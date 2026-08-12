import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, expect, test } from "vitest";
import { spawnSync } from "node:child_process";

const script = resolve("scripts/version.mjs");
const workflow = readFileSync(".github/workflows/ci.yml", "utf8");
const fixtures: string[] = [];

function fixture(version: string): string {
  const root = mkdtempSync(resolve(tmpdir(), "quartz-tabsdown-version-"));
  fixtures.push(root);
  writeFileSync(
    resolve(root, "package.json"),
    JSON.stringify({ name: "quartz-tabsdown", version, quartz: { version } }),
  );
  writeFileSync(
    resolve(root, "package-lock.json"),
    JSON.stringify({ name: "quartz-tabsdown", version, packages: { "": { version } } }),
  );
  return root;
}

function run(root: string, ...args: string[]) {
  return spawnSync(process.execPath, [script, ...args], { cwd: root, encoding: "utf8" });
}

afterEach(() => {
  for (const root of fixtures.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

test("updates every package version authority", () => {
  const root = fixture("0.1.0");

  expect(run(root, "0.2.0").status).toBe(0);
  expect(JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"))).toMatchObject({
    version: "0.2.0",
    quartz: { version: "0.2.0" },
  });
  expect(JSON.parse(readFileSync(resolve(root, "package-lock.json"), "utf8"))).toMatchObject({
    version: "0.2.0",
    packages: { "": { version: "0.2.0" } },
  });
});

test("accepts equal or increased versions and rejects decreases", () => {
  const current = fixture("0.2.0");
  const lower = fixture("0.1.0");
  const higher = fixture("0.3.0");

  expect(run(current, "--check", resolve(lower, "package-lock.json")).stdout).toContain(
    "increased=true",
  );
  expect(run(current, "--check", resolve(current, "package-lock.json")).stdout).toContain(
    "increased=false",
  );
  expect(run(current, "--check", resolve(higher, "package-lock.json")).status).not.toBe(0);
});

test.each([
  ["fix: correct nested tabs", "0.2.1"],
  ["feat(ui): add vertical tabs", "0.3.0"],
  ["feat!: replace the mount API", "1.0.0"],
])("derives %s as version %s", (title, version) => {
  const root = fixture("0.2.0");
  const result = run(root, "--next", title);

  expect(result.status).toBe(0);
  expect(result.stdout.trim()).toBe(version);
});

test.each(["Add vertical tabs", "feature: add vertical tabs", "feat add vertical tabs"])(
  "rejects invalid PR title %s",
  (title) => {
    expect(run(fixture("0.2.0"), "--next", title).status).not.toBe(0);
  },
);

test("validates titles and releases main only after CI passes", () => {
  expect(workflow).toContain('run: node scripts/version.mjs --next "$PR_TITLE"');
  expect(workflow).toContain("Version metadata is updated automatically after merge.");
  expect(workflow).toContain("needs: [version, upstream-parity, quartz-smoke, check]");
  expect(workflow).toContain('git push --atomic origin HEAD:main "refs/tags/$version"');
  expect(workflow).toContain('gh release create "$version" --verify-tag');
});
