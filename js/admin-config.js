// Paste the OAuth 2.0 Client ID from Google Cloud Console here (see README.md).
// Not secret -- safe to commit. Must match the GOOGLE_CLIENT_ID constant in
// apps-script/Code.gs exactly, or Sign-In will succeed but every admin action will be
// rejected with "invalid_audience".
window.SFG_ADMIN_CONFIG = {
  GOOGLE_CLIENT_ID: 'REPLACE_WITH_YOUR_OAUTH_CLIENT_ID.apps.googleusercontent.com',
};
