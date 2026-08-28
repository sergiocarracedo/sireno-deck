// Node-side entrypoint for the addon's global service. The bridge imports
// this file (via the scanner's globalServiceEntry), so node-only imports
// (fs, daemon paths) stay OUT of the browser graph — index.ts is imported
// by the frontend's virtual addons/registry module, and any node builtin
// reachable from there crashes the whole app ("externalized for browser
// compatibility").
export { globalService } from "./global/backend.js"
