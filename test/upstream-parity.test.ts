import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { describe, expect, test } from "vitest";

const script = readFileSync("scripts/check-upstream-parity.mjs", "utf8");
const workflow = readFileSync(".github/workflows/ci.yml", "utf8");

describe("upstream parity identity gate", () => {
  test("applies only the explicit keyed-only patch and rejects incompatible upstream context", () => {
    const directory = mkdtempSync(join(tmpdir(), "quartz-keyed-patch-test-"));
    const patch = resolve("scripts/upstream-keyed-config.patch");
    const paths = ["src/config.ts", "src/parser.ts", "test/config.test.ts", "test/parser.test.ts"];
    try {
      for (const path of paths) {
        mkdirSync(dirname(join(directory, path)), { recursive: true });
        writeFileSync(join(directory, path), readFileSync(path));
      }
      execFileSync("git", ["apply", "--reverse", patch], { cwd: directory });
      expect(readFileSync(join(directory, "src/config.ts"), "utf8")).toContain('kind: "bare"');
      execFileSync("git", ["apply", "--whitespace=error", patch], { cwd: directory });
      for (const path of paths) {
        expect(readFileSync(join(directory, path), "utf8")).toBe(readFileSync(path, "utf8"));
      }
      execFileSync("git", ["apply", "--reverse", patch], { cwd: directory });
      const config = join(directory, "src/config.ts");
      writeFileSync(config, readFileSync(config, "utf8").replace('kind: "bare"', 'kind: "legacy"'));
      const failed = spawnSync("git", ["apply", "--whitespace=error", patch], { cwd: directory });
      expect(failed.status).not.toBe(0);
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

  test("resolves through the commits API and fetches raw files by resolved SHA", () => {
    expect(script).toContain("api.github.com/repos/${REPOSITORY}/commits/${requestedRef}");
    expect(script).toContain("resolvedSha !== requestedRef");
    expect(script).toContain("resolved_sha=${resolvedSha}");
    expect(script).toContain("raw.githubusercontent.com/${REPOSITORY}/${resolvedSha}");
    expect(script).not.toContain("obsidian-tabsdown/main");
  });

  test("pins pull request and push parity while schedules track main", () => {
    expect(workflow).toContain("GITHUB_TOKEN: ${{ github.token }}");
    expect(workflow).toContain("OBSIDIAN_TABSDOWN_SHA: 20b3da41426a90950a4719274a1117d0059a6f1a");
    expect(workflow).toContain("github.event_name != 'schedule'");
    expect(workflow).toContain('npm run check:upstream -- "$OBSIDIAN_TABSDOWN_SHA"');
    expect(workflow).toContain("github.event_name == 'schedule'");
  });
});
