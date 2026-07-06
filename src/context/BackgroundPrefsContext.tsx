import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  BackgroundImageId,
  BackgroundScreenKey,
  BACKGROUND_IMAGES,
  DEFAULT_BACKGROUNDS,
  isFreeBackground,
} from "@/constants/backgroundLibrary";
import { usePro } from "@/context/ProContext";

const STORAGE_KEY = "quiet-signal:background-prefs";

type Prefs = Record<BackgroundScreenKey, BackgroundImageId>;

type BackgroundPrefsContextValue = {
  prefs: Prefs;
  getSource: (key: BackgroundScreenKey) => (typeof BACKGROUND_IMAGES)[BackgroundImageId]["source"];
  setBackground: (key: BackgroundScreenKey, id: BackgroundImageId) => void;
};

const BackgroundPrefsContext = createContext<BackgroundPrefsContextValue | undefined>(undefined);

export function BackgroundPrefsProvider({ children }: { children: React.ReactNode }) {
  const { isPro } = usePro();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_BACKGROUNDS);

  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          setPrefs({ ...DEFAULT_BACKGROUNDS, ...JSON.parse(stored) });
        } catch {
          // ignore malformed storage, fall back to defaults
        }
      }
    })();
  }, []);

  const setBackground = (key: BackgroundScreenKey, id: BackgroundImageId) => {
    // Defense in depth - free users can only select the free looks (three
    // signature photos + the screen's default), even if called directly
    // rather than through the (also gated) pickers.
    if (!isPro && !isFreeBackground(key, id)) return;
    const next = { ...prefs, [key]: id };
    setPrefs(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const getSource = (key: BackgroundScreenKey) => BACKGROUND_IMAGES[prefs[key]].source;

  return (
    <BackgroundPrefsContext.Provider value={{ prefs, getSource, setBackground }}>
      {children}
    </BackgroundPrefsContext.Provider>
  );
}

export function useBackgroundPrefs(): BackgroundPrefsContextValue {
  const ctx = useContext(BackgroundPrefsContext);
  if (!ctx) throw new Error("useBackgroundPrefs must be used within BackgroundPrefsProvider");
  return ctx;
}
