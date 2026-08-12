import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";

const SEMVER = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/;
const PR_TITLE =
  /^(feat|fix|perf|refactor|docs|test|build|ci|chore|revert|style)(?:\([^)]+\))?(!)?: (.+)$/;
const root = process.cwd();

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function parseVersion(value, source) {
  const match = typeof value === "string" && SEMVER.exec(value);
  if (!match) {
    throw new Error(`${source} must be exact x.y.z SemVer.`);
  }
  return match.slice(1).map(Number);
}

function versionFromLock(lock, source) {
  const version = lock.version;
  if (lock.packages?.[""]?.version !== version) {
    throw new Error(`${source} root package version must match ${String(version)}.`);
  }
  parseVersion(version, source);
  return version;
}

function compareVersions(left, right) {
  const a = parseVersion(left, "Current version");
  const b = parseVersion(right, "Previous version");
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) {
      return a[index] - b[index];
    }
  }
  return 0;
}

const packagePath = resolve(root, "package.json");
const lockPath = resolve(root, "package-lock.json");

if (process.argv[2] === "--next") {
  const title = process.argv[3];
  const match = typeof title === "string" && PR_TITLE.exec(title);
  if (!match || process.argv.length !== 4) {
    throw new Error(
      "PR title must use '<type>[optional scope][!]: <description>' (for example, 'feat: add vertical tabs').",
    );
  }

  const [major, minor, patch] = parseVersion(
    versionFromLock(readJson(lockPath), "package-lock.json"),
    "package-lock.json",
  );
  const next = match[2]
    ? `${major + 1}.0.0`
    : match[1] === "feat"
      ? `${major}.${minor + 1}.0`
      : `${major}.${minor}.${patch + 1}`;
  process.stdout.write(`${next}\n`);
  process.exit(0);
}

if (process.argv[2] === "--check") {
  const packageJson = readJson(packagePath);
  const version = versionFromLock(readJson(lockPath), "package-lock.json");

  if (packageJson.version !== version || packageJson.quartz?.version !== version) {
    throw new Error("package.json, package-lock.json, and quartz metadata versions must match.");
  }

  const previousPath = process.argv[3];
  const previous = previousPath
    ? versionFromLock(readJson(resolve(previousPath)), "Previous package-lock.json")
    : version;
  const comparison = compareVersions(version, previous);

  if (comparison < 0) {
    throw new Error(`Version ${version} must not be lower than ${previous}.`);
  }

  process.stdout.write(`version=${version}\nincreased=${comparison > 0}\n`);
  process.exit(0);
}

const version = process.argv[2];
if (!version || !SEMVER.test(version) || process.argv.length !== 3) {
  throw new Error("Usage: npm run version -- <x.y.z>");
}

const backups = new Map([
  [packagePath, readFileSync(packagePath)],
  [lockPath, readFileSync(lockPath)],
]);
const packageJson = JSON.parse(backups.get(packagePath).toString());
const packageLock = JSON.parse(backups.get(lockPath).toString());

if (!packageJson.quartz || !packageLock.packages?.[""]) {
  throw new Error("Expected package.json quartz metadata and a root lockfile package.");
}

packageJson.version = version;
packageJson.quartz.version = version;
packageLock.version = version;
packageLock.packages[""].version = version;

try {
  writeFileSync(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);
  writeFileSync(lockPath, `${JSON.stringify(packageLock, null, 2)}\n`);
} catch (error) {
  for (const [path, contents] of backups) {
    writeFileSync(path, contents);
  }
  throw error;
}

process.stdout.write(`Updated release metadata to ${version}.\n`);
