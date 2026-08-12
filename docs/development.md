# Development and verification

Install dependencies and run the local checks:

```bash
npm install
npm run check
```

## Releases

Pull request titles use Conventional Commit syntax and determine the next release:

| Title                          | Bump  |
| ------------------------------ | ----- |
| `fix: correct nested tabs`     | Patch |
| `feat: add vertical tabs`      | Minor |
| `feat!: replace the mount API` | Major |
| `docs: explain configuration`  | Patch |

Scopes are optional, such as `feat(ui): add vertical tabs`. CI rejects titles outside the
`<type>[optional scope][!]: <description>` format. Supported types are `feat`, `fix`, `perf`,
`refactor`, `docs`, `test`, `build`, `ci`, `chore`, `revert`, and `style`.

After a pull request merges into `main` and CI passes, the workflow updates `package.json`,
`package-lock.json`, and Quartz metadata, commits the version, creates the matching unprefixed
tag, and publishes a GitHub release with generated notes. No manual version or release command is
required, and pull requests must leave version metadata unchanged. Make the `pr-title` job a
required status check. Repository Actions also need write access to contents and permission to
update protected `main`. Merge one pull request at a time and wait for its release to finish before
merging the next so version jobs cannot race.

## Smoke test against Quartz

```bash
npm run check:quartz
```

This command clones Quartz's moving `v5` branch, installs quartz-tabsdown into a temporary site, builds it, and checks the emitted HTML. Quartz accepts only remote plugin sources, so the command tests a pushed ref rather than the working tree:

```bash
npm run check:quartz -- 'github:grafanaKibana/quartz-tabsdown#my-branch'
```

CI also runs the smoke test weekly to catch Quartz changes.

## Check Obsidian parity

```bash
npm run check:upstream -- <40-character-obsidian-pr-head-sha>
```

`src/parser.ts` and `test/parser.test.ts` are vendored from [obsidian-tabsdown](https://github.com/grafanaKibana/obsidian-tabsdown). The same machine-readable contract drives style validation.

The check builds the package, fetches the requested upstream commit, and reports:

- parser files that no longer match;
- added, removed, or renamed Style Settings controls;
- changed types, defaults, enum values, ranges, steps, or units;
- numeric, color, or toggle controls without a plugin-owned CSS rule.

Push and pull-request CI pin the exact Obsidian implementation SHA. Running `npm run check:upstream` without one resolves `main` for the weekly drift check.
