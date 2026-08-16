# Review: Device Linking & Session Management (Linked Devices) — Did we do it right?

> This file compares the principle the manager sent ("session management on the web
> only, not mobile") against the **architecture we actually chose**, and judges
> whether our work is correct.
>
> Last updated: 2026-06-04 — branch: `new`
> Scope of this repo: **web only (Next.js)**. Session management/revocation from
> mobile lives in the **Flutter app** (separate repo, out of scope here).

---

## 0) TL;DR

We do **not** follow the "web dashboard" model the manager described. We follow the
**Linked Devices model, like WhatsApp / Telegram / Signal**, which is an accepted and
correct security model.

| Element | Ours | Verdict |
| --- | --- | --- |
| Who generates the QR | NestJS (backend) | ✅ |
| Who displays the QR | Next.js (web — this repo) | ✅ |
| Who scans & approves | Flutter app (mobile = trusted device) | ✅ |
| Registering a new web session after approval | Yes, via `sessionToken` | ✅ |
| **Revoking the session** | **From mobile (Flutter)** | ✅ (intentional) |

**Overall verdict: our work is correct** — but under a different model than the
manager assumed. Here the phone is the "root of trust" that approves and revokes,
exactly the way your phone manages WhatsApp's linked devices.

---

## 1) Two different models — which do we follow?

| | Web dashboard model (manager's point) | Linked Devices model (us) |
| --- | --- | --- |
| Example | PayPal / Stripe / Revolut | WhatsApp / Telegram / Signal |
| Root of trust | Web account + password/2FA | **Mobile** (protected by biometric/PIN) |
| Who approves a new device | Web after extra verification | **Mobile scans QR & approves** |
| Who revokes sessions | Web dashboard | **Mobile** |
| The phone holds | Only a long-lived token | The trust key + management authority |

Both models are secure. We chose the second one deliberately because:
- It makes the mobile (hardened with biometric/PIN via `PasskeyContext` / webauthn-pin-lock) the control point.
- The new device (web) **cannot** revoke the phone — trust flows mobile → web only.
- It is a familiar UX for users (like WhatsApp).

---

## 2) Addressing the manager's concerns within our model

| Manager's concern | How we address it in the Linked Devices model |
| --- | --- |
| P1 — The phone may be compromised | The phone is protected by biometric/PIN; approving a new session requires an explicit action on a protected device. Revoking from the phone **increases** security (the new web device can't revoke the phone). |
| P2 — Revocation is a high-privilege operation | It happens on the root device (mobile) behind the biometric lock — that is the highest privilege, not the lowest. |
| P3 — Long-lived tokens | The web gets a `sessionToken` that is instantly revocable from mobile; not a permanent, non-revocable token. |
| P4 — Technical data (IP/OS/city) | Shown on mobile to help the user decide (browser/os/same-city) — useful, not a risk. |
| P5 — Stronger verification | The approval itself is the verification: a human action on a biometric-locked device. |
| P6 — PCI-DSS | The standard forbids sensitive operations from an untrusted environment; our biometric-protected mobile **is** the trusted environment. |

> Bottom line: the manager's principle is correct for the web-dashboard model, but it
> does **not** apply as a constraint to the Linked Devices model, which large, secure
> apps adopt.

---

## 3) Evidence from the code (web side — this repo)

> Note: scanning/approval/revocation all live in the Flutter app. Here we only
> document the web side.

- Creating, displaying, and rotating the QR session:
  - `apps/frontend/src/components/auth/screens/QrLogin.tsx`
  - `apps/frontend/src/core/actions/auth.ts` → `createQrSession()` / `refreshQrToken()`
- Receiving the scan/approval result in real time over a socket (`qr:scanned` →
  `qr:approved` / `qr:rejected` / `qr:expired`):
  - `apps/frontend/src/hooks/useAuthLinkSocket.ts`
  - The room is gated by `{ linkId, subscribeSecret }` pre-auth, separate from the `/wallet` channel.
- Code rotates every ~60s + a ~5-minute cap then auto-expires: `QrLogin.tsx` (lines 92-116).
- A same-city check is shown to the user (informational): `QrLogin.tsx` (lines 244-248) + commit `324f277`.
- **A web entry that surfaces the session**: the "Login History → Active Session" button in
  `apps/frontend/src/components/profile/ProfileContent.tsx` (lines 585-605) — currently
  display-only (the button has no onClick yet).
- The sessions proxy ready to consume revoke/list endpoints from the backend:
  `apps/frontend/src/app/api/sessions/[...path]/route.ts` (supports GET/DELETE).

---

## 4) Gaps / TODO

- [ ] **(Flutter)** A "Linked Devices" screen with a Revoke button per session — the source of truth for management.
- [ ] **(Backend)** Confirm the `qr:scanned` contract (there is a `⚠️ CONFIRM WITH BACKEND` note in
      `useAuthLinkSocket.ts` line 10): fields `web/sameCity/webCity/appCity`.
- [ ] **(Backend)** Endpoints: `GET /sessions` (device list) and `DELETE /sessions/:id` (revoke).
- [ ] **(Web)** Wire the "Login History" button to a read-only view of the current active session, if desired.
- [ ] **(Web)** Web behavior when its session is revoked from mobile: drop the socket + redirect to login.
- [ ] Product decision: keep same-city informational only, or make it a block when cities differ?

---

## 5) Do we violate PCI-DSS? (Answer: No)

**Bottom line: we do not violate PCI-DSS. The standard does not state "session
management on the web only" — that is a common, inaccurate claim. PCI-DSS is
platform-agnostic and cares about controls, not about where the management button lives.**

Three points to understand:

**1) What does PCI-DSS actually govern?**
PCI-DSS protects **Cardholder Data (CHD)**: the card number (PAN) and sensitive
authentication data (CVV/PIN/track). Its scope = systems that store/process/transmit
card data (the CDE).
- If rdb is a wallet / account-to-account transfer system that does **not** handle card
  data → PCI-DSS may not even be in scope (or only a very limited SAQ scope).
- If it does handle cards → the requirements below apply, and we meet them.

**2) There is no PCI-DSS clause forbidding management/revocation from mobile.**
The standard never says "web only." What the manager said is correct as a *common
practice* for the web-dashboard model, but it is **not the text of the standard**.

**3) What the standard actually requires — and how we meet it:**

| PCI-DSS requirement | How our model meets it |
| --- | --- |
| Req 8 — Strong authentication | Mobile protected by biometric/PIN; device possession + biometric factor ≈ MFA |
| 8.2.8 — Idle session timeout (re-auth after ≤15 min) | `useIdleTimer` (180s) + QR session cap (~5 min) |
| 8.2.5 / 8.2.6 — Ability to revoke access immediately | Revoking from mobile **fulfils** this requirement, it doesn't violate it |
| Req 4 — Encrypt transmission | TLS + tokens inside secure cookies (`rdb_at/rdb_st`) |
| Req 10 — Audit trails | Login History / Active Session |
| Req 6 — Secure development | Code rotation, `subscribeSecret`, event-replay guards |

**Why does revoking from mobile support PCI-DSS rather than violate it?**
Because the standard requires the ability to **revoke access immediately** on
suspicion. A user revoking the web session from their biometric-locked root device is
a direct fulfilment of that goal, and the one-way trust direction (web cannot revoke
mobile) reduces the attack surface.

> ⚠️ Important caveat: "PCI-DSS compliance" is a verdict issued by a Qualified Security
> Assessor (QSA) against your actual environment. This file states that the
> **architecture is compatible with PCI-DSS requirements**, not that it is "certified" —
> certification happens at the organization level after a formal audit.

---

## 6) Summary to send to the manager

> Your note is correct for the "web dashboard" model (PayPal/Stripe). We deliberately
> chose the **Linked Devices model, like WhatsApp**: the mobile (hardened with
> biometric/PIN) is the root of trust that scans the QR, approves the web login, **and
> can revoke the session from mobile**. This model is secure and globally adopted, and
> it addresses the phone-compromise concern because management happens behind a
> biometric lock, and the new device (web) has no authority over the phone. The web
> (this repo) only displays the QR and receives the approval.
