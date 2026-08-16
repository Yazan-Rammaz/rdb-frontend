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

**Opaque routing is a client detail.** Pass `op: 'sv'` in the endpoint module and
the call goes through the `/api/p` gateway instead of a named URL. Call sites do
not know or care.

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
