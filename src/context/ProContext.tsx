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
