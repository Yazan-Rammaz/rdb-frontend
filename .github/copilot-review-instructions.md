# Copilot Code Review Instructions — RDB (Ramaaz Digital Banking)

> This is a **publishable Next.js UI library** (not a standalone app).
> Every change must work for host-app consumers, not just this repo.

---

## 🔴 Critical — Always Flag

### Server / Client Boundary Violations
- `'use client'` is **required** on every interactive component. Flag any component using hooks, state, or event handlers without it.
- `'use server'` must appear **only** in `src/core/server.ts`. Flag if it leaks to components or contexts.
- Server actions must **never** import client-only code (hooks, contexts, `useState`, `useEffect`).
- Client components must **never** import server actions directly — they receive them via the `actions` prop through `useActions()` hook or context.

### Library Boundary Violations
- Internal contexts (`AuthContext`, `ScannerContext`, `StoreContext`, `ToastContext`, `LayoutContext`, `PasskeyContext`, `RDBContext`) must **not** be exported from `src/rdb/index.ts` unless explicitly required by consumers.
- `package.json` exports (`./server`, `./core`, `./styles`) must match the intended public API. Flag any new export that exposes internals.
- Peer dependencies (`react`, `react-dom`, `next`) must stay **external** in `tsup.config.ts`. Flag if someone bundles them.

### Security & Cryptography
- All encryption must use **native `SubtleCrypto` (Web Crypto API)** only. Flag any import of `crypto-js`, `bcryptjs`, `node-forge`, or similar external crypto libraries.
- AES-GCM key derivation must follow the spec: account number padded to 32 bytes (`secret.padEnd(32, '\0').slice(0, 32)`). Flag deviations.
- `accessToken` lives **only** in `PasskeyContext` state — never in `localStorage`, `sessionStorage`, cookies, or any browser-persisted storage.
- Flag any hardcoded secrets, API keys, tokens, or credentials in source code.
- Flag any `console.log` that leaks sensitive data (tokens, PINs, account numbers, passwords).

### State Management
- State must use **React Context only**. Flag any import of Zustand, Redux, MobX, Jotai, Valtio, or any external state library.
- Every context must follow this exact pattern:
  - Interface for context type (`interface *ContextType`)
  - `createContext<*ContextType | undefined>(undefined)`
  - `*Provider` component with `children` prop
  - `use*` hook that throws if used outside provider

---

## 🟡 Important — Review Carefully

### TypeScript
- **Strict mode** is enabled. Flag implicit `any` in function params, return types, or variable declarations.
- Context types must be declared as **`interface`**, not `type`. Flag `type *ContextType = { ... }`.
- Action function signatures should be fully typed. Tolerating `any` in server wrappers (`server.ts`) is accepted but discourage spreading it to new code.
- Flag missing return types on exported functions and hooks.
- Prefer `const` over `let`; flag any use of `var`.

### Styling & Theming
- Use **Tailwind CSS utility classes** only. Flag inline `style={{ }}` unless it's for truly dynamic values (e.g., animation transforms, runtime-calculated positions).
- Colors and fonts must come from **CSS variables** (e.g., `text-foreground`, `bg-button`, `border-border`). Flag any hardcoded hex colors (`#3066CC`), rgb values, or font-family strings in components.
- For RTL/LTR support, use Tailwind **logical properties** (`ps-`, `pe-`, `ms-`, `me-`, `rounded-s-`, `rounded-e-`). Flag `pl-`, `pr-`, `ml-`, `mr-` in new code.
- The library uses `clsx` + `tailwind-merge` for conditional class merging. Flag string concatenation for complex class logic.

### Component Design
- Components should be **small, focused, and composable**. Flag God components doing too many things.
- Separate **rendering from logic** — hooks and utility functions should handle business logic, components should handle rendering.
- Props should be minimal and meaningful. Flag components accepting more than ~8 props without refactoring into composition or sub-components.

### Routing
- Library uses **`react-router-dom` v7 `MemoryRouter`** internally. Flag any use of `BrowserRouter`, `HashRouter`, or Next.js `useRouter` for in-library navigation.
- `useUniversalRouter` hook is the library's routing abstraction. Prefer it over direct `useNavigate()`.

### i18n & Localization
- All user-facing strings must go through the **i18n system** (`useI18n` / translation keys). Flag raw hardcoded English strings in UI components.
- Supported languages: `en`, `ar`, `tr`. RTL languages: `ar`. Translation files are in `src/i18n/locales/`.
- Locale format is `country-language` (e.g., `sy-en`, `lb-ar`). Language is extracted from the part after the dash.

### Error Handling
- API calls should have proper error handling with user-facing feedback (Toast context). Flag silent `catch` blocks that swallow errors without notifying the user.
- Flag empty `catch (error) { }` blocks — at minimum they should log to console.
- Async functions in event handlers must be wrapped in try/catch.

### Hooks
- Custom hooks in `src/hooks/` should follow the `use*` naming convention.
- Flag hooks that do too much — they should have a single responsibility.
- `useIdleTimer` has a 180s (3 minute) timeout that triggers PasskeyContext lock. Flag any change to this behavior without discussion.

---

## 🟢 Good Practices — Encourage

### Performance
- Encourage `useCallback` / `useMemo` for functions and computed values passed as props to child components, especially in contexts.
- Encourage lazy loading for heavy components (QR scanner, html2canvas).
- Flag unnecessary re-renders: objects/arrays created inline in JSX props (e.g., `style={{}}`, `options={[]}`) without memoization in hot paths.

### Import Organization
- Prefer `@/*` path alias (maps to `./src/*`) over relative imports that climb more than two levels (`../../../`).
- Group imports: React/Next → external libraries → internal modules → types → assets.

### Action Module Pattern
- New backend integrations should follow the existing pattern:
  1. Domain module in `src/core/actions/` (e.g., `banking.ts`)
  2. Export from `src/core/index.ts` (grouped + flat)
  3. Server wrapper in `src/core/server.ts`
  4. Client proxy stub in `src/core/client-actions.ts`
  5. Type definitions in `src/core/types/`
- Flag any backend call made directly from a component (bypassing the core action layer).

### API Layer
- HTTP calls go through `src/lib/api.ts` (axios-based). Flag direct `fetch()` or new axios instances in components.
- The `useActions()` hook resolves actions based on execution mode (Server Action Bridge vs Client RPC). All component-level API calls must go through this hook.

---

## ⛔ Never Accept

| Rule | Why |
|------|-----|
| External state library imports | Library uses React Context exclusively |
| External crypto library imports | Must use native SubtleCrypto only |
| `BrowserRouter` / `HashRouter` | Library is embedded via MemoryRouter |
| `localStorage.setItem('token', ...)` | Tokens live only in React state (PasskeyContext) |
| Hardcoded colors/fonts in components | Must use CSS variables / Tailwind theme tokens |
| `console.log` with tokens or PINs | Security risk — sensitive data exposure |
| `var` declarations | Use `const` or `let` |
| Missing `'use client'` on interactive components | Breaks SSR/library boundary |
| Direct API calls from components | Must go through core actions → useActions() |
| New peer deps bundled in tsup | Must be marked external |

---

## 📁 Key File Map (for context during review)

```
src/core/server.ts          → Server action wrappers ('use server')
src/core/index.ts           → Grouped + flat action exports
src/core/actions/           → Domain action modules
src/core/client-actions.ts  → Client RPC stubs
src/rdb/index.ts            → Public library exports
src/rdb/components/RDB.tsx  → Main entry component
src/context/                → All React contexts (internal)
src/hooks/                  → Custom React hooks
src/components/             → UI components (by domain)
src/i18n/                   → Translation system + locale files
src/lib/api.ts              → Axios HTTP layer
src/services/passkeyApi.ts  → WebAuthn/PIN mock service
src/styles/                 → Tailwind entry point + globals
```

---

## 💡 Review Tone

- Be **direct and actionable** — say what's wrong and how to fix it.
- Only flag things that **genuinely matter**: bugs, security issues, boundary violations, pattern breaks.
- Do **not** comment on formatting, trailing whitespace, or personal style preferences — that's the linter's job.
- When a pattern is violated, reference **which rule** from this document applies.
