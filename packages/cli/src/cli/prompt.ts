// ponytail: thin re-export of @clack/prompts so backend modules
// (`packages/cli/src/cli/...`) can pull clack's primitives without
// each one importing the upstream package name. Lives in `cli/` not
// `ui/` because the `ui/` tree is reserved for React surface code
// consumed by `packages/cli/frontend/` and `packages/cli/emulator/`.
//
// Anything that imports this file MUST be in the CLI backend — never
// the frontend or emulator SPAs.
export {
  intro,
  outro,
  note,
  log,
  tasks,
  spinner,
  select,
  confirm,
  text,
  password,
  isCancel,
  cancel,
} from "@clack/prompts"
