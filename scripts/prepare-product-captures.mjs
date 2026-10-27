import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse, stringify } from "yaml";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixtures = path.join(root, "docs/capture-fixtures");
const cache = path.join(root, ".product-captures-cache");
const quartz = path.join(cache, "quartz");
const plugin = path.join(cache, "plugin");
const upstream = "https://github.com/jackyzha0/quartz.git";
const revision = "97a2d05f80c4c50534959b1d0d41cc4b3895625e";
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

/** Run a fixed executable and argument list, forwarding useful build diagnostics. */
function run(command, args, cwd, capture = false) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, npm_config_cache: path.join(cache, "npm-cache") },
      stdio: capture ? ["ignore", "pipe", "inherit"] : "inherit",
      shell: false,
    });
    let output = "";
    child.stdout?.on("data", (chunk) => {
      output += chunk;
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) resolve(output.trim());
      else reject(new Error(`${command} ${args.join(" ")} failed (${signal ?? code})`));
    });
  });
}

/** Determine whether a path exists without treating malformed/unreadable files as absent. */
async function exists(file) {
  try {
    await readFile(file);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

/** Freeze the host engine at a documented commit and reject caches from another revision. */
async function prepareQuartz() {
  if (!(await exists(path.join(quartz, ".git/HEAD")))) {
    await mkdir(quartz, { recursive: true });
    if ((await readdir(quartz)).length !== 0) {
      throw new Error(`Refusing to initialize a non-empty capture cache: ${quartz}`);
    }
    await run("git", ["init", "-q"], quartz);
    await run("git", ["remote", "add", "origin", upstream], quartz);
    await run("git", ["fetch", "--depth", "1", "origin", revision], quartz);
    await run("git", ["checkout", "--detach", "FETCH_HEAD"], quartz);
  }
  const actual = await run("git", ["rev-parse", "HEAD"], quartz, true);
  assert.equal(
    actual,
    revision,
    "Capture cache has a different Quartz revision; move it aside first",
  );
  const remote = await run("git", ["remote", "get-url", "origin"], quartz, true);
  assert.equal(remote, upstream, "Capture cache has an unexpected Quartz remote");
  if (!(await exists(path.join(quartz, "node_modules/.package-lock.json")))) {
    await run(npm, ["ci", "--no-audit", "--no-fund"], quartz);
  }
}

/** Copy build inputs into the owned cache so plugin installation cannot change the source checkout. */
async function preparePlugin() {
  await mkdir(plugin, { recursive: true });
  for (const entry of ["src", "types"]) {
    await rm(path.join(plugin, entry), { recursive: true, force: true });
    await cp(path.join(root, entry), path.join(plugin, entry), { recursive: true });
  }
  for (const entry of [
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "tsconfig.build.json",
    "tsup.config.ts",
    "LICENSE",
  ]) {
    await cp(path.join(root, entry), path.join(plugin, entry));
  }
  // npm ci intentionally uses the checked-in plugin lockfile rather than mutable package ranges.
  await run(npm, ["ci", "--no-audit", "--no-fund"], plugin);
  await run(npm, ["run", "build"], plugin);
}

/** Write the fixture-only site configuration and content, then build its real Quartz output. */
async function buildFixture() {
  const config = parse(await readFile(path.join(quartz, "quartz.config.default.yaml"), "utf8"));
  config.configuration.pageTitle = "Fieldnotes";
  config.configuration.baseUrl = "example.invalid";
  config.configuration.analytics = null;
  config.configuration.enablePopovers = false;
  config.configuration.theme.fontOrigin = "local";
  config.plugins.unshift({
    source: { repo: plugin, name: "tabsdown" },
    enabled: true,
    order: 10,
    options: { styles: { personality: "underline", alignment: "equal-width", radius: 8 } },
  });
  await writeFile(path.join(quartz, "quartz.config.yaml"), stringify(config));
  await mkdir(path.join(quartz, "content"), { recursive: true });
  for (const entry of ["index.md", "target.md"]) {
    await cp(path.join(fixtures, entry), path.join(quartz, "content", entry));
  }
  await cp(path.join(fixtures, "Geist.ttf"), path.join(quartz, "quartz/static/capture-font.ttf"));
  await writeFile(
    path.join(quartz, "quartz/styles/custom.scss"),
    `
@use "./variables.scss" as *;
@font-face {
  font-family: "Capture Geist";
  src: url("/static/capture-font.ttf") format("truetype");
  font-display: block;
}
:root { --headerFont: "Capture Geist", sans-serif; --bodyFont: "Capture Geist", sans-serif; }
`,
  );
  await run(
    process.execPath,
    ["quartz/bootstrap-cli.mjs", "plugin", "install", "--from-config"],
    quartz,
  );
  await run(process.execPath, ["quartz/bootstrap-cli.mjs", "build"], quartz);
  const html = await readFile(path.join(quartz, "public/index.html"), "utf8");
  assert.match(html, /tabsdown__tab/, "Fixture did not render the local Tabsdown plugin");
  assert.doesNotMatch(html, /tabsdown__diagnostic/, "Fixture contains a Tabsdown diagnostic");
  await writeFile(
    path.join(cache, "fixture.json"),
    `${JSON.stringify(
      {
        quartzRevision: revision,
        pluginSource: "current-local-source-snapshot",
        publicDirectory: ".product-captures-cache/quartz/public",
        route: "/",
        readySelector: ".tabsdown .tabsdown__tab",
      },
      null,
      2,
    )}\n`,
  );
}

await mkdir(cache, { recursive: true });
await prepareQuartz();
await preparePlugin();
await buildFixture();
console.log(`Capture fixture built from current local source: ${path.join(quartz, "public")}`);
