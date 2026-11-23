> **لنشر هذا المشروع عبر GitHub ابدأ بالملف [START_HERE_AR.md](START_HERE_AR.md).**

# PaediaSprint — Payhip 30-day access integration (2026-11-23)

**Use `docs/PAYHIP_SETUP_AR.md` FIRST.** This build is updated to accept one-time purchases from Payhip via the merchant's exact checkout URL and a server-verified webhook. The earlier Stripe instructions below are legacy/optional and are **not** the active payment provider when `PAYMENT_PROVIDER = "payhip"`.

**STATUS: TESTED SOURCE CODE ONLY. NOT DEPLOYED.** No live transaction or real Payhip webhook has been verified. All sales flags stay false until commercial permission, editorial/rights review, and production payment tests.

# PaediaSprint Premium — Source Integration v3.0

**NEW 23 November 2026:** Owner-only 874-page PDF archive integration and 19 independently authored, UK-referenced FOP/TAS editorial draft questions, enhanced answer rationales and distractor explanations. See `docs/SOURCE_BANK_INTEGRATION_AR.md` for deployment and editorial instructions. Do **not** deploy the private source archive inside `public/` or place the original examination material in a public GitHub repository. Live Stripe enrolments remain disabled until `SALES_ENABLED=true`, `EDITORIAL_APPROVED=true` and `CONTENT_RIGHTS_CONFIRMED=true`, alongside existing verified merchant requirements. **Content from the uploaded PDF is not automatically licensed or clinically verified. The new 19 questions are unpublished drafts.**

---

# PaediaSprint Atelier — Premium Edition v2.0

Premium independent paediatric revision Qbank. Redesigned with an editorial midnight-navy / warm-gold visual system and polished responsive flows across home, question studio, performance dashboard, and membership pages. Unlike third-party examples, the branding and layout are custom to PaediaSprint.


A full-stack, mobile-first paid question bank for **FOP**, **TAS**, and **AKP**, with an original draft starter set. Built with Cloudflare Workers + D1 + Stripe Billing + Resend. No front-end framework or hosting VPS required.

> **STATUS: SOURCE PACKAGE TESTED LOCALLY, NOT A LIVE PUBLIC WEBSITE.**
> Real payments, verified email, merchant legal details, a domain, an approved business activity, external clinical review and an end-to-end production test are mandatory before accepting customers. No third-party account credentials are included.

## What changed in v2.0

- Luxurious original visual identity: dark editorial hero, gold accent and premium typography.
- Redesigned homepage, educational pathways, learning studio, membership and dashboard views, responsive across mobile, tablet, desktop.
- New editorial demonstration, FAQ, and safer payment-readiness notice.
- Added a **sales safety switch**: subscription checkout is disabled until a verified merchant sets `SALES_ENABLED = "true"` and provides required business contact/configuration values.
- Newly imported questions default to **unpublished**, making inadvertent release of unreviewed content less likely.
- Existing authentication, Stripe billing, Cloudflare D1, question-gating, progress tracking and administration preserved.
- Smoke-tested interactive free questions and all page transitions at 390, 768 and 1440 px; source unit/integration suite passes.

## Features

- Responsive English marketing site, pricing, legal and support pages
- 90 **independently drafted** best-of-five questions: 30 FOP / 30 TAS / 30 AKP; 15 free samples, 75 premium
- Instant-feedback practice and timed 5/10/20/30-question mocks with marking and review
- Registration, email verification, sign-in, password reset, HTTP-only sessions, request throttling
- Server-graded correct answers; full answer key never exposed in question-list API
- Dashboard: overall and subject accuracy, recent answers, unique questions, saved bookmarks
- Stripe-hosted recurring checkout (AED monthly/annual), signed webhooks, billing management portal
- Owner-only question import (JSON batches), publishing flags, delete
- D1 migration and idempotent starter SQL seed
- Separate privacy, terms and refunds pages (with business details from configuration), account deletion flow, branded confirmation email

## Required accounts

1. **Cloudflare** (Workers + D1 + a website URL; you can start on `*.workers.dev`).
2. **Stripe UAE business account** verified for your business and enabled for subscriptions.
3. **Resend** email sending account with verified sending domain (usually means you need control of a domain's DNS).
4. Business licence/approval covering paid online professional-education material in your jurisdiction, and any necessary educational/regulatory authorisations.
5. A qualified clinical editor who has checked and approved each question, answer, explanation and citation before commercial use.

### 1. Create Cloudflare database

Install Node 20+ and npm, unzip this project, then run:

```bash
npm install
npx wrangler login
npx wrangler d1 create paediasprint-db
```

Copy the returned `database_id` and replace `REPLACE_WITH_YOUR_D1_DATABASE_ID` in `wrangler.toml`.

### 2. Set up the database

```bash
npm run db:remote
npx wrangler d1 execute paediasprint-db --remote --file data/seed.sql
```

`data/seed.sql` is idempotent. It does **not** replace edited questions. It comes with **draft** educational questions that still need clinical review and confirmation of referenced guidance before charging users.

### 3. Configure recurring payments in Stripe

Create a product and two recurring prices in **AED**:

- Monthly: **AED 79** / month
- Annual: **AED 499** / year

Use the two resulting `price_...` IDs for `STRIPE_PRICE_MONTHLY` and `STRIPE_PRICE_YEARLY`. Enable the Stripe customer portal (including cancel at period end and invoice history). Price amounts in `wrangler.toml` drive the public label and must match the Stripe prices exactly. Enable appropriate tax configuration and review jurisdiction-specific requirements. Stripe handles card numbers; your app never sees them.

### 4. Set the secrets

Run `npx wrangler secret put VARIABLE_NAME` once for each secret:

```text
SESSION_SECRET           # cryptographically random, at least 32 characters
STRIPE_SECRET_KEY        # sk_live_..., only after live-mode approval
STRIPE_WEBHOOK_SECRET    # whsec_... from the Stripe webhook
STRIPE_PRICE_MONTHLY     # price_... for 79 AED per month
STRIPE_PRICE_YEARLY      # price_... for 499 AED per year
RESEND_API_KEY           # re_... from Resend
EMAIL_FROM               # PaediaSprint <noreply@your-verified-domain.com>
ADMIN_EMAIL              # your owner email: register and verify it first
PUBLIC_BASE_URL          # https://your-website-domain
SUPPORT_EMAIL            # your public verified support address
BUSINESS_LEGAL_NAME     # actual licensed operator (required for checkout)
BUSINESS_ADDRESS        # verified merchant address (required for checkout)
```

Cloudflare `wrangler.toml` also specifies `SITE_NAME`, `MONTHLY_PRICE_AED`, `YEARLY_PRICE_AED`, and `SALES_ENABLED`. The default `SALES_ENABLED = "false"` prevents payment requests. Only change it to `"true"` after Stripe/Resend/domain/live payment verification, business licence, customer policies, medical editorial sign-off and a completed end-to-end payment/cancellation test in Stripe test mode. Set `BUSINESS_LEGAL_NAME`, `BUSINESS_ADDRESS`, and `SUPPORT_EMAIL` accurately; these are required for checkout readiness and shown in policies. **Never commit or send private API keys in email, public repositories or screenshots.**

### 5. Deploy website

```bash
npm run deploy
```

Cloudflare provides a public `*.workers.dev` URL. Configure your domain as a Worker route/custom domain if desired. Set `PUBLIC_BASE_URL` to the **final** HTTPS URL (no trailing slash).

### 6. Connect Stripe webhook

In Stripe Developers → Webhooks, register:

```text
https://YOUR-SITE.com/api/webhook/stripe
```

Subscribe to these events:

```text
checkout.session.completed
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
```

Copy the signing secret (`whsec_...`) into Cloudflare `STRIPE_WEBHOOK_SECRET`, then redeploy if needed. Check that successful payment creates access and a cancelled subscription is disabled at the correct time. Use Stripe test mode **before** switching to live keys.

### 7. Enable verified email

Set up DNS validation in Resend for `EMAIL_FROM`, with SPF/DKIM as instructed. Test registration and password reset from an email address that is **not** the business sender address. The app blocks registrations while email is unconfigured. Checkout remains unavailable while `SALES_ENABLED = "false"` even when Stripe keys are present. The pricing page explains this status.

### 8. Create owner account and import new questions

Register on your website using the address in `ADMIN_EMAIL`, verify it and sign in. Open `https://YOUR-SITE.com/#admin` to access the import interface.

Question JSON format:

```json
[
  {
    "id": "fop-101",
    "exam": "FOP",
    "topic": "Respiratory",
    "difficulty": "Intermediate",
    "stem": "An original clinical question of at least 25 characters...",
    "choices": ["Option A", "Option B", "Option C", "Option D", "Option E"],
    "answer": 2,
    "explanation": "A detailed and original educational explanation of at least 25 characters.",
    "reference_title": "Reference title",
    "reference_url": "https://www.nice.org.uk/guidance/ng9",
    "is_free": false,
    "is_published": false
  }
]
```

`answer` uses **zero-based index**: 0 = A, 1 = B, 2 = C, 3 = D, 4 = E. Questions default to **unpublished** unless you explicitly set `is_published: true`. Keep drafts unpublished until each question is independently reviewed. Do not import proprietary RCPCH examination questions, images, or recalled exam content.

### 9. Production acceptance tests

- [ ] `https://SITE/api/health` returns `{"ok":true,...}`
- [ ] All 90 questions visible in admin; free sample visible without login
- [ ] Fresh verified email can register, confirm address, log in and log out
- [ ] Password reset sends a link and revokes old sessions
- [ ] Free account cannot fetch/submit premium question answers
- [ ] Test-monthly and test-annual Stripe checkout activates subscription
- [ ] Payment failure or cancellation results in expected access state
- [ ] Portal manages cancellation, card details and invoices
- [ ] Practice score, mock grade, saved bookmarks and dashboard persist after a new login
- [ ] Legal entity, support email, privacy notice, refund terms and required disclosures are accurate
- [ ] Commercial licensing is valid, all medical content clinically reviewed, merchant account approved
- [ ] Mobile checkout, email, accessibility and loading tested with real devices
- [ ] No `sk_live`, `whsec`, `re_` or session keys embedded in client code or Git history

## Local verification

To regenerate the fully offline interactive design preview after visual changes, run `node scripts/build-preview.mjs`; it writes `PREVIEW_ONLY.html`. The demo allows free practice but **does not** take money, create accounts or save history to D1. It is not the live product.


```bash
npm run verify
npm test
npm run db:local
npx wrangler d1 execute paediasprint-db --local --file data/seed.sql
npm run dev
```

To test full email, set secrets in local `.dev.vars` (never commit), or temporarily use test credentials on a private preview domain. A static `public/index.html` opened as a file is only a visual preview; it cannot run the database, login or payments.

## What is not provided or guaranteed

- No Cloudflare deployment, domain purchase, verified Stripe merchant account, paid Stripe transaction, DNS records, Resend sender validation, or legal/educational licensing is done on the user’s behalf.
- No claim of zero errors in real-world production; test with live third-party accounts and multiple browsers/devices before opening checkout.
- The medical content remains a **starter set awaiting specialist editorial review**; code tests cannot validate medicine.
- The demo file and the preview screenshots are **not** evidence that subscriptions work in a live production account.

## Operations and costs

Cloudflare Workers and D1 have usage-based/free allowances which may change. Stripe takes transaction/billing fees; Resend may incur email charges and a sending domain has registration fees. Your business licence may need additional paid activities or approvals. **Do not rely on free tiers without checking current provider limits.**

## Rights and editorial quality

The RCPCH states examination questions are its copyrighted property. All 90 included questions have been drafted independently; the site's name does not imply affiliation. References are educational starting points, **not evidence that a clinician validated every stem, key or explanation**. Before selling subscriptions, a qualified independent paediatric examiner/editor should review all content for correctness, currency, clarity and overlap with protected material. Clearly state the actual question count in marketing and expand the bank before claiming comprehensive preparation.

Useful official resources: [RCPCH](https://www.rcpch.ac.uk/education-careers/examinations/theory/structure-syllabi), [copyright policy](https://www.rcpch.ac.uk/about-us/rights-permissions-copyrighted-material), [Cloudflare docs](https://developers.cloudflare.com/workers/static-assets/), [Stripe UAE](https://stripe.com/ae/billing), [ADDED](https://www.added.gov.ae/en/set-up/establish-your-business/licensing-requirements).
