<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/grafanaKibana/quartz-tabsdown/HEAD/docs/assets/product-captures/hero-dark.png">
  <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/grafanaKibana/quartz-tabsdown/HEAD/docs/assets/product-captures/hero.png">
  <img src="https://raw.githubusercontent.com/grafanaKibana/quartz-tabsdown/HEAD/docs/assets/product-captures/hero.png" alt="Product overview">
</picture>

<p align="center">
quartz-tabsdown renders <a href="https://github.com/grafanaKibana/obsidian-tabsdown">Tabsdown</a> Markdown as theme-native tabs in <a href="https://quartz.jzhao.xyz/">Quartz</a>. The same marker layouts and fenced blocks work in Obsidian and on the published site.
</p>

<p align="center">
<a href="https://github.com/grafanaKibana/quartz-tabsdown/blob/main/docs/configuration.md"><picture><source media="(prefers-color-scheme: dark)" srcset="https://shieldcn.dev/badge/Quartz-%E2%89%A55.svg?variant=outline&amp;size=sm&amp;font=geist&amp;mode=dark&amp;logo=ri%3ALuGem&amp;color=a079ff&amp;logoColor=a079ff&amp;valueColor=fafafa&amp;labelTextColor=fafafa&amp;gradient=18181b%2C18181b%2C90"><img alt="Quartz 5 or later" src="https://shieldcn.dev/badge/Quartz-%E2%89%A55.svg?variant=outline&amp;size=sm&amp;font=geist&amp;mode=light&amp;logo=ri%3ALuGem&amp;color=7c3aed&amp;logoColor=7c3aed&amp;valueColor=18181b&amp;labelTextColor=18181b&amp;gradient=fafafa%2Cfafafa%2C90" style="display:inline-block;margin:0;vertical-align:middle"></picture></a>
<a href="https://github.com/grafanaKibana/quartz-tabsdown/releases/latest"><picture><source media="(prefers-color-scheme: dark)" srcset="https://shieldcn.dev/github/release/grafanaKibana/quartz-tabsdown/stable.svg?variant=outline&amp;size=sm&amp;font=geist&amp;mode=dark&amp;label=Version&amp;gradient=18181b%2C18181b%2C90&amp;labelTextColor=fafafa"><img alt="Latest version" src="https://shieldcn.dev/github/release/grafanaKibana/quartz-tabsdown/stable.svg?variant=outline&amp;size=sm&amp;font=geist&amp;mode=light&amp;label=Version&amp;gradient=fafafa%2Cfafafa%2C90&amp;labelTextColor=18181b" style="display:inline-block;margin:0;vertical-align:middle"></picture></a>
<a href="https://github.com/grafanaKibana/quartz-tabsdown/actions/workflows/ci.yml"><picture><source media="(prefers-color-scheme: dark)" srcset="https://shieldcn.dev/github/ci/grafanaKibana/quartz-tabsdown.svg?variant=outline&amp;size=sm&amp;font=geist&amp;mode=dark&amp;label=CI&amp;workflow=ci.yml&amp;branch=main&amp;statusDot=true&amp;gradient=18181b%2C18181b%2C90&amp;labelTextColor=fafafa"><img alt="CI status" src="https://shieldcn.dev/github/ci/grafanaKibana/quartz-tabsdown.svg?variant=outline&amp;size=sm&amp;font=geist&amp;mode=light&amp;label=CI&amp;workflow=ci.yml&amp;branch=main&amp;statusDot=true&amp;gradient=fafafa%2Cfafafa%2C90&amp;labelTextColor=18181b" style="display:inline-block;margin:0;vertical-align:middle"></picture></a>
<a href="https://github.com/grafanaKibana/quartz-tabsdown/issues"><picture><source media="(prefers-color-scheme: dark)" srcset="https://shieldcn.dev/badge/Report_an_issue.svg?variant=outline&amp;size=sm&amp;font=geist&amp;mode=dark&amp;logo=ri%3ALuBug&amp;gradient=18181b%2C18181b%2C90&amp;logoColor=fafafa&amp;labelTextColor=fafafa"><img alt="Report an issue" src="https://shieldcn.dev/badge/Report_an_issue.svg?variant=outline&amp;size=sm&amp;font=geist&amp;mode=light&amp;logo=ri%3ALuBug&amp;gradient=fafafa%2Cfafafa%2C90&amp;logoColor=18181b&amp;labelTextColor=18181b" style="display:inline-block;margin:0;vertical-align:middle"></picture></a>
<a href="docs/development.md"><picture><source media="(prefers-color-scheme: dark)" srcset="https://shieldcn.dev/badge/Contributing.svg?variant=outline&amp;size=sm&amp;font=geist&amp;mode=dark&amp;logo=ri%3ALuGitPullRequest&amp;gradient=18181b%2C18181b%2C90&amp;logoColor=fafafa&amp;labelTextColor=fafafa"><img alt="Contributing" src="https://shieldcn.dev/badge/Contributing.svg?variant=outline&amp;size=sm&amp;font=geist&amp;mode=light&amp;logo=ri%3ALuGitPullRequest&amp;gradient=fafafa%2Cfafafa%2C90&amp;logoColor=18181b&amp;labelTextColor=18181b" style="display:inline-block;margin:0;vertical-align:middle"></picture></a>
<a href="LICENSE"><picture><source media="(prefers-color-scheme: dark)" srcset="https://shieldcn.dev/badge/License.svg?variant=outline&amp;size=sm&amp;font=geist&amp;mode=dark&amp;logo=ri%3ALuScale&amp;gradient=18181b%2C18181b%2C90&amp;logoColor=fafafa&amp;labelTextColor=fafafa"><img alt="License" src="https://shieldcn.dev/badge/License.svg?variant=outline&amp;size=sm&amp;font=geist&amp;mode=light&amp;logo=ri%3ALuScale&amp;gradient=fafafa%2Cfafafa%2C90&amp;logoColor=18181b&amp;labelTextColor=18181b" style="display:inline-block;margin:0;vertical-align:middle"></picture></a>
</p>

## Get started

Use Quartz 5 or later with Node 22+ and npm 10.9.2+. Run the installer from your Quartz site:

```bash
npx quartz plugin add github:grafanaKibana/quartz-tabsdown
```

## Configuration

Check the entry in `quartz.config.yaml`:

```yaml
plugins:
  - source: github:grafanaKibana/quartz-tabsdown
    enabled: true
```

The [configuration guide](docs/configuration.md) also covers direct registration in `quartz.ts`. Keep the default transformer order: Tabsdown must run before Obsidian Flavored Markdown so marker controls survive comment processing and panel content receives the later Markdown transforms.

## Add your first layout

Put this in a content note and build the site:

```markdown
%% tabs %%
%% config: position=top, layout=multi %%

%% tab: icon:book **Overview** %%

Explain the idea with ordinary Markdown.

%% tab: icon:code Example %%

Add an example, link, or callout here.

%% endtabs %%
```

Use at least two non-empty, unique labels. Configuration belongs before the first tab and always uses `key=value`; repeated keys are errors. `position=top|bottom|left|right` places the list, while `layout=one` scrolls labels on one line and `layout=multi` lets them wrap.

Labels accept bold, italic, strikethrough, and inline code. A leading `icon:<name>` selects a bundled Lucide icon; unknown names render without an icon. Other label constructs, including links and HTML, remain literal text.

## Source formats

For a fenced layout, use a `tabsdown` fence with column-zero `tab: <label>` lines. If a panel contains code fences, make the outer fence longer than any matching inner fence. Marker layouts also work inside Markdown lists and blockquotes using their normal container prefixes.

Both formats support nesting, including a marker layout inside a fenced panel or the reverse. Each marker layout needs its own matching `%% endtabs %%`. Nested blocks default to the secondary palette; an explicit block palette overrides that default.

### Without JavaScript

Quartz emits every panel with its label in source order. JavaScript adds tab behavior and hides inactive panels only after it loads. Without JavaScript, all content stays readable.

Missing closing markers, invalid settings, or invalid labels produce diagnostics with the original source and location. If wikilinks or callouts render incorrectly, first check transformer order in the configuration guide.

## Guides

- [Plugin configuration](docs/configuration.md) — YAML, direct `quartz.ts` registration, and transformer order.
- [Appearance](docs/style-options.md) — global styles, position overrides, and theme behavior.
- [Custom component panels](docs/mounting-panels.md) — the optional browser API.
- [Development and verification](docs/development.md) — checks, Quartz smoke testing, and Obsidian parity.
