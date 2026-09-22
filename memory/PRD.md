# ZeroTrust AI — functional core + support

## User requirements and latest scope
Mobile cybersecurity SaaS for individuals and organizations: GPT-5.4 assistant, device/access management, alert dashboard, scores/audits, Google + email login, government/private-sector use. RevenueCat for both stores; Pro unlocks assistant and advanced reports. User prioritized finishing a functional app and publishing without further scope expansion; latest addition: support section, full functionality and polish. Apple sign-in was requested earlier but later focus moved to Google/RevenueCat (not implemented).

## Architecture
- Actual dependencies Expo 57.0.24 / RN 0.86.3 (do not downgrade), Expo Router, FastAPI/Motor/MongoDB.
- One TanStack Query provider; /api prefix everywhere. Authenticated data queries keyed by user.id, cleared on logout.
- Config: Constants.expoConfig extra from app.config.ts; Metro public-env fallback for Expo57 browser preview.
- Email auth: SHA256-hexdigest then bcrypt; opaque 7-day session hashes in Mongo. Native SecureStore, browser HttpOnly secure cookie. Managed Google exchange server-side, deduplicated hot/cold callbacks; no insecure automatic linking of existing password accounts.
- Server-owned support_staff role, false by default; strict boolean authorization. Env-driven support owner seed never promotes/resets an existing ordinary user.
- RevenueCat: official Test Store in preview, iOS/Android SDK keys for release. Sole paid status = CustomerInfo.entitlements.active.pro, client-side only per integration playbook. No backend pro flags/webhooks. Stable identity logIn on auth; serialized transitions/listener/cache scoped per user.
- UI: dark tactical palette in src/theme.ts, Rajdhani/DM Sans, native components, 5-item bottom navigation; support via Overview help icon/account.

## Implemented features
1. Email signup/login, managed Google flow, session restore/logout and protected screens.
2. Personal/private/government workspace name/context settings; workspace data remains isolated per account (not shared organization collaboration).
3. Device registry create/edit/remove, platform/owner fields, declared MFA/encryption/updates controls, recorded access decisions allowed/review/denied.
4. Automatic review alerts from declared missing controls; manual incident reporting; severity, resolve/reopen, filters; dashboard refreshes every 30s.
5. Transparent inventory score: complete MFA/encryption/updates/review decisions ÷ four controls per registered device. No devices => no score. Incidents shown separately.
6. Real GPT-5.4 streaming assistant using workspace posture + last 10 messages. User/assistant history saved in Mongo. Rate cap 10 requests/10min/account. Response timeout/error feedback, no invented telemetry/actions.
7. Saved audit snapshots from real registered data, control bars, prioritized findings, sector context, timestamp, methodology, native share/selectable-text fallback.
8. RevenueCat dynamic monthly/annual packages, price/period, explicit Test Store confirmation, purchase/restore/error handling, membership and management. Back button handles direct-load route. Identity ready state avoids false free label.
9. Support center: 10 searchable/expandable guides, ticket creation/categories/reference/status, customer replies, resolve/reopen, staff inbox/replies/status controls. Ticket reads/mutations authorized server-side. Auto-refresh every30s and manual refresh. No fake agent responses, emails or push notifications.

## Verified so far
- Original billing test iteration1: official Test Store purchase/cancel/failure/restore, QA1 Pro vs QA2 free isolation, session reload; backend10/10 auth checks passed.
- Old back-navigation bug fixed; exact billing identity shown in account dialog for test mode.
- Actual GPT-5.4 SSE response generated and saved, shown in phone UI.
- Screenshots: dashboard, device form, persisted AI reply; help search/accordion, ticket creation and thread.
- JS/Python lint + TypeScript checks pass after support addition. Test-only secrets were removed from agent-created test sources; tests load private credentials. Owner credential rotated and previous sessions revoked; full backend suite rerun: 24/24 passed in 7.58 seconds.
- Core/support end-to-end regression iteration2: 24/24 backend tests passed, key phone390/360 workflows passed (93% first-run UI assertions, timing retries; no functional defects). Real AI persisted, reports saved, tenant isolation and full customer→staff→customer support thread verified. Publishing readiness scan pending.

## Important boundaries / not claimed
- No endpoint agent, SIEM/MDM/identity connector, automatic live threat detection, real network blocking, or compliance certification. Data comes from declared registry/incident records.
- Government mode is context, NOT accreditation or permission to store classified data.
- Support tickets are saved for app-owner handling, not staffed emergency response; no external email/push delivery or response SLA.
- Preview billing is SIMULATED RevenueCat Test Store. Real purchases intentionally gated by EXPO_PUBLIC_ENABLE_LIVE_SUBSCRIPTIONS until store credentials, operator legal/contact details and device-store tests are finished.
- Human Google approval/native callbacks and real store transactions still need device/account verification.
- No publishing/deployment/app-store submission has been performed. Deployment agent is readiness scan only; user Publish action/store approval separate.

## Remaining priorities
- P0: final readiness scan and explicit handoff. Functional core/support testing complete with no reported blockers. Expo restarted successfully; no app-render errors observed (headless React DevTools installer warning is unrelated to app rendering).
- P0 before public paid release: native store credentials/products/TestFlight/Play testing; real operator terms/privacy/contact and staff owner credentials; confirm Google device login. See payments panel FAQ.
- P1: email verification/password recovery, self-service account deletion, real team membership and shared org roles; automatic connectors only when user provides service/credentials.
- P2: Apple sign-in, native push notifications, richer policy automation and formally specified compliance targets.

## Key files
- Backend: auth.py, support_admin.py, security_models.py, security_data.py, security_routes.py, assistant_routes.py, support_routes.py, server.py.
- Frontend: app/{index,devices,alerts,assistant,reports,support,subscription,login}.tsx; src/{auth,billing,security,support}; src/components/{ui,security-ui}.tsx.
- /app/memory/revenuecat.md has provisioning and real-store setup. Private test/support-owner credentials in /app/memory/test_credentials.md (gitignored). Secrets only backend.env and private memory; RevenueCat public SDK keys frontend.env.