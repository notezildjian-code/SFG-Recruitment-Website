// Thin wrapper around PropertiesService. No secrets are committed to source —
// SHEET_ID / DRIVE_FOLDER_ID are written here at first run and read on every
// subsequent run. See README.md for the one-time setup steps.

function getProp(key) {
  return PropertiesService.getScriptProperties().getProperty(key);
}

function setProp(key, value) {
  PropertiesService.getScriptProperties().setProperty(key, value);
}
