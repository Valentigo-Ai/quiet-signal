// RevenueCat configuration.
//
// The two API keys below are public "SDK" keys - the same trust tier as
// Stripe's publishable key or the Supabase anon key already used elsewhere
// in this app (see src/lib/supabase.ts) - safe to ship inside the client
// bundle. Get them from the RevenueCat dashboard: Project settings > API
// keys, one per platform app you connect there.
//
// Copy .env.example to .env and fill these in. See docs/revenuecat-setup.md
// for the full one-time RevenueCat dashboard setup this depends on
// (products, entitlement, offering) before any of this works end to end.
export const REVENUECAT_IOS_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
export const REVENUECAT_ANDROID_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;

// Must match the entitlement identifier created in the RevenueCat dashboard
// (Entitlements > + New Entitlement) with both quiet_signal_pro_monthly and
// quiet_signal_pro_yearly products attached to it. See
// constants/proPricing.ts for where those two product IDs are defined.
export const PRO_ENTITLEMENT_ID = "pro";
