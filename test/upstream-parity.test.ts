import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { describe, expect, test } from "vitest";

const script = readFileSync("scripts/check-upstream-parity.mjs", "utf8");
const workflow = readFileSync(".github/workflows/ci.yml", "utf8");

describe("upstream parity identity gate", () => {
  test("applies explicit Quartz patches and rejects incompatible upstream context", () => {
    const directory = mkdtempSync(join(tmpdir(), "quartz-keyed-patch-test-"));
    const patches = [
      resolve("scripts/upstream-keyed-config.patch"),
      resolve("scripts/upstream-renderer-only.patch"),
      resolve("scripts/upstream-literal-contexts.patch"),
    ];
    const paths = [
      "src/syntax.ts",
      "src/config.ts",
      "src/parser.ts",
      "test/config.test.ts",
      "test/parser.test.ts",
    ];
    try {
      for (const path of paths) {
        mkdirSync(dirname(join(directory, path)), { recursive: true });
        writeFileSync(join(directory, path), readFileSync(path));
      }
      for (const patch of [...patches].reverse()) {
        execFileSync("git", ["apply", "--reverse", patch], { cwd: directory });
      }
      expect(readFileSync(join(directory, "src/config.ts"), "utf8")).toContain('kind: "bare"');
      expect(readFileSync(join(directory, "src/config.ts"), "utf8")).toContain("configEdit(");
      expect(readFileSync(join(directory, "test/config.test.ts"), "utf8")).toContain(
        'describe("configEdit"',
      );
      for (const patch of patches) {
        execFileSync("git", ["apply", "--whitespace=error", patch], { cwd: directory });
      }
      for (const path of paths) {
        expect(readFileSync(join(directory, path), "utf8")).toBe(readFileSync(path, "utf8"));
      }
      expect(readFileSync(join(directory, "src/config.ts"), "utf8")).not.toContain("configEdit");
      expect(readFileSync(join(directory, "src/config.ts"), "utf8")).not.toContain("ConfigEdit");
      expect(readFileSync(join(directory, "src/config.ts"), "utf8")).not.toContain("./syntax");
      for (const patch of [...patches].reverse()) {
        execFileSync("git", ["apply", "--reverse", patch], { cwd: directory });
      }
      const config = join(directory, "src/config.ts");
      const upstreamConfig = readFileSync(config, "utf8");
      writeFileSync(config, upstreamConfig.replace('kind: "bare"', 'kind: "legacy"'));
      const keyedFailed = spawnSync("git", ["apply", "--whitespace=error", patches[0]!], {
        cwd: directory,
      });
      expect(keyedFailed.status).not.toBe(0);

      writeFileSync(config, upstreamConfig);
      execFileSync("git", ["apply", "--whitespace=error", patches[0]!], { cwd: directory });
      writeFileSync(
        config,
        readFileSync(config, "utf8").replace("function configEdit(", "function renamedConfigEdit("),
      );
      const rendererFailed = spawnSync("git", ["apply", "--whitespace=error", patches[1]!], {
        cwd: directory,
      });
      expect(rendererFailed.status).not.toBe(0);

      // The keyed adaptation is already applied; restore only its config file.
      writeFileSync(config, upstreamConfig);
      execFileSync("git", ["apply", "--include=src/config.ts", patches[0]!], { cwd: directory });
      execFileSync("git", ["apply", "--whitespace=error", patches[1]!], { cwd: directory });
      const syntax = join(directory, "src/syntax.ts");
      writeFileSync(
        syntax,
        readFileSync(syntax, "utf8").replace(
          "function hasClosingCodeRun(",
          "function renamedCodeRun(",
        ),
      );
      const literalsFailed = spawnSync("git", ["apply", "--whitespace=error", patches[2]!], {
        cwd: directory,
      });
      expect(literalsFailed.status).not.toBe(0);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test.each(["62819e6", "feature/issues-56-57", "z".repeat(40)])(
    "rejects non-exact commit identity %s before fetching",
    (reference) => {
      const result = spawnSync(process.execPath, ["scripts/check-upstream-parity.mjs", reference], {
        encoding: "utf8",
      });

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("exact 40-character SHA");
      expect(result.stdout).not.toContain("npm run build");
    },
  );

  test("rejects extra arguments before fetching", () => {
    const result = spawnSync(
      process.execPath,
      ["scripts/check-upstream-parity.mjs", "0123456789abcdef0123456789abcdef01234567", "extra"],
      { encoding: "utf8" },
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("expected zero arguments");
  });

  test("compares shared marker syntax and both parser and config test suites", () => {
    for (const [upstream, local] of [
      ["src/syntax.ts", "src/syntax.ts"],
      ["src/parser.ts", "src/parser.ts"],
      ["src/config.ts", "src/config.ts"],
      ["tests/parser.test.ts", "test/parser.test.ts"],
      ["tests/config.test.ts", "test/config.test.ts"],
    ]) {
      expect(script).toContain(`["${upstream}", "${local}"]`);
    }
    expect(script).toContain('"scripts/upstream-keyed-config.patch"');
    expect(script).toContain('"scripts/upstream-renderer-only.patch"');
    expect(script).toContain('"scripts/upstream-literal-contexts.patch"');
  });

  test("resolves through the commits API and fetches raw files by resolved SHA", () => {
    expect(script).toContain("api.github.com/repos/${REPOSITORY}/commits/${requestedRef}");
    expect(script).toContain("resolvedSha !== requestedRef");
    expect(script).toContain("resolved_sha=${resolvedSha}");
    expect(script).toContain("raw.githubusercontent.com/${REPOSITORY}/${resolvedSha}");
    expect(script).not.toContain("obsidian-tabsdown/main");
  });

  test("pins pull request and push parity while schedules track main", () => {
    expect(workflow).toContain("GITHUB_TOKEN: ${{ github.token }}");
    expect(workflow).toContain("OBSIDIAN_TABSDOWN_SHA: 654a04712bd2a2e38a77be2436199a137f3ba19a");
    expect(workflow).toContain("github.event_name != 'schedule'");
    expect(workflow).toContain('npm run check:upstream -- "$OBSIDIAN_TABSDOWN_SHA"');
    expect(workflow).toContain("github.event_name == 'schedule'");
  });
});
