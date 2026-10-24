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

This command clones Quartz's moving `v5` branch, installs quartz-tabsdown into a temporary site, builds it, and checks the emitted HTML. This smoke test deliberately installs a pushed remote ref to exercise the real plugin installer:

```bash
npm run check:quartz -- 'github:grafanaKibana/quartz-tabsdown#my-branch'
```

The fixture in `test/fixtures/quartz-smoke.md` covers fenced and marker layouts, adjacent marker lines, both mixed nesting directions, nested markers, sibling layouts in list/quote containers, ordered-list continuation indentation, configuration, icons, and formatted labels. DOM assertions in `scripts/check-quartz-smoke.mjs` check panel-scoped wikilinks, highlights, callouts, document references, and container ownership. They also guard ordinary comment removal, literal markers inside ordinary and quoted code, and the absence of raw tabsdown fences, diagnostics, or internal marker comments.

The site uses Quartz's default OFM settings and plugin ordering. CI also runs the smoke test weekly to catch Quartz changes.

## Check Obsidian parity

```bash
npm run check:upstream -- <40-character-obsidian-pr-head-sha>
```

`src/syntax.ts`, `src/parser.ts`, `src/config.ts`, and their tests are adapted from [obsidian-tabsdown](https://github.com/grafanaKibana/obsidian-tabsdown). After formatting, parity applies two explicit patches in order: `scripts/upstream-keyed-config.patch` requires keyed configuration, then `scripts/upstream-renderer-only.patch` removes Obsidian's unused `configEdit` source-edit helper, its result type, syntax import, and tests. Configuration parsing and serialization remain shared. Patch conflicts or any other file differences fail the check. The same machine-readable contract drives style validation.

The check builds the package, fetches the requested upstream commit, and reports:

- syntax, parser, and configuration files that no longer match;
- added, removed, or renamed Style Settings controls;
- changed types, defaults, enum values, ranges, steps, or units;
- numeric, color, or toggle controls without a plugin-owned CSS rule.

Push and pull-request CI pin the exact 40-character Obsidian implementation SHA in `.github/workflows/ci.yml`. Update that pin, the shared syntax/parser/config files and tests, parity scope, and both adaptation patches together; keep each patch limited to its documented purpose. Running `npm run check:upstream` without one resolves `main` for the weekly drift check.
