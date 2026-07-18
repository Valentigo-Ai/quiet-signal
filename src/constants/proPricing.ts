import { CountryCode } from "@/constants/crisisResources";

export type ProPlanId = "monthly" | "yearly";

export type ProPlanInfo = {
  label: string;
  price: string; // localized display string, e.g. "£3.99" or "$4.99"
  billingNote: string;
  storeProductId: string;
  savePercent?: number;
};

// Regional pricing (July 2026), keyed by the same CountryCode used for
// crisis-resource localization - so a user's region drives both which
// crisis numbers they see AND what currency/price Pro shows.
//
// These are DISPLAY prices only, roughly matched to each region's usual
// app-store price-tier/"charm pricing" conventions (e.g. $4.99 not $5.07),
// not a live currency conversion. Once real Play Console / App Store
// Connect subscription products exist, the store itself supplies the true
// localized price (and handles every country automatically, not just the
// 6 below) - at that point this table becomes a fallback/preview only,
// used before the real product info has loaded.
const PRICING_BY_COUNTRY: Record<CountryCode, { monthly: ProPlanInfo; yearly: ProPlanInfo }> = {
  GB: {
    monthly: { label: "Monthly", price: "£3.99", billingNote: "per month, cancel anytime", storeProductId: "quiet_signal_pro_monthly" },
    yearly: { label: "Yearly", price: "£29.99", billingNote: "per year (~£2.50/mo)", storeProductId: "quiet_signal_pro_yearly", savePercent: 37 },
  },
  IE: {
    monthly: { label: "Monthly", price: "€4.99", billingNote: "per month, cancel anytime", storeProductId: "quiet_signal_pro_monthly" },
    yearly: { label: "Yearly", price: "€35", billingNote: "per year (~€2.92/mo)", storeProductId: "quiet_signal_pro_yearly", savePercent: 42 },
  },
  US: {
    monthly: { label: "Monthly", price: "$4.99", billingNote: "per month, cancel anytime", storeProductId: "quiet_signal_pro_monthly" },
    yearly: { label: "Yearly", price: "$38", billingNote: "per year (~$3.17/mo)", storeProductId: "quiet_signal_pro_yearly", savePercent: 37 },
  },
  CA: {
    monthly: { label: "Monthly", price: "CA$6.99", billingNote: "per month, cancel anytime", storeProductId: "quiet_signal_pro_monthly" },
    yearly: { label: "Yearly", price: "CA$52", billingNote: "per year (~CA$4.33/mo)", storeProductId: "quiet_signal_pro_yearly", savePercent: 38 },
  },
  AU: {
    monthly: { label: "Monthly", price: "A$7.99", billingNote: "per month, cancel anytime", storeProductId: "quiet_signal_pro_monthly" },
    yearly: { label: "Yearly", price: "A$60", billingNote: "per year (~A$5.00/mo)", storeProductId: "quiet_signal_pro_yearly", savePercent: 37 },
  },
  NZ: {
    monthly: { label: "Monthly", price: "NZ$8.49", billingNote: "per month, cancel anytime", storeProductId: "quiet_signal_pro_monthly" },
    yearly: { label: "Yearly", price: "NZ$65", billingNote: "per year (~NZ$5.42/mo)", storeProductId: "quiet_signal_pro_yearly", savePercent: 36 },
  },
};

// Fallback for any region outside the 6 above (mirrors DEFAULT_COUNTRY in
// crisisResources.ts) - USD is the most broadly understood default.
const FALLBACK_PRICING = PRICING_BY_COUNTRY.US;

export function getProPlans(country: CountryCode): { monthly: ProPlanInfo; yearly: ProPlanInfo } {
  return PRICING_BY_COUNTRY[country] ?? FALLBACK_PRICING;
}
