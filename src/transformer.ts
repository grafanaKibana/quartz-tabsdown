import type { ElementContent, Properties } from "hast";
import type { Parent, Root as MdastRoot, RootContent } from "mdast";
import type { PluggableList, Plugin, Processor } from "unified";
import type { QuartzTransformerPlugin } from "@quartz-community/types";
import iconNodes from "lucide-static/icon-nodes.json";
import { parseTabs, type ParsedTab, type TabConfiguration, type TabsDiagnostic } from "./parser";
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

const remarkTabsdown = (): Plugin<[], MdastRoot> =>
  function () {
    const processor = this as unknown as Processor<MdastRoot>;

    return (tree: MdastRoot) => {
      let blockCount = 0;

      function transform(parent: Parent): void {
        parent.children.forEach((child, index) => {
          if (child.type === "code" && child.lang === "tabsdown") {
            parent.children[index] = block(child.value);
          } else if ("children" in child) {
            transform(child);
          }
        });
      }

      function block(source: string): RootContent {
        const result = parseTabs(source);
        if (!result.ok) {
          return diagnosticNode(result.diagnostic);
        }

        const blockId = `tabsdown-${++blockCount}`;
        const buttons = result.tabs.map((tab, index) => tabButton(tab, blockId, index));
        const panels = result.tabs.map((tab, index) => {
          const body = processor.parse(tab.body);
          transform(body);
          return panelNode(tab, blockId, index, body.children);
        });

        const classNames = ["tabsdown"];
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

export const Tabsdown: QuartzTransformerPlugin = () => {
  return {
    name: "Tabsdown",
    markdownPlugins(): PluggableList {
      return [remarkTabsdown()];
    },
    externalResources() {
      return {
        css: [{ content: styles, inline: true }],
        js: [{ contentType: "inline", loadTime: "afterDOMReady", script }],
      };
    },
  };
};
