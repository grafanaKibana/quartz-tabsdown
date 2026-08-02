import { readFile } from "node:fs/promises";
import { format, resolveConfig } from "prettier";
import { parse } from "yaml";
import { STYLE_SETTINGS_CONTRACT } from "../dist/types.js";

const UPSTREAM = "https://raw.githubusercontent.com/grafanaKibana/obsidian-tabsdown/main";
const STYLESHEET = "src/styles/tabsdown.scss";

/** Files copied verbatim from obsidian-tabsdown, compared after formatting. */
const VENDORED = [
  ["src/parser.ts", "src/parser.ts"],
  ["tests/parser.test.ts", "test/parser.test.ts"],
];

const problems = [];

async function fetchUpstream(path) {
  const response = await fetch(`${UPSTREAM}/${path}`);
  if (!response.ok) {
    throw new Error(`could not fetch ${path}: ${response.status} ${response.statusText}`);
  }
  return response.text();
}

async function checkVendoredFiles() {
  for (const [upstreamPath, vendoredPath] of VENDORED) {
    const config = await resolveConfig(vendoredPath);
    const upstream = await format(await fetchUpstream(upstreamPath), {
      ...config,
      filepath: vendoredPath,
    });
    const vendored = await readFile(vendoredPath, "utf8");
    if (upstream === vendored) continue;

    const upstreamLines = upstream.split("\n");
    const vendoredLines = vendored.split("\n");
    const at = vendoredLines.findIndex((line, index) => line !== upstreamLines[index]) + 1;
    problems.push(
      `${vendoredPath} drifted from obsidian-tabsdown ${upstreamPath} at line ${at}:\n` +
        `      upstream: ${upstreamLines[at - 1] ?? "(end of file)"}\n` +
        `      vendored: ${vendoredLines[at - 1] ?? "(end of file)"}`,
    );
  }
}

function compare(id, field, actual, expected) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    problems.push(
      `${id} ${field} drifted: upstream is ${JSON.stringify(actual)}, Quartz maps ${JSON.stringify(expected)}`,
    );
  }
}

async function checkStyleSettings() {
  const block = /\/\*\s*@settings\s*\n([\s\S]*?)\*\//.exec(await fetchUpstream("styles.css"))?.[1];
  if (!block) {
    throw new Error("no @settings block in the upstream stylesheet — has its format changed?");
  }

  const parsed = parse(block).settings;
  if (!Array.isArray(parsed)) {
    throw new Error("the upstream @settings block has no settings list");
  }

  const upstream = parsed.filter(({ type }) => type !== "heading");
  const mappings = new Map(STYLE_SETTINGS_CONTRACT.map((setting) => [setting.id, setting]));
  const stylesheet = await readFile(STYLESHEET, "utf8");

  for (const setting of upstream) {
    const mapping = mappings.get(setting.id);
    if (!mapping) {
      problems.push(`${setting.id} (${setting.title}) has no options.styles mapping`);
      continue;
    }
    mappings.delete(setting.id);

    compare(setting.id, "type", setting.type, mapping.type);
    compare(setting.id, "default", setting.default ?? null, mapping.default);

    if (setting.type === "class-select") {
      compare(
        setting.id,
        "enum values",
        setting.options?.map(({ value }) => value) ?? [],
        mapping.enums,
      );
    } else if (setting.type === "variable-number-slider") {
      compare(setting.id, "minimum", setting.min, mapping.min);
      compare(setting.id, "maximum", setting.max, mapping.max);
      compare(setting.id, "step", setting.step, mapping.step);
      compare(setting.id, "unit", setting.format, mapping.unit);
      if (!stylesheet.includes(`--${setting.id}`)) {
        problems.push(
          `${STYLESHEET} has no --${setting.id} used by options.styles.${mapping.path}`,
        );
      }
    } else if (!stylesheet.includes(setting.id)) {
      problems.push(
        `${STYLESHEET} has no ${setting.id} rule used by options.styles.${mapping.path}`,
      );
    }
  }

  for (const [id, mapping] of mappings) {
    problems.push(
      `options.styles.${mapping.path} maps ${id}, but that control no longer exists upstream`,
    );
  }

  return upstream.length;
}

await checkVendoredFiles();
const controls = await checkStyleSettings();

if (problems.length > 0) {
  for (const problem of problems) console.error(`::error::${problem}`);
  process.exit(1);
}

console.log(
  `In sync with obsidian-tabsdown: ${VENDORED.length} vendored files identical and ` +
    `${controls} Style Settings controls mapped with defaults, types, enums, ranges, steps, and units.`,
);
