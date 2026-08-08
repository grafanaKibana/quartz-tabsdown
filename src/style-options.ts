export type TabsdownSize = "compact" | "default";
export type TabsdownPersonality = "default" | "underline" | "separator" | "rail";
export type TabsdownUnderlinePlacement = "auto" | "top" | "right" | "bottom" | "left";
export type TabsdownOverflow = "scroll" | "wrap";
export type TabsdownPalette = "primary" | "secondary";
export type TabsdownAlignment = "start" | "center" | "equal-width";
export type TabsdownSelectedFontWeight = "thinner" | "default" | "bolder";
export type TabsdownNestedStyle = "card" | "flat";
export type TabsdownPosition = "top" | "bottom" | "left" | "right";
export type TabsdownPositionPersonality = "inherit" | "button" | "underline" | "separator" | "rail";
export type TabsdownPositionPalette = "inherit" | TabsdownPalette;
export type TabsdownPositionAlignment = "inherit" | TabsdownAlignment;

export interface TabsdownGlobalStyleOptions {
  size?: TabsdownSize;
  personality?: TabsdownPersonality;
  overflow?: TabsdownOverflow;
  palette?: TabsdownPalette;
  accent?: string | null;
  alignment?: TabsdownAlignment;
  themeButtonOutline?: boolean;
  underlinePlacement?: TabsdownUnderlinePlacement;
  underlineThickness?: number;
  gap?: number;
  radius?: number;
  horizontalPadding?: number;
  contentSpacing?: number;
  sideWidth?: number;
  iconSize?: number;
  iconSpacing?: number;
  selectedFontWeight?: TabsdownSelectedFontWeight;
  nestedStyle?: TabsdownNestedStyle;
}

export interface TabsdownPositionStyleOptions {
  personality?: TabsdownPositionPersonality;
  palette?: TabsdownPositionPalette;
  alignment?: TabsdownPositionAlignment;
}

export interface TabsdownMotionStyleOptions {
  speed?: number;
  disabled?: boolean;
}

export interface TabsdownStyleOptions extends TabsdownGlobalStyleOptions {
  positions?: Partial<Record<TabsdownPosition, TabsdownPositionStyleOptions>>;
  motion?: TabsdownMotionStyleOptions;
}

export interface TabsdownOptions {
  styles?: TabsdownStyleOptions;
}

export type TabsdownStyleSettingContract =
  | {
      readonly path: string;
      readonly id: string;
      readonly type: "class-select";
      readonly default: string;
      readonly enums: readonly string[];
    }
  | {
      readonly path: string;
      readonly id: string;
      readonly type: "class-toggle";
      readonly default: boolean;
    }
  | {
      readonly path: string;
      readonly id: string;
      readonly type: "variable-color";
      readonly default: null;
    }
  | {
      readonly path: string;
      readonly id: string;
      readonly type: "variable-number-slider";
      readonly default: number;
      readonly min: number;
      readonly max: number;
      readonly step: number;
      readonly unit: "px" | "ms";
    };

/** The single machine-readable mapping for all non-heading upstream Style Settings controls. */
export const STYLE_SETTINGS_CONTRACT = [
  {
    path: "size",
    id: "tabsdown-density",
    type: "class-select",
    default: "tabsdown-density-default",
    enums: ["tabsdown-density-compact", "tabsdown-density-default"],
  },
  {
    path: "personality",
    id: "tabsdown-personality",
    type: "class-select",
    default: "tabsdown-personality-default",
    enums: [
      "tabsdown-personality-default",
      "tabsdown-personality-underline",
      "tabsdown-personality-separator",
      "tabsdown-personality-rail",
    ],
  },
  {
    path: "overflow",
    id: "tabsdown-overflow",
    type: "class-select",
    default: "tabsdown-overflow-scroll",
    enums: ["tabsdown-overflow-scroll", "tabsdown-overflow-wrap"],
  },
  {
    path: "palette",
    id: "tabsdown-palette",
    type: "class-select",
    default: "tabsdown-palette-primary",
    enums: ["tabsdown-palette-primary", "tabsdown-palette-secondary"],
  },
  { path: "accent", id: "tabsdown-accent-override", type: "variable-color", default: null },
  {
    path: "alignment",
    id: "tabsdown-alignment",
    type: "class-select",
    default: "tabsdown-alignment-start",
    enums: [
      "tabsdown-alignment-start",
      "tabsdown-alignment-center",
      "tabsdown-alignment-equal-width",
    ],
  },
  {
    path: "themeButtonOutline",
    id: "tabsdown-theme-button-outline",
    type: "class-toggle",
    default: false,
  },
  {
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
  },
  {
    path: "underlineThickness",
    id: "tabsdown-underline-thickness",
    type: "variable-number-slider",
    default: 2,
    min: 1,
    max: 8,
    step: 1,
    unit: "px",
  },
  {
    path: "gap",
    id: "tabsdown-gap",
    type: "variable-number-slider",
    default: 4,
    min: 0,
    max: 48,
    step: 1,
    unit: "px",
  },
  {
    path: "radius",
    id: "tabsdown-radius",
    type: "variable-number-slider",
    default: 4,
    min: 0,
    max: 24,
    step: 1,
    unit: "px",
  },
  {
    path: "horizontalPadding",
    id: "tabsdown-horizontal-padding",
    type: "variable-number-slider",
    default: 36,
    min: 0,
    max: 48,
    step: 1,
    unit: "px",
  },
  {
    path: "contentSpacing",
    id: "tabsdown-content-spacing",
    type: "variable-number-slider",
    default: 12,
    min: 0,
    max: 48,
    step: 1,
    unit: "px",
  },
  {
    path: "sideWidth",
    id: "tabsdown-side-width",
    type: "variable-number-slider",
    default: 192,
    min: 192,
    max: 320,
    step: 8,
    unit: "px",
  },
  {
    path: "iconSize",
    id: "tabsdown-icon-size",
    type: "variable-number-slider",
    default: 16,
    min: 12,
    max: 32,
    step: 1,
    unit: "px",
  },
  {
    path: "iconSpacing",
    id: "tabsdown-icon-spacing",
    type: "variable-number-slider",
    default: 6,
    min: 0,
    max: 16,
    step: 1,
    unit: "px",
  },
  {
    path: "selectedFontWeight",
    id: "tabsdown-selected-font-weight",
    type: "class-select",
    default: "tabsdown-selected-font-weight-default",
    enums: [
      "tabsdown-selected-font-weight-thinner",
      "tabsdown-selected-font-weight-default",
      "tabsdown-selected-font-weight-bolder",
    ],
  },
  {
    path: "nestedStyle",
    id: "tabsdown-nested-style",
    type: "class-select",
    default: "tabsdown-nested-style-card",
    enums: ["tabsdown-nested-style-card", "tabsdown-nested-style-flat"],
  },
  ...(["top", "bottom", "left", "right"] as const).flatMap((position) => [
    {
      path: `positions.${position}.personality`,
      id: `tabsdown-${position}-personality`,
      type: "class-select" as const,
      default: `tabsdown-${position}-personality-inherit`,
      enums: [
        `tabsdown-${position}-personality-inherit`,
        `tabsdown-${position}-personality-button`,
        `tabsdown-${position}-personality-underline`,
        `tabsdown-${position}-personality-separator`,
        `tabsdown-${position}-personality-rail`,
      ],
    },
    {
      path: `positions.${position}.palette`,
      id: `tabsdown-${position}-palette`,
      type: "class-select" as const,
      default: `tabsdown-${position}-palette-inherit`,
      enums: [
        `tabsdown-${position}-palette-inherit`,
        `tabsdown-${position}-palette-primary`,
        `tabsdown-${position}-palette-secondary`,
      ],
    },
    {
      path: `positions.${position}.alignment`,
      id: `tabsdown-${position}-alignment`,
      type: "class-select" as const,
      default: `tabsdown-${position}-alignment-inherit`,
      enums: [
        `tabsdown-${position}-alignment-inherit`,
        `tabsdown-${position}-alignment-start`,
        `tabsdown-${position}-alignment-center`,
        `tabsdown-${position}-alignment-equal-width`,
      ],
    },
  ]),
  {
    path: "motion.speed",
    id: "tabsdown-animation-speed",
    type: "variable-number-slider",
    default: 160,
    min: 0,
    max: 500,
    step: 20,
    unit: "ms",
  },
  {
    path: "motion.disabled",
    id: "tabsdown-animations-disabled",
    type: "class-toggle",
    default: false,
  },
] as const satisfies readonly TabsdownStyleSettingContract[];

export interface ResolvedTabsdownGlobalStyles {
  size: TabsdownSize;
  personality: TabsdownPersonality;
  overflow: TabsdownOverflow;
  palette: TabsdownPalette;
  accent: string | null;
  alignment: TabsdownAlignment;
  themeButtonOutline: boolean;
  underlinePlacement: TabsdownUnderlinePlacement;
  underlineThickness: number;
  gap: number;
  radius: number;
  horizontalPadding: number;
  contentSpacing: number;
  sideWidth: number;
  iconSize: number;
  iconSpacing: number;
  selectedFontWeight: TabsdownSelectedFontWeight;
  nestedStyle: TabsdownNestedStyle;
}

export interface ResolvedTabsdownPositionStyles {
  personality: TabsdownPositionPersonality;
  palette: TabsdownPositionPalette;
  alignment: TabsdownPositionAlignment;
}

export interface ResolvedTabsdownMotionStyles {
  speed: number;
  disabled: boolean;
}

export interface ResolvedTabsdownStyles extends ResolvedTabsdownGlobalStyles {
  positions: Record<TabsdownPosition, ResolvedTabsdownPositionStyles>;
  motion: ResolvedTabsdownMotionStyles;
}

const GLOBAL_DEFAULTS: ResolvedTabsdownGlobalStyles = {
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
};

const POSITION_DEFAULTS: ResolvedTabsdownPositionStyles = {
  personality: "inherit",
  palette: "inherit",
  alignment: "inherit",
};

const MOTION_DEFAULTS: ResolvedTabsdownMotionStyles = {
  speed: 160,
  disabled: false,
};

type UnknownRecord = Record<string, unknown>;

function fail(path: string, reason: string): never {
  throw new TypeError(`Invalid Tabsdown option at ${path}: ${reason}`);
}

function objectAt(value: unknown, path: string): UnknownRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    fail(path, "expected an object");
  }
  return value as UnknownRecord;
}

function knownKeys(value: UnknownRecord, path: string, allowed: readonly string[]): void {
  const allowedKeys = new Set(allowed);
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) {
      fail(`${path}.${key}`, "unknown option");
    }
  }
}

function enumAt<T extends string>(value: unknown, path: string, allowed: readonly T[]): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    fail(path, `expected one of ${allowed.map((item) => JSON.stringify(item)).join(", ")}`);
  }
  return value as T;
}

function booleanAt(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") {
    fail(path, "expected a boolean");
  }
  return value;
}

function numberAt(
  value: unknown,
  path: string,
  { min, max, step }: { min: number; max: number; step: number },
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    fail(path, "expected a finite number");
  }
  if (value < min || value > max) {
    fail(path, `expected a number from ${min} to ${max}`);
  }
  const steps = (value - min) / step;
  if (Math.abs(steps - Math.round(steps)) > Number.EPSILON * 16) {
    fail(path, `expected a step of ${step} from ${min}`);
  }
  return value;
}

const CSS_NAMED_COLORS = new Set(
  (
    "aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue " +
    "blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk " +
    "crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki " +
    "darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen " +
    "darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue " +
    "dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite " +
    "gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki " +
    "lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan " +
    "lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen " +
    "lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen " +
    "magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen " +
    "mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream " +
    "mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid " +
    "palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum " +
    "powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown " +
    "seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen " +
    "steelblue tan teal thistle tomato transparent turquoise violet wheat white whitesmoke yellow " +
    "yellowgreen currentcolor"
  ).split(" "),
);

const HUE_COMPONENT_INDEX: Record<string, number> = { hsl: 0, hsla: 0, hwb: 0, lch: 2, oklch: 2 };

function cssColorAt(value: unknown, path: string): string {
  if (typeof value !== "string") {
    fail(path, "expected a CSS color string");
  }

  const color = value.trim();
  if (color !== value || color.includes("\\") || /[;{}@\n\r]|\/\*/.test(color)) {
    fail(path, "expected a safe CSS color");
  }

  const hex = /^#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i;
  const numeric = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)%?$/;
  const angular = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:deg|grad|rad|turn)$/i;
  const functional = /^(rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch)\((.*)\)$/i.exec(color);
  let validFunction = false;

  if (functional) {
    const name = functional[1]?.toLowerCase() ?? "";
    const body = functional[2]?.trim() ?? "";
    const hueIndex = HUE_COMPONENT_INDEX[name] ?? -1;
    const validComponent = (component: string, index: number) =>
      numeric.test(component) || (index === hueIndex && angular.test(component));

    if (body.includes(",")) {
      const components = body.split(",").map((component) => component.trim());
      validFunction =
        (name === "rgb" || name === "rgba" || name === "hsl" || name === "hsla") &&
        (components.length === 3 || components.length === 4) &&
        components.every(validComponent);
    } else {
      const slashParts = body.split("/").map((part) => part.trim());
      const components = slashParts[0]?.split(/\s+/) ?? [];
      const alpha = slashParts[1];
      validFunction =
        slashParts.length <= 2 &&
        components.length === 3 &&
        components.every(validComponent) &&
        (alpha === undefined || numeric.test(alpha));
    }
  }

  const colorFunction =
    /^color\(\s*(?:srgb|srgb-linear|display-p3|a98-rgb|prophoto-rgb|rec2020|xyz|xyz-d50|xyz-d65)\s+[+\-\d.%]+\s+[+\-\d.%]+\s+[+\-\d.%]+(?:\s*\/\s*[+\-\d.%]+)?\s*\)$/i;

  if (
    !hex.test(color) &&
    !CSS_NAMED_COLORS.has(color.toLowerCase()) &&
    !validFunction &&
    !colorFunction.test(color)
  ) {
    fail(path, "expected a valid CSS color");
  }
  return color;
}

const globalKeys = [
  "size",
  "personality",
  "overflow",
  "palette",
  "accent",
  "alignment",
  "themeButtonOutline",
  "underlinePlacement",
  "underlineThickness",
  "gap",
  "radius",
  "horizontalPadding",
  "contentSpacing",
  "sideWidth",
  "iconSize",
  "iconSpacing",
  "selectedFontWeight",
  "nestedStyle",
] as const;

function resolveGlobals(value: unknown, path: string): ResolvedTabsdownGlobalStyles {
  const input = objectAt(value, path);
  knownKeys(input, path, globalKeys);
  const result: ResolvedTabsdownGlobalStyles = { ...GLOBAL_DEFAULTS };

  if (input.size !== undefined)
    result.size = enumAt(input.size, `${path}.size`, ["compact", "default"]);
  if (input.personality !== undefined)
    result.personality = enumAt(input.personality, `${path}.personality`, [
      "default",
      "underline",
      "separator",
      "rail",
    ]);
  if (input.overflow !== undefined)
    result.overflow = enumAt(input.overflow, `${path}.overflow`, ["scroll", "wrap"]);
  if (input.palette !== undefined)
    result.palette = enumAt(input.palette, `${path}.palette`, ["primary", "secondary"]);
  if (input.accent !== undefined)
    result.accent = input.accent === null ? null : cssColorAt(input.accent, `${path}.accent`);
  if (input.alignment !== undefined)
    result.alignment = enumAt(input.alignment, `${path}.alignment`, [
      "start",
      "center",
      "equal-width",
    ]);
  if (input.themeButtonOutline !== undefined)
    result.themeButtonOutline = booleanAt(input.themeButtonOutline, `${path}.themeButtonOutline`);
  if (input.underlinePlacement !== undefined)
    result.underlinePlacement = enumAt(input.underlinePlacement, `${path}.underlinePlacement`, [
      "auto",
      "top",
      "right",
      "bottom",
      "left",
    ]);
  if (input.underlineThickness !== undefined)
    result.underlineThickness = numberAt(input.underlineThickness, `${path}.underlineThickness`, {
      min: 1,
      max: 8,
      step: 1,
    });
  if (input.gap !== undefined)
    result.gap = numberAt(input.gap, `${path}.gap`, { min: 0, max: 48, step: 1 });
  if (input.radius !== undefined)
    result.radius = numberAt(input.radius, `${path}.radius`, { min: 0, max: 24, step: 1 });
  if (input.horizontalPadding !== undefined)
    result.horizontalPadding = numberAt(input.horizontalPadding, `${path}.horizontalPadding`, {
      min: 0,
      max: 48,
      step: 1,
    });
  if (input.contentSpacing !== undefined)
    result.contentSpacing = numberAt(input.contentSpacing, `${path}.contentSpacing`, {
      min: 0,
      max: 48,
      step: 1,
    });
  if (input.sideWidth !== undefined)
    result.sideWidth = numberAt(input.sideWidth, `${path}.sideWidth`, {
      min: 192,
      max: 320,
      step: 8,
    });
  if (input.iconSize !== undefined)
    result.iconSize = numberAt(input.iconSize, `${path}.iconSize`, { min: 12, max: 32, step: 1 });
  if (input.iconSpacing !== undefined)
    result.iconSpacing = numberAt(input.iconSpacing, `${path}.iconSpacing`, {
      min: 0,
      max: 16,
      step: 1,
    });
  if (input.selectedFontWeight !== undefined) {
    const legacy = { "theme-default": "default", medium: "default", bold: "bolder" } as const;
    const weight =
      typeof input.selectedFontWeight === "string" && input.selectedFontWeight in legacy
        ? legacy[input.selectedFontWeight as keyof typeof legacy]
        : input.selectedFontWeight;
    result.selectedFontWeight = enumAt(weight, `${path}.selectedFontWeight`, [
      "thinner",
      "default",
      "bolder",
    ]);
  }
  if (input.nestedStyle !== undefined)
    result.nestedStyle = enumAt(input.nestedStyle, `${path}.nestedStyle`, ["card", "flat"]);

  return result;
}

function resolvePosition(value: unknown, path: string): ResolvedTabsdownPositionStyles {
  const input = objectAt(value, path);
  knownKeys(input, path, ["personality", "palette", "alignment"]);
  return {
    personality:
      input.personality === undefined
        ? POSITION_DEFAULTS.personality
        : enumAt(input.personality, `${path}.personality`, [
            "inherit",
            "button",
            "underline",
            "separator",
            "rail",
          ]),
    palette:
      input.palette === undefined
        ? POSITION_DEFAULTS.palette
        : enumAt(input.palette, `${path}.palette`, ["inherit", "primary", "secondary"]),
    alignment:
      input.alignment === undefined
        ? POSITION_DEFAULTS.alignment
        : enumAt(input.alignment, `${path}.alignment`, [
            "inherit",
            "start",
            "center",
            "equal-width",
          ]),
  };
}

function resolveMotion(value: unknown, path: string): ResolvedTabsdownMotionStyles {
  const input = objectAt(value, path);
  knownKeys(input, path, ["speed", "disabled"]);
  return {
    speed:
      input.speed === undefined
        ? MOTION_DEFAULTS.speed
        : numberAt(input.speed, `${path}.speed`, { min: 0, max: 500, step: 20 }),
    disabled:
      input.disabled === undefined
        ? MOTION_DEFAULTS.disabled
        : booleanAt(input.disabled, `${path}.disabled`),
  };
}

/** Validates a partial plugin options object and fills every upstream Style Settings default. */
export function resolveTabsdownStyles(options: TabsdownOptions = {}): ResolvedTabsdownStyles {
  const root = objectAt(options, "options");
  knownKeys(root, "options", ["styles"]);
  const styles = root.styles === undefined ? {} : objectAt(root.styles, "options.styles");
  knownKeys(styles, "options.styles", [...globalKeys, "positions", "motion"]);

  const positions =
    styles.positions === undefined ? {} : objectAt(styles.positions, "options.styles.positions");
  knownKeys(positions, "options.styles.positions", ["top", "bottom", "left", "right"]);

  return {
    ...resolveGlobals(
      Object.fromEntries(
        Object.entries(styles).filter(([key]) => key !== "positions" && key !== "motion"),
      ),
      "options.styles",
    ),
    positions: {
      top:
        positions.top === undefined
          ? { ...POSITION_DEFAULTS }
          : resolvePosition(positions.top, "options.styles.positions.top"),
      bottom:
        positions.bottom === undefined
          ? { ...POSITION_DEFAULTS }
          : resolvePosition(positions.bottom, "options.styles.positions.bottom"),
      left:
        positions.left === undefined
          ? { ...POSITION_DEFAULTS }
          : resolvePosition(positions.left, "options.styles.positions.left"),
      right:
        positions.right === undefined
          ? { ...POSITION_DEFAULTS }
          : resolvePosition(positions.right, "options.styles.positions.right"),
    },
    motion:
      styles.motion === undefined
        ? { ...MOTION_DEFAULTS }
        : resolveMotion(styles.motion, "options.styles.motion"),
  };
}

/** Returns the modifier classes applied to every authored or programmatically mounted root. */
export function tabsdownStyleClasses(styles: ResolvedTabsdownStyles): string[] {
  const classes = [
    `tabsdown-density-${styles.size}`,
    `tabsdown-personality-${styles.personality}`,
    `tabsdown-underline-placement-${styles.underlinePlacement}`,
    `tabsdown-overflow-${styles.overflow}`,
    `tabsdown-palette-${styles.palette}`,
    `tabsdown-alignment-${styles.alignment}`,
    `tabsdown-selected-font-weight-${styles.selectedFontWeight}`,
    `tabsdown-nested-style-${styles.nestedStyle}`,
  ];

  if (styles.themeButtonOutline) classes.push("tabsdown-theme-button-outline");
  if (styles.motion.disabled) classes.push("tabsdown-animations-disabled");

  for (const position of ["top", "bottom", "left", "right"] as const) {
    const overrides = styles.positions[position];
    if (overrides.personality !== "inherit") {
      classes.push(`tabsdown-${position}-personality-${overrides.personality}`);
    }
    if (overrides.palette !== "inherit") {
      classes.push(`tabsdown-${position}-palette-${overrides.palette}`);
    }
    if (overrides.alignment !== "inherit") {
      classes.push(`tabsdown-${position}-alignment-${overrides.alignment}`);
    }
  }

  return classes;
}

/** Returns the validated numeric and accent custom properties shared by all Tabsdown roots. */
export function tabsdownStyleVariables(styles: ResolvedTabsdownStyles): string {
  const declarations = [
    styles.accent === null ? undefined : `  --tabsdown-accent-override: ${styles.accent};`,
    `  --tabsdown-underline-thickness: ${styles.underlineThickness}px;`,
    `  --tabsdown-gap: ${styles.gap}px;`,
    `  --tabsdown-radius: ${styles.radius}px;`,
    `  --tabsdown-horizontal-padding: ${styles.horizontalPadding}px;`,
    `  --tabsdown-content-spacing: ${styles.contentSpacing}px;`,
    `  --tabsdown-side-width: ${styles.sideWidth}px;`,
    `  --tabsdown-icon-size: ${styles.iconSize}px;`,
    `  --tabsdown-icon-spacing: ${styles.iconSpacing}px;`,
    `  --tabsdown-animation-speed: ${styles.motion.speed}ms;`,
  ].filter((declaration): declaration is string => declaration !== undefined);

  return `.tabsdown {\n${declarations.join("\n")}\n}`;
}
