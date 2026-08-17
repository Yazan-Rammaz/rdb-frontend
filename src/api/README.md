# `src/api`

Every backend call the browser makes goes through here.

```
api/
├── client.ts            the one request() — auth, refresh, errors, URLs
├── index.ts             the `api` object you import
├── endpoints/           one module per domain, thin and typed
│   ├── auth.ts
│   ├── banking.ts
│   ├── paymentRequests.ts
│   ├── transactions.ts
│   ├── transfers.ts
│   └── wallets.ts
└── types/               request bodies + responses, one file per domain
    ├── common.ts        ApiResult, ApiError, pagination
    └── …
```

## Using it

```ts
import { api } from '@/api';

const res = await api.transfers.verify({
    toAccountNumber,
    amount,          // minor units, as a string
    currencySymbol,
});

if (!res.ok) {
    setError(res.error.message);   // already human-readable
    return;
}

showConfirmation(res.data.recipient.fullName, res.data.total);
```

Calls **never throw**. A network failure, a 404 and a validation error all come
back as `{ ok: false, error }`.

## Why `ApiResult` is a union

`{ ok: true; data: T } | { ok: false; error: ApiError }` rather than
`{ data?: T; error?: E }`. TypeScript then refuses to let you read `.data`
before checking `.ok`, which is what stops the "cannot read property of
undefined" class of bug reaching production.

## Why there are two types folders

There are two, and only one rule keeps them apart:

| | holds | owned by |
|---|---|---|
| `core/types/` | **domain models** — what a Wallet, AssetItem or LedgerEntry *is*. Imported by components that never touch the API. | the app |
| `api/types/` | **the call contract** — `ApiResult`/`ApiError`, and request bodies that exist only because an endpoint takes them | this layer |

**A model is declared once, in `core/types`, and re-exported here.** Never
redeclared. If you find yourself copying an interface across, stop: two identical
copies are free to drift, and drift is the exact failure this layer exists to
prevent. `AssetItem` and `TransferPurpose` were briefly duplicated during the
migration and had to be collapsed back.

Request bodies belong here because they have no life outside a call —
`VerifyOtpInput` is not a domain concept, it is "what this endpoint accepts".
Note that a request body is not always the wire body: `auth.verifyOtp` renames
`type` to `action` and adds `platform: 'web'` before sending.

If a type is only ever produced and consumed by one endpoint, declaring it here
is fine. The moment a component imports it to render something, it is a domain
model — move it to `core/types` and re-export.

## Adding an endpoint

1. Types in `types/<domain>.ts` — body under Requests, response under Responses
2. One function in `endpoints/<domain>.ts` calling `request()`
3. Nothing else. Do not export a URL, and never call `fetch` from a component.

Path parameters are encoded inside the endpoint module, not by the caller — a
caller passing an id containing `/` must not be able to alter the path.

## Conventions worth keeping

**Money is a string of minor units.** Piastres, cents. Never a JS number: `0.1 +
0.2` is why. Format at the render edge, compute with a decimal library.

**Model "or else" outcomes as unions.** A transfer that needs step-up auth is not
a completed transfer:

```ts
type SendTransferResponse =
    | { status: 'completed'; transactionId: string }
    | { status: 'step_up_required'; challengeId: string; method: 'face' | 'otp' };
```

The caller has to handle both. With optional fields it would compile while
silently treating a challenge as a success.

**Endpoints are named by their real path.** There was an opcode gateway that
routed some calls through a random-hash URL so endpoint names stayed out of the
bundle. It was removed: it was obfuscation rather than access control — every
endpoint still requires the httpOnly auth cookie — and it cost a second routing
table, a synthesized-request dispatcher, and endpoint modules that could not name
the route they called.

## What this replaced

Four browser→server paths: `apiFetch`, `apiFetchOp`, `pfetch`, and Server Actions
via `useActions()`. Components picked one largely by when they were written — and
they did not behave alike. Only the `apiFetch` pair refreshed an expired token,
so the same operation could recover silently in one screen and log the user out
in another.

Everything now funnels through `client.ts`, so refresh-on-401 is guaranteed
rather than dependent on which helper someone reached for.

Server-side code (`/api/*` route handlers) still uses `backendFetch` from
`lib/edgeProxy` — that is the other side of the boundary and stays separate.
