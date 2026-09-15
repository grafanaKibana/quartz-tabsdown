# quartz-tabsdown

## Unreleased

- Add theme-following and custom tab radii while treating existing numeric-only radius configurations as Custom. Button and Rail use matching outer and inner geometry; Underline and Separator remain square.
- Pin parity checks to the Obsidian 1.5.0 release PR commit `20b3da41426a90950a4719274a1117d0059a6f1a`.

## 0.4.0

- Align the parser and configuration helpers with Obsidian Tabsdown, including keyed block settings, nested fence handling, and their upstream regression tests. Remove bare position and layout syntax: migrate `config: top, multi` to `config: position=top, layout=multi`.
- Apply block density, personality, palette, and alignment ahead of site-wide and position-specific styles without affecting nested or sibling blocks.
- Match Obsidian defaults: Rail personality, equal-width alignment, flat nested blocks, and Underline personality for left and right tabs. Explicit style options remain available for the previous appearance.
- Apply the complete secondary palette to nested blocks so Rail selection keeps matching foreground and background colors.
- Pin push and pull-request parity checks to Obsidian commit `726ac26b0c1bcdf195eb0d6dfa13a49826c197eb` and include the shared configuration module and tests in drift detection.

## 0.2.0

- Add typed, validated `options.styles` configuration with full Obsidian Style Settings parity, including global variants, position overrides, nested styling, motion controls, and mounted-tab support while retaining Quartz theme colors.
- Add bounded formatted labels, Separator and Rail personalities, position-aware underlines, stable selected-label sizing, and aligned equal-width wrapping.

## 0.1.0

- Initial release: `tabsdown` fenced blocks render as tabs in Quartz, with `config:` markers, Lucide icon labels, nested blocks, diagnostics for malformed source, and a no-JavaScript fallback.
