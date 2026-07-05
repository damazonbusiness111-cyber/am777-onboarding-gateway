# AM777 Onboarding Gateway

Private, role-based onboarding portal for AM777 Automation Solutions — VA Outreach Collaborator, Admin/Closing Partner, Perks-Based Supporter, Revenue-Share Funder, and Formal Capital Inquiry routes, each with its own fields, disclosures, and confirmation statement. Part of the InfraMind777 ecosystem.

Static frontend (GitHub Pages-ready) + Google Apps Script backend + Google Sheets as the CRM/database. No paid libraries, no frameworks.

## Files

| File | Purpose |
|---|---|
| `index.html` | Page structure — welcome, route selector, route context, common fields, dynamic route-specific fields, signature, confirmation |
| `style.css` | Dark navy/glass theme, electric blue + cyan accents, route cards, status chips, print styles |
| `script.js` | All flow logic — route config (`ROUTES` object), validation, dynamic field rendering, signature canvas, submission |
| `Code.gs` | Apps Script backend — receives submissions, writes to the correct Sheet tab, saves signature to Drive, emails admin notification |
| `README.md` | This file |

## One-time setup

### 1. Google Sheet + Apps Script
1. Create a new Google Sheet — this is your CRM/database.
2. Extensions → Apps Script. Delete the default code, paste in `Code.gs`.
3. At the top of `Code.gs`, set:
   - `SHEET_ID` — from the Sheet's URL (`.../spreadsheets/d/THIS_PART/edit`)
   - `SIGNATURE_FOLDER_ID` — a Google Drive folder ID where signature PNGs get saved (create one first, get its ID from its URL)
   - `ADMIN_EMAIL` — where new-submission alerts go
4. Run `setupSheets` once (select it in the function dropdown, click Run). Approve the permissions prompt. This creates all 17 tabs from the spec with headers — only the Master Log + the 5 route submission tabs are written to automatically; the rest (Funded Initiatives, Qualified Revenue, Payout Tracker, etc.) are for your own downstream tracking as deals progress.
5. Deploy → New deployment → type **Web app**. Execute as **Me**, access **Anyone**. Copy the deployment URL.

### 2. Connect the frontend
In `script.js`, replace:
```js
var APPS_SCRIPT_URL = 'REPLACE_WITH_YOUR_APPS_SCRIPT_WEB_APP_URL';
```
with the deployment URL from step 5 above.

### 3. Deploy to GitHub Pages
Push this folder to a repo (or a subpath of an existing Pages-enabled repo, e.g. `your-repo/onboarding-gateway/`) and enable GitHub Pages on `main`.

## How submissions work

1. Visitor picks a route → sees that route's context + trust cards → fills common fields → fills route-specific fields (rendered dynamically from the `ROUTES` config in `script.js`) → signs (typed + drawn) → types `CONFIRMED` → submits.
2. Frontend POSTs JSON to your Apps Script URL as `text/plain` (avoids a CORS preflight — Apps Script Web Apps don't support the preflight `OPTIONS` request).
3. `Code.gs` generates the real Record ID (`{PREFIX}-{YYYYMMDD}-{0001}`, sequential per route tab), saves the drawn signature to Drive, appends a row to that route's Sheet tab and to the Master Log, and emails you.
4. Frontend shows the confirmation screen with the Record ID Apps Script returned, plus a Print/Save button.

**No submission is auto-approved** — this gateway records and notifies; you review and approve manually in the Sheet.

## Editing or adding a route

Everything route-specific — label, extra fields, ID prefix, target Sheet tab, confirmation statement — lives in one place: the `ROUTES` object at the top of `script.js`. Add a new route by adding a new key there and a matching route-card button in `index.html`; the field rendering, validation, and submission logic all read from that config automatically.

## Known local-dev quirk

If testing locally with a static file server, navigate to the folder **with a trailing slash** (e.g. `http://localhost:PORT/am777-onboarding-gateway/`), not without one — some dev servers strip `index.html` and the trailing slash on redirect, which breaks the relative `style.css`/`script.js` links. This does not affect GitHub Pages, which serves directory paths correctly.
