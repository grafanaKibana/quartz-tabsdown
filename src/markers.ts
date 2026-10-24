import { unified } from "unified";
import remarkParse from "remark-parse";
import type { Parent, RootContent } from "mdast";
import { commentMarkers, type CommentMarker } from "./syntax";

const transport = /<!--quartz-tabsdown-marker:([A-Za-z0-9+/=]+)-->/g;
export interface ProtectedMarker {
  kind: CommentMarker["kind"];
  raw: string;
  line: number;
}

interface SourceRow {
  text: string;
  offset: number;
  line: number;
}

/** Project actual Markdown containers before scanning; literal AST spans stay opaque. */
function structuralMarkers(
  source: string,
): { from: number; to: number; kind: CommentMarker["kind"]; line: number }[] {
  const tree = unified().use(remarkParse).parse(source);
  const literals: { from: number; to: number }[] = [];
  const labelLiterals = new Set<number>();
  function collect(parent: Parent): void {
    for (const child of parent.children) {
      if (
        [
          "code",
          "html",
          "inlineCode",
          "definition",
          "link",
          "image",
          "linkReference",
          "imageReference",
        ].includes(child.type) &&
        child.position
      ) {
        literals.push({ from: child.position.start.offset!, to: child.position.end.offset! });
      } else if ("children" in child) collect(child);
    }
  }
  collect(tree);
  const rows: SourceRow[] = [];
  for (const match of source.matchAll(/[^\n]*(?:\n|$)/g)) {
    if (match[0])
      rows.push({
        text: match[0].replace(/\r?\n$/, ""),
        offset: match.index,
        line: rows.length + 1,
      });
  }
  const markers: ReturnType<typeof structuralMarkers> = [];
  function scan(parent: Parent, context: SourceRow[]): void {
    const containers: RootContent[] = [];
    function children(node: Parent): void {
      for (const child of node.children) {
        if (child.type === "blockquote" || child.type === "listItem") containers.push(child);
        else if ("children" in child) children(child);
      }
    }
    children(parent);
    const probes = new Map<number, RootContent>();
    const projected = context.map((row) => {
      const container = containers.find(
        (child) => row.line >= child.position!.start.line && row.line <= child.position!.end.line,
      );
      if (!container) return row.text;
      if (row.line === container.position!.start.line) {
        probes.set(row.line, container);
        return "%% tab: container-probe %%";
      }
      return "";
    });
    const starts: number[] = [];
    let offset = 0;
    for (const line of projected) {
      starts.push(offset);
      offset += line.length + 1;
    }
    for (const control of commentMarkers(projected.join("\n"))) {
      const index = starts.findIndex(
        (start, i) => control.from >= start && control.from < (starts[i + 1] ?? offset),
      );
      const row = context[index]!;
      const container = probes.get(row.line);
      if (container && "children" in container) {
        const nested = context.filter(
          (item) =>
            item.line >= container.position!.start.line &&
            item.line <= container.position!.end.line,
        );
        const first = nested[0]!;
        const prefix =
          container.type === "listItem"
            ? (/^( {0,3}(?:[-+*]|\d{1,9}[.)]))[ \t]+/.exec(first.text)?.[0] ?? "")
            : "";
        const columns = (text: string) =>
          [...text].reduce(
            (width, character) => width + (character === "\t" ? 4 - (width % 4) : 1),
            0,
          );
        scan(
          container,
          nested.map((item, i) => {
            let length = 0;
            if (container.type === "blockquote")
              length = /^ {0,3}>[ \t]?/.exec(item.text)?.[0].length ?? 0;
            else if (i === 0) length = prefix.length;
            else
              while (
                length < item.text.length &&
                /[ \t]/.test(item.text[length]!) &&
                columns(item.text.slice(0, length)) < columns(prefix)
              )
                length += 1;
            return { ...item, text: item.text.slice(length), offset: item.offset + length };
          }),
        );
        continue;
      }
      const start = row.offset + row.text.indexOf("%%");
      if (
        !literals.some(
          (literal) =>
            !labelLiterals.has(literal.from) && start >= literal.from && start < literal.to,
        )
      ) {
        // Labels are opaque to body Markdown. A provisional code/HTML span
        // opened inside an accepted control cannot hide subsequent controls.
        for (const literal of literals) {
          if (literal.from >= start && literal.from < row.offset + row.text.length)
            labelLiterals.add(literal.from);
        }
        markers.push({
          from: start,
          to: row.offset + row.text.length,
          kind: control.kind,
          line: row.line,
        });
      }
    }
  }
  scan(tree, rows);
  return markers.sort((a, b) => a.from - b.from);
}

/** Protect structural controls from Obsidian's comment parser, keeping containers intact. */
export function protectMarkers(source: string, options: { frontmatter?: boolean } = {}): string {
  // Only the full document has frontmatter. A fenced panel may start with a
  // thematic break, so recursive panel parsing must scan that content normally.
  const frontmatter = options.frontmatter
    ? (/^(?:\uFEFF)?(---|\+\+\+)[ \t]*\r?\n(?:[\s\S]*?\r?\n)?\1[ \t]*(?:\r?\n|$)/.exec(
        source,
      )?.[0] ?? "")
    : "";
  const offset = frontmatter.length;
  const lineOffset = frontmatter.split("\n").length - 1;
  let result = source;
  for (const marker of structuralMarkers(source.slice(offset)).reverse()) {
    const from = marker.from + offset;
    const to = marker.to + offset;
    const raw = source.slice(from, to);
    const data: ProtectedMarker = { kind: marker.kind, raw, line: marker.line + lineOffset };
    const encoded = Buffer.from(JSON.stringify(data)).toString("base64");
    result = result.slice(0, from) + `<!--quartz-tabsdown-marker:${encoded}-->` + result.slice(to);
  }
  return result;
}

export function protectedMarker(value: string): ProtectedMarker | undefined {
  const match = /^<!--quartz-tabsdown-marker:([A-Za-z0-9+/=]+)-->$/.exec(value);
  if (!match) return undefined;
  try {
    const data = JSON.parse(Buffer.from(match[1]!, "base64").toString()) as ProtectedMarker;
    if (
      ["tabs", "endtabs", "tab", "config"].includes(data.kind) &&
      typeof data.raw === "string" &&
      typeof data.line === "number"
    )
      return data;
  } catch {
    /* Authored HTML is not necessarily an internal control. */
  }
  return undefined;
}

export function restoreMarkers(source: string): string {
  return source.replace(transport, (value) => protectedMarker(value)?.raw ?? value);
}
