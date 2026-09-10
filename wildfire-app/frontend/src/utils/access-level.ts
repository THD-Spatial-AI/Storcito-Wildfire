import type { User } from "@/types/user";

export type AccessLevel = User["access_level"];

const ACCESS_LEVEL_ORDER: AccessLevel[] = ["very_low", "intermediate", "manager", "expert"];

export function hasMinimumAccessLevel(
  actual: AccessLevel | null | undefined,
  required: AccessLevel,
): boolean {
  if (!actual) return false;
  return ACCESS_LEVEL_ORDER.indexOf(actual) >= ACCESS_LEVEL_ORDER.indexOf(required);
}

export function isAccessLevelAllowed(
  actual: AccessLevel | null | undefined,
  allowed: AccessLevel | readonly AccessLevel[],
): boolean {
  if (!actual) return false;
  const allowedLevels: readonly AccessLevel[] = typeof allowed === "string" ? [allowed] : allowed;
  return allowedLevels.includes(actual);
}
