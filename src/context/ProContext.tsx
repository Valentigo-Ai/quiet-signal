import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Purchases, {
  LOG_LEVEL,
  PACKAGE_TYPE,
  type PurchasesPackage,
} from "react-native-purchases";
import type { ProPlanId } from "@/constants/proPricing";
import { hasProEntitlement, deriveIsPro } from "@/lib/proEntitlement";
import { supabase } from "@/lib/supabase";

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
  const [devPro, setDevPro] = useState(false);
  const [ready, setReady] = useState(false);
  const [livePrices, setLivePrices] = useState<Partial<Record<ProPlanId, string>>>({});
  const packagesRef = useRef<PurchasesPackage[]>([]);
  // The Supabase user id currently identified to RevenueCat (null = anonymous).
  const identifiedRef = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;
    // Supabase auth subscription, torn down on unmount.
    let authSub: { unsubscribe: () => void } | undefined;

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
          // cancellations) flow in here without a manual refresh.
          Purchases.addCustomerInfoUpdateListener((updated) => {
            setEntitled(hasProEntitlement(updated));
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
                if (mounted) setEntitled(hasProEntitlement(customerInfo));
              } else if (identifiedRef.current) {
                // Only log out if a real user was previously identified;
                // Purchases.logOut() throws when already anonymous.
                const info = await Purchases.logOut();
                identifiedRef.current = null;
                if (mounted) setEntitled(hasProEntitlement(info));
              }
            } catch (e) {
              console.warn("[Pro] RevenueCat identity sync failed:", e);
            }
          };

          // Identify from any restored session first, then track auth changes.
          const { data: sessionData } = await supabase.auth.getSession();
          const initialUserId = sessionData.session?.user?.id ?? null;
          if (initialUserId) {
            await syncIdentity(initialUserId);
          } else {
            const info = await Purchases.getCustomerInfo();
            if (mounted) setEntitled(hasProEntitlement(info));
          }
          authSub = supabase.auth.onAuthStateChange((_event, s) => {
            void syncIdentity(s?.user?.id ?? null);
          }).data.subscription;

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

    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      const active = hasProEntitlement(customerInfo);
      setEntitled(active);
      return active;
    } catch (e: any) {
      // User backed out of the Play purchase sheet - not an error to surface.
      if (e?.userCancelled) return false;
      throw e;
    }
  };

  const restorePurchases = async (): Promise<boolean> => {
    if (!PURCHASES_SUPPORTED) {
      return __DEV__ ? devPro : false;
    }
    const info = await Purchases.restorePurchases();
    const active = hasProEntitlement(info);
    setEntitled(active);
    return active;
  };

  // A real "pro" entitlement always wins; the dev toggle only adds access in
  // development builds (it's not even rendered in production). See deriveIsPro.
  const isPro = deriveIsPro(entitled, devPro, __DEV__);

  return (
    <ProContext.Provider
      value={{ isPro, ready, livePrices, purchasePro, restorePurchases, _devSetPro }}
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
