const DRAFT_KEY_PREFIX = 'sfg_application_draft_';
let autosaveTimer = null;

function draftKey(applicationId) {
  return DRAFT_KEY_PREFIX + applicationId;
}

function saveDraft(state) {
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => {
    try {
      // Attachments are excluded from the draft: base64 payloads can blow past
      // localStorage's ~5MB quota, and losing an in-progress file pick on refresh
      // is an acceptable tradeoff for keeping the rest of the draft restorable.
      const { attachments, ...draftable } = state;
      localStorage.setItem(draftKey(state.applicationId), JSON.stringify(draftable));
    } catch (e) {
      // localStorage full or unavailable (private browsing) — draft save is best-effort.
    }
  }, 500);
}

function loadDraft(applicationId) {
  try {
    const raw = localStorage.getItem(draftKey(applicationId));
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function findAnyDraft() {
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(DRAFT_KEY_PREFIX)) {
      try {
        return JSON.parse(localStorage.getItem(key));
      } catch (e) {
        continue;
      }
    }
  }
  return null;
}

function clearDraft(applicationId) {
  localStorage.removeItem(draftKey(applicationId));
}
