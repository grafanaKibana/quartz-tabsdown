export type {
  BuildCtx,
  CSSResource,
  JSResource,
  QuartzTransformerPlugin,
  QuartzTransformerPluginInstance,
  StaticResources,
} from "@quartz-community/types";

export type {
  ParsedTab,
  TabConfiguration,
  TabsDiagnostic,
  TabsDiagnosticCode,
  TabsParseResult,
} from "./parser";

export {
  STYLE_SETTINGS_CONTRACT,
  type TabsdownAlignment,
  type TabsdownGlobalStyleOptions,
  type TabsdownMotionStyleOptions,
  type TabsdownNestedStyle,
  type TabsdownOptions,
  type TabsdownOverflow,
  type TabsdownPalette,
  type TabsdownPersonality,
  type TabsdownPosition,
  type TabsdownPositionAlignment,
  type TabsdownPositionPalette,
  type TabsdownPositionPersonality,
  type TabsdownPositionStyleOptions,
  type ResolvedTabsdownSelectedFontWeight,
  type TabsdownSelectedFontWeight,
  type TabsdownSize,
  type TabsdownStyleOptions,
  type TabsdownStyleOptions as TabsdownStyles,
  type TabsdownStyleSettingContract,
  type TabsdownUnderlinePlacement,
} from "./style-options";

export interface TabSpec {
  id: string;
  label: string;
  panel: HTMLElement;
}

export interface MountTabsOptions {
  tabs: readonly TabSpec[];
  selection?: string | null;
  label: string;
  onSelectionChange?: (selection: string | null, previous: string | null) => void;
}

export interface TabsController {
  readonly selection: string | null;
  setSelection(id: string | null): void;
  setAvailable(id: string, available: boolean): void;
  destroy(): void;
}

export interface TabsdownRuntime {
  mountTabs(container: HTMLElement, options: MountTabsOptions): TabsController;
}

declare global {
  interface Window {
    tabsdown?: TabsdownRuntime;
  }
}
