# ZeroTrust AI — launch handoff

## Completed verification
- Core APIs and support: 24/24 backend tests passed, rerun after credential cleanup.
- Mobile web at 390/360px: device registry/control scores/incidents, real GPT-5.4 stream and history, report snapshots, sector settings, support customer/staff replies and isolation, Pro/free access, direct subscription navigation.
- Official RevenueCat Test Store purchase/cancel/failure/restore and account identity isolation verified.
- No fabricated security telemetry. No automatic blocking or endpoint scans.
- Readiness scan checks configuration only and does NOT publish the app.

## Operator actions still required
1. Use your Publish action when ready. The agent has not published or submitted anything to app stores.
2. Verify Google approval/redirects and keyboard/layout on a real iOS/Android device. Apple sign-in is not part of this delivered scope.
3. Complete native store credentials/products and device purchase validation. See memory/revenuecat.md and the payments panel FAQ. Keep EXPO_PUBLIC_ENABLE_LIVE_SUBSCRIPTIONS disabled until these are complete; preview is SIMULATED billing.
4. Set real operator privacy/terms/contact details. Before public store launch, add self-service account deletion, password recovery/email delivery, and verify applicable store policy requirements; these are not implemented.
5. Configure a real support owner and response process. Preview owner credentials are ONLY in backend/.env and memory/test_credentials.md. Startup seeding never resets/promotes existing ordinary users. No real email/push support delivery or response SLA is claimed.
6. Add a real endpoint/identity monitoring connector if automatic detection or enforcement is required. Existing access statuses are registry decisions only; government context is not certification/accreditation.

## How to use the delivered core
- Register/sign in → Overview workspace selector → personal/private/government.
- Devices + → record controls and access decision → score/review alerts update.
- Alerts + → log an incident → resolve/reopen from its details.
- Membership → Test Pro subscription (preview only) → AI assistant and Reports unlock.
- Reports → Generate audit report → open/share saved snapshot.
- Overview help icon → searchable help + My tickets. Support owner sees Staff inbox and can reply/resolve.

Potential next enhancement: connect the organization's existing endpoint-monitoring provider so alerts are based on telemetry, not only declared controls and manual incident records.