import * as Localization from "expo-localization";
import { CountryCode, CRISIS_RESOURCES_BY_COUNTRY, DEFAULT_COUNTRY } from "@/constants/crisisResources";

export const CRISIS_COUNTRY_STORAGE_KEY = "quiet-signal:crisis-country";

// Reads the device's region (e.g. "US", "GB", "AU") from its locale settings
// and maps it to one of our supported countries. Falls back to
// DEFAULT_COUNTRY if the device is set to a region we don't have resources
// for yet, or if detection fails for any reason (e.g. web/simulator quirks).
export function detectDeviceCountry(): CountryCode {
  try {
    const locales = Localization.getLocales();
    for (const locale of locales) {
      const region = locale.regionCode as CountryCode | null;
      if (region && region in CRISIS_RESOURCES_BY_COUNTRY) {
        return region;
      }
    }
  } catch {
    // fall through to default
  }
  return DEFAULT_COUNTRY;
}
