# WebSocket Namespaces & Events — Integration Reference

Complete map of every Socket.IO namespace, its events, and **which client connects to what**.

---

## 1. How it works (read first)

- The server exposes several **Socket.IO namespaces**. Each is a separate connection path: `wss://<host>/<namespace>`.
- On authenticated namespaces, the JWT identifies the user and the socket auto-joins a private room `user:<userId>`. The server pushes user-targeted events to that room.
- **Cross-namespace note:** `emitToUser()` broadcasts a user event to `user:<id>` across **all** namespaces the user is connected to. In practice that means `session:*` events would arrive on *any* authenticated namespace you hold open — but you should still treat **`sessions`** as the canonical place for them and not depend on the others.
- **Auth methods:**
  - **JWT** (most namespaces): pass the access token in the handshake — `auth: { token }` (preferred) or header `Authorization: Bearer <token>`.
  - **Nonce** (`auth-link` only): pass `auth: { linkId, subscribeSecret }`.
- A **LOCKED** (parked) app token is rejected on JWT namespaces (same rule as normal APIs). Reconnect after `switch-to-app`.

---

## 2. Namespaces at a glance

| Namespace | Path | Auth | Web | App | Purpose |
|---|---|---|---|---|---|
| **sessions** | `/sessions` | JWT (required) | ✅ | ✅ | Session lifecycle: lock / revoke / approval / switch. **Both clients should always connect.** |
| **notifications** | `/notifications` | JWT (required) | ✅ | ✅ | In-app notifications + unread count. Connect if you show notifications. |
| **wallet** | `/wallet` | JWT (required) | ✅ | ✅ | Live balances, deposits, withdrawals, transfers, payment requests, ledger. Connect on wallet screens. |
| **order-book** | `/order-book` | JWT (optional) | ✅ | ✅ | Trading: order/trade/orderbook updates. Connect only on trading screens. |
| **auth-link** | `/auth-link` | Nonce (no JWT) | ✅ | ❌ | Pre-login web during QR login only. |

> You do **NOT** need to connect to all namespaces. Connect to the ones whose features the current screen uses (see §8).

---

## 3. `/sessions` — session lifecycle (JWT) — **both clients**

**Connect:** `io('wss://<host>/sessions', { auth: { token: accessToken } })`

### Server → client
| Event | Payload | When / action |
|---|---|---|
| `session:approval_request` | `{ requestId, ipAddress, deviceInfo, expiresAt }` | (App) A web login needs approval → show approve/reject. |
| `session:approved` | `{ sessionId, sessionToken }` | (Web) Your login was approved → exchange `sessionToken` via `POST /auth/session/complete`. |
| `session:rejected` | `{ requestId }` | (Web) Login was rejected. |
| `session:locked` | `{ sessionId }` | (App) You were parked (user went to web) → show "Switch back to app". |
| `session:activated` | `{ sessionId }` | (App) You reactivated via switch-to-app → back to normal. |
| `session:revoked_by_switch` | `{}` | (Web) The app switched back and revoked you → log out. |
| `session:revoked_by_new_login` | `{ revokedSessionId, reason, newIpAddress }` | A newer same-platform login replaced this session → log out. |
| `session:revoked` | `{ sessionId }` | This session was revoked (remote logout) → log out. |
| `session:all_revoked` | `{ exceptSessionToken }` or `{}` | All other sessions revoked (password change/reset, "log out other devices"). |

### Client → server
| Event | Payload | Purpose |
|---|---|---|
| `heartbeat` | `{}` | Updates `lastActiveAt`; server replies `{ status: 'ok', timestamp }`. Send periodically. |

---

## 4. `/notifications` — in-app notifications (JWT)

**Connect:** `io('wss://<host>/notifications', { auth: { token } })`

### Server → client
| Event | Payload | Meaning |
|---|---|---|
| `notification:new` | `{ notificationId, userId, title, body, type, category?, metadata?, createdAt }` | New notification. |
| `notification:read` | `{ ... }` | A notification's read state changed. |
| `notification:unreadCount` | `{ userId, count }` | Unread badge count. |

### Client → server
| Event | Payload | Purpose |
|---|---|---|
| `notification:markRead` | `{ notificationId }` | Mark one as read. |
| `notification:markAllRead` | `{}` | Mark all as read. |

---

## 5. `/wallet` — live wallet (JWT)

**Connect:** `io('wss://<host>/wallet', { auth: { token } })`

### Server → client
| Group | Events |
|---|---|
| Balance | `balance:updated`, `balance:snapshot` |
| Deposits | `deposit:initiated`, `deposit:processing`, `deposit:completed`, `deposit:failed` |
| Withdrawals | `withdrawal:requested`, `withdrawal:approved`, `withdrawal:processing`, `withdrawal:completed`, `withdrawal:rejected`, `withdrawal:cancelled` |
| Transfers | `transfer:sent`, `transfer:received`, `transfer:internal` |
| Merchant | `merchant:paymentSent`, `merchant:paymentReceived`, `merchant:refundSent`, `merchant:refundReceived` |
| Payment requests | `paymentRequest:created`, `paymentRequest:received`, `paymentRequest:fulfilled`, `paymentRequest:cancelled`, `paymentRequest:expired` |
| Ledger | `ledger:created`, `ledger:completed`, `ledger:failed`, `ledger:cancelled` |

Representative payloads:
- `balance:updated` → `{ userId, assetSymbol, assetType, available, locked, reserved, total, timestamp }`
- `deposit:*` / `withdrawal:*` → `{ orderId, userId, amount, assetSymbol, status, timestamp, ... }`
- `transfer:*` → `{ transferId, fromUserId, toUserId, amount, assetSymbol, transferType, timestamp }`
- `paymentRequest:*` → `{ requestId, fromUserId, toUserId, amount, assetSymbol, status, timestamp }`
- `ledger:*` → full ledger entry (`id, userId, ledgerType, status, direction, title{en,ar}, amount, fee, net, parties, timestamps, ...`)

### Client → server
| Event | Purpose |
|---|---|
| `balance:snapshot` | Request the current balance snapshot. |

---

## 6. `/order-book` — trading (JWT optional)

**Connect:** `io('wss://<host>/order-book', { auth: { token } })` — token optional (public market data works unauthenticated; user-specific events need a token).

### Server → client
| Group | Events |
|---|---|
| Orders | `order:created`, `order:matched`, `order:partiallyFilled`, `order:filled`, `order:cancelled`, `order:failed`, `order:queued` |
| Trades | `trade:executed` |
| Book | `orderBook:update`, `orderBook:snapshot` |
| User | `balance:updated` |
| Error | `error` |

### Client → server
| Event | Payload | Purpose |
|---|---|---|
| `subscribe:pair` | `{ pairSymbol }` | Subscribe to a market pair's book/trades. |
| `unsubscribe:pair` | `{ pairSymbol }` | Unsubscribe. |
| `subscribe:user` | `{ userId }` | Subscribe to your own order events (must match your token). |

---

## 7. `/auth-link` — QR pre-login (nonce) — **web only**

**Connect:** `io('wss://<host>/auth-link', { auth: { linkId, subscribeSecret } })` (values from `POST /auth/qr/session`). On connect the server **replays current state**, so a missed transition during a reconnect isn't lost.

### Server → client
| Event | Payload | Meaning |
|---|---|---|
| `qr:scanned` | `{ linkId, ...device/geo info (sameCity, webCity, appCity) }` | The app scanned the QR. |
| `qr:approved` | `{ sessionToken }` | Approved → call `POST /auth/session/complete { sessionToken }`. |
| `qr:rejected` | `{ linkId }` | App declined. |
| `qr:expired` | `{ linkId }` | Link expired → regenerate. |

(No client→server messages; the app drives scan/approve via HTTP `POST /auth/qr/scan` and `/auth/qr/approve`.)

---

## 8. Which namespaces should you connect to?

**Don't connect to all of them blindly.** Connect per need:

**App (mobile):**
- ✅ **`/sessions`** — always (lifecycle, lock/switch, approvals). Mandatory.
- ✅ `/notifications` — if you show notifications.
- ✅ `/wallet` — on wallet/home screens for live balance.
- ⬜ `/order-book` — only on trading screens.
- ❌ `/auth-link` — not used by the app.

**Web:**
- ✅ **`/sessions`** — always once logged in (revocation, switch-back logout). Mandatory.
- ✅ `/notifications`, `/wallet` — as features require.
- ⬜ `/order-book` — only on trading pages.
- ✅ `/auth-link` — **only** while showing a QR (logged out); drop it after `POST /auth/session/complete` and connect `/sessions` instead.

**Notes**
- Each namespace is its own connection; Socket.IO multiplexes namespaces over one transport to the same host, so connecting to several is cheap.
- Always (re)authenticate the JWT namespaces with the **current** access token; reconnect after a token refresh if the socket dropped.
- On `session:revoked*` / a hard `401`, tear down all sockets and return to login.

---

## 9. Connection snippet

```js
import { io } from 'socket.io-client';

const opts = { auth: { token: accessToken }, transports: ['websocket'] };
const sessions = io(`${WS_HOST}/sessions`, opts);
const notifications = io(`${WS_HOST}/notifications`, opts);

sessions.on('session:locked', ({ sessionId }) => showSwitchBackUI(sessionId));      // app
sessions.on('session:revoked_by_switch', () => logout());                            // web
sessions.on('session:approval_request', (r) => showApprovePrompt(r));                // app
setInterval(() => sessions.emit('heartbeat'), 30_000);

// QR (web, logged out):
const link = io(`${WS_HOST}/auth-link`, { auth: { linkId, subscribeSecret } });
link.on('qr:approved', ({ sessionToken }) => completeLogin(sessionToken));
```
