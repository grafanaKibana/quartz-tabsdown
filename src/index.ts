// Only the plugin: Quartz's loader re-exports every other named export from
// dist/index.d.ts as a value, so a type exported here breaks its generated index.
export { Tabsdown } from "./transformer";
