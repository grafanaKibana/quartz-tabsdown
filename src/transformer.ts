import type { ElementContent, Properties } from "hast";
import type { Definition, Parent, Root as MdastRoot, RootContent } from "mdast";
import type { PluggableList, Plugin, Processor } from "unified";
import type { QuartzTransformerPlugin } from "@quartz-community/types";
import { protectMarkers, protectedMarker, restoreMarkers } from "./markers";
import iconNodes from "lucide-static/icon-nodes.json";
import {
  parseInlineLabel,
  parseTabs,
  type ParsedTab,
  type TabConfiguration,
  type TabsdownConfig,
  type TabsDiagnostic,
} from "./parser";
import {
  resolveTabsdownStyles,
  tabsdownStyleClasses,
  tabsdownStyleVariables,
  type TabsdownOptions,
} from "./style-options";
import styles from "./styles/tabsdown.scss";
// @ts-expect-error - bundled to a browser-ready string by the inline script loader
import script from "./scripts/tabsdown.inline.ts";

const positions = new Set<TabConfiguration>(["top", "left", "right", "bottom"]);

function synthetic(
  type: string,
  hName: string,
  hProperties: Properties,
  children: RootContent[],
  hChildren?: ElementContent[],
): RootContent {
  const data = { hName, hProperties, ...(hChildren ? { hChildren } : {}) };
  return { type, data, children } as unknown as RootContent;
}

function element(
  tagName: string,
  properties: Properties,
  children: ElementContent[],
): ElementContent {
  return { type: "element", tagName, properties, children };
}

function text(value: string): ElementContent {
  return { type: "text", value };
}

function labelNodes(label: string): ElementContent[] {
  return parseInlineLabel(label).map((token) => {
    if (token.type === "text") return text(token.text);
    let tagName: "strong" | "em" | "del" | "code";
    switch (token.type) {
      case "strong":
        tagName = "strong";
        break;
      case "emphasis":
        tagName = "em";
        break;
      case "delete":
        tagName = "del";
        break;
      case "code":
        tagName = "code";
        break;
    }
    return element(tagName, {}, [text(token.text)]);
  });
}

function iconElement(name: string): ElementContent | undefined {
  const nodes = iconNodes[name];
  if (!nodes) {
    return undefined;
  }

  return element("span", { className: ["tabsdown__tab-icon"], "aria-hidden": "true" }, [
    element(
      "svg",
      {
        xmlns: "http://www.w3.org/2000/svg",
        viewBox: "0 0 24 24",
        width: "1em",
        height: "1em",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2",
        strokeLinecap: "round",
        strokeLinejoin: "round",
      },
      nodes.map(([tagName, properties]) => element(tagName, properties, [])),
    ),
  ]);
}

function resolveConfiguration(configuration: readonly TabConfiguration[]): TabConfiguration[] {
  let position: TabConfiguration = "top";
  let layout: TabConfiguration = "one";
  for (const value of configuration) {
    if (positions.has(value)) {
      position = value;
    } else {
      layout = value;
    }
  }
  return [position, layout];
}

function blockStyleClasses(styles: readonly string[], options: TabsdownConfig = {}): string[] {
  let classes = [...styles];
  for (const key of ["density", "personality", "palette", "alignment"] as const) {
    const value = options[key];
    if (value === undefined) continue;
    // Block settings take precedence over both global and position defaults.
    const setting = new RegExp(`^tabsdown-(?:(?:top|bottom|left|right)-)?${key}-`);
    classes = classes.filter((name) => !setting.test(name));
    classes.push(`tabsdown-${key}-${value === "button" ? "default" : value}`);
    if (key === "palette") classes.push(`tabsdown--palette-${value}`);
  }
  return classes;
}

function diagnosticNode(diagnostic: TabsDiagnostic): RootContent {
  return synthetic(
    "tabsdownDiagnostic",
    "div",
    { className: ["tabsdown", "tabsdown__diagnostic"], role: "alert" },
    [],
    [
      element("strong", { className: ["tabsdown__diagnostic-title"] }, [
        text(`Tabsdown: ${diagnostic.message}`),
      ]),
      element("div", { className: ["tabsdown__diagnostic-location"] }, [
        text(`Line ${diagnostic.line}`),
      ]),
      element("pre", { className: ["tabsdown__diagnostic-source"] }, [text(diagnostic.source)]),
    ],
  );
}

function tabButton(tab: ParsedTab, blockId: string, index: number): RootContent {
  const icon = tab.icon ? iconElement(tab.icon) : undefined;
  return synthetic(
    "tabsdownTab",
    "button",
    {
      type: "button",
      id: `${blockId}-tab-${index}`,
      className: ["tabsdown__tab"],
    },
    [],
    [
      element("span", { className: ["tabsdown__tab-content"] }, [
        ...(icon ? [icon] : []),
        element("span", { className: ["tabsdown__tab-label"] }, labelNodes(tab.label)),
        element(
          "span",
          {
            className: ["tabsdown__tab-reserve", ...(icon ? ["tabsdown__tab-reserve--icon"] : [])],
            ariaHidden: "true",
          },
          labelNodes(tab.label),
        ),
      ]),
    ],
  );
}

function panelNode(
  tab: ParsedTab,
  blockId: string,
  index: number,
  content: RootContent[],
): RootContent {
  const label = synthetic(
    "tabsdownPanelLabel",
    "div",
    { className: ["tabsdown__panel-label"] },
    [],
    labelNodes(tab.label),
  );
  return synthetic(
    "tabsdownPanel",
    "div",
    {
      id: `${blockId}-panel-${index}`,
      className: ["tabsdown__panel"],
      "aria-labelledby": `${blockId}-tab-${index}`,
    },
    [label, synthetic("tabsdownContent", "div", { className: ["tabsdown__content"] }, content)],
  );
}

const remarkTabsdown = (styleClasses: readonly string[]): Plugin<[], MdastRoot> =>
  function () {
    const processor = this as unknown as Processor<MdastRoot>;

    return (tree: MdastRoot, file) => {
      let blockCount = 0;
      const documentSource = String(file.value);
      function collectDefinitions(parent: Parent, result: Definition[] = []): Definition[] {
        for (const child of parent.children) {
          if (child.type === "definition") result.push(child);
          else if ("children" in child) collectDefinitions(child, result);
        }
        return result;
      }
      const definitions = collectDefinitions(tree);

      function definitionSource(definition: Definition): string {
        // mdast identifiers retain authored escapes; escaping again changes identity.
        const label = definition.identifier;
        const url = definition.url.replace(/[\\<>\n\r]/g, (character) =>
          encodeURIComponent(character),
        );
        const title =
          definition.title == null ? "" : ` "${definition.title.replace(/[\\"]/g, "\\$&")}"`;
        return `[${label}]: <${url}>${title}\n`;
      }

      function marker(child: RootContent) {
        return child.type === "html" ? protectedMarker(child.value) : undefined;
      }

      function transform(
        parent: Parent,
        depth = 0,
        source = documentSource,
        lineOffset = 0,
        scope: readonly Definition[] = definitions,
      ): void {
        for (let index = 0; index < parent.children.length; index += 1) {
          const child = parent.children[index]!;
          const control = marker(child);
          if (control?.kind === "tabs") {
            let nesting = 1;
            let end = index + 1;
            for (; end < parent.children.length; end += 1) {
              const next = marker(parent.children[end]!);
              if (next?.kind === "tabs") nesting += 1;
              if (next?.kind === "endtabs" && --nesting === 0) break;
            }
            if (nesting === 0) {
              const group = parent.children.slice(index, end + 1);
              parent.children.splice(
                index,
                group.length,
                markerBlock(group, depth, source, lineOffset, scope),
              );
            } else {
              parent.children[index] = diagnosticNode({
                code: "unclosed-nested-block",
                message: "A tabs block is never closed.",
                line: control.line + lineOffset,
                source: control.raw,
              });
            }
          } else if (control) {
            parent.children[index] = {
              type: "paragraph",
              children: [{ type: "text", value: control.raw }],
            };
          } else if (child.type === "code" && child.lang === "tabsdown") {
            parent.children[index] = block(
              child.value,
              depth,
              lineOffset + (child.position?.start.line ?? 0),
              scope,
            );
          } else if ("children" in child) {
            transform(child, depth, source, lineOffset, scope);
          }
        }
      }

      function markerBlock(
        group: RootContent[],
        depth: number,
        source: string,
        lineOffset: number,
        scope: readonly Definition[],
      ): RootContent {
        const inner = group.slice(1, -1);
        const lines = inner.map((child) => marker(child)?.raw ?? "content");
        const result = parseTabs(lines.join("\n"), "markers");
        if (!result.ok) {
          const offending = inner[result.diagnostic.line - 1] ?? group[0]!;
          const start = group[0]!.position?.start.offset;
          const end = group[group.length - 1]!.position?.end.offset;
          return diagnosticNode({
            ...result.diagnostic,
            line: (marker(offending)?.line ?? offending.position?.start.line ?? 1) + lineOffset,
            source:
              start !== undefined && end !== undefined
                ? restoreMarkers(source.slice(start, end))
                : group.map((child) => marker(child)?.raw ?? "content").join("\n"),
          });
        }
        const bodies: RootContent[][] = [];
        let nesting = 0;
        for (const child of inner) {
          const control = marker(child);
          if (control?.kind === "tab" && nesting === 0) {
            bodies.push([]);
            continue;
          }
          if (bodies.length > 0) bodies[bodies.length - 1]!.push(child);
          if (control?.kind === "tabs") nesting += 1;
          if (control?.kind === "endtabs") nesting -= 1;
        }
        return renderBlock(result, depth, (index) => {
          const body: MdastRoot = { type: "root", children: bodies[index] ?? [] };
          transform(body, depth + 1, source, lineOffset, scope);
          return body.children;
        });
      }

      function resolveReferences(parent: Parent, scope: readonly Definition[]): void {
        for (let index = 0; index < parent.children.length; index += 1) {
          const child = parent.children[index]!;
          if (child.type === "linkReference" || child.type === "imageReference") {
            const definition = scope.find((item) => item.identifier === child.identifier);
            if (definition) {
              parent.children[index] =
                child.type === "linkReference"
                  ? {
                      type: "link",
                      url: definition.url,
                      title: definition.title,
                      children: child.children,
                      position: child.position,
                      data: child.data,
                    }
                  : {
                      type: "image",
                      url: definition.url,
                      title: definition.title,
                      alt: child.alt,
                      position: child.position,
                      data: child.data,
                    };
            }
          }
          const resolved = parent.children[index]!;
          if ("children" in resolved) resolveReferences(resolved, scope);
        }
      }

      function block(
        source: string,
        depth: number,
        lineOffset: number,
        scope: readonly Definition[],
      ): RootContent {
        const result = parseTabs(source);
        if (!result.ok)
          return diagnosticNode({
            ...result.diagnostic,
            line: result.diagnostic.line + lineOffset,
          });
        // Unescaping a fenced tab body changes offsets but never line counts.
        const locationSource = source.replace(/^\\(?=tab:)/gm, "");
        let bodyCursor = 0;
        return renderBlock(result, depth, (index) => {
          const tab = result.tabs[index]!;
          // Parse definitions before any open literal context in the body. Keep local
          // definitions authoritative and remove the inherited declarations afterwards.
          const own = collectDefinitions(processor.parse(protectMarkers(tab.body)));
          const prefix = scope
            .filter(
              (definition) => !own.some((local) => local.identifier === definition.identifier),
            )
            .map(definitionSource)
            .join("");
          const bodySource = protectMarkers(prefix + "\n" + tab.body);
          const body = processor.parse(bodySource);
          // Resolve inside this panel before the document-wide rehype lookup can
          // let an earlier global definition shadow the panel-local definition.
          const panelScope = [...own, ...scope];
          resolveReferences(body, panelScope);
          body.children = body.children.filter(
            (child) =>
              child.type !== "definition" ||
              (child.position?.start.offset ?? prefix.length) >= prefix.length,
          );
          const locationBody = tab.body.replace(/^\\(?=tab:)/gm, "");
          const tabOffset = locationSource.indexOf(locationBody, bodyCursor);
          if (tabOffset >= 0) bodyCursor = tabOffset + locationBody.length;
          const bodyLine = locationSource.slice(0, tabOffset).split("\n").length - 1;
          const prefixLines = prefix.split("\n").length;
          transform(body, depth + 1, bodySource, lineOffset + bodyLine - prefixLines, panelScope);
          return body.children;
        });
      }

      function renderBlock(
        result: Extract<ReturnType<typeof parseTabs>, { ok: true }>,
        depth: number,
        content: (index: number) => RootContent[],
      ): RootContent {
        const blockId = `tabsdown-${++blockCount}`;
        const buttons = result.tabs.map((tab, index) => tabButton(tab, blockId, index));
        const panels = result.tabs.map((tab, index) =>
          panelNode(tab, blockId, index, content(index)),
        );

        const classNames = ["tabsdown", ...blockStyleClasses(styleClasses, result.options)];
        if (depth > 0) {
          classNames.push(`tabsdown--nested-${depth % 2 === 1 ? "odd" : "even"}`);
        }
        if (result.configuration?.some((value) => value === "one" || value === "multi")) {
          classNames.push("tabsdown--inline-overflow");
        }
        for (const value of resolveConfiguration(result.configuration ?? [])) {
          classNames.push(`tabsdown--${value}`);
        }

        return synthetic("tabsdown", "div", { id: blockId, className: classNames }, [
          synthetic("tabsdownTabList", "div", { className: ["tabsdown__tablist"] }, buttons),
          synthetic("tabsdownPanels", "div", { className: ["tabsdown__panels"] }, panels),
        ]);
      }

      transform(tree);
    };
  };

export const Tabsdown: QuartzTransformerPlugin<TabsdownOptions> = (options) => {
  const resolvedStyles = resolveTabsdownStyles(options);
  const styleClasses = tabsdownStyleClasses(resolvedStyles);
  const mountedStyleClasses = styleClasses.filter(
    (name) => !/^tabsdown-(?:top|bottom|left|right)-/.test(name),
  );
  const configuredScript = script.replace(
    "__TABSDOWN_STYLE_CLASSES__",
    mountedStyleClasses.join(" "),
  );

  return {
    name: "Tabsdown",
    textTransform(_ctx, source) {
      return protectMarkers(source, { frontmatter: true });
    },
    markdownPlugins(): PluggableList {
      return [remarkTabsdown(styleClasses)];
    },
    externalResources() {
      return {
        css: [{ content: `${styles}\n${tabsdownStyleVariables(resolvedStyles)}`, inline: true }],
        js: [{ contentType: "inline", loadTime: "afterDOMReady", script: configuredScript }],
      };
    },
  };
};
