// ---------------------------------------------------------------------------
// Human-readable messages for RevenueCat / Google Play Billing failures, and
// the small amount of logic needed to switch between plans rather than buy a
// second one.
//
// Why this exists: tapping "Start Pro" while the Play account already owned a
// subscription in the same group produced "Purchase didn't go through - One or
// more of the arguments provided are invalid" (observed 2026-07-28), with
// Play's own sheet underneath saying "We are unable to change your
// subscription plan". Google treats buying a second product in one
// subscription group as a *plan change*, and a plan change started without the
// existing product identifier and a replacement mode is a DEVELOPER_ERROR -
// which RevenueCat surfaces as PURCHASE_INVALID_ERROR, whose stock message is
// exactly the argument-validation string above.
//
// Testers won't hit this - they own nothing yet. A real monthly subscriber who
// taps Yearly walks straight into it, hence fixing it before public launch.
// ---------------------------------------------------------------------------

import { PURCHASES_ERROR_CODE, STORE_REPLACEMENT_MODE } from "react-native-purchases";
import type { CustomerInfo } from "react-native-purchases";
import type { ProPlanId } from "@/constants/proPricing";

export type AlertCopy = { title: string; body: string };

/**
 * Google reports active subscriptions as either "quiet_signal_pro_monthly" or
 * "quiet_signal_pro_monthly:monthly" (subscription id plus base plan id)
 * depending on the API surface. The old-product identifier a plan change wants
 * is the subscription id on its own, so trim any base plan suffix.
 */
export function baseProductId(identifier: string): string {
  return identifier.split(":")[0];
}

/** True if this store product id belongs to the Quiet Signal Pro group. */
function isProProduct(identifier: string): boolean {
  return baseProductId(identifier).startsWith("quiet_signal_pro_");
}

/**
 * The Pro subscription the account already owns, if any, as a bare product id.
 * Anything in the same subscription group has to go through the plan-change
 * path instead of a fresh purchase.
 */
export function activeProProductId(info: CustomerInfo | null | undefined): string | null {
  const active = info?.activeSubscriptions ?? [];
  const match = active.find(isProProduct);
  return match ? baseProductId(match) : null;
}

/**
 * Which Pro plan a store product id corresponds to, or null if it isn't one of
 * ours. Promotional entitlements granted in RevenueCat have no store product
 * at all, so they land here as null - which is right, there's no plan to
 * switch away from.
 */
export function planFromProductId(identifier: string | null): ProPlanId | null {
  if (!identifier) return null;
  const id = baseProductId(identifier);
  if (id.includes("yearly")) return "yearly";
  if (id.includes("monthly")) return "monthly";
  return null;
}

/**
 * Replacement mode for moving between the two Pro plans.
 *
 * Monthly -> Yearly is an upgrade: CHARGE_PRORATED_PRICE takes effect at once
 * and charges only the difference, so nobody pays twice for days they already
 * bought. Yearly -> Monthly is a downgrade: WITHOUT_PRORATION leaves the year
 * they paid for intact and starts monthly billing when it runs out, which is
 * both fairer and what Google recommends. Getting this backwards is how people
 * end up feeling robbed by a subscription screen.
 */
export function replacementModeFor(target: ProPlanId): STORE_REPLACEMENT_MODE {
  return target === "yearly"
    ? STORE_REPLACEMENT_MODE.CHARGE_PRORATED_PRICE
    : STORE_REPLACEMENT_MODE.WITHOUT_PRORATION;
}

/**
 * Wraps a RevenueCat error so the paywall knows whether the attempt was a
 * fresh purchase or a plan change, without having to work it out again.
 */
export class PurchaseError extends Error {
  readonly code: string;
  readonly planChange: boolean;

  constructor(cause: unknown, planChange: boolean) {
    const c = cause as { message?: string; code?: string | number } | undefined;
    super(c?.message ?? "Purchase failed");
    this.name = "PurchaseError";
    this.code = String(c?.code ?? "");
    this.planChange = planChange;
  }
}

function errorCode(e: unknown): string {
  return String((e as { code?: string | number } | undefined)?.code ?? "");
}

/** RevenueCat sets this when the person dismissed the Play sheet themselves. */
export function isUserCancelled(e: unknown): boolean {
  const err = e as { userCancelled?: boolean } | undefined;
  return err?.userCancelled === true || errorCode(e) === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR;
}

/**
 * Copy for a failed purchase. `wasPlanChange` matters because the same error
 * code means different things: an invalid-argument error on a fresh purchase
 * is our bug, whereas on a plan change it is nearly always Play refusing the
 * change - most often because the current subscription is set to not renew,
 * a state Play won't let you switch out of.
 */
export function describePurchaseError(e: unknown, wasPlanChange?: boolean): AlertCopy {
  const code = errorCode(e);
  const planChange = wasPlanChange ?? (e instanceof PurchaseError ? e.planChange : false);

  switch (code) {
    case PURCHASES_ERROR_CODE.PRODUCT_ALREADY_PURCHASED_ERROR:
      return {
        title: "You already have this plan",
        body: "Google says this subscription is already active on your account. Tap \"Restore purchases\" to bring it back into the app.",
      };
    case PURCHASES_ERROR_CODE.PURCHASE_INVALID_ERROR:
      return planChange
        ? {
            title: "Couldn't switch your plan",
            body: "Google wouldn't accept the change. This usually happens when your current subscription is already set to end - you can switch once it does, or turn renewal back on in the Play Store first.",
          }
        : {
            // The other way to reach this: the Google account on the phone
            // already owns a Pro subscription, but the Quiet Signal account
            // signed in here doesn't know about it - the two are separate, and
            // Play refuses a second purchase in the same group. "Restore
            // purchases" is what links them up.
            title: "Purchase didn't go through",
            body: "Nothing has been charged. If you've subscribed before on this phone, tap \"Restore purchases\" - Google won't sell the same subscription twice. Otherwise please try again.",
          };
    case PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR:
      return {
        title: "Payment still processing",
        body: "Google hasn't finished confirming your payment. Pro will unlock on its own once it does - no need to buy again.",
      };
    case PURCHASES_ERROR_CODE.PURCHASE_NOT_ALLOWED_ERROR:
      return {
        title: "Purchase not allowed",
        body: "This device or Google account isn't permitted to make purchases. Check your Play Store account and any parental controls.",
      };
    case PURCHASES_ERROR_CODE.PRODUCT_NOT_AVAILABLE_FOR_PURCHASE_ERROR:
      return {
        title: "Plan unavailable",
        body: "That plan isn't available on your account right now. Please try again in a moment.",
      };
    case PURCHASES_ERROR_CODE.NETWORK_ERROR:
    case PURCHASES_ERROR_CODE.OFFLINE_CONNECTION_ERROR:
      return {
        title: "No connection",
        body: "We couldn't reach the store. Check your connection and try again - nothing has been charged.",
      };
    case PURCHASES_ERROR_CODE.STORE_PROBLEM_ERROR:
      return {
        title: "The Play Store had a problem",
        body: "Nothing has been charged. Please try again in a few minutes.",
      };
    default:
      return {
        title: planChange ? "Couldn't switch your plan" : "Purchase didn't go through",
        body:
          (e as { message?: string } | undefined)?.message ??
          "Something went wrong. Please try again.",
      };
  }
}
