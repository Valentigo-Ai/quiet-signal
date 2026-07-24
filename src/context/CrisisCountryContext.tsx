import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  CountryCode,
  CountryCrisisInfo,
  CRISIS_RESOURCES_BY_COUNTRY,
  DEFAULT_COUNTRY,
} from "@/constants/crisisResources";
import { CRISIS_COUNTRY_STORAGE_KEY, detectDeviceCountry } from "@/lib/crisisCountry";

type CrisisCountryContextValue = {
  country: CountryCode;
  info: CountryCrisisInfo;
  setCountry: (code: CountryCode) => void;
  isAutoDetected: boolean;
  ready: boolean;
};

const CrisisCountryContext = createContext<CrisisCountryContextValue | undefined>(undefined);

// Auto-detects the user's region for crisis/support resources on first
// launch (Section 4.6), persists it, and lets Settings override it manually
// (e.g. the device region is wrong, or the person is travelling).
export function CrisisCountryProvider({ children }: { children: React.ReactNode }) {
  const [country, setCountryState] = useState<CountryCode>(DEFAULT_COUNTRY);
  const [isAutoDetected, setIsAutoDetected] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      // Guarded (2026-07-24 review, closing the session-1 handover item): an
      // AsyncStorage rejection used to leave `ready` false forever and skip
      // region detection entirely. Crisis resources must always come up -
      // worst case we fall back to device-detected (or default) country.
      try {
        const stored = await AsyncStorage.getItem(CRISIS_COUNTRY_STORAGE_KEY);
        if (stored && stored in CRISIS_RESOURCES_BY_COUNTRY) {
          setCountryState(stored as CountryCode);
          setIsAutoDetected(false);
        } else {
          setCountryState(detectDeviceCountry());
          setIsAutoDetected(true);
        }
      } catch {
        setCountryState(detectDeviceCountry());
        setIsAutoDetected(true);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const setCountry = (code: CountryCode) => {
    setCountryState(code);
    setIsAutoDetected(false);
    // Persistence is best-effort; the in-memory choice above already took
    // effect for this session either way.
    AsyncStorage.setItem(CRISIS_COUNTRY_STORAGE_KEY, code).catch(() => {});
  };

  const value: CrisisCountryContextValue = {
    country,
    info: CRISIS_RESOURCES_BY_COUNTRY[country],
    setCountry,
    isAutoDetected,
    ready,
  };

  return <CrisisCountryContext.Provider value={value}>{children}</CrisisCountryContext.Provider>;
}

export function useCrisisCountry(): CrisisCountryContextValue {
  const ctx = useContext(CrisisCountryContext);
  if (!ctx) throw new Error("useCrisisCountry must be used within CrisisCountryProvider");
  return ctx;
}
