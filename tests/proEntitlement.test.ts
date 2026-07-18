// Unit tests for the pure Pro-entitlement decision logic.
//
// Run with:  npm test
//
// These lock in the gate that unlocks paid features. The rules are small but
// money-sensitive: a real entitlement must always win, and the dev toggle
// must NEVER be able to grant Pro in a production build or take it away from a
// paying customer.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  hasProEntitlement,
  deriveIsPro,
  PRO_ENTITLEMENT_ID,
} from "../src/lib/proEntitlement.ts";

const withActive = (ids: string[]) => ({
  entitlements: { active: Object.fromEntries(ids.map((id) => [id, {}])) },
});

test("hasProEntitlement: true only when the 'pro' entitlement is active", () => {
  assert.equal(hasProEntitlement(withActive(["pro"])), true);
  assert.equal(hasProEntitlement(withActive([])), false);
  assert.equal(hasProEntitlement(withActive(["some_other_entitlement"])), false);
  assert.equal(hasProEntitlement(withActive(["pro", "extra"])), true);
});

test("hasProEntitlement: entitlement id constant is 'pro'", () => {
  assert.equal(PRO_ENTITLEMENT_ID, "pro");
  // and honours a custom id argument
  assert.equal(hasProEntitlement(withActive(["vip"]), "vip"), true);
  assert.equal(hasProEntitlement(withActive(["vip"]), "pro"), false);
});

test("deriveIsPro: a real entitlement always wins, in dev or prod", () => {
  assert.equal(deriveIsPro(true, false, false), true); // paid, prod
  assert.equal(deriveIsPro(true, false, true), true);  // paid, dev
});

test("deriveIsPro: dev toggle grants access ONLY in development", () => {
  assert.equal(deriveIsPro(false, true, true), true);   // dev toggle on, dev build
  assert.equal(deriveIsPro(false, true, false), false); // dev toggle on, PROD build -> denied
});

test("deriveIsPro: no entitlement and no dev toggle = not pro", () => {
  assert.equal(deriveIsPro(false, false, true), false);
  assert.equal(deriveIsPro(false, false, false), false);
});

test("deriveIsPro: dev toggle can never revoke a real entitlement", () => {
  // entitled=true, devPro=false must stay true regardless of build type.
  assert.equal(deriveIsPro(true, false, true), true);
  assert.equal(deriveIsPro(true, false, false), true);
});
