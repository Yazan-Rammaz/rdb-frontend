# Plan — transaction receipt with Download / Share / Done

Spec: `_specs/transaction-receipt-download-share/spec.md`.
Branch: `fix/transaction-receipt-download-share` from `development`.

**Status: revision 2** — revised after committee review; decisions in §8.

## Shape of the change

Reuse the post-transfer receipt instead of building a second one. The ledger
row is mapped into the `ReceiptData` the receipt already takes, and the
receipt learns to theme itself from `data.status`. `TransactionDetails` keeps
its name and props, so neither caller (Home, Transactions) changes.

```text
src/components/QR/send/shared/receipt-types.ts      EDIT  optional direction, typeLabel, extraRows
src/components/QR/send/shared/receiptStatus.ts      NEW   status → tone (bg, accent, icons, headline key)
src/components/QR/send/shared/SuccessReceipt.tsx    EDIT  tone-driven header/status/bg; centred content
src/components/QR/send/shared/DownloadView.tsx      EDIT  tone-driven status mark; typeLabel; extraRows
src/components/transactions/items/TransactionDetails.tsx  REWRITE  ledger → ReceiptData → <SuccessReceipt>
src/components/home/content/transactions.tsx        EDIT  formatStatus: EXPIRED
src/i18n/locales/{en,ar,tr,ckb}.ts                  EDIT  receipt.headline.*, statusValue.expired,
                                                          amountReceived, fee/tax/note reuse, transactionStatus.expired
```

No new dependency (icons from `lucide-react`, already a dependency), no API,
type in `src/core/types/`, route or deployment-file change.

## 1. `ReceiptData` — three optional fields

```ts
direction?: 'IN' | 'OUT';      // headline + amount label; default OUT
typeLabel?: string;            // default t.transfer.receipt.typeValue
extraRows?: { label: string; value: string }[];  // fee / tax / note
```

All optional, so `TransferSuccess` and `PaymentRequestReview` compile and
behave unchanged.

## 2. `receiptStatus.ts` — the one status table

```ts
type ReceiptTone = 'success' | 'pending' | 'expired' | 'failed';
getReceiptTone(status: string): ReceiptTone   // COMPLETED → success, PENDING, EXPIRED, else failed
RECEIPT_TONES: Record<ReceiptTone, { bg: string; accent: string }>
```

Colours are the four already in `TransactionDetails.getStatusColor`. Icons are
picked in the component (React nodes don't belong in a plain table):
success keeps `transferdone.svg` / `success.svg`; pending `Clock`; expired
`TimerOff`; failed `XCircle` — lucide, stroked in `accent`.

Shared by `SuccessReceipt` and `DownloadView` so the screen and the image can
never disagree.

## 3. `SuccessReceipt` — themed and centred

- `bg` from the tone replaces the hard-coded `#F4FFFA` (root, action bar, QR
  background, and the `#bottom-sheet` background effect — whose dependency
  becomes `[bg]`).
- Header: success → existing paper-plane + `moneySentSuccess` (OUT) or
  `headline.received` (IN). Other tones → lucide icon in a 40 px accent-tinted
  circle + `headline.<tone>`.
- Status row icon per tone; status text via `statusValue[status]` (adds
  `expired`).
- Amount label: `amountReceived` when `direction === 'IN'`.
- Type: `data.typeLabel ?? typeValue`. Purpose: `data.purposeLabel || '—'`.
- `extraRows` render as extra `DetailRow`s in the same 2-column grid.
- Centring: the scroll container keeps `overflow-y-auto`; its single child
  gets `my-auto` (not `justify-center` on the container, which clips the top
  when the content overflows). Content gets `px-xd-16` so the 370-unit grid
  keeps a gutter on 320 px phones.

Download / Share / Done handlers, `html2canvas` preloading, file name and
inline feedback are untouched.

## 4. `DownloadView` — same status, same data

- Status row mark: success keeps `success.svg`; other tones draw a 10 px
  circle in `accent` (plain CSS — html2canvas renders it reliably, inline SVG
  less so).
- `typeLabel`, `amountReceived`, `extraRows`, purpose fallback — same rules as
  §3.

## 5. `TransactionDetails` — mapper + receipt

```ts
const receipt: ReceiptData = {
  referenceCode: ledger.referenceId || ledger.id,
  createdAt: ledger.createdAt,
  status: ledger.status,
  direction: ledger.direction,
  senderAccountNumber: ledger.senderAccount?.accountNumber || '—',
  senderMaskedName: ledger.senderAccount?.name ?? '',
  recipientAccountNumber: ledger.receiverAccount?.accountNumber || '—',
  recipientMaskedName: ledger.receiverAccount?.name ?? '',
  amount: String(ledger.amount),
  currency: ledger.assetSymbol,
  purposeLabel: ledger.metadata?.purposeName ?? '',
  inputMethod: ledger.metadata?.inputMethod,
  typeLabel: getTypeLabel(),           // existing switch, kept
  extraRows: [fee, tax, note].filter(Boolean),
};
return <SuccessReceipt data={receipt} onClose={onClose} />;
```

`senderFirstName` (share text) falls back to the account number, as today.
`description` from the old screen is dropped: it is the backend's English
free text, already rendered as the list subtitle.

## 6. List label + i18n

`formatStatus` gets `case 'EXPIRED'`. New keys mirrored in all four locales
(`TranslationSchema` makes a missing key a type error):

```text
transfer.receipt.headline.{received,pending,expired,failed}
transfer.receipt.statusValue.expired
transfer.receipt.amountReceived
home.transactionStatus.expired
```

## 7. Verification

- `npx tsc --noEmit`, `npm run lint`.
- Manual in `npm run dev`, Chrome device mode 320 / 375 / 430 px, en + ar:
  open a COMPLETED OUT, COMPLETED IN, PENDING and EXPIRED row from Home and
  from Transactions; Download → PNG; Share → clipboard on desktop; Done
  closes. Re-run a transfer to confirm AC-9.

## 8. Review committee feedback

Run sequentially against the three checklists in `.claude/agents/`
(this account does not allow sub-agents).

| Reviewer | Finding | Decision |
|---|---|---|
| Senior | `getReceiptTone` mapping `SUCCESS` is speculative — no producer sends it (minor) | **Accepted** — only `COMPLETED` / `PENDING` / `EXPIRED`; rest → failed |
| Senior | AC-9 depends on every existing caller passing `COMPLETED` (major, verify) | **Verified** — `TransferSuccess` passes `TransferResult.status`; payer flow hard-codes `'COMPLETED'` (`PaymentRequestReview.tsx:311`) |
| Senior | `senderAccount` / `receiverAccount` are optional on the ledger ("added by backend later") → empty `"  "` rows (minor) | **Accepted** — mapper falls back to `—` for the number and `''` for the name |
| Senior | `extraRows` is a generic list with one caller | **Kept** — three explicit fields would be more code for the same render; list is the smaller change |
| Senior | Dropping `description` loses data | **Accepted as-is** — it is backend English free text already shown as the list subtitle; noted in PR |
| Senior | Renaming `SuccessReceipt` | **Declined** — out of scope (spec) |
| Performance | `html2canvas` preload runs on every sheet open | **info** — `import()` resolves from the module cache after the first time; no change |
| Performance | Off-screen `DownloadView` always mounted | **info** — one extra small subtree while the sheet is open, as in the send flow |
| Performance | `#bottom-sheet` style effect must not churn | **Accepted** — depends on `[bg]`, a string constant per tone |
| Security | Ledger strings rendered into the receipt / QR / file name | **info** — text nodes only, no `dangerouslySetInnerHTML`, no URL built from them; `download` attribute strips path characters |
| Security | No deployment file, dependency, token or money-moving call touched | **info** — proceed |

## Rollback

Revert the commit. Only presentation files and locale keys change; no stored
or server state is involved.
