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
      underlineThickness: 2,
      gap: 4,
      radius: 4,
      horizontalPadding: 36,
      contentSpacing: 12,
      sideWidth: 192,
      iconSize: 16,
      iconSpacing: 6,
      selectedFontWeight: "theme-default",
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
        accent: "oklch(62% 0.2 250)",
        themeButtonOutline: true,
        sideWidth: 240,
        positions: {
          top: { personality: "underline", alignment: "center" },
          right: { palette: "secondary" },
        },
        motion: { speed: 320, disabled: true },
      },
    };
    const resolved = resolveTabsdownStyles(options);
    expect(resolved).toMatchObject({
      size: "compact",
      accent: "oklch(62% 0.2 250)",
      themeButtonOutline: true,
      sideWidth: 240,
      gap: 4,
      motion: { speed: 320, disabled: true },
    });
    expect(resolved.positions.top).toEqual({
      personality: "underline",
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
  test("describes all 31 non-heading upstream controls exactly once", () => {
    expect(STYLE_SETTINGS_CONTRACT).toHaveLength(31);
    expect(new Set(STYLE_SETTINGS_CONTRACT.map(({ id }) => id))).toHaveLength(31);
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
        selectedFontWeight: "bold",
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
      "tabsdown-overflow-scroll",
      "tabsdown-palette-primary",
      "tabsdown-alignment-start",
      "tabsdown-selected-font-weight-bold",
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
});
