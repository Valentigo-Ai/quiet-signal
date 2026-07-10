# RevenueCat setup checklist (Richard's account-side tasks)

The app code (this PR) is wired to call RevenueCat, but none of it will work
until the RevenueCat dashboard and both app stores are set up to match. This
is the one-time setup - do it once per store, not per release.

## 1. Create your RevenueCat account and project

1. Sign up at https://app.revenuecat.com (free tier is fine to start).
2. Create a new Project called "Quiet Signal".

## 2. Connect each store

### Android (Google Play)

1. In RevenueCat: Project settings > Apps > + New > Google Play.
2. Package name: `com.quietsignal.app`
3. You'll need to link a Google Play service account so RevenueCat can
   verify purchases server-side - RevenueCat's guide walks through creating
   this in Google Cloud and granting it access in Play Console:
   https://www.revenuecat.com/docs/getting-started/installation/android#google-play-service-credentials-and-app-permissions

### iOS (App Store)

1. In RevenueCat: Project settings > Apps > + New > App Store.
2. Bundle ID: `com.quietsignal.app`
3. Add your App-Specific Shared Secret (App Store Connect > your app > App
   Information > App-Specific Shared Secret) so RevenueCat can verify
   receipts:
   https://www.revenuecat.com/docs/getting-started/installation/ios#app-store-connect

## 3. Create the two subscription products - in each store first

RevenueCat doesn't create store products for you - the products have to
exist in Play Console / App Store Connect first, then get imported into
RevenueCat. Use these exact product IDs (already hardcoded in
`src/constants/proPricing.ts` - changing them here means changing that file
too):

- `quiet_signal_pro_monthly`
- `quiet_signal_pro_yearly`

**Play Console:** Monetize with Play > Products > Subscriptions > Create
subscription, for each ID above. Base plan billing period: 1 month / 1 year
to match.

**App Store Connect:** your app > Monetization > Subscriptions > create a
Subscription Group (e.g. "Quiet Signal Pro"), then add both subscriptions
inside it using the same two product IDs.

Once created in both stores, go back to RevenueCat: Product catalog >
Products > + New, and add both, one per store, matching the IDs above.

## 4. Create the entitlement

RevenueCat dashboard > Entitlements > + New Entitlement.

- Identifier: `pro` (must match `PRO_ENTITLEMENT_ID` in
  `src/config/revenuecat.ts`)
- Attach both products (`quiet_signal_pro_monthly` and
  `quiet_signal_pro_yearly`) to this entitlement.

## 5. Create an offering

RevenueCat dashboard > Offerings > + New Offering (call it `default`), add
both products as packages, and mark this offering as **Current**. The app
reads whichever offering is marked current.

## 6. Get your public API keys

RevenueCat dashboard > Project settings > API keys. You'll see one key per
app you connected (iOS, Android) - these are public/client-safe keys, same
trust level as the Supabase anon key already in this repo.

Paste them into:

- Your local `.env` (copy `.env.example` if you haven't already)
- `eas.json`, replacing the `REPLACE_WITH_REVENUECAT_IOS_KEY` /
  `REPLACE_WITH_REVENUECAT_ANDROID_KEY` placeholders in all three build
  profiles (`development`, `preview`, `production`) - this PR added those
  placeholders so EAS cloud builds pick the keys up automatically.

## 7. Build a dev client to actually test purchases

Expo Go can't run real in-app purchases (no custom native code allowed) -
you need an EAS development build:

```
npm install -g eas-cli
eas login
eas build --profile development --platform android
# and/or
eas build --profile development --platform ios
```

Install the resulting build on a device/simulator, then run `npx expo
start` and open it from there as usual.

## 8. Test with a sandbox/license tester account before going live

- **Android:** Play Console > Setup > License testing, add your Google
  account as a license tester so test purchases don't charge real money.
- **iOS:** App Store Connect > Users and Access > Sandbox Testers, create a
  sandbox Apple ID and sign into it on the test device (Settings > App Store
  > Sandbox Account), not your real Apple ID.

Once a test purchase completes successfully and Settings' "Pro (testing
toggle, dev only)" switch is no longer needed to preview Pro state, you're
ready to submit the subscription products for review alongside the app
binary.
