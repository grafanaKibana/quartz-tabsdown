export type TabPosition = "top" | "left" | "right" | "bottom";
export type TabLayout = "one" | "multi";
export type TabConfiguration = TabPosition | TabLayout;
export type TabDensity = "default" | "compact";
export type TabPersonality = "button" | "underline" | "separator" | "rail";
export type TabPalette = "primary" | "secondary";
export type TabAlignment = "start" | "center" | "equal-width";

export interface TabsdownConfig {
  position?: TabPosition;
  layout?: TabLayout;
  density?: TabDensity;
  personality?: TabPersonality;
  palette?: TabPalette;
  alignment?: TabAlignment;
}

export type KeyedConfigName = keyof TabsdownConfig;

export type ParsedConfigToken =
  { kind: "keyed"; key: KeyedConfigName; value: string } | { kind: "invalid" };

const keyedValues: Record<KeyedConfigName, ReadonlySet<string>> = {
  position: new Set(["top", "left", "right", "bottom"]),
  layout: new Set(["one", "multi"]),
  density: new Set(["default", "compact"]),
  personality: new Set(["button", "underline", "separator", "rail"]),
  palette: new Set(["primary", "secondary"]),
  alignment: new Set(["start", "center", "equal-width"]),
};

export function parseConfigToken(token: string): ParsedConfigToken {
  const match = /^([a-z-]+)=([^=]+)$/.exec(token);
  if (!match) return { kind: "invalid" };
  const key = match[1] as KeyedConfigName;
  const value = match[2] ?? "";
  if (!Object.prototype.hasOwnProperty.call(keyedValues, key)) return { kind: "invalid" };
  if (!keyedValues[key].has(value)) {
    return { kind: "invalid" };
  }
  return { kind: "keyed", key, value };
}

export function serializeConfig(config: TabsdownConfig): string {
  const values = [
    config.position && `position=${config.position}`,
    config.layout && `layout=${config.layout}`,
    config.density && `density=${config.density}`,
    config.personality && `personality=${config.personality}`,
    config.palette && `palette=${config.palette}`,
    config.alignment && `alignment=${config.alignment}`,
  ].filter(Boolean);
  return values.length === 0 ? "" : `config: ${values.join(", ")}`;
}
