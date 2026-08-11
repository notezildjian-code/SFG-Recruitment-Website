function getPath(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function setPath(obj, path, value) {
  const keys = path.split('.');
  let target = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (target[k] == null || typeof target[k] !== 'object') target[k] = {};
    target = target[k];
  }
  target[keys[keys.length - 1]] = value;
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function uuid() {
  if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Single active language, chosen on the language-select step. Defaults to Thai until chosen.
window.SFG_LANG = window.SFG_LANG || 'th';

function bilingual(label) {
  return escapeHtml(bilingualPlain(label));
}

// Raw (unescaped) text in the active language — for callers that need to
// escape it themselves (e.g. inside an already-escaped attribute value).
function bilingualPlain(label) {
  const lang = window.SFG_LANG === 'en' ? 'en' : 'th';
  return label[lang] != null ? label[lang] : label.th;
}

function calculateAge(dateStr) {
  if (!dateStr) return '';
  const dob = new Date(dateStr);
  if (isNaN(dob.getTime())) return '';
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) age--;
  return age >= 0 ? String(age) : '';
}

function parseMonthYear(str) {
  const m = /^\s*(\d{1,2})\s*\/\s*(\d{4})\s*$/.exec(str || '');
  if (!m) return null;
  const month = parseInt(m[1], 10);
  const year = parseInt(m[2], 10);
  if (month < 1 || month > 12) return null;
  return { month, year };
}

// Mirrors calculateAge's UX: computed from free-text "MM/YYYY" fields, blank when
// either end is unparsable or "to" precedes "from".
function calculateWorkDuration(fromStr, toStr, isCurrent) {
  const from = parseMonthYear(fromStr);
  if (!from) return '';
  let toMonth, toYear;
  if (isCurrent) {
    const now = new Date();
    toMonth = now.getMonth() + 1;
    toYear = now.getFullYear();
  } else {
    const to = parseMonthYear(toStr);
    if (!to) return '';
    toMonth = to.month;
    toYear = to.year;
  }
  const totalMonths = (toYear - from.year) * 12 + (toMonth - from.month);
  if (totalMonths < 0) return '';
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  const lang = window.SFG_LANG === 'en' ? 'en' : 'th';
  const yearWord = lang === 'en' ? (years === 1 ? 'year' : 'years') : 'ปี';
  const monthWord = lang === 'en' ? (months === 1 ? 'month' : 'months') : 'เดือน';
  const parts = [];
  if (years > 0) parts.push(`${years} ${yearWord}`);
  if (months > 0 || years === 0) parts.push(`${months} ${monthWord}`);
  return parts.join(' ');
}
