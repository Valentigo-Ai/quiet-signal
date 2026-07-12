import * as Localization from "expo-localization";
import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";

// Turn whatever the user typed into a WhatsApp/SMS-safe international number.
//
// Android hands our `sms:` share link off to whichever messaging app the user
// picks. SMS apps tolerate local formats, but WhatsApp needs a full
// international number (e.g. "+447777169711") or it reports the contact as not
// on WhatsApp. To spare the user from ever formatting a number themselves, we
// read the device's own region and use it to expand local input:
//   UK "07777 169711"  -> "+447777169711"
//   US "212 555 0134"  -> "+12125550134"
// A number already typed in full "+…" form is respected as-is. Returns ok:false
// when the input can't be parsed into a valid number, so callers can prompt.
export function normalisePhone(input: string): { ok: boolean; e164?: string } {
  const raw = (input ?? "").trim();
  if (!raw) return { ok: false };

  const region = (Localization.getLocales?.()[0]?.regionCode ?? "GB") as CountryCode;

  const parsed = parsePhoneNumberFromString(raw, region);
  if (parsed && parsed.isValid()) {
    return { ok: true, e164: parsed.number };
  }
  return { ok: false };
}
