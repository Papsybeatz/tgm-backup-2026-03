# Grants Master QA Test Plan

## 1. Drafts (Autosave & Persistence)
- [ ] Create a new draft
- [ ] Edit content for 2–3 minutes
- [ ] Confirm autosave triggers reliably
- [ ] Refresh page, draft loads correctly
- [ ] Rename draft, name persists
- [ ] Delete draft, removed from dashboard

## 2. Scoring
- [ ] Score a draft with medium-length content
- [ ] Radar chart loads
- [ ] Strengths/weaknesses appear
- [ ] "Improve with AI" rewrites content
- [ ] Score again, updated score reflects changes
- [ ] Score history updates

## 3. Matching
- [ ] Complete onboarding, matching triggers
- [ ] Match scores appear
- [ ] Expand “Why this grant?” reasons load
- [ ] Save a grant, appears in saved list
- [ ] Filter by sector/deadline, results update
- [ ] Open grant details, panel loads

## 4. Billing (Stripe)
- [ ] Start Free, dashboard loads
- [ ] Upgrade to Starter, Stripe checkout works
- [ ] Return to app, tier updates
- [ ] Access Pro-only feature, gating removed
- [ ] Downgrade, gating returns
- [ ] Stripe portal, invoices/payment method visible

## 5. Agency Isolation
- [ ] Create a client
- [ ] Switch to client workspace
- [ ] Create draft for client
- [ ] Score draft, saved to client history
- [ ] Run matching, client-specific results
- [ ] Switch back to personal workspace
- [ ] Confirm no cross-contamination

## 6. UI/UX, Performance, Error Handling, Security, Cross-device, Launch-critical
- [ ] See full checklist in product QA doc

---

## Automated Test Scripts
- See /tests/ for Playwright/Cypress scripts for:
  - Autosave & draft persistence
  - Agency workspace isolation
  - Stripe integration (mocked)
  - Feature gating
  - Error banners/fallbacks
  - Route protection
