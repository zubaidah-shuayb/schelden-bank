# Schelden Bank — Roadmap

> **Schelden Bank is a premium full-stack simulated banking platform built to demonstrate a modern customer banking experience and a secure bank-operations environment.**

**Brand:** ZEEAYB  
**Status:** Core platform implemented — final testing and refinement  
**Last updated:** September 2026

---

## 1. Product Vision

Schelden Bank is designed around two connected experiences:

- **Customer Banking** — a polished digital banking experience where customers can view accounts, manage eligible banking features, request services, review activity, use financial tools, and contact support.
- **Bank Operations** — a secure administrative command centre where authorized bank administrators review requests, manage simulated financial operations, support customers, handle verification/risk workflows, and review audit activity.

The guiding principle is:

> **Customers request and use banking services. The bank controls and approves sensitive banking operations.**

---

# 2. Roadmap Status

| Phase | Area | Status |
|---|---|---|
| 01 | Foundation & Authentication | ✅ Complete |
| 02 | Customer Banking Core | ✅ Complete |
| 02.5 | Customer Settings & Preferences | ✅ Complete |
| 03 | Financial Services & Security | ✅ Complete |
| 03.5 | Dashboard & Overview Enhancement | ✅ Complete |
| 04 | Admin Command Centre | ✅ Complete |
| 04.5 | Internationalization | 🟡 Implemented / Refinement |
| 05 | Final QA & Real-World Testing | 🟡 In Progress |
| 06 | Production Readiness & Launch Polish | ⬜ Planned |

---

# 3. Phase 01 — Foundation & Authentication

### Status: ✅ Complete

### Public Experience

- [x] Schelden Bank landing page
- [x] Banking services overview
- [x] Accounts overview
- [x] Security information
- [x] Responsive public navigation
- [x] Legal/informational pages
- [x] Simulation disclaimer
- [x] "Built by ZEEAYB" branding

### Customer Authentication

- [x] Customer signup
- [x] Customer login
- [x] Logout
- [x] Email verification
- [x] Forgot password
- [x] Password reset
- [x] Password change
- [x] First-login/onboarding flow
- [x] Input validation
- [x] Email normalization
- [x] Correct verification-state handling

### Administrator Authentication

- [x] Dedicated admin login
- [x] Database-backed administrator authorization
- [x] No public admin signup
- [x] Admin access tied to authenticated Supabase user UUID
- [x] Customer accounts cannot self-promote to administrator

### Authorized Administrators

Schelden Bank uses a two-administrator allowlist.

Only the two configured administrator accounts are permitted to receive administrator access.

The actual administrator email addresses are intentionally not documented in the public repository README.

---

# 4. Phase 02 — Customer Banking Core

### Status: ✅ Complete

### Customer Dashboard

- [x] Greeting and financial overview
- [x] Total balance
- [x] Quick actions
- [x] Recent activity
- [x] Financial insights
- [x] Analytics
- [x] Responsive dashboard layout
- [x] Empty/loading/error states

### Accounts

- [x] Account overview
- [x] Account balances
- [x] Belgian IBAN display
- [x] Bank-controlled account creation model
- [x] Account request workflow

### Transactions

- [x] Transaction timeline
- [x] Search
- [x] Filtering
- [x] Transaction details
- [x] Status handling
- [x] Empty states
- [x] Error states

### Transfers

- [x] Transfer form
- [x] Account validation
- [x] Recipient validation
- [x] Amount validation
- [x] Simulated transfer outcome
- [x] Support escalation flow

Transfers do not process real money.

### Beneficiaries

- [x] Saved beneficiaries
- [x] Customer-owned beneficiary records
- [x] Add/manage workflow

### Cards

- [x] Card overview
- [x] Card request workflow
- [x] Freeze / unfreeze
- [x] Daily limits
- [x] Monthly limits
- [x] Online payments control
- [x] Contactless control
- [x] International usage control

### Live Support

- [x] Customer support inbox
- [x] Realtime messaging
- [x] Typing indicators
- [x] Read receipts
- [x] Image attachments
- [x] PDF attachments
- [x] Private attachment storage

### Support Inactivity Rule

- [x] Two-sided inactivity tracking
- [x] 60-minute inactivity threshold
- [x] Message from either side resets the timer
- [x] Automatic scheduled clearing
- [x] Restricted global cleanup execution

---

# 5. Phase 02.5 — Customer Settings & Preferences

### Status: ✅ Complete

### Profile

- [x] Personal information
- [x] Profile editing
- [x] Avatar upload
- [x] Private avatar storage
- [x] Profile completion state
- [x] Verification status display

### Security

- [x] Password controls
- [x] Security information
- [x] Security activity
- [x] Session/logout controls
- [x] Account security experience

### Preferences

- [x] Theme preferences
- [x] Light theme
- [x] Dark theme
- [x] System theme
- [x] Persistent preference handling
- [x] Notification preferences
- [x] Language preference architecture

### Account & Privacy

- [x] Account controls
- [x] Privacy-related settings
- [x] Document access
- [x] Support/account options

---

# 6. Phase 03 — Financial Services & Security

### Status: ✅ Complete

### Savings

- [x] Savings goals
- [x] Goal tracking
- [x] Savings funding workflow
- [x] Savings-related dashboard information

### Investments

- [x] Investment experience
- [x] Investment holdings
- [x] Investment overview
- [x] Portfolio information

> Schelden Bank investment features are simulated and are not financial advice or real investment services.

### Loans

- [x] Loan simulator
- [x] Loan calculations/estimates
- [x] Simulation history

### Documents

- [x] Customer documents
- [x] Document access
- [x] Protected document storage
- [x] Appropriate customer/admin permissions

### Notifications

- [x] Customer notifications
- [x] Read receipts
- [x] Notification preferences
- [x] Protected notification updates

### Security Centre

- [x] Security overview
- [x] Security events
- [x] Account-security information
- [x] Customer-facing security controls

---

# 7. Phase 03.5 — Dashboard & Overview Enhancement

### Status: ✅ Complete

The dashboard was expanded from a basic banking overview into a richer financial command centre.

### Quick Actions

- [x] Transfer
- [x] Beneficiaries
- [x] Statements
- [x] Cards
- [x] Notifications
- [x] Deposit
- [x] Withdraw
- [x] Investments
- [x] Loans
- [x] Settings

### Insights

- [x] Spending trend
- [x] Net savings
- [x] Pending activity
- [x] Profile completion
- [x] Data-driven insights
- [x] Meaningful empty states

### Analytics

- [x] Income vs expenses
- [x] Savings growth
- [x] Spending by category
- [x] Cash flow
- [x] Time filtering
- [x] Responsive charts

### Recent Activity

- [x] Recent transaction/activity list
- [x] Transaction amounts
- [x] Dates
- [x] Descriptions
- [x] View-all navigation
- [x] Empty state

### Dashboard Support

- [x] Persistent floating Live Support control
- [x] Unread support indication
- [x] Responsive positioning

---

# 8. Phase 04 — Admin Command Centre

### Status: ✅ Complete

The administrator experience provides the bank-side operational layer.

## Command Centre

- [x] Admin dashboard
- [x] Customer overview
- [x] Account overview
- [x] Transaction activity
- [x] Support activity
- [x] Risk information
- [x] Verification information
- [x] Operational alerts

## Customer Management

- [x] Customer search
- [x] Customer filtering
- [x] Customer profiles
- [x] Customer 360
- [x] Account information
- [x] Transaction history
- [x] Cards
- [x] Savings
- [x] Investments
- [x] Loans
- [x] Documents
- [x] Notifications
- [x] Support history
- [x] Security information

## Account Operations

- [x] Account requests
- [x] Account review
- [x] Account opening workflow
- [x] IBAN assignment
- [x] Customer/account association

## Card Operations

- [x] Card requests
- [x] Card review
- [x] Card issuance workflow
- [x] Card status management
- [x] Card limits
- [x] Card controls

## Balance Management

- [x] Customer account balance view
- [x] Secure credit operation
- [x] Secure debit operation
- [x] Balance before/after tracking
- [x] Operation reason
- [x] Audit records

Administrators do not directly edit balance columns from the browser.

## Transaction Operations

- [x] Transaction creation
- [x] Credits
- [x] Debits
- [x] Deposits
- [x] Withdrawals
- [x] Refunds
- [x] Adjustments/corrections
- [x] Transaction search
- [x] Transaction filtering
- [x] Transaction reversal

## Reversal Protection

- [x] Only completed transactions can be reversed
- [x] Already reversed transactions cannot be reversed again
- [x] Reversals cannot themselves be reversed
- [x] One reversal per original transaction
- [x] Reversal recorded as a separate transaction
- [x] Audit trail

## Verification & Risk

- [x] Verification status management
- [x] Audited verification changes
- [x] Risk cases
- [x] Risk levels
- [x] Case management

## Admin Live Support

- [x] Support inbox
- [x] Customer conversations
- [x] Realtime messaging
- [x] Typing indicators
- [x] Read receipts
- [x] Attachments
- [x] Conversation status
- [x] Priority
- [x] Assignment

## Reports

- [x] Customer reporting
- [x] Account/balance summaries
- [x] Transaction activity
- [x] Savings activity
- [x] Investment activity
- [x] Loan activity
- [x] Support activity
- [x] Verification/risk information

## Audit Logs

- [x] Administrative activity
- [x] Financial operations
- [x] Reversals
- [x] Verification changes
- [x] Admin identity
- [x] Timestamp
- [x] Before/after information where available
- [x] Reason tracking

## How It Works

- [x] Admin operations guide
- [x] Customer onboarding workflow
- [x] Account-opening workflow
- [x] Card issuance workflow
- [x] Balance/transaction workflow
- [x] Reversal workflow
- [x] Verification/risk workflow
- [x] Live Support workflow
- [x] Customer vs bank responsibilities
- [x] Security and permission guidance

---

# 9. Phase 04.5 — Internationalization

### Status: 🟡 Implemented / Refinement

Schelden is designed to support customers who understand different languages.

### Language System

- [x] Structured translation architecture
- [x] Language selector
- [x] Persistent language preference
- [x] Browser/device language detection
- [x] Customer override
- [x] Localized dates
- [x] Localized number formatting
- [x] Responsive translation handling

### Initial Languages

- [x] English
- [x] French
- [x] Dutch
- [x] German
- [x] Spanish

### Future Localization

- [ ] Expand language catalogue
- [ ] Add RTL language support where required
- [ ] Review translations with native-language validation
- [ ] Audit all customer-facing strings
- [ ] Review localized banking terminology

---

# 10. Phase 05 — Final QA & Real-World Testing

### Status: 🟡 In Progress

The automated/project audit has been completed, but real authenticated user flows still require manual testing against the connected Supabase environment.

## Authentication Testing

- [ ] Customer signup
- [ ] Email verification
- [ ] Customer login
- [ ] Customer logout
- [ ] Password reset
- [ ] Password change
- [ ] Admin login
- [ ] Unauthorized admin login rejection

## Customer Testing

- [ ] Dashboard data
- [ ] Account display
- [ ] Account request
- [ ] Card request
- [ ] Card controls
- [ ] Beneficiaries
- [ ] Transactions
- [ ] Transfer validation
- [ ] Savings
- [ ] Investments
- [ ] Loans
- [ ] Documents
- [ ] Notifications
- [ ] Settings
- [ ] Avatar upload
- [ ] Security Centre

## Live Support Testing

- [ ] Customer sends message
- [ ] Admin receives message realtime
- [ ] Admin replies
- [ ] Customer receives reply realtime
- [ ] Typing indicators
- [ ] Read receipts
- [ ] Image attachment
- [ ] PDF attachment
- [ ] Private attachment access
- [ ] 60-minute inactivity behavior
- [ ] Conversation clearing
- [ ] Conversation reopening/new conversation behavior

## Admin Testing

- [ ] Admin dashboard
- [ ] Customer search
- [ ] Customer 360
- [ ] Account requests
- [ ] Card requests
- [ ] Balance credit
- [ ] Balance debit
- [ ] Transaction creation
- [ ] Transaction reversal
- [ ] Verification
- [ ] Risk cases
- [ ] Documents
- [ ] Notifications
- [ ] Support
- [ ] Reports
- [ ] Audit logs
- [ ] How It Works

## Security Testing

- [ ] Customer cannot access another customer's records
- [ ] Customer cannot access admin routes
- [ ] Customer cannot manipulate protected profile fields
- [ ] Customer cannot modify financial records
- [ ] Customer cannot alter transaction history
- [ ] Customer cannot bypass card restrictions
- [ ] Unauthorized admin email cannot access admin
- [ ] Admin authorization remains database-backed
- [ ] Private storage remains private
- [ ] Realtime subscriptions respect access controls
- [ ] No secret keys exposed in frontend
- [ ] No sensitive information leaked through errors

## UI/UX Testing

- [ ] Desktop
- [ ] Tablet
- [ ] Mobile
- [ ] Light theme
- [ ] Dark theme
- [ ] System theme
- [ ] Loading states
- [ ] Empty states
- [ ] Error states
- [ ] Form validation
- [ ] Responsive navigation
- [ ] Floating Live Support positioning
- [ ] Accessibility review
- [ ] Translation layout review

---

# 11. Phase 06 — Production Readiness & Launch Polish

### Status: ⬜ Planned

After real authenticated testing is complete:

## Engineering

- [ ] Final production build
- [ ] Final TypeScript check
- [ ] Final lint check
- [ ] Dependency review
- [ ] Environment-variable review
- [ ] Production configuration
- [ ] Error monitoring
- [ ] Performance review

## Security

- [ ] Final RLS review
- [ ] Storage policy review
- [ ] Realtime policy review
- [ ] Admin authorization review
- [ ] Database function review
- [ ] Audit-log review
- [ ] Secret exposure check

## UX

- [ ] Final responsive polish
- [ ] Final accessibility pass
- [ ] Final translation review
- [ ] Empty-state consistency
- [ ] Error-message consistency
- [ ] Navigation consistency
- [ ] Final visual QA

## Documentation

- [ ] README final review
- [ ] Roadmap final update
- [ ] Setup documentation
- [ ] Environment-variable documentation
- [ ] Database migration documentation
- [ ] Admin operations documentation

---

# 12. Database Migration History

Schelden's database changes are maintained as ordered SQL migrations.

```text
001_initial_schema.sql
002_rls_policies.sql
003_functions_and_triggers.sql
004_storage_and_realtime.sql
005_hardening_patch.sql
006_...
007_...
008_...
009_...
010_...
```
