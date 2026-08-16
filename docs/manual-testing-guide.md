# Manual Testing Guide

> Scope: Post-login flows only. Auth, sign-up, and KYC are out of scope.
> Prerequisites: Tester is already logged in with a valid account that has sufficient balance.

---

## 1. Send / Transfer Money

### 1.1 Happy Path — Transfer by Account Number

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Tap the **Send** icon in the top-right header | Send bottom sheet opens |
| 2 | Tap **Transfer** | Recipient input screen appears |
| 3 | Type a valid account number (format `xxxx-xxxx`) | Input accepts the value |
| 4 | Tap **Confirm** (or press Enter) | Account is validated; recipient name and masked details appear |
| 5 | Enter a valid amount (e.g. `50`) | Amount field shows the value with currency symbol |
| 6 | Tap **Confirm** on the amount | Amount is validated against balance; no error shown |
| 7 | Select a **Purpose** from the dropdown | Purpose row shows the selection |
| 8 | Tap **Send** | Loading animation plays; success receipt screen appears |
| 9 | Tap **Close** | Sheet closes; home screen shows |

### 1.2 Transfer by Phone Number

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Open Send → Transfer | Recipient input screen |
| 2 | Switch to **Phone** tab / input mode | Phone number field active |
| 3 | Enter a valid phone number linked to an account | Recipient name and account resolved |
| 4 | Continue with amount + purpose + send | Success receipt shown |

### 1.3 Validation — Insufficient Balance

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Open Send → Transfer | Recipient input |
| 2 | Enter a valid recipient account and confirm | Recipient resolved |
| 3 | Enter an amount **greater than** the available balance | Error message shown (e.g. "Insufficient balance") |
| 4 | Correct the amount to a value within balance | Error clears |
| 5 | Complete the transfer | Success receipt |

### 1.4 Validation — Invalid Account Number

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Open Send → Transfer | Recipient input |
| 2 | Enter a non-existent account number and confirm | Error: account not found |
| 3 | Clear the field and enter a valid account | Recipient resolved correctly |

### 1.5 Edit After Confirm

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Confirm recipient account | Recipient shown |
| 2 | Tap the **Edit** icon next to the confirmed account | Field becomes editable again |
| 3 | Change to a different valid account and confirm | New recipient shown |
| 4 | Complete the transfer | Success with updated recipient |

### 1.6 Transfer via Scanned QR

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Open Send → Transfer | Recipient input |
| 2 | Tap the **Scan QR** icon | Camera opens |
| 3 | Point camera at a valid address-mode QR | Camera closes; recipient auto-filled |
| 4 | Confirm account and complete the transfer | Success receipt |

---

## 2. Payment Request — Generate QR

### 2.1 Address-Mode QR (Default Receive)

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Tap the **Receive** icon in the header | Receive sheet opens showing a QR code |
| 2 | Verify QR is visible and account number is shown below it | QR rendered with account details |
| 3 | Tap **Copy** | Toast confirms "Copied to clipboard" |
| 4 | Tap **Download** | QR image saved / download triggered |
| 5 | Tap **Share** | Device share sheet opens |

### 2.2 Generate a Time-Limited Payment Request

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Open Receive sheet | Default address QR visible |
| 2 | Tap **Request** tab/button | Payment request form appears |
| 3 | Enter **Amount** (e.g. `100`) | Field shows value |
| 4 | Select a **Purpose** from the dropdown | Purpose selected |
| 5 | Set **Validity** to `15m` | Dropdown shows "15 minutes" |
| 6 | (Optional) Add a **Note** | Note field accepts text |
| 7 | (Optional) Add a **Reference** | Reference field accepts text |
| 8 | Tap **Generate** | Loading; QR generated in PAYREQ format |
| 9 | Verify QR is displayed and countdown timer starts | Timer visible, counting down |
| 10 | Tap **Download** | QR image saved |
| 11 | Tap **Share** | Device share sheet opens |

### 2.3 Generate an Always-Valid Payment Request

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Open Receive → Request form | Form shown |
| 2 | Enter amount and purpose; set Validity to **Always** | Fields filled |
| 3 | Tap **Generate** | QR generated; no countdown timer shown |

### 2.4 Validation — Missing Required Fields

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Open Receive → Request form | Form shown |
| 2 | Leave **Amount** empty; tap **Generate** | Error: amount required |
| 3 | Fill amount but leave **Purpose** empty; tap **Generate** | Error: purpose required |
| 4 | Fill all required fields; tap **Generate** | QR generated successfully |

### 2.5 Expired Request

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Generate a payment request with Validity `1m` | QR shown with 1-minute countdown |
| 2 | Wait for the timer to reach 0 | QR fades / becomes disabled |
| 3 | Attempt to share / use the expired QR | QR blocked or cancel option shown |

---

## 3. Scan a Payment Request QR

### 3.1 Scan and Pay a Valid Payment Request

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Tap the **Scanner** icon in the header (home screen) | Camera opens |
| 2 | Scan a valid `PAYREQ:…` QR generated by another account | Scanner closes; payment request details shown (amount, purpose, requester) |
| 3 | Verify details match what was requested | Correct amount and purpose displayed |
| 4 | Tap **Pay** / **Confirm** | Transfer executes; success screen shown |
| 5 | Tap **Close** | Returns to home |

### 3.2 Scan an Address-Mode QR

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Tap **Scanner** | Camera opens |
| 2 | Scan a standard address QR (`ana=…&anu=…&cu=…`) | Scanner closes; recipient pre-filled in the Send flow |
| 3 | Enter amount and purpose; complete transfer | Success receipt |

### 3.3 Scan an Invalid / Unrecognized QR

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Tap **Scanner** | Camera opens |
| 2 | Scan a random QR (e.g. a website URL) | Error message shown; no transfer initiated |
| 3 | Tap close or retry | Camera or error dismissal |

### 3.4 Scan an Expired Payment Request

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Generate a `1m` payment request and let it expire | QR expired |
| 2 | Open Scanner and scan the expired QR | Error shown: request expired or not found |

---

## 4. Update Profile

### 4.1 Update Profile Photo

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Tap the **Settings** tab in the footer | Settings screen opens |
| 2 | Tap the **profile photo** area (top of screen) | Photo options appear (Camera / Gallery) |
| 3 | Tap **Gallery** | Device file picker opens |
| 4 | Select an image | Crop screen appears with draggable frame |
| 5 | Drag the frame to desired crop area | Frame moves within image bounds |
| 6 | Drag a corner handle to resize the frame | Frame resizes; min size enforced |
| 7 | Tap **Confirm** / **Done** | Cropped preview shown (800×800 output) |
| 8 | Tap **Save** | Upload in progress; spinner shown |
| 9 | Upload completes | Profile photo updates throughout the app |

### 4.2 Update Profile Photo via Camera

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Tap profile photo → **Camera** | Device camera opens |
| 2 | Capture a photo | Crop screen appears |
| 3 | Adjust crop and save | Photo updates |

### 4.3 Update Display Name (Unverified Account)

> Note: Name editing is only available if the account is **not** KYC-verified.

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Navigate to **Settings** | Settings screen |
| 2 | Tap **Client Information** | Information screen opens |
| 3 | Tap **Client Name** row | Name editor screen opens |
| 4 | Verify a warning banner shows (not KYC-verified) | Warning visible |
| 5 | Clear the name field and enter a new name (e.g. `John Doe`) | Field accepts input |
| 6 | Tap **Save** | Loading; toast confirms save; returns to settings |
| 7 | Re-open Client Information | Name updated everywhere |

### 4.4 Name Field — Verified Account (Read-Only)

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | On a KYC-verified account, navigate to Settings → Client Information → Client Name | Name editor opens |
| 2 | Verify name field is **disabled / read-only** | Cannot type in the field |
| 3 | Verify KYC documents (front, back, face) are displayed | Documents shown in gallery |
| 4 | Tap **Need Help About My Name** (if shown) | Opens help/contact flow |

### 4.5 View Personal QR Code

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Go to Settings → Client Information | Information screen |
| 2 | Tap the **QR** icon / row | Full-screen QR code displayed |
| 3 | Tap **Download** | QR saved to device |
| 4 | Tap **Share** | Share sheet opens |
| 5 | Tap **Close** | Returns to Client Information |

---

## 5. Edge Cases & Cross-Feature Checks

| # | Scenario | Expected Result |
|---|----------|----------------|
| 1 | Dismiss any bottom sheet by swiping down | Sheet closes; home screen intact |
| 2 | Rotate device mid-flow (if applicable) | Layout reflows; no data lost |
| 3 | Background app then return during an active request countdown | Timer continues from correct time |
| 4 | Start a transfer, go home, re-open Send | Flow resets to initial state |
| 5 | Attempt to pay your **own** payment request QR | Error: cannot pay own request |
| 6 | Network offline during transfer confirmation | Error shown; no duplicate transfer |
| 7 | Profile photo upload — select a very large image (>10 MB) | Handled gracefully (error or auto-compression) |
| 8 | Tap header action icons rapidly (double-tap) | Only one sheet opens; no duplicate modals |

---

## 6. Quick Regression Checklist

After any release, run through these in order:

- [ ] Home screen loads with correct balance
- [ ] Send → Transfer → account + amount + purpose → success
- [ ] Receive → address QR visible and downloadable
- [ ] Receive → Request → generate QR with amount + purpose
- [ ] Scanner → scan address QR → pre-fills Send flow
- [ ] Scanner → scan PAYREQ QR → shows request details and pays
- [ ] Settings → update profile photo (Gallery path)
- [ ] Settings → Client Information → name visible
- [ ] All bottom sheets open and close without layout breaks
