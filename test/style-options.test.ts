// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { compileString } from "sass";
import { describe, expect, test } from "vitest";
import {
  resolveTabsdownStyles,
  STYLE_SETTINGS_CONTRACT,
  tabsdownStyleClasses,
  tabsdownStyleVariables,
  type TabsdownOptions,
} from "../src/style-options";

function optionsAt(path: string, value: unknown): TabsdownOptions {
  const options: Record<string, unknown> = { styles: {} };
  const parts = ["styles", ...path.split(".")];
  let current = options;
  parts.forEach((part, index) => {
    if (index === parts.length - 1) {
      current[part] = value;
    } else {
      current = (current[part] ??= {}) as Record<string, unknown>;
    }
  });
  return options as TabsdownOptions;
}

function valueAt(value: unknown, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>((current, part) => (current as Record<string, unknown>)[part], value);
}

describe("resolveTabsdownStyles", () => {
  test("resolves omitted and empty styles to all upstream defaults", () => {
    const defaults = resolveTabsdownStyles();
    expect(resolveTabsdownStyles({})).toEqual(defaults);
    expect(resolveTabsdownStyles({ styles: {} })).toEqual(defaults);
    expect(defaults).toEqual({
      size: "default",
      personality: "default",
      overflow: "scroll",
      palette: "primary",
      accent: null,
      alignment: "start",
      themeButtonOutline: false,
      underlinePlacement: "auto",
      underlineThickness: 2,
      gap: 4,
      radius: 4,
      horizontalPadding: 36,
      contentSpacing: 12,
      sideWidth: 192,
      iconSize: 16,
      iconSpacing: 6,
      selectedFontWeight: "default",
      nestedStyle: "card",
      positions: {
        top: { personality: "inherit", palette: "inherit", alignment: "inherit" },
        bottom: { personality: "inherit", palette: "inherit", alignment: "inherit" },
        left: { personality: "inherit", palette: "inherit", alignment: "inherit" },
        right: { personality: "inherit", palette: "inherit", alignment: "inherit" },
      },
      motion: { speed: 160, disabled: false },
    });
  });

  test("resolves flat partial globals, position overrides, motion, and null accent", () => {
    const options: TabsdownOptions = {
      styles: {
        size: "compact",
        personality: "rail",
        underlinePlacement: "left",
        accent: "oklch(62% 0.2 250)",
        themeButtonOutline: true,
        sideWidth: 240,
        positions: {
          top: { personality: "separator", alignment: "center" },
          right: { palette: "secondary" },
        },
        motion: { speed: 320, disabled: true },
      },
    };
    const resolved = resolveTabsdownStyles(options);
    expect(resolved).toMatchObject({
      size: "compact",
      personality: "rail",
      underlinePlacement: "left",
      accent: "oklch(62% 0.2 250)",
      themeButtonOutline: true,
      sideWidth: 240,
      gap: 4,
      motion: { speed: 320, disabled: true },
    });
    expect(resolved.positions.top).toEqual({
      personality: "separator",
      palette: "inherit",
      alignment: "center",
    });
    expect(resolveTabsdownStyles({ styles: { accent: null } }).accent).toBeNull();
    expect(options.styles?.size).toBe("compact");
  });

  test.each([
    [{ typo: true }, "options.typo"],
    [{ styles: { globals: {} } }, "options.styles.globals"],
    [{ styles: { disabled: true } }, "options.styles.disabled"],
    [{ styles: { positions: { center: {} } } }, "options.styles.positions.center"],
    [
      { styles: { positions: { top: { overflow: "wrap" } } } },
      "options.styles.positions.top.overflow",
    ],
    [{ styles: { motion: { size: "compact" } } }, "options.styles.motion.size"],
  ])("rejects unknown or misplaced keys at their exact path", (options, path) => {
    expect(() => resolveTabsdownStyles(options as TabsdownOptions)).toThrow(path);
  });

  test.each([
    [{ styles: { size: "tiny" } }, "options.styles.size"],
    [{ styles: { underlinePlacement: "center" } }, "options.styles.underlinePlacement"],
    [
      { styles: { positions: { left: { personality: "default" } } } },
      "options.styles.positions.left.personality",
    ],
    [{ styles: { themeButtonOutline: "yes" } }, "options.styles.themeButtonOutline"],
    [{ styles: { motion: { disabled: 1 } } }, "options.styles.motion.disabled"],
    [{ styles: { sideWidth: 191 } }, "options.styles.sideWidth"],
    [{ styles: { sideWidth: 196 } }, "options.styles.sideWidth"],
    [{ styles: { underlineThickness: 8.5 } }, "options.styles.underlineThickness"],
    [{ styles: { motion: { speed: 30 } } }, "options.styles.motion.speed"],
    [{ styles: { motion: { speed: Number.NaN } } }, "options.styles.motion.speed"],
  ])("rejects invalid values at their exact path", (options, path) => {
    expect(() => resolveTabsdownStyles(options as TabsdownOptions)).toThrow(path);
  });

  test.each([
    "red; color: blue",
    "url(https://example.test/x)",
    "not-a-color",
    "#12",
    "rgb(nope)",
    "rgb(1)",
    "rgb(1 2 3 4)",
    "red\nblue",
    "rgb(1deg 2deg 3deg)",
    "hsl(120deg 30deg 40%)",
    "hsl(120, 30%, 40%, 0.5deg)",
    "oklch(62% 0.2deg 250)",
    "lab(50% 20deg 30)",
  ])("rejects malformed or injection-like color %s", (accent) => {
    expect(() => resolveTabsdownStyles({ styles: { accent } })).toThrow("options.styles.accent");
  });

  test.each([
    "#09f",
    "#0099ffaa",
    "rebeccapurple",
    "rgb(10 20 30 / 50%)",
    "hsl(120 30% 40%)",
    "hsl(120deg, 30%, 40%)",
    "hwb(0.5turn 10% 20%)",
    "oklch(62% 0.2 250deg)",
  ])("accepts safe CSS color %s", (accent) =>
    expect(resolveTabsdownStyles({ styles: { accent } }).accent).toBe(accent),
  );
});

describe("style settings contract and output helpers", () => {
  test("describes all 32 non-heading upstream controls exactly once", () => {
    expect(STYLE_SETTINGS_CONTRACT).toHaveLength(32);
    expect(new Set(STYLE_SETTINGS_CONTRACT.map(({ id }) => id))).toHaveLength(32);
    expect(STYLE_SETTINGS_CONTRACT).toContainEqual({
      path: "underlinePlacement",
      id: "tabsdown-underline-placement",
      type: "class-select",
      default: "tabsdown-underline-placement-auto",
      enums: [
        "tabsdown-underline-placement-auto",
        "tabsdown-underline-placement-top",
        "tabsdown-underline-placement-right",
        "tabsdown-underline-placement-bottom",
        "tabsdown-underline-placement-left",
      ],
    });
    expect(STYLE_SETTINGS_CONTRACT).toContainEqual({
      path: "motion.speed",
      id: "tabsdown-animation-speed",
      type: "variable-number-slider",
      default: 160,
      min: 0,
      max: 500,
      step: 20,
      unit: "ms",
    });
  });

  test("keeps every mapped upstream default wired to the resolver", () => {
    const resolved = resolveTabsdownStyles();

    for (const setting of STYLE_SETTINGS_CONTRACT) {
      const expected =
        setting.type === "class-select"
          ? setting.default.slice(`${setting.id}-`.length)
          : setting.default;
      expect(valueAt(resolved, setting.path), setting.path).toBe(expected);
    }
  });

  test("emits every enum variant, with inherit represented by no local override", () => {
    for (const setting of STYLE_SETTINGS_CONTRACT) {
      if (setting.type !== "class-select") continue;

      for (const className of setting.enums) {
        const value = className.slice(`${setting.id}-`.length);
        const classes = tabsdownStyleClasses(resolveTabsdownStyles(optionsAt(setting.path, value)));
        if (value === "inherit") {
          expect(classes, `${setting.path}=${value}`).not.toContain(className);
        } else {
          expect(classes, `${setting.path}=${value}`).toContain(className);
        }
      }
    }
  });

  test("serializes every numeric setting with its upstream unit", () => {
    for (const setting of STYLE_SETTINGS_CONTRACT) {
      if (setting.type !== "variable-number-slider") continue;

      const css = tabsdownStyleVariables(
        resolveTabsdownStyles(optionsAt(setting.path, setting.max)),
      );
      expect(css, setting.path).toContain(`--${setting.id}: ${setting.max}${setting.unit};`);
    }
  });

  test("returns global classes and only non-inherit position modifiers", () => {
    const resolved = resolveTabsdownStyles({
      styles: {
        size: "compact",
        themeButtonOutline: true,
        selectedFontWeight: "bolder",
        positions: {
          top: { personality: "underline", palette: "secondary" },
          left: { alignment: "equal-width" },
        },
        motion: { disabled: true },
      },
    });
    expect(tabsdownStyleClasses(resolved)).toEqual([
      "tabsdown-density-compact",
      "tabsdown-personality-default",
      "tabsdown-underline-placement-auto",
      "tabsdown-overflow-scroll",
      "tabsdown-palette-primary",
      "tabsdown-alignment-start",
      "tabsdown-selected-font-weight-bolder",
      "tabsdown-nested-style-card",
      "tabsdown-theme-button-outline",
      "tabsdown-animations-disabled",
      "tabsdown-top-personality-underline",
      "tabsdown-top-palette-secondary",
      "tabsdown-left-alignment-equal-width",
    ]);
  });

  test("returns a root rule containing every numeric value and optional accent", () => {
    const css = tabsdownStyleVariables(
      resolveTabsdownStyles({
        styles: { accent: "#09f", gap: 12, sideWidth: 240, motion: { speed: 0 } },
      }),
    );
    expect(css).toContain("--tabsdown-accent-override: #09f;");
    expect(css).toContain("--tabsdown-gap: 12px;");
    expect(css).toContain("--tabsdown-side-width: 240px;");
    expect(css).toContain("--tabsdown-animation-speed: 0ms;");
    expect(tabsdownStyleVariables(resolveTabsdownStyles())).not.toContain("accent-override");
  });

  test("keeps every personality reset complete and position-aware", () => {
    const styles = readFileSync("src/styles/tabsdown.scss", "utf8");
    for (const personality of ["button", "underline", "separator", "rail"]) {
      const mixin = new RegExp(`@mixin ${personality}-personality \\{([\\s\\S]*?)\\n\\}`).exec(
        styles,
      )?.[1];
      expect(mixin, personality).toBeDefined();
      for (const property of [
        "--tabsdown-separator-width",
        "--tabsdown-button-border-top-width",
        "--tabsdown-button-border-right-width",
        "--tabsdown-button-border-bottom-width",
        "--tabsdown-button-border-left-width",
        "--tabsdown-button-background",
        "--tabsdown-button-selected-background",
        "--tabsdown-tablist-background",
      ]) {
        expect(mixin, `${personality}: ${property}`).toContain(property);
      }
      expect(styles).toContain(`tabsdown-#{$position}-personality-${personality}`);
    }
    expect(styles).toContain(".tabsdown--left.tabsdown-underline-placement-auto");
    expect(styles).toContain(".tabsdown--right.tabsdown-underline-placement-auto");
    expect(styles).toContain(".tabsdown.tabsdown-underline-placement-top");
    expect(styles).toContain(".tabsdown.tabsdown-underline-placement-bottom");
    expect(styles).toContain('.tabsdown__separator[data-axis="inline"]');
    expect(styles).toContain("block-size: var(--tabsdown-separator-length, 80%)");
    expect(styles).toContain("inline-size: var(--tabsdown-separator-length, 80%)");
    expect(/@mixin underline-personality \{([\s\S]*?)\n\}/.exec(styles)?.[1]).toContain(
      "--tabsdown-button-selected-color: var(--tabsdown-tab-underline-color)",
    );
    expect(styles).toContain("@container (max-width: 28rem)");
    const containerStart = styles.indexOf("@container (max-width: 28rem)");
    const narrow = styles.slice(containerStart, styles.indexOf("@keyframes", containerStart));
    expect(narrow).toContain(".tabsdown--left > .tabsdown__tablist,");
    expect(narrow).toContain(".tabsdown--right > .tabsdown__tablist {");
    expect(narrow).not.toContain("\n  .tabsdown--left,\n  .tabsdown--right {");
  });

  test("lets every explicit position personality fully override every global personality", () => {
    const css = compileString(readFileSync("src/styles/tabsdown.scss", "utf8")).css;
    const personalities = ["default", "underline", "separator", "rail"] as const;
    const overrides = ["button", "underline", "separator", "rail"] as const;

    for (const global of personalities) {
      for (const position of ["top", "bottom", "left", "right"] as const) {
        for (const override of overrides) {
          const classes = tabsdownStyleClasses(
            resolveTabsdownStyles({
              styles: { personality: global, positions: { [position]: { personality: override } } },
            }),
          );
          const globalClass = `tabsdown-personality-${global}`;
          const positionClass = `tabsdown-${position}-personality-${override}`;
          const selector = `.tabsdown--${position}.${positionClass}`;
          const rule = new RegExp(
            `${selector.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")} \\{([\\s\\S]*?)\\n\\}`,
          ).exec(css)?.[1];

          expect(classes).toContain(globalClass);
          expect(classes).toContain(positionClass);
          expect(rule, `${global} -> ${positionClass}`).toContain(
            `--tabsdown-separator-width: ${override === "separator" ? "1px" : "0"}`,
          );
          expect(css.indexOf(`.tabsdown.tabsdown-personality-${global}`)).toBeLessThan(
            css.indexOf(selector),
          );
        }
      }
    }
  });

  test("keeps rail spacing compact and side tabs equal width", () => {
    const styles = readFileSync("src/styles/tabsdown.scss", "utf8");
    const rail = /@mixin rail-personality \{([\s\S]*?)\n\}/.exec(styles)?.[1];
    expect(rail).toContain("--tabsdown-tab-min-block-size: 36px");
    expect(rail).toContain("--tabsdown-tab-padding-block: 0.125rem");
    expect(rail).toContain("--tabsdown-tablist-padding: 0.375rem");
    expect(rail).toContain(
      "--tabsdown-button-selected-background: var(--tabsdown-rail-selected-background)",
    );
    expect(rail).toContain("--tabsdown-button-selected-color: var(--tabsdown-tab-selected-color)");
    expect(styles).toContain("inline-size: 100%");
    expect(styles).toContain("flex: 1 1 0");
  });

  test("keeps selected weight and wrapped equal-width geometry stable", () => {
    const styles = readFileSync("src/styles/tabsdown.scss", "utf8");
    const nested =
      /\.tabsdown--nested-odd\.tabsdown,\n\.tabsdown--nested-even\.tabsdown \{([\s\S]*?)\n\}/.exec(
        styles,
      )?.[1];
    expect(styles).toContain(".tabsdown__tab-reserve");
    expect(styles).toContain("font-weight: 700");
    expect(styles).toContain(".tabsdown__tab-reserve--icon");
    expect(styles).toContain("display: grid");
    expect(styles).toContain("minmax(min(100%, max(var(--tabsdown-tab-min-size), 12ch)), 1fr)");
    expect(styles).toContain("@media (any-pointer: coarse)");
    expect(nested).not.toContain("--tabsdown-tab-underline-color");
    expect(nested).not.toContain("--tabsdown-rail-selected-background");
  });

  test("normalizes legacy selected-weight values", () => {
    expect(
      resolveTabsdownStyles({
        styles: { selectedFontWeight: "theme-default" },
      } as unknown as TabsdownOptions).selectedFontWeight,
    ).toBe("default");
    expect(
      resolveTabsdownStyles({
        styles: { selectedFontWeight: "medium" },
      } as unknown as TabsdownOptions).selectedFontWeight,
    ).toBe("default");
    expect(
      resolveTabsdownStyles({
        styles: { selectedFontWeight: "bold" },
      } as unknown as TabsdownOptions).selectedFontWeight,
    ).toBe("bolder");
  });
});
