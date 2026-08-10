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
  - `Applications` tab — one row per submission. Add/edit the `Status` column freely for HR
    triage (e.g. "Reviewed", "Contacted") — the script never overwrites it.
  - `Education`, `WorkHistory`, `Siblings`, `EmergencyContacts` — one row per entry, linked back
    to the applicant via the `ApplicationID` column (matches the `ApplicationID` in `Applications`).
  - `Attachments` — one row per uploaded document, with a link to the file in Drive.
- **Drive folder** ("SFG Applications - Attachments"): each applicant gets a subfolder named by
  their `ApplicationID`, containing their uploaded photo/ID copy/certificates.

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
