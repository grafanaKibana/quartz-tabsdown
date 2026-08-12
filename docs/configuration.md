# Plugin configuration

The installer adds quartz-tabsdown to `quartz.config.yaml`. Appearance options are optional and belong under `options.styles`:

```yaml
plugins:
  - source: github:grafanaKibana/quartz-tabsdown
    enabled: true
    options:
      styles:
        personality: underline
        gap: 8
```

To register it directly in `quartz.ts`:

```typescript
import { Tabsdown } from "quartz-tabsdown";

transformers: [Tabsdown({ styles: { personality: "underline", gap: 8 } })];
```

Omit `styles`, or pass `styles: {}`, to use the defaults shared with Obsidian Tabsdown. Invalid keys, enum values, colors, ranges, and slider steps stop the build and report the complete configuration path.

## Transformer order

Tabsdown declares `order: 10` so it runs before Obsidian Flavored Markdown. Keep that order. Tabsdown first turns each tab body into a Markdown tree; later transformers can then process wikilinks, highlights, and callouts normally.

Raising Tabsdown's order above Obsidian Flavored Markdown leaves those features partly processed. Wikilinks can become dead links and callouts plain blockquotes.
