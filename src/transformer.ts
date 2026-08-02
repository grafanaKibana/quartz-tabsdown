import type { ElementContent, Properties } from "hast";
import type { Parent, Root as MdastRoot, RootContent } from "mdast";
import type { PluggableList, Plugin, Processor } from "unified";
import type { QuartzTransformerPlugin } from "@quartz-community/types";
import iconNodes from "lucide-static/icon-nodes.json";
import { parseTabs, type ParsedTab, type TabConfiguration, type TabsDiagnostic } from "./parser";
import {
  resolveTabsdownStyles,
  tabsdownStyleClasses,
  tabsdownStyleVariables,
  type TabsdownOptions,
} from "./style-options";
import styles from "./styles/tabsdown.scss";
// @ts-expect-error - bundled to a browser-ready string by the inline script loader
import script from "./scripts/tabsdown.inline.ts";

const positions = new Set<TabConfiguration>(["top", "left", "right", "bottom"]);

function synthetic(
  type: string,
  hName: string,
  hProperties: Properties,
  children: RootContent[],
  hChildren?: ElementContent[],
): RootContent {
  const data = { hName, hProperties, ...(hChildren ? { hChildren } : {}) };
  return { type, data, children } as unknown as RootContent;
}

function element(
  tagName: string,
  properties: Properties,
  children: ElementContent[],
): ElementContent {
  return { type: "element", tagName, properties, children };
}

function text(value: string): ElementContent {
  return { type: "text", value };
}

function iconElement(name: string): ElementContent | undefined {
  const nodes = iconNodes[name];
  if (!nodes) {
    return undefined;
  }

  return element("span", { className: ["tabsdown__tab-icon"], "aria-hidden": "true" }, [
    element(
      "svg",
      {
        xmlns: "http://www.w3.org/2000/svg",
        viewBox: "0 0 24 24",
        width: "1em",
        height: "1em",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2",
        strokeLinecap: "round",
        strokeLinejoin: "round",
      },
      nodes.map(([tagName, properties]) => element(tagName, properties, [])),
    ),
  ]);
}

function resolveConfiguration(configuration: readonly TabConfiguration[]): TabConfiguration[] {
  let position: TabConfiguration = "top";
  let layout: TabConfiguration = "one";
  for (const value of configuration) {
    if (positions.has(value)) {
      position = value;
    } else {
      layout = value;
    }
  }
  return [position, layout];
}

function diagnosticNode(diagnostic: TabsDiagnostic): RootContent {
  return synthetic(
    "tabsdownDiagnostic",
    "div",
    { className: ["tabsdown", "tabsdown__diagnostic"], role: "alert" },
    [],
    [
      element("strong", { className: ["tabsdown__diagnostic-title"] }, [
        text(`Tabsdown: ${diagnostic.message}`),
      ]),
      element("div", { className: ["tabsdown__diagnostic-location"] }, [
        text(`Line ${diagnostic.line}`),
      ]),
      element("pre", { className: ["tabsdown__diagnostic-source"] }, [text(diagnostic.source)]),
    ],
  );
}

function tabButton(tab: ParsedTab, blockId: string, index: number): RootContent {
  const icon = tab.icon ? iconElement(tab.icon) : undefined;
  return synthetic(
    "tabsdownTab",
    "button",
    {
      type: "button",
      id: `${blockId}-tab-${index}`,
      className: ["tabsdown__tab"],
    },
    [],
    [
      ...(icon ? [icon] : []),
      element("span", { className: ["tabsdown__tab-label"] }, [text(tab.label)]),
    ],
  );
}

function panelNode(
  tab: ParsedTab,
  blockId: string,
  index: number,
  content: RootContent[],
): RootContent {
  const label = synthetic(
    "tabsdownPanelLabel",
    "div",
    { className: ["tabsdown__panel-label"] },
    [],
    [text(tab.label)],
  );
  return synthetic(
    "tabsdownPanel",
    "div",
    {
      id: `${blockId}-panel-${index}`,
      className: ["tabsdown__panel"],
      "aria-labelledby": `${blockId}-tab-${index}`,
    },
    [label, synthetic("tabsdownContent", "div", { className: ["tabsdown__content"] }, content)],
  );
}

const remarkTabsdown = (styleClasses: readonly string[]): Plugin<[], MdastRoot> =>
  function () {
    const processor = this as unknown as Processor<MdastRoot>;

    return (tree: MdastRoot) => {
      let blockCount = 0;

      function transform(parent: Parent, depth = 0): void {
        parent.children.forEach((child, index) => {
          if (child.type === "code" && child.lang === "tabsdown") {
            parent.children[index] = block(child.value, depth);
          } else if ("children" in child) {
            transform(child, depth);
          }
        });
      }

      function block(source: string, depth: number): RootContent {
        const result = parseTabs(source);
        if (!result.ok) {
          return diagnosticNode(result.diagnostic);
        }

        const blockId = `tabsdown-${++blockCount}`;
        const buttons = result.tabs.map((tab, index) => tabButton(tab, blockId, index));
        const panels = result.tabs.map((tab, index) => {
          const body = processor.parse(tab.body);
          transform(body, depth + 1);
          return panelNode(tab, blockId, index, body.children);
        });

        const classNames = ["tabsdown", ...styleClasses];
        if (depth > 0) {
          classNames.push(`tabsdown--nested-${depth % 2 === 1 ? "odd" : "even"}`);
        }
        if (result.configuration?.some((value) => value === "one" || value === "multi")) {
          classNames.push("tabsdown--inline-overflow");
        }
        for (const value of resolveConfiguration(result.configuration ?? [])) {
          classNames.push(`tabsdown--${value}`);
        }

        return synthetic("tabsdown", "div", { id: blockId, className: classNames }, [
          synthetic("tabsdownTabList", "div", { className: ["tabsdown__tablist"] }, buttons),
          synthetic("tabsdownPanels", "div", { className: ["tabsdown__panels"] }, panels),
        ]);
      }

      transform(tree);
    };
  };

export const Tabsdown: QuartzTransformerPlugin<TabsdownOptions> = (options) => {
  const resolvedStyles = resolveTabsdownStyles(options);
  const styleClasses = tabsdownStyleClasses(resolvedStyles);
  const mountedStyleClasses = styleClasses.filter(
    (name) => !/^tabsdown-(?:top|bottom|left|right)-/.test(name),
  );
  const configuredScript = script.replace(
    "__TABSDOWN_STYLE_CLASSES__",
    mountedStyleClasses.join(" "),
  );

  return {
    name: "Tabsdown",
    markdownPlugins(): PluggableList {
      return [remarkTabsdown(styleClasses)];
    },
    externalResources() {
      return {
        css: [{ content: `${styles}\n${tabsdownStyleVariables(resolvedStyles)}`, inline: true }],
        js: [{ contentType: "inline", loadTime: "afterDOMReady", script: configuredScript }],
      };
    },
  };
};
