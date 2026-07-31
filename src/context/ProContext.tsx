import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AppState, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import Purchases, {
  LOG_LEVEL,
  PACKAGE_TYPE,
  type CustomerInfo,
  type PurchasesPackage,
} from "react-native-purchases";
import type { ProPlanId } from "@/constants/proPricing";
import { hasProEntitlement, deriveIsPro } from "@/lib/proEntitlement";
import {
  activeProProductId,
  baseProductId,
  isUserCancelled,
  planFromProductId,
  PurchaseError,
  replacementModeFor,
} from "@/lib/purchaseErrors";
import { supabase, verifyEntitlement } from "@/lib/supabase";
import { reportDataError } from "@/lib/sentry";

// ---------------------------------------------------------------------------
// Pro / entitlement layer, backed by RevenueCat (react-native-purchases).
//
// RevenueCat wraps Google Play Billing (and App Store IAP) behind one API and
// is the single source of truth for whether a customer has the "pro"
// entitlement. Every screen that gates a feature reads `isPro` from this
// context only, so nothing else in the app needs to know how payments work.
//
// Setup expected in the RevenueCat dashboard:
//   - Entitlement identifier:  "pro"  (see ENTITLEMENT_ID below)
//   - A current Offering whose packages are the monthly + annual products
//     (store product IDs quiet_signal_pro_monthly / quiet_signal_pro_yearly).
// The Android SDK (public) key is supplied at build time via
// EXPO_PUBLIC_REVENUECAT_ANDROID_KEY (set in eas.json env).
// ---------------------------------------------------------------------------

const ANDROID_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;
const IOS_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY; // reserved for the future iOS release

// Native billing only exists on device. In Expo Go, react-native-purchases
// auto-mocks (Preview API Mode); on web it can't process native IAP. We only
// configure on iOS/Android and, in dev, keep a local toggle so the paywall UI
// stays previewable elsewhere.
const PURCHASES_SUPPORTED = Platform.OS === "android" || Platform.OS === "ios";

// Dev-only local override so the "Pro (testing toggle)" switch in Settings
// (rendered only under __DEV__) can still flip Pro on/off without a purchase.
const DEV_PRO_KEY = "quiet-signal:dev-pro";

export const FREE_MAX_RECIPIENTS = 1;
export const FREE_HISTORY_RANGES = [7, 30] as const;
export const PRO_ONLY_HISTORY_RANGES = [60, 90] as const;

// Regional pricing lives in constants/proPricing.ts, keyed by the same
// CountryCode used for crisis-resource localization (see getProPlans there
// and CrisisCountryContext for the detected/selected country). Once offerings
// load, `livePrices` below carries the real store-localized price string,
// which the paywall prefers over the static fallback table.
export type { ProPlanId };

type ProContextValue = {
  isPro: boolean;
  ready: boolean;
  /** Real store-localized price strings once offerings have loaded (e.g. "£3.99"). */
  livePrices: Partial<Record<ProPlanId, string>>;
  /**
   * The plan currently subscribed to through the store, or null. Null while
   * still free, and also null for Pro granted promotionally in RevenueCat
   * (there's no store subscription behind it), so the paywall can tell "on
   * monthly, could switch to yearly" apart from "Pro, nothing to switch".
   */
  currentPlan: ProPlanId | null;
  /** Returns true if the purchase completed and the "pro" entitlement is now active. */
  purchasePro: (plan: ProPlanId) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  /** Testing/demo only - lets you flip Pro on/off from Settings (dev builds only). */
  _devSetPro: (value: boolean) => void;
};

const ProContext = createContext<ProContextValue | undefined>(undefined);

function pricesFromPackages(pkgs: PurchasesPackage[]): Partial<Record<ProPlanId, string>> {
  const out: Partial<Record<ProPlanId, string>> = {};
  for (const p of pkgs) {
    if (p.packageType === PACKAGE_TYPE.MONTHLY) out.monthly = p.product.priceString;
    if (p.packageType === PACKAGE_TYPE.ANNUAL) out.yearly = p.product.priceString;
  }
  return out;
}

export function ProProvider({ children }: { children: React.ReactNode }) {
  const [entitled, setEntitled] = useState(false);
  // The webhook-confirmed server truth for this user's "pro" row in
  // public.user_entitlements - null until the first read completes (or there
  // is no signed-in user to read it for). See effectiveEntitled below for how
  // this and `entitled` combine.
  const [serverIsPro, setServerIsPro] = useState<boolean | null>(null);
  const [devPro, setDevPro] = useState(false);
  const [ready, setReady] = useState(false);
  const [livePrices, setLivePrices] = useState<Partial<Record<ProPlanId, string>>>({});
  const [currentPlan, setCurrentPlan] = useState<ProPlanId | null>(null);
  const packagesRef = useRef<PurchasesPackage[]>([]);
  // The Supabase user id currently identified to RevenueCat (null = anonymous).
  const identifiedRef = useRef<string | null>(null);
  // The live Realtime subscription on this user's user_entitlements row, if any.
  const entitlementChannelRef = useRef<RealtimeChannel | null>(null);

  // Entitlement and current plan always come from the same CustomerInfo, so
  // they're set together. Letting them drift is how a paywall ends up offering
  // someone the plan they're already paying for.
  const applyCustomerInfo = useCallback((info: CustomerInfo) => {
    setEntitled(hasProEntitlement(info));
    setCurrentPlan(planFromProductId(activeProProductId(info)));
  }, []);

  // Overrides entitlement straight to false when verify-entitlement's
  // server-side check disagrees with what RevenueCat's client SDK just
  // reported (see purchasePro/restorePurchases below, and the doc comment on
  // verify-entitlement itself for why the two can differ: a refund RevenueCat
  // hasn't been notified about yet). Also clears currentPlan for the same
  // reason applyCustomerInfo sets both together above - a refunded
  // subscription showing as "your current plan" while not entitled is its
  // own confusing, inconsistent state.
  const revokeEntitlementLocally = useCallback(() => {
    setEntitled(false);
    setCurrentPlan(null);
  }, []);

  // Reads this user's current is_pro straight from the webhook-maintained
  // mirror - the actual server-confirmed truth, independent of whatever
  // RevenueCat's client SDK currently happens to report. No row (a user who's
  // never triggered a RevenueCat event) means "not pro", same as the table's
  // own default. A read failure leaves serverIsPro exactly as it was rather
  // than assuming false - a transient fetch error must never look like a
  // revoked subscription.
  const fetchServerEntitlement = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("user_entitlements")
      .select("is_pro")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      reportDataError(error, "pro-entitlement-fetch");
      return;
    }
    setServerIsPro(data?.is_pro ?? false);
  }, []);

  const unsubscribeFromEntitlementChanges = useCallback(() => {
    if (entitlementChannelRef.current) {
      supabase.removeChannel(entitlementChannelRef.current);
      entitlementChannelRef.current = null;
    }
  }, []);

  // Live-updates serverIsPro the moment the webhook flips it (a
  // CUSTOMER_SUPPORT-reason cancellation, an EXPIRATION, a renewal), without
  // waiting for the next foreground or app restart. Relies on the existing
  // "own entitlement is readable by owner" RLS policy on user_entitlements -
  // Realtime enforces the same policy for postgres_changes, so this can only
  // ever see this user's own row.
  const subscribeToEntitlementChanges = useCallback(
    (userId: string) => {
      unsubscribeFromEntitlementChanges();
      entitlementChannelRef.current = supabase
        .channel(`user_entitlements_${userId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "user_entitlements", filter: `user_id=eq.${userId}` },
          (payload: RealtimePostgresChangesPayload<{ user_id: string; is_pro: boolean }>) => {
            const row = payload.new as { is_pro?: boolean } | undefined;
            if (row && typeof row.is_pro === "boolean") setServerIsPro(row.is_pro);
          },
        )
        .subscribe();
    },
    [unsubscribeFromEntitlementChanges],
  );

  useEffect(() => {
    let mounted = true;
    // Supabase auth subscription, torn down on unmount.
    let authSub: { unsubscribe: () => void } | undefined;
    // AppState (foreground) subscription, also torn down on unmount.
    let appStateSub: { remove: () => void } | undefined;

    (async () => {
      // Non-mobile (web): no native billing. Restore the dev flag in __DEV__
      // so the paywall/gating UI can still be exercised, then mark ready.
      if (!PURCHASES_SUPPORTED) {
        if (__DEV__) {
          const stored = await AsyncStorage.getItem(DEV_PRO_KEY);
          if (mounted && stored === "true") setDevPro(true);
        }
        if (mounted) setReady(true);
        return;
      }

      try {
        if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG);

        const apiKey = Platform.OS === "ios" ? IOS_API_KEY : ANDROID_API_KEY;
        if (!apiKey) {
          console.warn(
            "[Pro] RevenueCat API key missing (EXPO_PUBLIC_REVENUECAT_ANDROID_KEY); " +
              "purchases are disabled for this build.",
          );
        } else {
          Purchases.configure({ apiKey });

          // Live entitlement updates (renewals, purchases on other devices,
          // cancellations) flow in here without a manual refresh. Secondary/
          // optimistic only, per effectiveEntitled below - good for instant
          // feedback, but this is exactly the signal that can go stale (a
          // refund RevenueCat's own servers haven't learned about yet), so it
          // never gets the final say once serverIsPro has an answer.
          Purchases.addCustomerInfoUpdateListener((updated) => {
            applyCustomerInfo(updated);
          });

          // Keep RevenueCat's identity in lockstep with the Supabase user, so
          // the RevenueCat app_user_id IS the Supabase auth.users.id. This is
          // what lets the server-side revenuecat-webhook map a purchase to an
          // account - without it RevenueCat assigns an anonymous id the backend
          // can't resolve. Idempotent: guarded by identifiedRef so repeated
          // auth events (e.g. token refresh) don't re-call logIn needlessly.
          const syncIdentity = async (userId: string | null) => {
            try {
              if (userId) {
                if (identifiedRef.current === userId) return;
                const { customerInfo } = await Purchases.logIn(userId);
                identifiedRef.current = userId;
                if (mounted) applyCustomerInfo(customerInfo);
                if (mounted) await fetchServerEntitlement(userId);
                if (mounted) subscribeToEntitlementChanges(userId);
              } else if (identifiedRef.current) {
                // Only log out if a real user was previously identified;
                // Purchases.logOut() throws when already anonymous.
                const info = await Purchases.logOut();
                identifiedRef.current = null;
                if (mounted) applyCustomerInfo(info);
                if (mounted) setServerIsPro(null); // no user - nothing to gate on server-side
                unsubscribeFromEntitlementChanges();
              }
            } catch (e) {
              console.warn("[Pro] RevenueCat identity sync failed:", e);
            }
          };

          // Identify from any restored session first, then track auth changes.
          const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
          // Falls back to the anonymous-customer path below, same as a
          // genuinely signed-out user - safe, but worth knowing about if it
          // means RevenueCat isn't getting identified to the right account.
          if (sessionError) reportDataError(sessionError, "pro-session-lookup");
          const initialUserId = sessionData.session?.user?.id ?? null;
          if (initialUserId) {
            await syncIdentity(initialUserId);
          } else {
            const info = await Purchases.getCustomerInfo();
            if (mounted) applyCustomerInfo(info);
          }
          authSub = supabase.auth.onAuthStateChange((_event, s) => {
            void syncIdentity(s?.user?.id ?? null);
          }).data.subscription;

          // Coming to foreground re-reads user_entitlements directly, on top
          // of the Realtime subscription above - belt and braces for any gap
          // while the app was backgrounded (a dropped socket, a change that
          // happened while this device had no connection at all), same
          // reasoning as reconnecting a stream rather than trusting it never
          // missed anything.
          appStateSub = AppState.addEventListener("change", (state) => {
            if (state === "active" && identifiedRef.current) {
              void fetchServerEntitlement(identifiedRef.current);
            }
          });

          // Preload the current offering for pricing + purchase.
          const offerings = await Purchases.getOfferings();
          const pkgs = offerings.current?.availablePackages ?? [];
          packagesRef.current = pkgs;
          if (mounted) setLivePrices(pricesFromPackages(pkgs));
        }
      } catch (e) {
        // Never let payments init crash app startup - the app is fully usable
        // without Pro, and a failed init just leaves isPro false.
        console.warn("[Pro] RevenueCat initialization failed:", e);
      } finally {
        if (__DEV__) {
          const stored = await AsyncStorage.getItem(DEV_PRO_KEY);
          if (mounted && stored === "true") setDevPro(true);
        }
        if (mounted) setReady(true);
      }
    })();

    return () => {
      mounted = false;
      authSub?.unsubscribe();
      appStateSub?.remove();
      unsubscribeFromEntitlementChanges();
    };
  }, []);

  const packageForPlan = (plan: ProPlanId): PurchasesPackage | undefined => {
    const pkgs = packagesRef.current;
    const wantType = plan === "yearly" ? PACKAGE_TYPE.ANNUAL : PACKAGE_TYPE.MONTHLY;
    return (
      pkgs.find((p) => p.packageType === wantType) ??
      // Fallback: match by store product id if packages weren't set up with
      // the standard monthly/annual types.
      pkgs.find((p) => p.product.identifier.includes(`quiet_signal_pro_${plan === "yearly" ? "yearly" : "monthly"}`))
    );
  };

  const _devSetPro = (value: boolean) => {
    setDevPro(value);
    AsyncStorage.setItem(DEV_PRO_KEY, value ? "true" : "false");
  };

  const purchasePro = async (plan: ProPlanId): Promise<boolean> => {
    if (!PURCHASES_SUPPORTED) {
      if (__DEV__) {
        _devSetPro(true);
        return true;
      }
      throw new Error("In-app purchases aren't available on this platform.");
    }

    const pkg = packageForPlan(plan);
    if (!pkg) {
      throw new Error("That plan isn't available right now - please try again in a moment.");
    }

    // Google treats a second purchase inside one subscription group as a plan
    // change, not a new sale, and refuses it outright unless we hand it the
    // product being replaced plus a replacement mode. Without that it fails as
    // a DEVELOPER_ERROR that surfaces to the person as "One or more of the
    // arguments provided are invalid" - see purchaseErrors.ts.
    let owned: string | null = null;
    try {
      owned = activeProProductId(await Purchases.getCustomerInfo());
    } catch (e) {
      // Non-fatal: worst case we attempt a plain purchase, which is exactly
      // the behaviour before this check existed.
      console.warn("[Pro] Couldn't read current subscriptions before purchase:", e);
    }

    const targetId = baseProductId(pkg.product.identifier);
    // Already on this very plan - don't send them to Play to buy it twice.
    if (owned && owned === targetId) {
      const info = await Purchases.getCustomerInfo();
      applyCustomerInfo(info);
      return hasProEntitlement(info);
    }

    const isPlanChange = owned !== null;

    try {
      const { customerInfo } = await Purchases.purchasePackage(
        pkg,
        null,
        isPlanChange
          ? { oldProductIdentifier: owned as string, replacementMode: replacementModeFor(plan) }
          : null,
      );
      applyCustomerInfo(customerInfo);
      const clientSaysEntitled = hasProEntitlement(customerInfo);
      if (!clientSaysEntitled) return false;

      // A purchase that was JUST made being already-refunded is vanishingly
      // unlikely, but this is the one gate every path to "pro" should share
      // (see verify-entitlement's doc comment) - a fresh purchase is not a
      // special case exempt from it.
      const serverVerdict = await verifyEntitlement();
      if (serverVerdict === false) {
        revokeEntitlementLocally();
        setServerIsPro(false);
        return false;
      }
      const result = serverVerdict ?? clientSaysEntitled;
      // Syncs serverIsPro to this same result, not just entitled - otherwise
      // a serverIsPro left over from *before* this purchase (stale/false)
      // would win over this fresh purchase in effectiveEntitled below, until
      // the webhook's own row eventually catches up. This isn't claiming the
      // database row itself says this yet (it may not have caught up), just
      // that a stale earlier read must not get to outvote what was just
      // confirmed here - the next real fetch/Realtime event overwrites it
      // properly once the webhook does land.
      setServerIsPro(result);
      return result;
    } catch (e: any) {
      // User backed out of the Play purchase sheet - not an error to surface.
      if (isUserCancelled(e)) return false;
      throw new PurchaseError(e, isPlanChange);
    }
  };

  const restorePurchases = async (): Promise<boolean> => {
    if (!PURCHASES_SUPPORTED) {
      return __DEV__ ? devPro : false;
    }
    const info = await Purchases.restorePurchases();
    applyCustomerInfo(info);
    const clientSaysEntitled = hasProEntitlement(info);
    if (!clientSaysEntitled) return false;

    // This is exactly the case incident 2026-07-31 was about: RevenueCat's
    // client SDK can report an entitlement as active from a Google Play
    // subscription that was refunded directly via Play Console Order
    // Management, if RevenueCat's own servers were never notified of the
    // refund (Google Play Real-time Developer Notifications not wired up -
    // see verify-entitlement's doc comment). Restoring is precisely the
    // moment a stale/refunded record would otherwise get taken at face
    // value, so it's checked server-side before being trusted.
    const serverVerdict = await verifyEntitlement();
    if (serverVerdict === false) {
      revokeEntitlementLocally();
      setServerIsPro(false);
      return false;
    }
    // null = the check itself couldn't run (not configured yet, or a
    // transient failure) - fall back to what RevenueCat's own SDK already
    // said rather than denying a legitimate customer over our own infra.
    const result = serverVerdict ?? clientSaysEntitled;
    // See the matching comment in purchasePro above - keeps a stale prior
    // serverIsPro from outvoting this restore in effectiveEntitled below.
    setServerIsPro(result);
    return result;
  };

  // user_entitlements (kept current by the revenuecat-webhook edge function)
  // is the actual gate once we've heard from it at least once - it's the
  // server-confirmed truth, and can override a stale `entitled` the same way
  // verify-entitlement already overrides one right after a purchase/restore.
  // serverIsPro is null only before the very first read completes (or when
  // there's no signed-in user to read it for), in which case falling back to
  // `entitled` avoids an incorrect "not pro" flash while that fetch is still
  // in flight - see fetchServerEntitlement/subscribeToEntitlementChanges.
  const effectiveEntitled = serverIsPro ?? entitled;

  // A real "pro" entitlement always wins; the dev toggle only adds access in
  // development builds (it's not even rendered in production). See deriveIsPro.
  const isPro = deriveIsPro(effectiveEntitled, devPro, __DEV__);

  return (
    <ProContext.Provider
      value={{ isPro, ready, livePrices, currentPlan, purchasePro, restorePurchases, _devSetPro }}
    >
      {children}
    </ProContext.Provider>
  );
}

export function usePro(): ProContextValue {
  const ctx = useContext(ProContext);
  if (!ctx) throw new Error("usePro must be used within ProProvider");
  return ctx;
}
