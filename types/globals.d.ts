/// <reference path="../node_modules/@quartz-community/types/globals.d.ts" />

declare module "*.scss" {
  const content: string;
  export default content;
}

declare module "*.inline.ts" {
  const content: string;
  export default content;
}

declare module "lucide-static/icon-nodes.json" {
  const nodes: Record<string, [string, Record<string, string>][]>;
  export default nodes;
}
