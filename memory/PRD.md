# ZeroTrust AI

## Product request
Advanced cybersecurity mobile SaaS for individuals and organizations, with AI security assistant (GPT-5.4), device/access management, real-time alerts, scores/audits, Google and email/password login; later request for government/private-sector sections. User also requested Apple sign-in (not implemented).

## Current priority: RevenueCat
User requested RevenueCat for BOTH Apple App Store and Google Play; Pro unlocks AI assistant and advanced security reports. Defaults accepted for plans. User confirmed RevenueCat connected. Provisioned real managed RevenueCat Test Store + Apple/Play apps, pro entitlement/default offering. Defaults monthly/annual. Focus is subscription foundation, not full security suite.

## Architecture
- Expo Router / React Native with actual installed Expo 57.0.24, RN 0.86.3. Preserve versions and app identifiers.
- FastAPI + Motor MongoDB. All backend routes /api. Config uses dotenv.
- One shared TanStack Query provider. RevenueCat CustomerInfo is sole source of paid status, client-side only per playbook.
- Constants.expoConfig.extra from app.config.ts for backend URL and RevenueCat public keys. Native release uses store keys; preview uses test key. No private secrets shipped.
- Auth: email/password bcrypt over SHA-256 input, opaque 7-day sessions hashed in DB, native SecureStore / web HttpOnly secure cookie. Managed Google exchange backend only, with callback deduplication and mobile hot/cold links. Google linking to preexisting email accounts intentionally blocked, not silently merged.
- Dark tactical visual system based on design_guidelines.json, centralized theme, Rajdhani/DM Sans, RN primitives.

## Implemented (testing pending)
- Login/register UI and APIs, managed Google sign-in flow, session restoration/logout.
- Workspace account summary and genuine connection/entitlement statuses (no fake security data).
- Subscription page with dynamic monthly/annual RevenueCat packages/prices, selection, test purchase confirmation, purchase errors/cancellation/pending, restore, membership status, subscription management.
- Authenticated stable billing identity, per-user query cache and serialized identity transitions. Missing identity/config/offerings fail closed.
- AI assistant/report entry pages show entitlement gate and explicit in-development status. Neither feature executes requests/generates output yet.
- Test Store purchases clearly marked simulated, no live charge. Live native sales disabled by default until operator explicitly enables EXPO_PUBLIC_ENABLE_LIVE_SUBSCRIPTIONS after finishing app/store/legal setup.

## Backlog
- P0: Run and fix integration/auth tests; verify real Test Store purchase and identity isolation. Finish operator setup and native-device/store tests before real sales.
- P1: Implement GPT-5.4 assistant and real advanced reports; security dashboard/data sources, device/access management, audit score.
- P1: Government/private-sector workspaces and roles; no compliance certification claimed.
- P1: Full human Google OAuth/native callback validation; operator-approved privacy/terms/contact; email verification/password recovery before public use.
- P2: Apple sign-in; organization collaboration/policies; certification requirements only after user clarification.

## Integration references
See memory/revenuecat.md for provisioning IDs/remaining store tasks. Keys live in frontend/.env, not memory. See memory/test_credentials.md for dedicated test accounts.