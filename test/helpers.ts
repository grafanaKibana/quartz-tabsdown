import type { BuildCtx, QuartzConfig } from "@quartz-community/types";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import type { TabsdownOptions } from "../src/style-options";
import { Tabsdown } from "../src/transformer";

export const createCtx = (): BuildCtx => ({
  buildId: "test-build",
  argv: {
    directory: "content",
    verbose: false,
    output: "dist",
    serve: false,
    watch: false,
    port: 0,
    wsPort: 0,
  },
  cfg: { configuration: {} } as QuartzConfig,
  allSlugs: [],
  allFiles: [],
  incremental: false,
});

export const render = async (markdown: string, options?: TabsdownOptions): Promise<string> => {
  const transformer = Tabsdown(options);
  const file = await unified()
    .use(remarkParse)
    .use(transformer.markdownPlugins?.(createCtx()) ?? [])
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(markdown);
  return String(file);
};
