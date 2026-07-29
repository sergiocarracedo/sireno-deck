// ponytail: SIRENO_CWD is a privilege escalation surface — it lets any process
// in the user's shell environment redirect config include resolution to an
// attacker-controlled cwd. Refuse the override unless the user explicitly
// opts in via SIRENO_ALLOW_CWD_OVERRIDE=1.
export const getOriginalCwd = (): string => {
  if (
    process.env["SIRENO_CWD"] !== undefined &&
    process.env["SIRENO_ALLOW_CWD_OVERRIDE"] !== "1"
  ) {
    return process.cwd()
  }
  return process.env["SIRENO_CWD"] ?? process.cwd()
}
