// ponytail: as a builtin of the cli, this addon re-exports the runtime's
// type surface directly. The previous third-party addon shipped a
// minimal local mirror because third-party packages must not reach into
// the cli's @/ path aliases — builtins don't have that constraint.
export type {
  AddonButtonService,
  AddonButtonServiceContext,
  AddonButtonTypeDef,
  AddonButtonTypeDefAny,
  AddonButtonTypeService,
  AddonCheck,
  AddonCheckResult,
  AddonDeckDefinition,
  AddonDeckEntry,
  AddonDeckEntryCtx,
  AddonDeckFactory,
  AddonFrontend,
  AddonFrontendButton,
  AddonFrontendButtonProps,
  AddonGeneratedDeck,
  AddonGlobalPoller,
  AddonGlobalService,
  AddonGlobalSubscription,
  AddonGestureEvent,
  AddonLoadIssue,
  AddonManifest,
  AddonManifestKind,
  AddonManifestV1,
  AddonServiceContext,
  AddonServiceMethod,
  AddonKind,
  GestureKind,
} from "@/addon/api"
