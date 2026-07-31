// Pure Pro-entitlement decision logic, extracted from ProContext so it can be
// unit-tested without importing react-native-purchases (which pulls in native
// modules that don't load in a plain Node test environment). ProContext wires
// these to the live RevenueCat SDK; the rules themselves live here.

export const PRO_ENTITLEMENT_ID = "pro";

// Minimal structural shape of the parts of RevenueCat's CustomerInfo we read.
// Kept structural (not imported) so this module stays dependency-free and
// testable; the real CustomerInfo satisfies it.
export type EntitlementInfoLike = {
  entitlements: { active: Record<string, { isActive?: boolean } | undefined> };
};

// True iff the customer currently holds the "pro" entitlement. RevenueCat is
// the source of truth: by contract, `entitlements.active` only ever contains
// entries RevenueCat currently considers active, so a presence check alone
// already means the same thing as isActive===true. Checked explicitly anyway
// (rather than relying on that contract implicitly) so this doesn't silently
// start granting Pro if that ever stops being true - the field is right there
// on the object either way, so asserting it costs nothing.
export function hasProEntitlement(
  info: EntitlementInfoLike,
  entitlementId: string = PRO_ENTITLEMENT_ID,
): boolean {
  return info.entitlements.active[entitlementId]?.isActive === true;
}

// The single gate every feature check reads. A real entitlement always wins;
// the dev toggle can only ADD access, and only in development builds - it can
// never take Pro away from a paying customer, and is never consulted in prod.
export function deriveIsPro(entitled: boolean, devPro: boolean, isDev: boolean): boolean {
  return entitled || (isDev && devPro);
}
