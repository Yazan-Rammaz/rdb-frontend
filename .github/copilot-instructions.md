# COPILOT_INSTRUCTIONS.md

> Ramaaz Digital Banking (RDB) — Next.js Library  
> TypeScript 5 • React 19 • Next.js ≥14 • Tailwind 4 • Server Actions • React
> Context • No tests

---

## Role

GitHub Copilot acts as a **senior TypeScript / Next.js library developer**.

When working on this codebase:

- Understand the dual-execution architecture (Server Actions vs Client RPC)
- Respect the library/host-app boundary
- Keep server actions isolated from client components
- Maintain clean context patterns

This is a **library**, not an app. Changes must work for consumers, not just
this repo.

---

## First Rule: Understand the Architecture (MANDATORY)

Before writing or modifying code:

1. Identify whether the change affects:
    - Core actions (`src/core/`)
    - Client components (`src/components/`, `src/rdb/`)
    - Context providers (`src/context/`)
    - Library exports (`src/rdb/index.ts`, `package.json`)
2. Determine execution mode:
    - Server Action Bridge (recommended)
    - Client RPC Fallback
3. Respect existing patterns and folder conventions.

If intent is unclear, ask clarifying questions. Do **not** guess.

---

## Library Architecture

### Dual Execution Modes

**Server Action Bridge (Recommended)**

- Host app calls `getServerActions()` from `rdb/server`
- Actions run on host's server, API calls hidden from client
- Secure, performant, minimal bundle size

**Client RPC Fallback**

- No `actions` prop passed to `<RDB />`
- Library makes direct fetch calls to host's `/api/rdb` route
- Host must implement API proxy

### Core Structure

```
src/core/
  actions/              ← Domain modules (banking, media, transactions, wallets, auth, paymentRequests)
  index.ts              ← Grouped + flat exports for Next.js compatibility
  server.ts             ← Server-side wrappers with "use server", exports getServerActions()
  server-client-proxy.ts ← Browser-side stubs for client RPC mode
```

**Export Strategy:**

- `src/core/index.ts` exports both grouped (`core.banking.*`) and flat
  (`getSupportedAssets`) for flexibility
- `src/core/server.ts` wraps each action with `"use server"` directive and
  provides `getServerActions()`
- `package.json` exports `./server` entry point for host apps

### Component Layer

```
src/rdb/
  components/RDB.tsx    ← Main entry component
  index.ts              ← Re-exports RDB, types, i18n utilities
  types/RDBProps.ts     ← Component prop types

src/components/         ← Internal UI components (layout, home, auth, transactions, etc.)
src/context/            ← React contexts (Auth, Scanner, Store, Toast, Layout, I18n, Passkey)
```

**Context Pattern:**

- Each domain has `*Context.tsx` with `*Provider` and `use*` hook
- All state is client-side via React contexts — no external state library
- Contexts are internal to the library, not exposed to consumers

---

## Build & Development Commands

```bash
npm run lib:build   # Clean, bundle with tsup, build CSS → dist/
npm run css:build   # Compile Tailwind CSS → dist/styles/styles.css
npm run dev         # Run standalone dev mode (Next.js dev server)
npm run build       # Build Next.js app (for testing library in dev environment)
npm run lint        # ESLint
```

**No test scripts.** Code must be correct by construction.

---

## Project Stack Reference

| Layer     | Technology                                                                   |
| --------- | ---------------------------------------------------------------------------- |
| Framework | Next.js ≥14, React 19                                                        |
| Language  | TypeScript 5 (strict)                                                        |
| Bundler   | tsup 8.5+                                                                    |
| State     | React Context (Auth, Scanner, Store, Toast, Layout, I18n, Passkey)           |
| Styling   | Tailwind CSS 4, CSS variables via `generateThemeVariables()`                 |
| Routing   | react-router-dom 7 (MemoryRouter inside library)                             |
| QR        | qr-scanner, html2canvas                                                      |
| Crypto    | Web Crypto API (SubtleCrypto for AES-GCM), @simplewebauthn/browser ^13       |
| Auth      | WebAuthn passkeys + PIN (SHA-256), idle lock (180s)                          |
| Utilities | clsx, tailwind-merge, lucide-react, react-loading-skeleton, framer-motion 12 |
| Peer deps | react ≥18, react-dom ≥18, next ≥14                                           |

---

## Folder Conventions

```
src/
  core/                 ← Server actions (domain modules: banking, media, transactions, etc.)
    actions/            ← Individual action modules
    index.ts            ← Grouped + flat exports
    server.ts           ← Server-side wrappers, getServerActions()
    types/              ← Shared types for actions
  rdb/                  ← Library entry point
    components/RDB.tsx  ← Main component
    index.ts            ← Public exports
    types/              ← Public type definitions
  context/              ← React contexts (AuthContext, ScannerContext, PasskeyContext, etc.)
  components/           ← UI components, grouped by domain (layout, home, auth, QR, etc.)
    QR/                 ← QR scanner, receive, send, shared utilities
      receive/          ← CreatePaymentRequest, DownloadView, AccountInfo, ActionButtons
      send/             ← QR scanner, transfer flow, payment request review
      shared/           ← ActionButton, shareQRImage
    layout/             ← Header, PasskeyGate, ProtectedLayout
    home/               ← Home page components, balance cards
    auth/               ← Auth screens (login, OTP, passkey enrollment)
    profile/            ← Settings page
    transactions/       ← Transaction list, details
    ui/                 ← Shared UI primitives (BottomSheet, Input, CustomQR, etc.)
  assets/               ← Static assets (icons, images)
  app/                  ← Standalone dev/test app (not bundled in library)
  hooks/                ← Custom React hooks
  lib/                  ← Shared utilities
  i18n/                 ← Internationalization (locales: en, ar, tr)
  styles/               ← Global styles, Tailwind entry point, XD scale utilities
  services/             ← Service layer (passkeyApi mock)
```

---

## TypeScript & Code Style

### Standards

- **TypeScript strict mode** enabled.
- All context types declared as **interfaces**, not types.
- Function signatures and shared data shapes must be typed.
- Avoid `any` unless absolutely necessary (ESLint allows it but discourage use).
- Use `const`; avoid `var`.
- Prefer `async/await` over promises.

### ESLint Config

- `@typescript-eslint/no-explicit-any`: `off`
- `@typescript-eslint/no-unused-vars`: `warn`
- Global ignores: `node_modules`, `.next`, `dist`, `build`, `coverage`

### Naming

- Components: PascalCase (`RDB.tsx`, `Header.tsx`)
- Contexts: `*Context.tsx` with `*Provider` and `use*` hook
- Actions: camelCase verbs (`getSupportedAssets`, `createPaymentRequest`)
- Files: kebab-case for non-components (`server-client-proxy.ts`)

---

## Component Conventions

### Server vs Client

- Default to **client components** for library UI (`'use client'` directive).
- Server actions live in `src/core/` with `"use server"` directive.
- Never import Zustand or other global state — use React Context only.

### Styling

- Tailwind utility classes + CSS variables injected via
  `generateThemeVariables()`.
- Inline styles are acceptable for dynamic values (animations, transforms,
  runtime calculations).
- Hardcoded colors (e.g., `#3C3C3C`, `#388CFF`) are acceptable in internal
  components. CSS variables preferred for theme-level colors.
- Icons: SVG imported as Next.js `Image` src, use `fill` + `object-contain`.

### Component Design

- Components must be small, focused, predictable.
- Separate rendering from logic.
- Prefer composition over large configurable components.
- Props should be minimal and meaningful.

---

## Library Integration Rules

### For Library Maintainers (This Repo)

1. **Exports:**
    - `package.json` must export `./server`, `./core`, `./styles`.
    - `src/rdb/index.ts` exports main component, types, i18n utilities.
    - Never export internal contexts or utilities meant for library use only.

2. **Bundling:**
    - `tsup.config.ts` marks `react`, `react-dom`, `next` as **external** (peer
      deps).
    - `noExternal: [/^@\//, /\.\//]` bundles internal imports.
    - SVG/PNG assets use dataurl loader.

3. **Server Actions:**
    - `src/core/server.ts` wraps all actions with `"use server"` banner.
    - `getServerActions()` returns structured object for host apps.

### For Host Apps (Consumers)

1. **Next.js Config:**

    ```js
    transpilePackages: ['rdb'];
    ```

2. **Styles Import:**

    ```tsx
    import 'rdb/styles';
    ```

3. **Usage (Server Action Bridge):**

    ```tsx
    'use client';
    import { RDB } from 'rdb';
    import { serverActions } from 'rdb/server';

    export default function Page() {
      return (
        <RDB
          baseUrl={process.env.NEXT_PUBLIC_API_URL!}
          actions={serverActions}
          authToken="..."
          local="en-US"
          handleUnauthenticated={() => {...}}
        />
      );
    }
    ```

4. **Fallback (Client RPC):**
    - Omit `actions` prop.
    - Implement `/api/rdb` route in host app to proxy requests.

---

## QR Code System

### QR Formats

**Payment Request Mode (encrypted):**

```
PAYREQ:{base64(iv+encryptedRequestCode)}|{requesterAccountNumber}
```

- AES-GCM 256-bit encryption using Web Crypto API (`SubtleCrypto`).
- Key = requester account number padded to 32 bytes.
- Scanner detects `PAYREQ:` prefix → decrypts with account number → calls lookup
  API.

**Address Mode (plaintext):**

```
ana={name}&anu={number}&cu={currency}
```

- When scanned, opens TransferSend with account pre-filled (amount, purpose,
  note empty).

### QR Scanner Flow

- `GlobalQrScanner` → `QrScanner/index.tsx` (page router with sliding track)
- Pages: `scan` → `sendChoose` → `transferSend` → `paymentRequest` →
  `paymentRequestView`
- Payment request QR → `PaymentRequestReview` component
- Regular account QR → `TransferSend` with `prefillAccountNumber` prop

### Receive Flow

- `CreatePaymentRequest` — address mode (QR + account info) and request mode
  (form → generate → review)
- `DownloadView` — mode-aware: address mode shows QR + account only; review mode
  adds payment details
- `ActionButton` — shared button with `bounceOnClick` animation support

### Backend APIs

- `POST /payment-requests` — Create request
- `GET /payment-requests/lookup/{code}` — Decrypt and lookup
- `POST /payment-requests/{id}/fulfill` — Process payment
- `PATCH /payment-requests/{id}/cancel` — Cancel request

**No external crypto library** — use native `SubtleCrypto` only.

---

## State Management (React Context Only)

- All state lives in React contexts — **no Zustand, Redux, or external state
  library**.
- Each context follows the pattern:
    ```tsx
    interface SomeContextType { ... }
    const SomeContext = createContext<SomeContextType | undefined>(undefined);
    export const SomeProvider = ({ children }) => { ... };
    export const useSome = () => {
      const ctx = useContext(SomeContext);
      if (!ctx) throw new Error('useSome must be used within SomeProvider');
      return ctx;
    };
    ```
- Contexts are **internal** — do not export from `src/rdb/index.ts` unless
  explicitly needed by consumers.

### Active Contexts

- `AuthContext` — User auth state, tokens
- `PasskeyContext` — WebAuthn/PIN lock state machine
  (BOOTING/SETUP_REQUIRED/LOCKED/UNLOCKED)
- `ScannerContext` — QR scanner state, transfer scan callbacks
- `StoreContext` — In-app data store (balances, transactions, account, purposes)
- `ToastContext` — Toast notifications
- `LayoutContext` — Layout/navigation state
- `I18nContext` — Internationalization (exported for consumers)
- `RDBContext` — Root library configuration

---

## Authentication & Security

### WebAuthn + PIN Lock

- `PasskeyContext` manages a state machine: `BOOTING` → `SETUP_REQUIRED` →
  `LOCKED` → `UNLOCKED`
- `@simplewebauthn/browser` ^13 for passkey registration/authentication
- PIN hashed with SHA-256 via `SubtleCrypto`
- `useIdleTimer` (180s) triggers lock on inactivity
- `PasskeyGate` wraps protected content, shows lock screen when needed

### Token Management

- `accessToken` lives only in `PasskeyContext` state
- Never stored in `localStorage`, `sessionStorage`, or cookies

---

## Action Conventions

### Core Actions (`src/core/actions/`)

Domain modules:

- `banking.ts` — `getSupportedAssets`, `getCurrencies`, `GetBanks`,
  `CreateBankDeposit`, `validateRecipientAccount`, `lookupAccountByPhone`, etc.
- `media.ts` — `UploadMedia`
- `transactions.ts` — `GetTransactions`, `GetWalletBalance`,
  `GetAccountBalance`, `CheckoutOrder`, `SendTransfer`, `verifyTransfer`,
  `getTransferPurposes`, etc.
- `wallets.ts` — `GetWalletBalance`, `GetAccountBalance`, `GetJournalEntries`,
  etc.
- `auth.ts` — `checkWallet`, `createWallet`, `sendOtp`, `verifyOtp`, `verifyMe`
- `payment-requests.ts` — `createPaymentRequest`, `lookupPaymentRequest`,
  `fulfillPaymentRequest`, `cancelPaymentRequest`

### Server Wrappers (`src/core/server.ts`)

```ts
'use server';
export const actionName = async (args: any) => await coreLogic.actionName(args);
```

All wrappers are **exported individually** and grouped in `getServerActions()`.

---

## CSS & Theming

- **Tailwind CSS 4** with custom config + XD scale utilities
  (`xd-utilities.css`).
- Theme variables injected at runtime via `generateThemeVariables()`.
- CSS output: `dist/styles/styles.css`.
- Custom animations defined in `styles.css`: `bounce-vertical`, `bounce-once`,
  `arrow-fly`, `shake-horizontal`, `slide-in-right`, etc.
- XD scale unit: `--xd-unit` for responsive sizing based on 430px design canvas.

**If IDE shows "Unresolved custom property" warnings:** Add fallbacks in host
app's `globals.css`:

```css
:root {
    --primary: #3066cc;
    --primary-light: #5a85db;
    --font-quicksand: 'Quicksand', sans-serif;
}
```

---

## Using Slash Commands from .github/prompts

- Slash commands like `/speckit.analyze`, `/speckit.checklist`, etc. are
  available and mapped to agents via prompt files in `.github/prompts`.
- To customize a command, edit the corresponding `.prompt.md` file.
- To add a new command, create a new `.prompt.md` file with the desired agent
  mapping.

---

## What Not to Do

- Do not export internal contexts to consumers.
- Do not bundle peer dependencies (`react`, `next`).
- Do not use external state management libraries (Zustand, Redux, etc.).
- Do not add crypto libraries — use `SubtleCrypto`.
- Do not mix server and client imports.
- Do not bypass the `actions` prop pattern.
- Do not write tests unless explicitly requested.

---

## Default Mindset

Act like a senior developer building a **production-ready Next.js library**
without automated tests.

The best solution:

- Works seamlessly in both execution modes (Server Actions + Client RPC).
- Respects library/host-app boundaries.
- Uses the least code possible.
- Is easy to integrate, debug, and maintain.
- Makes the library better than before.

Smart library code is **calm, predictable, and composable**.
