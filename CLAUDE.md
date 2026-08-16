# rdb Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-04-15

## Active Technologies
- TypeScript 5 + React 19 + Next.js ≥14 + Tailwind CSS 4, Framer Motion, react-router-dom 7 (MemoryRouter), html2canvas, qrcode, clsx, tailwind-merge (transfer-send)
- N/A (client-side state via React contexts; all data from mock APIs) (transfer-send)
- TypeScript 5 + React 19 + Next.js >=14, Tailwind CSS 4, react-router-dom 7 (MemoryRouter) (fetch-transfer-purposes)
- N/A (client-side state via React contexts; all data from API) (fetch-transfer-purposes)
- TypeScript 5 + React 19 + Next.js >=14, Tailwind CSS 4, Framer Motion, lucide-react, react-loading-skeleton (settings-page)
- N/A (client-side state via React contexts; all data from AuthContext) (settings-page)
- TypeScript 5 + React 19 + Next.js ≥14, Tailwind CSS 4, Framer Motion, react-router-dom 7 (MemoryRouter) (assets-supported-api)
- N/A (client-side state via React contexts; data from API) (assets-supported-api)
- TypeScript 5 + React 19 + Next.js ≥14, Tailwind CSS 4, Framer Motion 12, react-router-dom 7 (MemoryRouter), qr-scanner, html2canvas, clsx, tailwind-merge (payment-request-scan-pay)
- SubtleCrypto Web Crypto API (AES-GCM 256-bit) for client-side requestCode encryption — no external crypto library (payment-request-scan-pay)
- Real backend APIs: POST /payment-requests, GET /payment-requests/lookup/{code}, POST /payment-requests/{id}/fulfill, PATCH /payment-requests/{id}/cancel (payment-request-scan-pay)
- TypeScript 5 + React 19 + Next.js ≥14, Tailwind CSS 4, Framer Motion 12, react-router-dom 7, qr-scanner, html2canvas, clsx, tailwind-merge (payment-request-scan-pay)
- N/A (client-side state via React contexts; all data from real backend APIs) (payment-request-scan-pay)
- TypeScript 5 + React 19 + Next.js ≥14, `socket.io-client` (new), `axios` (existing), existing context infrastructure (websocket-integration)
- N/A — client-side state only; no persistence added (websocket-integration)
- TypeScript 5 + React 19 + Next.js >=14, Tailwind CSS 4, Framer Motion 12, react-router-dom 7 (MemoryRouter), qr-scanner (camera access reuse) (kyc-verification)
- N/A (client-side state via React context; verification session state in VerificationContext) (kyc-verification)
- TypeScript 5 + React 19 + Next.js ≥14 + Tailwind CSS 4, Framer Motion 12, lucide-react, next/image (login-history)
- N/A — mock data in-memory (no backend API yet) (login-history)
- TypeScript 5, React 19, Next.js ≥14 (App Router, edge runtime for API proxy) + Existing only — `FaceReverifyContext`/`FaceReverifyOverlay` (camera UX), `useStepUp` hook, `resetPasscodeApi` service, Framer Motion (flow transitions). **No new dependencies.** (step-face-reverify)
- N/A — client state only. Face step-up token held in a React ref for the life of the flow; deliberately NOT written to the `rdb_step` cookie on the mid-login path (see research.md D3). (step-face-reverify)
- TypeScript 5, React 19, Next.js ≥14 (App Router) + `qr-scanner` (already a dependency — used for camera scan; `scanImage` static method reused for still images), Tailwind CSS 4, `next/image` (qr-image-upload)
- N/A — the image is transient input, decoded in-memory, never uploaded or persisted (qr-image-upload)

- TypeScript 5 + React 19 + Next.js ≥14 + Tailwind CSS 4 (header-action-icons)
- tsup (library bundler), react-router-dom 7 (MemoryRouter inside library)
- TypeScript 5 + React 19 + Next.js ≥14, Tailwind CSS 4, Framer Motion 12 (responsive-design)
- Tailwind logical properties (ps-, pe-, ms-, me-) for LTR/RTL layout; usePathname() for route-aware max-width cap (responsive-design)

## Project Structure

```text
src/
├── assets/icons/layout/header/   ← SVG icons (rdbsmall, scannercode, send, receive, eye)
├── context/                      ← React contexts (ScannerContext, StoreContext, etc.)
├── components/
│   ├── layout/Header/            ← Global header component
│   └── home/items/QR/            ← QR scanner + receive sheet overlays
└── app/(protected)/layout.tsx    ← Protected layout mounts Header + global overlays
```

## Commands

```bash
npm run lib:build   # build library dist/
npm run css:build   # build Tailwind CSS
npm run dev         # run standalone dev mode
npm run lint        # lint
```

## Code Style

- TypeScript: strict, type-first; all context types declared as interfaces
- Components: `'use client'` directive required on all interactive components
- Styling: Tailwind utility classes + CSS variables via
  `generateThemeVariables()`
- Context pattern: each concern has `*Context.tsx` with `*Provider` + `use*`
  hook
- Icon imports: SVG files imported as Next.js `Image` src; use `fill` +
  `object-contain`

- TypeScript 5 + React 19 + Next.js ≥14, Tailwind CSS 4, `@simplewebauthn/browser` ^13, `SubtleCrypto` Web Crypto API (SHA-256 PIN hashing) (webauthn-pin-lock)
- React Context state machine (BOOTING/SETUP_REQUIRED/LOCKED/UNLOCKED), `localStorage`-backed mock `passkeyApi.ts` service, existing `useIdleTimer` (180s), existing `PasscodeScreen` reused (webauthn-pin-lock)

## Recent Changes
- qr-image-upload: Added TypeScript 5, React 19, Next.js ≥14 (App Router) + `qr-scanner` (already a dependency — used for camera scan; `scanImage` static method reused for still images), Tailwind CSS 4, `next/image`
- step-face-reverify: Added TypeScript 5, React 19, Next.js ≥14 (App Router, edge runtime for API proxy) + Existing only — `FaceReverifyContext`/`FaceReverifyOverlay` (camera UX), `useStepUp` hook, `resetPasscodeApi` service, Framer Motion (flow transitions). **No new dependencies.**
- login-history: Added TypeScript 5 + React 19 + Next.js ≥14 + Tailwind CSS 4, Framer Motion 12, lucide-react, next/image

## Payment Request QR Format (payment-request-scan-pay)

- Request mode QR: `PAYREQ:{base64(iv+encryptedRequestCode)}|{requesterAccountNumber}`
- Address mode QR: `ana={name}&anu={number}&cu={currency}` (unchanged)
- Scanner detects PAYREQ: prefix → decrypts with account number → calls lookup API
- AES-GCM key = requester account number padded to 32 bytes
- `paymentRequests` namespace added to `core`, `server.ts`, and `client-actions.ts`
- `ParsedQR.requestMoneyId` renamed to `encryptedRequestCode`; `requesterAccount` field added


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
