# Architecture Decision Record: Pages + Worker Split & Custom Domain for WebAuthn

**Author:** Yazan Ad
**Date:** 2026-06-03
**Status:** Implemented

---

## Summary

This document explains three interconnected infrastructure decisions:

1. Migrating the frontend from Cloudflare Workers to **Cloudflare Pages**
2. Keeping the KYC SDK on a dedicated **Cloudflare Worker**
3. Registering a real custom domain (`ramaaz-digital-bank.online`) instead of using the free `*.workers.dev` / `*.pages.dev` subdomains

Each decision was forced by hard technical constraints, not preference.

---

## Decision 1 — Frontend: Workers → Pages

### Why We Were on Workers

The initial deployment used a Worker to serve the Next.js frontend via the `@cloudflare/next-on-pages` adapter. This worked for early prototyping.

### Why We Moved to Pages

**Cloudflare Pages is the officially supported target for Next.js on Cloudflare.** The Workers runtime has a fundamental incompatibility with the Next.js App Router:

| Constraint | Workers | Pages |
|---|---|---|
| Next.js App Router support | Partial / unsupported | Full (`@cloudflare/next-on-pages`) |
| Edge Runtime APIs (Request, Response, crypto) | Subset only | Full Web Standards |
| Static asset serving | Manual KV binding required | Native, zero-config |
| Build integration | Manual wrangler deploy | Git-connected, automatic |
| Middleware support | Breaks on complex routes | Fully supported |
| `next/image` optimization | Not available | Available via Cloudflare Image Resizing |
| Cache-Control / stale-while-revalidate headers | Manual | Automatic from Next.js config |

The specific error that broke the Workers deployment was the **Edge Runtime** restriction: Workers only expose a subset of the Web Crypto API and do not support all Node.js-compatible APIs that Next.js middleware and server actions depend on. Pages runs on the same infrastructure but with the full set of Web Standard APIs correctly wired, which is why Cloudflare's own documentation explicitly recommends Pages for Next.js applications.

Attempting to work around these limitations on Workers would have meant maintaining a custom compatibility shim that would break on every Next.js upgrade — an unsustainable maintenance burden.

**Decision: Pages is the correct and supported runtime for this frontend. This is not a workaround; it is the intended architecture.**

---

## Decision 2 — KYC SDK: Stays on a Dedicated Worker

### Why the KYC SDK Cannot Move to Pages

The KYC SDK (identity verification, document scanning, liveness detection) runs server-side logic that is incompatible with the Pages Functions model:

1. **Long-running processes.** KYC verification involves sequential API calls to a third-party provider with timeouts that exceed the Pages Functions CPU time limit. Workers on the paid plan support higher CPU time limits and are the correct environment for this.

2. **Binary / streaming responses.** The SDK proxies document image uploads as multipart streams. Pages Functions have constraints on request body size and streaming behavior that the Worker handles natively.

3. **Isolated secret scope.** KYC API keys and signing secrets should not live in the same deployment as the frontend. Keeping the KYC Worker separate enforces a hard security boundary: the frontend Pages deployment has zero access to KYC credentials.

4. **Independent scaling and deployment.** KYC verification load is unpredictable (spikes during onboarding campaigns). A dedicated Worker can be scaled, rate-limited, and deployed independently without touching the frontend deployment pipeline.

5. **Runtime API requirements.** The KYC SDK uses `crypto.subtle` for request signing and streams `ReadableStream` bodies — APIs that are fully available in the Workers runtime but have known edge cases in Pages Functions when combined with middleware.

### Architecture

```
Browser / Mobile App
       │
       ├──► Cloudflare Pages  (Next.js frontend, all UI routes)
       │
       └──► Cloudflare Worker (KYC SDK proxy, /api/kyc/* routes)
                   │
                   └──► Third-party KYC Provider API
```

This split is a well-established pattern in Cloudflare's own documentation ("Backend for Frontend" or BFF pattern). It is not over-engineering — it is the minimum viable separation required by the technical constraints of each runtime.

---

## Decision 3 — Real Custom Domain: `ramaaz-digital-bank.online`

This is the most critical decision and the one with the most direct business impact.

### The Problem: WebAuthn / Passkeys Are Bound to a Registered Domain (RP ID)

WebAuthn (the standard behind Face ID, fingerprint, Windows Hello, and Google Password Manager passkeys) works by binding a credential to an **RP ID** — a Relying Party Identifier, which is always a **registrable domain suffix**.

The W3C WebAuthn specification, section 5.4.1, states:

> *"The RP ID must be a registrable domain suffix of, or equal to, the caller's origin's effective domain."*

`workers.dev` and `pages.dev` are **Public Suffix List (PSL) entries**. This means:

- `ramaaz.workers.dev` and `another-app.workers.dev` are treated as **different registrable domains**.
- **An RP ID cannot be set to `workers.dev` or `pages.dev`** because they are public suffixes, not owned domains.
- Any passkey registered on `ramaaz.workers.dev` is permanently and irrevocably tied to that exact subdomain and cannot be used from any other origin.

### Why This Kills the Mobile + Web Use Case

Our application has both a **web frontend** and an **Android app** (and planned iOS app). For a user to register one fingerprint/Face ID/passkey and use it on both the web and the mobile app, the WebAuthn RP ID must be **the same on both platforms**.

| Platform | Requirement |
|---|---|
| Web (browser) | RP ID must match the page's registrable domain |
| Android (FIDO2 / Digital Asset Links) | RP ID must match `assetlinks.json` hosted at `https://<rp-id>/.well-known/assetlinks.json` |
| iOS (passkeys) | RP ID must match `apple-app-site-association` at `https://<rp-id>/.well-known/apple-app-site-association` |

**Android categorically rejects `workers.dev` and `pages.dev` as RP IDs.** Google's FIDO2 implementation on Android validates that the RP ID is a real registered domain that the app publisher controls — a domain on the Public Suffix List fails this check entirely. This is enforced at the OS level and cannot be bypassed.

### What Breaks Without a Real Domain

| Feature | `*.workers.dev` / `*.pages.dev` | `ramaaz-digital-bank.online` |
|---|---|---|
| Register passkey on web | ✅ works (isolated to that subdomain) | ✅ works |
| Register passkey on Android | ❌ rejected by OS | ✅ works |
| Same passkey usable on web AND Android | ❌ impossible | ✅ works |
| Google Password Manager sync | ❌ blocked (PSL domain) | ✅ works |
| Windows Hello credential sync | ❌ blocked | ✅ works |
| `assetlinks.json` verification | ❌ Android rejects PSL domains | ✅ verified |
| Face ID / Touch ID on iOS | ❌ blocked (PSL domain) | ✅ works |

### The `assetlinks.json` File

The `assetlinks.json` file (already in the repository root) is the mechanism by which Android verifies that the web domain and the Android app are controlled by the same publisher. It must be served at:

```
https://ramaaz-digital-bank.online/.well-known/assetlinks.json
```

Google's Play Services fetches this file when the user attempts to use a passkey on Android. If the domain is not a real registered domain — or if it is a shared public suffix like `workers.dev` — Google rejects the entire handshake. There is no workaround.

### Security Benefit of the Custom Domain

Beyond WebAuthn, owning the domain provides:

- **TLS certificate under our control** — not shared infrastructure
- **Ability to set HSTS preload** — protects users from SSL stripping
- **Custom CSP and security headers** — not overridden by Cloudflare's defaults for shared subdomains
- **Professional trust signals** — banking application on `workers.dev` would immediately fail any security or compliance review

---

## Summary of Decisions

| Decision | Chosen Approach | Alternative Considered | Why Alternative Was Rejected |
|---|---|---|---|
| Frontend hosting | Cloudflare Pages | Cloudflare Workers | Workers lacks full Edge Runtime support for Next.js App Router; Pages is the officially supported target |
| KYC SDK hosting | Dedicated Cloudflare Worker | Pages Functions | CPU limits, streaming constraints, security isolation of credentials |
| Domain | `ramaaz-digital-bank.online` (registered) | `*.workers.dev` / `*.pages.dev` | PSL domains are rejected by Android FIDO2; WebAuthn RP ID cannot span platforms on a public suffix |

---

## References

- [Cloudflare Docs — Deploy Next.js on Pages](https://developers.cloudflare.com/pages/framework-guides/nextjs/)
- [W3C WebAuthn Spec — RP ID (§5.4.1)](https://www.w3.org/TR/webauthn-2/#rp-id)
- [FIDO Alliance — Android FIDO2 API](https://developers.google.com/identity/fido/android/native-apps)
- [Google — Digital Asset Links (`assetlinks.json`)](https://developers.google.com/digital-asset-links/v1/getting-started)
- [Mozilla Public Suffix List](https://publicsuffix.org/)
- [Cloudflare — Workers vs Pages Functions](https://developers.cloudflare.com/workers/platform/workers-vs-pages-functions/)
