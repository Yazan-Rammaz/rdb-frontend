# Manual Test Plan — KYC & Forget Passcode

Pure test scenarios (no code/APIs). Organized by account state and session state.

---

## Part 1 — KYC / Identity Verification

### A. Account state at entry

| # | Scenario | Expected result |
|---|----------|----------------|
| K1 | **Not-verified** account opens verification | Intro screen appears with "Start Verification" + "Later, use limited version" |
| K2 | **Already-verified** account tries to re-enter verification | Skips flow, lands straight on Home (no re-doing) |
| K3 | Account **pending review** opens verification | Sent back to Home, told it's under review (cannot re-submit) |
| K4 | **Previously rejected** account re-enters | Allowed to start the full flow again from the intro |

### B. The verification steps (happy path)

| # | Scenario | Expected result |
|---|----------|----------------|
| K5 | Capture ID front, then back | Both images accepted, advance to ID summary |
| K6 | Review extracted ID details (name, number, birthday, expiry) | Details shown correctly; confirm to continue |
| K7 | Liveness: look straight → turn right → turn left | Each gesture detected in order, progress advances |
| K8 | Face match (selfie vs ID photo) | Scanning animation runs, match succeeds, success screen shown |
| K9 | Success screen | Celebratory screen, auto-redirect to Home; account now shows verified |
| K10 | Skip via "Later, use limited version" | Goes to Home with limited features; can verify later |

### C. KYC failure / edge scenarios

| # | Scenario | Expected result |
|---|----------|----------------|
| K11 | ID photo blurry / dark / angled | Capture rejected with a hint to retake |
| K12 | ID unreadable (OCR can't extract fields) | Prompted to retake the document |
| K13 | **Presented / fake face** (photo of a photo, screen) at liveness | Rejected as non-real face, retry offered |
| K14 | Liveness gesture wrong / not following prompts | Hint shown (eyes open, remove glasses, lighting), retry within attempt limit |
| K15 | Exceed liveness attempt limit | Flow resets / blocked appropriately |
| K16 | Selfie does **not** match ID face | Mismatch message, option to "Try Again" / "Rematch" |
| K17 | Borderline match score (just below threshold) | Treated as failure, retry path |

### D. KYC session scenarios

| # | Scenario | Expected result |
|---|----------|----------------|
| K18 | Session expires mid-flow, then submit | A fresh session is fetched; no error to the user |
| K19 | Retry after a rejected submission | New session used, not the consumed one |
| K20 | Leave flow midway and return | Resumes from first incomplete step (not from scratch) |
| K21 | Lose camera permission mid-flow | Clear prompt to re-grant camera access |

---

## Part 2 — Forget / Reset Passcode

### A. Entry points & account state

| # | Scenario | Expected result |
|---|----------|----------------|
| R1 | Tap "Forget Passcode?" on the **idle lock screen** (verified account) | Reset flow opens via the **face re-verification** branch |
| R2 | Tap "Forget Passcode?" on **idle lock screen** (not-verified account) | Reset flow opens via the **phone + OTP + quiz** branch |
| R3 | Tap "Forget Passcode?" **during login** (passcode step) | Reset flow opens; OTP skipped, goes straight to quiz, regardless of verification status |

### B. Verified account — face branch (idle entry)

| # | Scenario | Expected result |
|---|----------|----------------|
| R4 | Start reset → pass face re-verification | Skips phone/OTP/quiz → goes straight to Set New Passcode |
| R5 | Face re-verification fails (wrong / fake face) | Rejected, retry offered; cannot reach passcode step |

### C. Not-verified account — phone/OTP/quiz branch

| # | Scenario | Expected result |
|---|----------|----------------|
| R6 | Enter phone → choose SMS or WhatsApp → receive OTP | OTP screen accepts the code, advances to quiz |
| R7 | Enter **wrong OTP** | Error flash, field clears, can retry |
| R8 | Exceed OTP resend limit | No more resends allowed |
| R9 | Quiz: swipe between questions, tap dots to jump | Navigation works; selecting an answer auto-advances |
| R10 | Quiz: answer the **last question** | The selection itself submits; brief "swipe to review" hint shown |
| R11 | Quiz answered correctly | Proceeds to Set New Passcode |
| R12 | Quiz **failed once** | "One attempt left" screen, retry with fresh questions |
| R13 | Quiz **failed twice** | Lockout screen with countdown timer; cannot retry until it expires |
| R14 | Wait out the lockout, then retry | Allowed to restart from intro after timer ends |

### D. Set new passcode

| # | Scenario | Expected result |
|---|----------|----------------|
| R15 | Enter new passcode + confirm (matching) | Saved, "Done!" screen shown |
| R16 | Confirmation does **not** match | Error, field clears, re-enter |
| R17 | Save succeeds — **idle entry** | Session unlocks, lands on Home |
| R18 | Save succeeds — **login entry** | Overlay closes, returns to login passcode step; new passcode completes login |
| R19 | Save fails (network/server) | Error message, can retry the set step |

### E. Reset-passcode session scenarios

| # | Scenario | Expected result |
|---|----------|----------------|
| R20 | Reset session expires during quiz | Error message, nudged back to the intro |
| R21 | **Login-step token expires** mid-reset | Sent back to start of login (re-enter phone) |
| R22 | Close the reset overlay midway | Returns to lock / login screen cleanly, no half-state |

---

## Part 3 — Session & Lock State (cross-cutting)

| # | Scenario | Expected result |
|---|----------|----------------|
| S1 | App cold start | Splash/boot shown, then either "set up passcode" (new device) or lock screen (existing) |
| S2 | New device, no passcode yet | Forced to create a passcode once (optional biometric enroll after) |
| S3 | Correct passcode / biometric entry | Unlocks to Home; idle timer starts |
| S4 | Stay idle past the idle timeout (~3 min) | App auto-locks back to passcode screen |
| S5 | Lock in one tab/window | Other open tabs/windows also lock |
| S6 | Logout / session revoked | Access cleared, returned to locked/login state |
| S7 | Reset-passcode overlay over the lock screen | Overlay sits correctly on top, lock screen not interactable behind it |

---

## Coverage matrix

| Flow | Verified account | Not-verified account |
|------|------------------|----------------------|
| KYC entry | Redirect to Home (K2) | Full flow (K1, K5–K17) |
| Reset – idle lock | Face branch (R1, R4–R5) | Phone/OTP/quiz branch (R2, R6–R14) |
| Reset – during login | Quiz branch (R3) | Quiz branch (R3) |

Run each flow once on the **happy path**, then repeat hitting the **failure branches** (fake face, wrong OTP, quiz lockout, session/token expiry) and the **session transitions** (idle lock, cross-tab, mid-flow abandon).
