# Style options

Styles are injected inline and use Quartz theme variables in light and dark mode. Put appearance settings under `options.styles`:

```yaml
options:
  styles:
    personality: underline
    underlinePlacement: auto
    gap: 8
```

All keys are optional.

| Key                  | Accepted values                             | Default                |
| -------------------- | ------------------------------------------- | ---------------------- |
| `size`               | `compact`, `default`                        | `default`              |
| `personality`        | `default`, `underline`, `separator`, `rail` | `default`              |
| `overflow`           | `scroll`, `wrap`                            | `scroll`               |
| `palette`            | `primary`, `secondary`                      | `primary`              |
| `accent`             | CSS color or `null`                         | `null` (Quartz accent) |
| `alignment`          | `start`, `center`, `equal-width`            | `start`                |
| `themeButtonOutline` | boolean                                     | `false`                |
| `underlinePlacement` | `auto`, `top`, `right`, `bottom`, `left`    | `auto`                 |
| `underlineThickness` | `1`–`8` px                                  | `2`                    |
| `gap`                | `0`–`48` px                                 | `4`                    |
| `radius`             | `0`–`24` px                                 | `4`                    |
| `horizontalPadding`  | `0`–`48` px                                 | `36`                   |
| `contentSpacing`     | `0`–`48` px                                 | `12`                   |
| `sideWidth`          | `192`–`320` px, step `8`                    | `192`                  |
| `iconSize`           | `12`–`32` px                                | `16`                   |
| `iconSpacing`        | `0`–`16` px                                 | `6`                    |
| `selectedFontWeight` | `thinner`, `default`, `bolder`              | `default`              |
| `nestedStyle`        | `card`, `flat`                              | `card`                 |
| `motion.speed`       | `0`–`500` ms, step `20`                     | `160`                  |
| `motion.disabled`    | boolean                                     | `false`                |

Legacy `theme-default`, `medium`, and `bold` selected weights are normalized to `default`, `default`, and `bolder`.

## Position overrides

Each `positions.top`, `positions.bottom`, `positions.left`, and `positions.right` object accepts:

| Key           | Accepted values                                       | Default   |
| ------------- | ----------------------------------------------------- | --------- |
| `personality` | `inherit`, `button`, `underline`, `separator`, `rail` | `inherit` |
| `palette`     | `inherit`, `primary`, `secondary`                     | `inherit` |
| `alignment`   | `inherit`, `start`, `center`, `equal-width`           | `inherit` |

Position overrides apply only to authored fences in that position. The public `mountTabs` runtime uses global styles.

## Behavior notes

- A fence's `config: top|bottom|left|right, one|multi` marker still controls its position and overflow.
- `motion.disabled: true` disables motion regardless of speed. `prefers-reduced-motion` also disables it.
- Separator uses 80%-length dividers between controls on the same row or column. Rail keeps 44 px touch targets.
- Primary accents selected Separator text and the selected Rail segment. Secondary stays neutral, including in nested blocks.
- Equal width with Wrap aligns complete rows and expands the final row.
- Use Quartz `custom.scss` for one-off CSS. Supported variants should use `options.styles`.
