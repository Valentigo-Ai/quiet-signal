import React, { createContext, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Purchases, { CustomerInfo, PurchasesPackage } from "react-native-purchases";
import { getProPlans } from "@/constants/proPricing";
import type { ProPlanId } from "@/constants/proPricing";
import {
  PRO_ENTITLEMENT_ID,
  REVENUECAT_ANDROID_API_KEY,
  REVENUECAT_IOS_API_KEY,
} from "@/config/revenuecat";

// ---------------------------------------------------------------------------
// Pro/entitlement layer, backed by RevenueCat (react-native-purchases).
// RevenueCat is the single source of truth for whether someone has an
// active Pro subscription - it wraps Play Billing (Android) and StoreKit
// (iOS) behind one API and one dashboard. See docs/revenuecat-setup.md for
// the one-time dashboard setup this depends on (products, entitlement,
// offering, API keys) before any of this works end to end.
//
// A local __DEV__-only override still exists (see _devSetPro below) purely
// so Settings' "Pro (testing toggle, dev only)" switch can preview the
// Pro/free UI without a real purchase. It never runs in production builds -
// real users always see their actual RevenueCat entitlement.
// ---------------------------------------------------------------------------

const DEV_OVERRIDE_STORAGE_KEY = "quiet-signal:dev-pro-override";

export const FREE_MAX_RECIPIENTS = 1;
export const FREE_HISTORY_RANGES = [7, 30] as const;
export const PRO_ONLY_HISTORY_RANGES = [60, 90] as const;

// Regional pricing lives in constants/proPricing.ts, keyed by the same
// CountryCode used for crisis-resource localization (see getProPlans there
// and CrisisCountryContext for the detected/selected country).
export type { ProPlanId };

type ProContextValue = {
  isPro: boolean;
  ready: boolean;
  purchasePro: (plan: ProPlanId) => Promise<void>;
  restorePurchases: () => Promise<boolean>;
  /** Testing/demo only - lets you flip Pro on/off from Settings, __DEV__ builds only. */
  _devSetPro: (value: boolean) => void;
};

const ProContext = createContext<ProContextValue | undefined>(undefined);

// react-native-purchases must only be configured once per app lifetime -
// this guard survives remounts (e.g. React StrictMode's double-invoke of
// effects in development) without re-calling Purchases.configure.
let purchasesConfigured = false;

// Product IDs are identical across every region (only the *display* price
// in proPricing.ts differs per country) - "GB" here is just a stable key to
// read the region-invariant storeProductId, not a real region lookup.
function storeProductIdFor(plan: ProPlanId): string {
  return getProPlans("GB")[plan].storeProductId;
}

export function ProProvider({ children }: { children: React.ReactNode }) {
  const [realIsPro, setRealIsPro] = useState(false);
  // null = no override set; only ever read/written in __DEV__.
  const [devOverride, setDevOverride] = useState<boolean | null>(null);
  const [ready, setReady] = useState(false);

  const isPro = __DEV__ && devOverride !== null ? devOverride : realIsPro;

  useEffect(() => {
    let listener: ((info: CustomerInfo) => void) | undefined;
    let cancelled = false;

    (async () => {
      if (__DEV__) {
        const stored = await AsyncStorage.getItem(DEV_OVERRIDE_STORAGE_KEY);
        if (!cancelled) setDevOverride(stored === null ? null : stored === "true");
      }

      const apiKey = Platform.OS === "ios" ? REVENUECAT_IOS_API_KEY : REVENUECAT_ANDROID_API_KEY;
      if (!apiKey) {
        console.warn(
          "[ProContext] Missing EXPO_PUBLIC_REVENUECAT_IOS_API_KEY / " +
            "EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY - copy .env.example to .env and add your " +
            "RevenueCat public SDK keys (see docs/revenuecat-setup.md). Pro purchases will not " +
            "work until this is set."
        );
        if (!cancelled) setReady(true);
        return;
      }

      if (!purchasesConfigured) {
        Purchases.configure({ apiKey });
        purchasesConfigured = true;
      }

      try {
        const customerInfo = await Purchases.getCustomerInfo();
        if (!cancelled) {
          setRealIsPro(typeof customerInfo.entitlements.active[PRO_ENTITLEMENT_ID] !== "undefined");
        }
      } catch (e) {
        console.warn("[ProContext] Failed to fetch initial customer info", e);
      } finally {
        if (!cancelled) setReady(true);
      }

      listener = (info) => {
        setRealIsPro(typeof info.entitlements.active[PRO_ENTITLEMENT_ID] !== "undefined");
      };
      Purchases.addCustomerInfoUpdateListener(listener);
    })();

    return () => {
      cancelled = true;
      if (listener) Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, []);

  const _devSetPro = (value: boolean) => {
    if (!__DEV__) return;
    setDevOverride(value);
    AsyncStorage.setItem(DEV_OVERRIDE_STORAGE_KEY, value ? "true" : "false");
  };

  const purchasePro = async (plan: ProPlanId) => {
    const productId = storeProductIdFor(plan);
    const offerings = await Purchases.getOfferings();

    let pkg: PurchasesPackage | undefined = offerings.current?.availablePackages.find(
      (p) => p.product.identifier === productId
    );
    if (!pkg) {
      // Fall back to scanning every offering, not just "current", in case
      // the default offering isn't set correctly yet in the dashboard.
      pkg = Object.values(offerings.all)
        .flatMap((o) => o.availablePackages)
        .find((p) => p.product.identifier === productId);
    }
    if (!pkg) {
      throw new Error(
        `No RevenueCat package found for product "${productId}". Check that this product exists ` +
          `and is attached to an offering in the RevenueCat dashboard (see docs/revenuecat-setup.md).`
      );
    }

    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      setRealIsPro(typeof customerInfo.entitlements.active[PRO_ENTITLEMENT_ID] !== "undefined");
    } catch (e: any) {
      if (e?.userCancelled) return; // Not a real error - they just backed out of the sheet.
      throw e;
    }
  };

  const restorePurchases = async (): Promise<boolean> => {
    try {
      const customerInfo = await Purchases.restorePurchases();
      const active = typeof customerInfo.entitlements.active[PRO_ENTITLEMENT_ID] !== "undefined";
      setRealIsPro(active);
      return active;
    } catch (e) {
      console.warn("[ProContext] restorePurchases failed", e);
      return false;
    }
  };

  return (
    <ProContext.Provider value={{ isPro, ready, purchasePro, restorePurchases, _devSetPro }}>
      {children}
    </ProContext.Provider>
  );
}

export function usePro(): ProContextValue {
  const ctx = useContext(ProContext);
  if (!ctx) throw new Error("usePro must be used within ProProvider");
  return ctx;
}
import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ProPlanId } from "@/constants/proPricing";

// ---------------------------------------------------------------------------
// PLACEHOLDER Pro/entitlement layer.
//
// This tracks "isPro" locally so the paywall UI and feature gates can be
// built and tested end-to-end before real payments are wired up. To go
// live, replace the body of `purchasePro` / `restorePurchases` below with
// calls to RevenueCat's `react-native-purchases` SDK (industry-standard for
// Expo apps - handles Play Billing + App Store IAP behind one API), and
// replace `isPro` with the SDK's live entitlement check instead of the
// AsyncStorage flag. Nothing else in the app needs to change - every screen
// that gates a feature reads `isPro` from this context only.
// ---------------------------------------------------------------------------

const PRO_STORAGE_KEY = "quiet-signal:is-pro";

export const FREE_MAX_RECIPIENTS = 1;
export const FREE_HISTORY_RANGES = [7, 30] as const;
export const PRO_ONLY_HISTORY_RANGES = [60, 90] as const;

// Regional pricing lives in constants/proPricing.ts, keyed by the same
// CountryCode used for crisis-resource localization (see getProPlans there
// and CrisisCountryContext for the detected/selected country).
export type { ProPlanId };

type ProContextValue = {
  isPro: boolean;
  ready: boolean;
  purchasePro: (plan: ProPlanId) => Promise<void>;
  restorePurchases: () => Promise<boolean>;
  /** Testing/demo only - lets you flip Pro on/off from Settings. Remove once real payments are live. */
  _devSetPro: (value: boolean) => void;
};

const ProContext = createContext<ProContextValue | undefined>(undefined);

export function ProProvider({ children }: { children: React.ReactNode }) {
  const [isPro, setIsPro] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem(PRO_STORAGE_KEY);
      setIsPro(stored === "true");
      setReady(true);
    })();
  }, []);

  const _devSetPro = (value: boolean) => {
    setIsPro(value);
    AsyncStorage.setItem(PRO_STORAGE_KEY, value ? "true" : "false");
  };

  // TODO(payments): replace with Purchases.purchasePackage(...) from
  // react-native-purchases (using getProPlans(country)[plan].storeProductId
  // from constants/proPricing.ts), then set isPro from the entitlement.
  const purchasePro = async (_plan: ProPlanId) => {
    _devSetPro(true);
  };

  // TODO(payments): replace with Purchases.restorePurchases() and check
  // customerInfo.entitlements.active for the "pro" entitlement.
  const restorePurchases = async () => {
    return isPro;
  };

  return (
    <ProContext.Provider value={{ isPro, ready, purchasePro, restorePurchases, _devSetPro }}>
      {children}
    </ProContext.Provider>
  );
}

export function usePro(): ProContextValue {
  const ctx = useContext(ProContext);
  if (!ctx) throw new Error("usePro must be used within ProProvider");
  return ctx;
}
