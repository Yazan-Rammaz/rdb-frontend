# Tester Guide — Send Transfer & Payment Request

**Date**: 2026-04-11
**Scope**: Two end-to-end test scenarios for QA engineers

---

## Scenario 1 — Transfer | Send (Send Money to Another Account)

### Overview

The user sends money to another RDB account using an account number, phone number, or QR code scan. The flow ends with a downloadable receipt.

---

### Pre-conditions

- User is logged in with an active account
- Sender account has sufficient balance (e.g., at least 10 USD)
- Test recipient accounts are available (see test data below)

### Test Data

| Field | Value |
|---|---|
| Sender Account | 100-1128 |
| Sender Name (masked) | M***** A***** |
| Sender Balance | 1000 USD |
| Valid Recipient Account | 100-708 |
| Invalid Account (wrong format) | 999999 (does not start with 1) |
| Non-existent Account | 199999 |
| Phone Number (valid) | +9665XXXXXXXX |
| QR Code Content (account) | `an=100708` |
| Transfer Purposes | Work/Partnership, Service Fees, Home Rent, Office/Company |

---

### TC-S-01 — Happy Path: Send via Account Number

**Steps**:
1. Open the bottom sheet from the home screen
2. Tap "Send | Pay | Cash Withdrawal"
3. Tap "Transfer | Send"
4. Verify the sender balance card shows account number, masked name, balance, and currency
5. In the "Send To" field, enter `100708`
6. Wait for account validation — verify recipient details appear (account number + masked name)
7. Tap "Confirm" on the recipient
8. Enter amount `50`
9. Verify balance is sufficient — no error shown
10. Tap "Confirm" on the amount
11. Select a purpose (e.g., "Work/Partnership")
12. Verify the "Send" button is now enabled
13. Tap "Send"
14. Verify loading state ("Sending...") appears on the button
15. Verify the success receipt screen appears

**Expected Results on Receipt Screen**:
- Green paper plane icon
- "THE MONEY WAS SENT SUCCESSFULLY" message
- QR code displayed
- Verification code (e.g., 200192)
- Sender account number + masked name
- Recipient account number + masked name
- Amount: 50 USD
- Reference number (e.g., TSCR10012)
- Date and time of transaction
- Type: Transfer | Send
- Purpose selected
- Status: Succeeded (with checkmark)
- "Done", "Download", "Share" buttons visible

**Pass Criteria**: All receipt fields match the submitted data. No error shown during flow.

---

### TC-S-02 — Send via Phone Number

**Steps**:
1. Navigate to Transfer | Send screen
2. On the "Send To" field, tap the "Phone Number" toggle
3. Verify the input shows a "+" prefix
4. Enter a valid phone number (e.g., `+9665XXXXXXXX`)
5. Wait for account resolution
6. Verify recipient details appear (same as account number mode)
7. Verify the "Phone Number" toggle is hidden after recipient is confirmed
8. Complete the transfer (amount + purpose + Send)

**Pass Criteria**: Phone number resolves to an account correctly. Toggle hides after confirmation. Transfer completes successfully.

---

### TC-S-03 — Paste Clipboard into Recipient Field

**Steps**:
1. Copy `100708` to the device clipboard
2. Navigate to Transfer | Send screen
3. Tap the blue "Paste" label inside the recipient input field
4. Verify `100708` is pasted into the field automatically
5. Wait for validation to complete

**Pass Criteria**: Clipboard content fills the field without manual typing. Validation proceeds normally.

---

### TC-S-04 — Send via QR Code Scan

**Steps**:
1. Prepare a QR code containing `an=100708`
2. Navigate to Transfer | Send screen
3. Tap the QR scan icon inside the recipient input field
4. Scan the QR code
5. Verify account number `100708` is extracted and placed in the field
6. Verify recipient details load automatically

**Pass Criteria**: QR scan auto-populates account number. Validation proceeds normally.

---

### TC-S-05 — Invalid Account Number Format

**Steps**:
1. Navigate to Transfer | Send screen
2. Enter `999999` in the recipient field (does not start with 1)
3. Trigger validation

**Expected Error**:
`Incorrect Account Number. It Should Start With 1 And Consist Of 6 Digits.`

**Visual**: Light red/pink background, centered text.

**Pass Criteria**: Error message appears with correct text and styling. Send button remains disabled.

---

### TC-S-06 — Account Not Found

**Steps**:
1. Navigate to Transfer | Send screen
2. Enter `199999` (valid format, but non-existent account)
3. Trigger validation

**Expected Result**: Error message displayed — account not found.

**Pass Criteria**: Appropriate error shown. Flow does not proceed to amount entry.

---

### TC-S-07 — Currency Mismatch Warning

**Steps**:
1. Navigate to Transfer | Send screen
2. Enter an account number that has a different currency than the sender
3. Trigger validation

**Expected Result**: Warning message — "The Account Currency Is Different From The Sending Account."

**Pass Criteria**: Warning is shown. User can still choose to proceed (it is not a blocking error).

---

### TC-S-08 — Insufficient Balance

**Steps**:
1. Navigate to Transfer | Send screen
2. Enter a valid recipient account
3. Enter an amount greater than the sender's balance (e.g., `99999`)
4. Trigger amount validation

**Expected Result**: Inline error — insufficient balance message.

**Pass Criteria**: Error appears in the same inline style (pink/red background). Send button remains disabled.

---

### TC-S-09 — Balance Card Toggle and Refresh

**Steps**:
1. Navigate to Transfer | Send screen
2. Verify the balance card shows the balance amount
3. Tap the eye icon
4. Verify balance is hidden (masked)
5. Tap the eye icon again
6. Verify balance is visible again
7. Tap the refresh icon
8. Verify a 1–2 second loading state and then updated balance appears

**Pass Criteria**: Eye toggle hides/shows balance. Refresh fetches updated data with loading state.

---

### TC-S-10 — Edit Confirmed Fields

**Steps**:
1. Navigate to Transfer | Send screen
2. Enter and confirm a valid recipient account
3. Tap "Edit" on the recipient field
4. Verify the field returns to editable state
5. Verify the phone number toggle reappears

**Pass Criteria**: Editing a confirmed field resets downstream fields. Toggle returns when editing recipient.

---

### TC-S-11 — Download and Share Receipt

**Steps**:
1. Complete a successful transfer (TC-S-01)
2. On the receipt screen, tap "Download"
3. Verify the receipt is saved as a PNG file
4. Tap "Share"
5. Verify the native share dialog opens with the receipt image

**Pass Criteria**: Download saves the file. Share opens the OS share sheet.

---

### TC-S-12 — Done Button on Receipt

**Steps**:
1. Complete a successful transfer
2. On the receipt screen, tap "Done"

**Pass Criteria**: Receipt closes and the user is returned to the previous screen state.

---

### TC-S-13 — Empty Clipboard (Paste with Nothing)

**Steps**:
1. Ensure device clipboard is empty
2. Navigate to Transfer | Send screen
3. Tap the blue "Paste" label

**Pass Criteria**: No error is shown. Nothing is pasted. Field remains empty.

---

### TC-S-14 — Invalid QR Code Format

**Steps**:
1. Prepare a QR code that does NOT contain `an=` key (e.g., random text)
2. Tap the QR scan icon in the recipient field
3. Scan the invalid QR code

**Pass Criteria**: Error is shown — invalid QR format. Field is not populated.

---

### TC-S-15 — Send to Own Account

**Steps**:
1. Navigate to Transfer | Send screen
2. Enter the sender's own account number (100-1128 → `1001128`)
3. Trigger validation

**Pass Criteria**: API returns an error. User cannot send money to themselves.

---

## Scenario 2 — Payment Request (Create QR & Scan to Pay)

### Overview

A requester generates a payment request QR code. A payer scans it, reviews the request details, and confirms payment. The QR payload is encrypted using the requester's account number as the AES-GCM key.

---

### Pre-conditions

- Both requester and payer are logged in on separate devices (or use test accounts)
- Backend APIs are running: `POST /payment-requests`, `GET /payment-requests/lookup/{code}`, `POST /payment-requests/{id}/fulfill`, `PATCH /payment-requests/{id}/cancel`
- Requester has an active account with a known account number

### Test Data

| Field | Value |
|---|---|
| Requester Account | 100-1128 |
| Payer Account | 100-708 |
| Request Amount | 75 USD |
| Validity Options | 3m, 15m, 1h, 24h, Always |
| Purposes | Available from API |
| QR Prefix (Request Mode) | `PAYREQ:` |
| QR Format (Address Mode) | `ana=name&anu=number&cu=currency` |

---

### TC-P-01 — Happy Path: Create Payment Request QR

**Steps**:
1. Open the receive screen (from the home bottom sheet)
2. Switch to "Request" mode
3. Enter amount `75`
4. Select a purpose from the list
5. Select validity "15m"
6. Add an optional note (e.g., "Lunch payment")
7. Tap "Generate"
8. Verify the button shows a loading state while the API call is in progress
9. Verify a QR code appears on screen

**Expected Results**:
- QR code is displayed
- A countdown timer for 15 minutes is visible
- QR payload starts with `PAYREQ:` (not visible to user but verifiable via QR reader app)
- Raw `requestCode` is NOT directly in the QR (it is encrypted)

**Pass Criteria**: QR generated within ~3 seconds (excluding network). Timer visible. Payload is encrypted.

---

### TC-P-02 — Always Validity (No Expiry)

**Steps**:
1. Open the receive screen → Request mode
2. Enter amount and purpose
3. Select validity "Always"
4. Tap "Generate"

**Expected Results**:
- QR code appears
- No countdown timer visible
- API called with `isPermanent: true`

**Pass Criteria**: No expiry timer. QR works indefinitely.

---

### TC-P-03 — API Error During Generate

**Steps**:
1. Open the receive screen → Request mode
2. Fill in amount and purpose
3. Simulate a network error (disable network or use a test error account)
4. Tap "Generate"

**Expected Results**:
- Error toast/message appears
- The form remains editable
- User can retry by tapping "Generate" again

**Pass Criteria**: Error is surfaced clearly. Form is not locked. No duplicate requests created.

---

### TC-P-04 — Scan Payment Request QR and Pay

**Steps**:
1. Use the requester device to generate a QR (TC-P-01)
2. On the payer device, open the scanner
3. Scan the requester's QR code
4. Verify the review screen loads with:
   - Requester name and account number
   - Amount (75 USD)
   - Purpose name
   - Note (if entered)
   - Reference number
   - Expiry countdown (15 minutes remaining)
   - Status: ACTIVE
5. Tap "Confirm" / "Pay"
6. Verify payment success screen appears

**Pass Criteria**: All request details displayed correctly. Payment confirmed. Balances refresh after success.

---

### TC-P-05 — Expired Payment Request

**Steps**:
1. Create a payment request with validity "3m"
2. Wait for 3 minutes (or simulate expiry via backend)
3. Scan the QR code on the payer device
4. Verify the review screen loads

**Expected Results**:
- Pay button is disabled
- Expiry message is shown
- Status badge shows: EXPIRED

**Pass Criteria**: Expired requests cannot be paid. Clear expiry message shown.

---

### TC-P-06 — Fulfilled Payment Request

**Steps**:
1. Create and pay a payment request (TC-P-01 + TC-P-04)
2. Scan the same QR code again on a different payer device

**Expected Results**:
- Review screen loads
- Status badge shows: FULFILLED
- Pay button is disabled
- Message indicates request is already fulfilled

**Pass Criteria**: Fulfilled requests cannot be paid again.

---

### TC-P-07 — Cancel Payment Request (Requester Side)

**Steps**:
1. Create a payment request (TC-P-01)
2. On the QR screen, tap "Cancel"
3. Enter a cancellation reason
4. Confirm cancellation

**Expected Results**:
- API call to `PATCH /payment-requests/{id}/cancel` is made
- Status updates to: CANCELLED
- Pay/Fulfill button is hidden or disabled

**Pass Criteria**: Cancellation succeeds. Status updates immediately. Cannot be paid after cancellation.

---

### TC-P-08 — Scan Already-Cancelled Request

**Steps**:
1. Cancel a payment request (TC-P-07)
2. Scan the QR code on payer device

**Expected Results**:
- Status badge shows: CANCELLED
- Pay button is disabled
- Appropriate cancellation message shown

**Pass Criteria**: Cancelled requests are blocked from payment.

---

### TC-P-09 — Address Mode QR (No Amount)

**Steps**:
1. Open the receive screen
2. Switch to "Address" mode (no amount, just account number)
3. Verify a QR is shown with format `ana=name&anu=number&cu=currency`
4. Scan this QR from the payer device

**Expected Results**:
- QR does NOT have `PAYREQ:` prefix
- No API call made on the requester side
- Payer scanner routes to the standard account number transfer flow

**Pass Criteria**: Address mode QR works identically to before. No regression.

---

### TC-P-10 — Payer Has Insufficient Balance

**Steps**:
1. Create a payment request for an amount larger than the payer's balance
2. Payer scans and taps "Pay"

**Expected Results**:
- API returns an error from `POST /payment-requests/{id}/fulfill`
- Error is displayed to the payer
- Request remains ACTIVE (not fulfilled)

**Pass Criteria**: Insufficient balance error surfaced. Request not fulfilled.

---

### TC-P-11 — Expiry Countdown Reaches Zero While on Review Screen

**Steps**:
1. Create a payment request with validity "3m"
2. Payer scans and opens the review screen
3. Wait for the countdown to reach zero (do not tap Pay)

**Expected Results**:
- Countdown timer reaches 00:00
- Pay button disables automatically
- Expiry message appears without requiring a page refresh

**Pass Criteria**: Real-time countdown works. Button disables at expiry without user action.

---

### TC-P-12 — Malformed QR Code

**Steps**:
1. Open the scanner
2. Scan a QR code with random or unrecognized content (no `PAYREQ:` prefix, no `an=` key)

**Expected Results**:
- Error is shown — unrecognized QR format
- User is returned to the scanner or shown a retry option

**Pass Criteria**: No crash. Clear error message. User can retry.

---

### TC-P-13 — Corrupted Encrypted Payload (Decryption Failure)

**Steps**:
1. Scan a QR that starts with `PAYREQ:` but has corrupted/invalid encrypted data
2. Verify decryption failure handling

**Expected Results**:
- App attempts decryption — fails
- Falls back to account number transfer flow, OR shows error if fallback also fails
- No crash

**Pass Criteria**: Graceful degradation. No unhandled exception.

---

### TC-P-14 — Share and Download Payment Request QR

**Steps**:
1. Create a payment request (TC-P-01)
2. On the QR screen, tap "Download"
3. Verify QR image is saved
4. Tap "Share"
5. Verify OS share dialog opens with the QR image

**Pass Criteria**: Download and Share work correctly on the QR screen.

---

### TC-P-15 — Validity Options Map to Correct API Values

| Validity Selected | Expected API Field |
|---|---|
| 3m | `expiryMinutes: 3` |
| 15m | `expiryMinutes: 15` |
| 1h | `expiryMinutes: 60` |
| 24h | `expiryMinutes: 1440` |
| Always | `isPermanent: true`, `expiryMinutes: 0` |

**Steps**:
1. For each validity option, create a payment request
2. Inspect the API request payload (via network inspector or backend logs)
3. Verify the correct fields are sent

**Pass Criteria**: All 5 validity options map to the exact expected API fields.

---

## General Notes for Testers

- **Account number format**: 6 digits, must start with 1 (e.g., `100708`). Displayed with hyphen as `100-708`.
- **Masked names**: Pattern is `F***** L*****` (first letter visible, rest asterisked per word).
- **QR prefix detection**: The scanner routes based on payload prefix — `PAYREQ:` for payment requests, `an=` for address/account-number transfers.
- **Encryption**: AES-GCM 256-bit. Key = requester account number padded to 32 bytes. The raw `requestCode` must never appear unencrypted in the QR.
- **Retry logic**: API calls retry up to 3 times with exponential backoff (1s, 2s, 4s). Client errors (4xx) are not retried.
- **Wallet types**: Personal (Main) and Business wallets may have different currencies. Currency mismatch in Send flow shows a warning.
- **Idempotency**: Generate and Fulfill include idempotency keys — re-tapping should not create duplicate requests.
