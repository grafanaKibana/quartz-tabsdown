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

Tabsdown declares `order: 10` so it runs before Obsidian Flavored Markdown. Keep that order. Its `textTransform` protects structural `%% … %%` controls before OFM's parser tokenizes comments. Tabsdown then consumes the protected controls and transforms layouts before OFM's Markdown transforms run. Ordinary Obsidian comments still disappear normally.

Marker panels retain the document's parsed Markdown, including reference definitions. Fenced panel bodies are parsed recursively. Later transformers process wikilinks, highlights, callouts, and references inside both formats.

Parser protection keeps structural markers out of OFM's comment tokenization. The early Markdown transform order serves a separate purpose: raising Tabsdown's order above Obsidian Flavored Markdown leaves fenced panel features partly processed. Wikilinks can become dead links and callouts plain blockquotes.
