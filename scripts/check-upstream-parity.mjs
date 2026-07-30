import { readFile } from "node:fs/promises";
import { format, resolveConfig } from "prettier";
import { parse } from "yaml";

const UPSTREAM = "https://raw.githubusercontent.com/grafanaKibana/obsidian-tabsdown/main";
const STYLESHEET = "src/styles/tabsdown.scss";

/** Files copied verbatim from obsidian-tabsdown, compared after formatting. */
const VENDORED = [
  ["src/parser.ts", "src/parser.ts"],
  ["tests/parser.test.ts", "test/parser.test.ts"],
];

/**
 * Style Settings controls with no Quartz counterpart: preset switches that need a
 * settings panel to toggle. Anything not listed here must exist as a custom
 * property, so a control added upstream fails instead of being forgotten.
 */
const NOT_PORTED = new Map([
  [
    "tabsdown-density",
    "preset switch; --tabsdown-tab-min-size and the padding properties cover it",
  ],
  ["tabsdown-personality", "preset switch; restyle .tabsdown__tab instead"],
  ["tabsdown-overflow", "preset switch; per-block `config: one|multi` covers it"],
  ["tabsdown-palette", "preset switch; the --tabsdown-tab-* properties cover it"],
  ["tabsdown-alignment", "preset switch; restyle .tabsdown__tablist instead"],
  ["tabsdown-animations-disabled", "preset switch; set --tabsdown-animation-speed to 0ms"],
]);

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
    if (upstream === vendored) {
      continue;
    }

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

async function checkStyleSettings() {
  const block = /\/\*\s*@settings\s*\n([\s\S]*?)\*\//.exec(await fetchUpstream("styles.css"))?.[1];
  if (!block) {
    throw new Error("no @settings block in the upstream stylesheet — has its format changed?");
  }

  const { settings } = parse(block);
  if (!Array.isArray(settings)) {
    throw new Error("the upstream @settings block has no settings list");
  }

  const stylesheet = await readFile(STYLESHEET, "utf8");
  const upstreamIds = new Set();

  for (const setting of settings) {
    const { id, title, type, format: unit = "" } = setting;
    upstreamIds.add(id);
    if (NOT_PORTED.has(id)) {
      continue;
    }

    const property = `--${id}`;
    if (!stylesheet.includes(property)) {
      problems.push(
        `${STYLESHEET} has no ${property} for Style Settings "${title}" (${type}) — port it, or add "${id}" to NOT_PORTED with a reason`,
      );
      continue;
    }

    const expected = `${property}: ${setting.default}${unit};`;
    if (type === "variable-number-slider" && !stylesheet.includes(expected)) {
      problems.push(
        `${property} should default to ${setting.default}${unit} to match Style Settings "${title}" — expected the line \`${expected}\``,
      );
    }
  }

  for (const [id, reason] of NOT_PORTED) {
    if (!upstreamIds.has(id)) {
      problems.push(
        `NOT_PORTED lists "${id}" (${reason}) but it no longer exists upstream — drop it`,
      );
    }
  }

  return settings.length;
}

await checkVendoredFiles();
const controls = await checkStyleSettings();

if (problems.length > 0) {
  for (const problem of problems) {
    console.error(`::error::${problem}`);
  }
  process.exit(1);
}

console.log(
  `In sync with obsidian-tabsdown: ${VENDORED.length} vendored files identical, ` +
    `${controls - NOT_PORTED.size} of ${controls} Style Settings controls mapped, ` +
    `${NOT_PORTED.size} deliberately not ported.`,
);
