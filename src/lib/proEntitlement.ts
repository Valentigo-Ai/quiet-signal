// Pure Pro-entitlement decision logic, extracted from ProContext so it can be
// unit-tested without importing react-native-purchases (which pulls in native
// modules that don't load in a plain Node test environment). ProContext wires
// these to the live RevenueCat SDK; the rules themselves live here.

export const PRO_ENTITLEMENT_ID = "pro";

// Minimal structural shape of the parts of RevenueCat's CustomerInfo we read.
// Kept structural (not imported) so this module stays dependency-free and
// testable; the real CustomerInfo satisfies it.
export type EntitlementInfoLike = {
  entitlements: { active: Record<string, unknown> };
};

// True iff the customer currently holds the "pro" entitlement. RevenueCat is
// the source of truth: an entitlement is "active" only while the subscription
// is valid, so this also goes false on expiry/cancellation without extra work.
export function hasProEntitlement(
  info: EntitlementInfoLike,
  entitlementId: string = PRO_ENTITLEMENT_ID,
): boolean {
  return typeof info.entitlements.active[entitlementId] !== "undefined";
}

// The single gate every feature check reads. A real entitlement always wins;
// the dev toggle can only ADD access, and only in development builds - it can
// never take Pro away from a paying customer, and is never consulted in prod.
export function deriveIsPro(entitled: boolean, devPro: boolean, isDev: boolean): boolean {
  return entitled || (isDev && devPro);
}
