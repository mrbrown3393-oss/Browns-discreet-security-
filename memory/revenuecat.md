# RevenueCat — integrated, testing pending (2026-09-22)

This file preserves RevenueCat facts for later integration-proxy operations. No credentials belong here.

## Provisioning
- Connection verified connected. `/setup` completed and confirmed entitlement attachments.
- Job: `2cd246e4-cc55-4414-9fe6-07af1b688776`
- rc_project_id: `proj2e58160e`
- apple_app_id: `app0cd31e44f9`
- play_app_id: `app91c20d579d`
- entitlement_lookup_key: `pro`
- offering_lookup_key: `default`
- Bundle ID and Android package (preserved): `com.emergent.zerotrustaishield.wszr08`
- Packages from setup (RevenueCat internal product IDs, not store SKU strings):
  - `$rc_monthly` -> `prod29841903d2` (default $9.99 / P1M, no trial)
  - `$rc_annual` -> `prod0a8d9c8d1a` (default $79.99 / P1Y, no trial)
- Attached entitlement product IDs: prod29841903d2, prod8e4b34353a, prod9f9ad4f029, prod0a8d9c8d1a, prod9e8e454c9c, prod76459222f0.
- Dashboard: https://app.revenuecat.com/projects/proj2e58160e
- Real public Test Store, Apple, and Google SDK keys fetched from build-config and stored ONLY in frontend/.env.

## Implementation
- react-native-purchases 10.10.1 (installed Expo version 57.0.24; do not downgrade).
- Initialization at app/_layout.tsx module scope, once via guarded client function.
- Config from Constants.expoConfig.extra.revenueCat via app.config.ts.
- Dev/Expo Go/web preview use RevenueCat Test Store, clearly labeled SIMULATED, with explicit confirmation. Release native uses corresponding real store key.
- Stable authenticated backend user.id is bound by Purchases.logIn; errors disable purchase and appear with retry. No random app user IDs. Listener updates query cache; AppState refresh is event-driven, not polling.
- Identity transitions are serialized. Cache keys per user. Logout invokes RevenueCat.logOut, clears local auth/query state, revokes backend session.
- Offerings -> packages -> product, dynamic price/title/period. No invented products or local pro grants.
- Restore purchases present; subscription-management URL native; explanatory Test Store management modal.
- Pro status uses only CustomerInfo.entitlements.active.pro. No backend subscription fields/routes/webhooks.
- AI assistant/report entry points reflect Pro access but explicitly remain in development (no fake AI/reports).
- Live sales fail closed until EXPO_PUBLIC_ENABLE_LIVE_SUBSCRIPTIONS=true. Do NOT enable until capabilities, legal/operator policies, and store prerequisites are finished. Preview test purchases remain enabled.

## Proxy operations (do NOT call RevenueCat REST directly)
- Re-fetch integration playbook for authorized proxy header; never persist bearer/OAuth credentials in this file.
- Status: GET `$INTEGRATION_PROXY_URL/internal/revenuecat/projects/2cd246e4-cc55-4414-9fe6-07af1b688776/status`
- Setup (idempotent): POST same base `/setup` with bundle_id/package_name above.
- Build config: GET same base `/build-config?environment=sandbox` (production if necessary).
- Change price/add package: POST same base `/products` with products [{package, price, currency, period, prices:[{amount_micros,currency}]}]. Dollar micros = price × 1,000,000. Default package lookup keys $rc_monthly/$rc_annual.
- Remove: DELETE same base `/products/%24rc_monthly` (encode $).
- Design hosted paywalls/rename entitlement or offering in dashboard only after intentionally updating config. Never manually change provisioned product structure outside the proxy.

## Required before REAL App Store / Google Play purchases
1. App Store Connect IAP key (.p8) + API key, and Google Play service-account JSON: configure in RevenueCat dashboard for corresponding apps. Never paste private credentials into source.
2. Complete payment profiles/agreements in App Store Connect and Google Play Console.
3. Create matching in-app subscriptions in both stores using EXACT store identifiers in RevenueCat (internal prod... IDs above are NOT store SKUs). Configure Google base plans.
4. Finish Pro AI/reports and app-operator terms/privacy/contact details, then enable live-sales config.
5. Native release/device testing through TestFlight and Play internal testing; real store purchases not verified here.
6. All production RevenueCat setup steps are available in the payments panel FAQ.

## Verification
Pending end-to-end testing. Real Google provider completion needs a human Google account; mobile device/store verification is outside browser preview.