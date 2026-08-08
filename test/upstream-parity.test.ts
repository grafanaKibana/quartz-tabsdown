import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

const script = readFileSync("scripts/check-upstream-parity.mjs", "utf8");
const workflow = readFileSync(".github/workflows/ci.yml", "utf8");

describe("upstream parity identity gate", () => {
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
    expect(workflow).toContain("OBSIDIAN_TABSDOWN_SHA: df54b89811252068a607cee8b6fb1947960fbfd3");
    expect(workflow).toContain("github.event_name != 'schedule'");
    expect(workflow).toContain('npm run check:upstream -- "$OBSIDIAN_TABSDOWN_SHA"');
    expect(workflow).toContain("github.event_name == 'schedule'");
  });
});
