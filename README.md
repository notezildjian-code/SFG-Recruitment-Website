# SFG Job Application Form

A free, static job-application website for Star Fashion Group (SFG). Applicants fill in a
bilingual (Thai/English) multi-step form; submissions land in a Google Sheet, with attached
documents saved to Google Drive. No paid hosting or backend required.

**Live site:** https://notezildjian-code.github.io/SFG-Recruitment-Website/

## How it works

- `index.html` + `js/*.js` + `css/styles.css` — the form itself. Plain HTML/CSS/JS, no build step.
- `apps-script/Code.gs` — deployed separately as a Google Apps Script Web App. It receives the
  form submission and writes it into a Google Sheet (creating the Sheet and a Drive folder for
  attachments automatically on first run).
- The two are connected by one URL, set in `js/config.js`.

## One-time setup

### 1. Deploy the Apps Script backend

1. Go to [script.google.com](https://script.google.com) and create a new project.
2. Copy the contents of `apps-script/Code.gs` and `apps-script/Config.gs` into the project as
   two separate script files (same names).
3. Open `appsscript.json` via **Project Settings > Show "appsscript.json" manifest file in editor**,
   and replace its contents with `apps-script/appsscript.json` from this repo.
4. Click **Deploy > New deployment**. Type: **Web app**. Execute as: **Me**. Who has access:
   **Anyone**. Click Deploy, and authorize the requested permissions (Sheets + Drive access).
5. Copy the resulting URL — it ends in `/exec`.
6. The first time the form submits, the script automatically creates a Google Sheet named
   **"SFG Job Applications"** and a Drive folder named **"SFG Applications - Attachments"** in
   the Apps Script owner's Google Drive, and remembers their IDs. You don't need to create
   these yourself.

### 2. Point the form at the deployment

Open `js/config.js` and paste the `/exec` URL:

```js
window.SFG_CONFIG = {
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycb.../exec',
};
```

### 3. Deploy the form itself (GitHub Pages)

1. Push this folder to a GitHub repository's `main` branch.
2. Repo **Settings > Pages > Source**: `main` branch, `/ (root)`.
3. The form goes live at `https://<your-org>.github.io/<repo>/` within a minute or two.

## Redeploying after edits

**Editing `index.html`, `css/`, or `js/`** — just commit and push. GitHub Pages redeploys
automatically.

**Editing `apps-script/Code.gs`** — this is the one gotcha: saving the script in the Apps Script
editor is *not* enough. You must go to **Deploy > Manage deployments**, click the pencil icon on
the existing deployment, and choose **New version** under "Version", then Deploy again. Otherwise
the live form keeps calling the *old* version of the script and your fix won't take effect. This
is the most common cause of "the form silently stopped working."

## Where things live

- **Google Sheet** ("SFG Job Applications"): open it from the Apps Script owner's Google Drive.
  - `Applications` tab — **one row per applicant**, everything in one place. Repeatable sections
    (education, work history, emergency contacts, additional languages, additional computer apps)
    are flattened into numbered columns (`Education1_Level`, `Education2_Level`, ...) up to a cap
    (education ×3, work history ×5, emergency contacts ×3, additional languages ×3, additional
    apps ×3); anything beyond the cap is joined into a trailing `...Extra` text column per section
    so nothing is ever silently dropped. Attachment links (`PhotoURL`, `CVURL`,
    `AdditionalAttachment1_URL`..`3_URL` + `AdditionalAttachmentsExtra`) live on the row too. Add/
    edit the `Status` column freely for HR triage (e.g. "Reviewed", "Contacted") — the script
    never overwrites it.
  - `Positions` tab — open positions shown in the form's dropdown, managed via `admin.html` (or
    edit the sheet directly: `PositionID` / `PositionName` / `IsOpen` / `IsSalesPC`).
  - `Education`, `WorkHistory`, `EmergencyContacts`, `AdditionalLanguages`, `AdditionalComputerApps`,
    `Attachments` — **legacy tabs**, no longer written to (superseded by the flattened columns on
    `Applications` above). Safe to delete manually if you want; the script never touches them again.
- **Drive folder** ("SFG Applications - Attachments"): each applicant gets a subfolder named by
  their `ApplicationID`, containing their uploaded photo/CV/other attachments.

## Admin page (`admin.html`)

A separate, unlinked page for managing open positions, browsing submitted applications, and
exporting the whole spreadsheet to Excel — restricted to one Google account via Google Sign-In,
verified server-side in `Code.gs`. It is **not** linked from the public form; access it directly
at `https://<your-org>.github.io/<repo>/admin.html`.

### One-time setup (in addition to the steps above)

1. **Create an OAuth Client ID** at [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials):
   - Configure the OAuth consent screen if you haven't already (External, Testing mode is fine
     for a single admin — no verification/publishing needed).
   - Create Credentials → **OAuth client ID** → Application type **Web application**.
   - Authorized JavaScript origins: your production GitHub Pages origin (e.g.
     `https://notezildjian-code.github.io`) and, for local testing, `http://localhost:8080`. No
     redirect URI is needed.
   - Copy the resulting Client ID (looks like `xxxx.apps.googleusercontent.com` — not secret, safe
     to commit).
2. Paste that Client ID into **both**:
   - `js/admin-config.js` → `GOOGLE_CLIENT_ID`
   - `apps-script/Code.gs` → the `GOOGLE_CLIENT_ID` constant near the top
   (they must match exactly, or every admin action will be rejected with `invalid_audience`.)
3. In `apps-script/Code.gs`, confirm `ADMIN_EMAIL` is set to the Google account that should have
   access (currently `annop.p@sfg-th.com`). Only that exact email can sign in.
4. Redeploy the Apps Script (see "Redeploying after edits" below) — this manifest change adds an
   `oauthScopes` array, so Google will show a **new consent/authorization screen** (including an
   "unverified app" warning, expected for an internal script) that you have to click through
   yourself.
5. Open `admin.html`, sign in with the allowed Google account, and confirm the dashboard loads.

### Security notes

- The underlying Sheet is **never shared** with the admin's Google account — every admin action
  (list/edit positions, list applications, export) runs under the Apps Script's own identity
  (`executeAs: USER_DEPLOYING`), not the signed-in browser session. This matters because the
  Sheet holds PDPA-sensitive data (ID card numbers, health info) — don't "fix" any future access
  issue by sharing the Sheet directly; that would widen exposure unnecessarily.
- `admin.html` being unlinked is not the security boundary — the real gate is server-side, in
  `Code.gs`'s `verifyAdminToken` (checks the Google ID token's audience + exact email match).
  Anyone can technically load the page; only the allowed email can actually get data out of it.
- The admin page never stores the sign-in token in `localStorage`/`sessionStorage` — every page
  load requires a fresh sign-in.

## Anti-spam

The form has no server of its own, so spam protection is limited to two client+server checks in
`Code.gs`: a hidden honeypot field, and rejecting submissions completed in under 3 seconds. Both
fail silently (the bot still gets a success response, but no row is written) so scrapers don't
learn to route around them.

## Embedding in the existing career page (optional, not set up yet)

The form is currently a standalone link. To embed it into
`https://www.starfashiongroup.com/career` later, add:

```html
<iframe src="https://<your-org>.github.io/<repo>/" style="width:100%; height:3200px; border:0;" scrolling="no"></iframe>
```

A fixed height is used because we don't control the parent page's JavaScript — the outer page
scrolls through the whole form. Adjust the height if steps are added/removed.
