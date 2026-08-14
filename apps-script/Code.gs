// Apps Script Web App backend for the SFG job application form + admin page.
// Deploy: Deploy > New deployment > Web app, Execute as: Me, Who has access: Anyone.
// First run auto-creates the Spreadsheet + Drive folder and stores their IDs in
// Script Properties -- no manual ID configuration needed. See README.md.

var MIN_SUBMIT_MS = 3000;

// Set after creating an OAuth Client ID in Google Cloud Console (see README.md) --
// used to verify the admin page's Google Sign-In ID token is meant for this app.
var GOOGLE_CLIENT_ID = '883984622748-7maldegseaqpoho9emoi8c77ql1qob3a.apps.googleusercontent.com';
var ADMIN_EMAIL = 'annop.p@sfg-th.com';

// Every applicant is ONE row on the Applications sheet. Repeatable sections (education,
// work history, etc.) are flattened into numbered column groups up to a cap, with any
// entries beyond the cap joined into a trailing "Extra" text column so nothing is lost.
var APPLICATIONS_HEADERS = [
  'ApplicationID', 'SubmittedAt', 'PositionApplying', 'PositionArea', 'ExpectedSalary', 'NamePrefix', 'NameThai', 'NameEnglish', 'Nickname',
  'Gender', 'HeightCm', 'WeightKg', 'DobBE', 'Age', 'IdCardNo',
  'MobilePhone', 'Email', 'LineId', 'Address', 'PostalCode',
  'MaritalStatus', 'SpouseName', 'SpouseAge', 'NumChildren',
  'MilitaryStatus', 'MilitaryServedYearBE', 'MilitaryNotYetYearBE', 'MilitaryExemptOtherReason',
  'Lang_English_Overall', 'Lang_English_TestResult',
  'Computer_CanUse',
  'Computer_Word_Rating', 'Computer_Excel_Rating', 'Computer_PowerPoint_Rating',
  'Computer_Canva_Rating', 'Computer_CapCut_Rating', 'Computer_ChatGPT_Rating', 'Computer_Claude_Rating', 'Computer_Gemini_Rating',
  'Health_Illness_YN', 'Health_Illness_Specify',
  'Health_Chronic_YN', 'Health_Chronic_Specify',
  'Health_Disability_YN', 'Health_Disability_Specify',
  'Health_Pregnant_YN', 'Health_Pregnant_Specify',
  'SourceOfPosting', 'SourceOfPostingSpecify', 'ReferredBy',
  'CriminalRecord_YN', 'CriminalRecord_Specify',
  'PreviousSFG_YN', 'PreviousSFG_Specify',
  'WillingToRelocate',
  'PortfolioLink',
  'ConsentGiven', 'SignatureFullName', 'SignatureDate', 'Status',

  'Education1_Level', 'Education1_Institution', 'Education1_FacultyMajor', 'Education1_GPA',
  'Education2_Level', 'Education2_Institution', 'Education2_FacultyMajor', 'Education2_GPA',
  'Education3_Level', 'Education3_Institution', 'Education3_FacultyMajor', 'Education3_GPA',
  'EducationExtra',

  'WorkHistory1_From', 'WorkHistory1_To', 'WorkHistory1_IsCurrent', 'WorkHistory1_Duration', 'WorkHistory1_Employer', 'WorkHistory1_Position', 'WorkHistory1_LastSalary', 'WorkHistory1_Responsibilities', 'WorkHistory1_ReasonForLeaving',
  'WorkHistory2_From', 'WorkHistory2_To', 'WorkHistory2_IsCurrent', 'WorkHistory2_Duration', 'WorkHistory2_Employer', 'WorkHistory2_Position', 'WorkHistory2_LastSalary', 'WorkHistory2_Responsibilities', 'WorkHistory2_ReasonForLeaving',
  'WorkHistory3_From', 'WorkHistory3_To', 'WorkHistory3_IsCurrent', 'WorkHistory3_Duration', 'WorkHistory3_Employer', 'WorkHistory3_Position', 'WorkHistory3_LastSalary', 'WorkHistory3_Responsibilities', 'WorkHistory3_ReasonForLeaving',
  'WorkHistory4_From', 'WorkHistory4_To', 'WorkHistory4_IsCurrent', 'WorkHistory4_Duration', 'WorkHistory4_Employer', 'WorkHistory4_Position', 'WorkHistory4_LastSalary', 'WorkHistory4_Responsibilities', 'WorkHistory4_ReasonForLeaving',
  'WorkHistory5_From', 'WorkHistory5_To', 'WorkHistory5_IsCurrent', 'WorkHistory5_Duration', 'WorkHistory5_Employer', 'WorkHistory5_Position', 'WorkHistory5_LastSalary', 'WorkHistory5_Responsibilities', 'WorkHistory5_ReasonForLeaving',
  'WorkHistoryExtra',

  'EmergencyContact1_Name', 'EmergencyContact1_Mobile', 'EmergencyContact1_Relationship',
  'EmergencyContact2_Name', 'EmergencyContact2_Mobile', 'EmergencyContact2_Relationship',
  'EmergencyContact3_Name', 'EmergencyContact3_Mobile', 'EmergencyContact3_Relationship',
  'EmergencyContactExtra',

  'AdditionalLanguage1_Name', 'AdditionalLanguage1_Overall', 'AdditionalLanguage1_TestResult',
  'AdditionalLanguage2_Name', 'AdditionalLanguage2_Overall', 'AdditionalLanguage2_TestResult',
  'AdditionalLanguage3_Name', 'AdditionalLanguage3_Overall', 'AdditionalLanguage3_TestResult',
  'AdditionalLanguageExtra',

  'AdditionalApp1_Name', 'AdditionalApp1_Rating',
  'AdditionalApp2_Name', 'AdditionalApp2_Rating',
  'AdditionalApp3_Name', 'AdditionalApp3_Rating',
  'AdditionalAppExtra',

  'PhotoURL', 'CVURL',
  'AdditionalAttachment1_URL', 'AdditionalAttachment2_URL', 'AdditionalAttachment3_URL',
  'AdditionalAttachmentsExtra',
];

var POSITIONS_HEADERS = ['PositionID', 'PositionName', 'IsOpen', 'IsSalesPC'];

function doGet(e) {
  var action = e.parameter.action;
  if (action === 'positions') {
    var ss = getSpreadsheet();
    var sheet = ensureSheetWithHeaders(ss, 'Positions', POSITIONS_HEADERS);
    seedPositionsIfEmpty(sheet);
    var positions = readRowsAsObjects(sheet)
      .filter(function (r) { return r.PositionName && r.IsOpen === true; })
      .map(function (r) { return { name: r.PositionName, isSalesPC: r.IsSalesPC === true }; });
    return jsonResponse({ positions: positions });
  }
  return jsonResponse({ ok: false, error: 'unknown_action' });
}

function seedPositionsIfEmpty(sheet) {
  if (sheet.getLastRow() > 1) return;
  appendRowByHeaders(sheet, { PositionID: Utilities.getUuid(), PositionName: 'พนักงานขาย (PC)', IsOpen: true, IsSalesPC: true });
  appendRowByHeaders(sheet, { PositionID: Utilities.getUuid(), PositionName: 'เจ้าหน้าที่บัญชี', IsOpen: true, IsSalesPC: false });
}

function doPost(e) {
  var payload;
  try {
    payload = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonResponse({ ok: false, error: 'invalid_json' });
  }
  if (payload.action) return handleAdminAction(payload);
  return handleApplicationSubmission(payload);
}

function handleApplicationSubmission(payload) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    if (payload.honeypot) return jsonResponse({ ok: true });
    if (!payload.formLoadedAt || Date.now() - payload.formLoadedAt < MIN_SUBMIT_MS) return jsonResponse({ ok: true });

    var validationError = validatePayload(payload);
    if (validationError) return jsonResponse({ ok: false, error: validationError });

    var ss = getSpreadsheet();
    var attachmentColumns = saveAttachmentsAndGetColumns(ss, payload.applicationId, payload.attachments || []);
    var rowObj = buildApplicationRowObject(payload, attachmentColumns);
    var sheet = ensureSheetWithHeaders(ss, 'Applications', APPLICATIONS_HEADERS);
    appendRowByHeaders(sheet, rowObj);

    return jsonResponse({ ok: true, applicationId: payload.applicationId });
  } catch (err) {
    console.error(err);
    return jsonResponse({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function validatePayload(payload) {
  if (!payload.applicationId) return 'missing_applicationId';
  if (!payload.personal || !payload.personal.nameThai || !payload.personal.nameEnglish) return 'missing_name';
  if (!payload.personal.idCardNo || !/^[0-9]{13}$/.test(payload.personal.idCardNo)) return 'invalid_idCardNo';
  if (!payload.personal.positionApplying) return 'missing_position';
  if (!payload.consent || payload.consent.consentGiven !== true) return 'consent_not_given';
  return null;
}

function buildApplicationRowObject(p, attachmentColumns) {
  var personal = p.personal;
  var skills = p.skills;
  var health = p.health;
  var other = p.other;
  var consent = p.consent;
  var apps = skills.computer.apps || {};

  var rowObj = {
    ApplicationID: p.applicationId,
    SubmittedAt: new Date(),
    PositionApplying: personal.positionApplying,
    PositionArea: personal.positionArea,
    ExpectedSalary: personal.expectedSalary,
    NamePrefix: personal.namePrefix,
    NameThai: personal.nameThai,
    NameEnglish: personal.nameEnglish,
    Nickname: personal.nickname,
    Gender: personal.gender,
    HeightCm: personal.heightCm,
    WeightKg: personal.weightKg,
    DobBE: personal.dobBE,
    Age: personal.age,
    IdCardNo: personal.idCardNo,
    MobilePhone: personal.mobilePhone,
    Email: personal.email,
    LineId: personal.lineId,
    Address: personal.address,
    PostalCode: personal.postalCode,
    MaritalStatus: personal.maritalStatus,
    SpouseName: personal.spouseName,
    SpouseAge: personal.spouseAge,
    NumChildren: personal.numChildren,
    MilitaryStatus: personal.military.status,
    MilitaryServedYearBE: personal.military.servedYearBE,
    MilitaryNotYetYearBE: personal.military.notYetYearBE,
    MilitaryExemptOtherReason: personal.military.exemptOtherReason,
    Lang_English_Overall: skills.languages.english.overall,
    Lang_English_TestResult: skills.languages.english.testResult,
    Computer_CanUse: skills.computer.canUse,
    Computer_Word_Rating: appRating(apps, 'word'),
    Computer_Excel_Rating: appRating(apps, 'excel'),
    Computer_PowerPoint_Rating: appRating(apps, 'powerpoint'),
    Computer_Canva_Rating: appRating(apps, 'canva'),
    Computer_CapCut_Rating: appRating(apps, 'capcut'),
    Computer_ChatGPT_Rating: appRating(apps, 'chatgpt'),
    Computer_Claude_Rating: appRating(apps, 'claude'),
    Computer_Gemini_Rating: appRating(apps, 'gemini'),
    Health_Illness_YN: health.illness.yn,
    Health_Illness_Specify: health.illness.specify,
    Health_Chronic_YN: health.chronicDisease.yn,
    Health_Chronic_Specify: health.chronicDisease.specify,
    Health_Disability_YN: health.disability.yn,
    Health_Disability_Specify: health.disability.specify,
    Health_Pregnant_YN: health.pregnant.yn === null || health.pregnant.yn === undefined ? 'N/A' : health.pregnant.yn,
    Health_Pregnant_Specify: health.pregnant.specify,
    SourceOfPosting: other.sourceOfPosting,
    SourceOfPostingSpecify: other.sourceOfPostingSpecify,
    ReferredBy: other.referredBy,
    CriminalRecord_YN: other.criminalRecord.yn,
    CriminalRecord_Specify: other.criminalRecord.specify,
    PreviousSFG_YN: other.previousSFG.yn,
    PreviousSFG_Specify: other.previousSFG.specify,
    WillingToRelocate: other.willingToRelocate,
    PortfolioLink: consent.portfolioLink,
    ConsentGiven: consent.consentGiven,
    SignatureFullName: consent.signatureFullName,
    SignatureDate: consent.signatureDate,
    Status: '',
  };

  Object.assign(rowObj, flattenRepeatableSection(p.education, 3, 'Education',
    function (row) { return { Level: row.level, Institution: row.institution, FacultyMajor: row.facultyMajor, GPA: row.gpa }; },
    function (row) { return 'Level: ' + row.level + ' | Institution: ' + row.institution + ' | FacultyMajor: ' + row.facultyMajor + ' | GPA: ' + row.gpa; }
  ));

  Object.assign(rowObj, flattenRepeatableSection(p.workHistory, 5, 'WorkHistory',
    function (row) {
      return {
        From: row.from, To: row.to, IsCurrent: row.isCurrent ? 'Yes' : 'No', Duration: row.duration,
        Employer: row.employer, Position: row.position, LastSalary: row.lastSalary,
        Responsibilities: row.responsibilities, ReasonForLeaving: row.reasonForLeaving,
      };
    },
    function (row) {
      return 'From: ' + row.from + ' | To: ' + row.to + ' | Employer: ' + row.employer + ' | Position: ' + row.position +
        ' | LastSalary: ' + row.lastSalary + ' | Responsibilities: ' + row.responsibilities + ' | ReasonForLeaving: ' + row.reasonForLeaving;
    }
  ));

  Object.assign(rowObj, flattenRepeatableSection(other.emergencyContacts, 3, 'EmergencyContact',
    function (row) { return { Name: row.name, Mobile: row.mobile, Relationship: row.relationship }; },
    function (row) { return 'Name: ' + row.name + ' | Mobile: ' + row.mobile + ' | Relationship: ' + row.relationship; }
  ));

  Object.assign(rowObj, flattenRepeatableSection(skills.languages.additional, 3, 'AdditionalLanguage',
    function (row) { return { Name: row.name, Overall: row.overall, TestResult: row.testResult }; },
    function (row) { return 'Name: ' + row.name + ' | Overall: ' + row.overall + ' | TestResult: ' + row.testResult; }
  ));

  Object.assign(rowObj, flattenRepeatableSection(skills.computer.additionalApps, 3, 'AdditionalApp',
    function (row) { return { Name: row.name, Rating: row.rating }; },
    function (row) { return 'Name: ' + row.name + ' | Rating: ' + row.rating; }
  ));

  Object.assign(rowObj, attachmentColumns);

  return rowObj;
}

function appRating(apps, key) { return apps[key] ? apps[key].rating : ''; }

// Flattens a repeatable array (education rows, work-history rows, ...) into a fixed
// number of numbered column groups (columnPrefix + "1_" + field, "2_" + field, ...), and
// joins any entries beyond capCount into a single columnPrefix + "Extra" text column so
// an applicant with more entries than the cap never silently loses data.
function flattenRepeatableSection(rows, capCount, columnPrefix, mapRowToFields, formatOverflowEntry) {
  var nonEmpty = (rows || []).filter(function (row) {
    return Object.keys(row).some(function (k) { return !!row[k]; });
  });
  var result = {};
  for (var i = 0; i < capCount; i++) {
    var row = nonEmpty[i];
    if (!row) continue;
    var fields = mapRowToFields(row);
    Object.keys(fields).forEach(function (suffix) {
      result[columnPrefix + (i + 1) + '_' + suffix] = fields[suffix];
    });
  }
  result[columnPrefix + 'Extra'] = nonEmpty.slice(capCount).map(formatOverflowEntry).join('\n---\n');
  return result;
}

// Saves each attachment into a per-applicant Drive subfolder (unchanged from before) but
// returns flat column values for the applicant's single row instead of writing a separate
// Attachments-sheet row per file.
function saveAttachmentsAndGetColumns(ss, applicationId, attachments) {
  var columns = {
    PhotoURL: '', CVURL: '',
    AdditionalAttachment1_URL: '', AdditionalAttachment2_URL: '', AdditionalAttachment3_URL: '',
    AdditionalAttachmentsExtra: '',
  };
  if (!attachments || !attachments.length) return columns;

  var appFolder = getOrCreateDriveFolder().createFolder(applicationId);
  var additionalEntries = [];
  attachments.forEach(function (att) {
    var blob = Utilities.newBlob(Utilities.base64Decode(att.base64Data), att.mimeType, att.fileName);
    var ext = (att.fileName.match(/\.[^.]+$/) || [''])[0];
    var file = appFolder.createFile(blob).setName(applicationId + '_' + att.documentType + ext);
    var url = file.getUrl();
    if (att.documentType === 'photo') {
      columns.PhotoURL = url;
    } else if (att.documentType === 'cv') {
      columns.CVURL = url;
    } else {
      additionalEntries.push(att.fileName + ': ' + url);
    }
  });
  for (var i = 0; i < 3; i++) {
    columns['AdditionalAttachment' + (i + 1) + '_URL'] = additionalEntries[i] || '';
  }
  columns.AdditionalAttachmentsExtra = additionalEntries.slice(3).join('\n');
  return columns;
}

// ---- Admin actions (all require a verified Google Sign-In ID token) ----

function handleAdminAction(payload) {
  try {
    verifyAdminToken(payload.idToken);
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err) });
  }
  switch (payload.action) {
    case 'adminListPositions':
      return jsonResponse({ ok: true, positions: listAllPositionsForAdmin() });
    case 'adminAddPosition':
      return jsonResponse(addPosition(payload));
    case 'adminUpdatePosition':
      return jsonResponse(updatePosition(payload));
    case 'adminDeletePosition':
      return jsonResponse(deletePosition(payload));
    case 'adminMovePosition':
      return jsonResponse(movePosition(payload));
    case 'adminListApplications':
      return jsonResponse({ ok: true, applications: listAllApplications() });
    case 'adminExportXlsx':
      return jsonResponse(exportSpreadsheetAsXlsx());
    default:
      return jsonResponse({ ok: false, error: 'unknown_admin_action' });
  }
}

// Verifies a Google Identity Services ID token server-side. This is the ONLY access
// gate for admin actions, since the Web App deployment itself is anonymous/public --
// every admin branch must call this before doing anything. Throws (a plain string) on
// any failure; callers catch and turn it into a {ok:false, error:...} response.
function verifyAdminToken(idToken) {
  if (!idToken) throw 'missing_idToken';
  var resp = UrlFetchApp.fetch(
    'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken),
    { muteHttpExceptions: true }
  );
  if (resp.getResponseCode() !== 200) throw 'invalid_idToken';
  var claims = JSON.parse(resp.getContentText());
  // aud must match OUR client ID -- otherwise a token minted for some other site that
  // happens to belong to the same Google account could be replayed against this backend.
  if (claims.aud !== GOOGLE_CLIENT_ID) throw 'invalid_audience';
  if (claims.email_verified !== 'true') throw 'email_not_verified';
  if (String(claims.email).toLowerCase() !== ADMIN_EMAIL.toLowerCase()) throw 'not_authorized';
  return claims;
}

function listAllPositionsForAdmin() {
  var ss = getSpreadsheet();
  var sheet = ensureSheetWithHeaders(ss, 'Positions', POSITIONS_HEADERS);
  seedPositionsIfEmpty(sheet);
  backfillPositionIds(sheet);
  return readRowsAsObjects(sheet).map(function (r) {
    return { id: r.PositionID, name: r.PositionName, isOpen: r.IsOpen === true, isSalesPC: r.IsSalesPC === true };
  });
}

function addPosition(payload) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    if (!payload.name) return { ok: false, error: 'missing_name' };
    var ss = getSpreadsheet();
    var sheet = ensureSheetWithHeaders(ss, 'Positions', POSITIONS_HEADERS);
    var id = Utilities.getUuid();
    var isOpen = payload.isOpen !== false;
    var isSalesPC = payload.isSalesPC === true;
    appendRowByHeaders(sheet, { PositionID: id, PositionName: payload.name, IsOpen: isOpen, IsSalesPC: isSalesPC });
    return { ok: true, position: { id: id, name: payload.name, isOpen: isOpen, isSalesPC: isSalesPC } };
  } finally {
    lock.releaseLock();
  }
}

function updatePosition(payload) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    if (!payload.id) return { ok: false, error: 'missing_id' };
    var ss = getSpreadsheet();
    var sheet = ensureSheetWithHeaders(ss, 'Positions', POSITIONS_HEADERS);
    backfillPositionIds(sheet);
    var rowNum = findPositionRowById(sheet, payload.id);
    if (rowNum === -1) return { ok: false, error: 'position_not_found' };
    var updates = {};
    if (payload.name !== undefined) updates.PositionName = payload.name;
    if (payload.isOpen !== undefined) updates.IsOpen = payload.isOpen === true;
    if (payload.isSalesPC !== undefined) updates.IsSalesPC = payload.isSalesPC === true;
    updateRowByHeaders(sheet, rowNum, updates);
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

// Only closed positions can be deleted -- open ones should be closed first (matches the
// admin UI, which only shows the delete button for closed rows), checked again here in case
// of any client/server state mismatch.
function deletePosition(payload) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    if (!payload.id) return { ok: false, error: 'missing_id' };
    var ss = getSpreadsheet();
    var sheet = ensureSheetWithHeaders(ss, 'Positions', POSITIONS_HEADERS);
    backfillPositionIds(sheet);
    var rowNum = findPositionRowById(sheet, payload.id);
    if (rowNum === -1) return { ok: false, error: 'position_not_found' };
    var lastCol = sheet.getLastColumn();
    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    var rowValues = sheet.getRange(rowNum, 1, 1, lastCol).getValues()[0];
    if (rowValues[headers.indexOf('IsOpen')] === true) return { ok: false, error: 'position_is_open' };
    sheet.deleteRow(rowNum);
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

// Swaps a position's row with its immediate neighbor -- row order on the Positions sheet
// IS the display order, both here in the admin table and in the public form's dropdown
// (doGet's ?action=positions reads rows top-to-bottom in the same order), so moving a row
// up/down directly controls where it shows up for applicants.
function movePosition(payload) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    if (!payload.id || (payload.direction !== 'up' && payload.direction !== 'down')) {
      return { ok: false, error: 'invalid_request' };
    }
    var ss = getSpreadsheet();
    var sheet = ensureSheetWithHeaders(ss, 'Positions', POSITIONS_HEADERS);
    backfillPositionIds(sheet);
    var rowNum = findPositionRowById(sheet, payload.id);
    if (rowNum === -1) return { ok: false, error: 'position_not_found' };
    var targetRow = payload.direction === 'up' ? rowNum - 1 : rowNum + 1;
    if (targetRow < 2 || targetRow > sheet.getLastRow()) return { ok: false, error: 'cannot_move' };
    var lastCol = sheet.getLastColumn();
    var rangeA = sheet.getRange(rowNum, 1, 1, lastCol);
    var rangeB = sheet.getRange(targetRow, 1, 1, lastCol);
    var valuesA = rangeA.getValues();
    var valuesB = rangeB.getValues();
    rangeA.setValues(valuesB);
    rangeB.setValues(valuesA);
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

// Older Positions rows (created before PositionID existed) get one generated the first
// time the admin page reads them, so admin edits/closes always have a stable key to
// target -- no manual migration step needed.
function backfillPositionIds(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  var idCol = headerIndex(sheet, 'PositionID') + 1;
  var range = sheet.getRange(2, idCol, lastRow - 1, 1);
  var values = range.getValues();
  var changed = false;
  for (var i = 0; i < values.length; i++) {
    if (!values[i][0]) {
      values[i][0] = Utilities.getUuid();
      changed = true;
    }
  }
  if (changed) range.setValues(values);
}

function findPositionRowById(sheet, id) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  var idCol = headerIndex(sheet, 'PositionID') + 1;
  var ids = sheet.getRange(2, idCol, lastRow - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (ids[i][0] === id) return i + 2; // 1-based sheet row number
  }
  return -1;
}

// 0-based column index of a header name on the sheet's live header row, or -1.
function headerIndex(sheet, name) {
  var lastCol = sheet.getLastColumn();
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  return headers.indexOf(name);
}

// Partial update of an EXISTING row by header name -- only overwrites keys present in
// valuesObj, leaves every other cell in the row untouched.
function updateRowByHeaders(sheet, rowNum, valuesObj) {
  var lastCol = sheet.getLastColumn();
  var range = sheet.getRange(rowNum, 1, 1, lastCol);
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var currentRow = range.getValues()[0];
  var newRow = headers.map(function (h, i) {
    return valuesObj[h] !== undefined ? valuesObj[h] : currentRow[i];
  });
  range.setValues([newRow]);
}

function listAllApplications() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('Applications');
  return sheet ? readRowsAsObjects(sheet) : [];
}

// Whole spreadsheet (every tab), exported as .xlsx bytes via the script's OWN Google
// identity (executeAs: USER_DEPLOYING) -- NOT the signed-in admin's browser identity.
// This is deliberate: it means the Sheet (which holds PDPA-sensitive data -- ID card
// numbers, health info) never needs to be shared with anyone's personal Google account;
// verifyAdminToken above is the only access control that matters.
function exportSpreadsheetAsXlsx() {
  var ss = getSpreadsheet();
  var url = 'https://docs.google.com/spreadsheets/d/' + ss.getId() + '/export?format=xlsx';
  var resp = UrlFetchApp.fetch(url, {
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true,
  });
  if (resp.getResponseCode() !== 200) return { ok: false, error: 'export_failed_' + resp.getResponseCode() };
  return {
    ok: true,
    filename: 'SFG-Job-Applications-' + Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyyMMdd-HHmmss') + '.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    base64: Utilities.base64Encode(resp.getContent()),
  };
}

// Reads every data row (row 2 onward) of a sheet into an array of plain objects keyed by
// that sheet's live header row -- used by both the positions and applications admin reads.
function readRowsAsObjects(sheet) {
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2) return [];
  var data = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  var headers = data[0];
  return data.slice(1).map(function (row) {
    var obj = {};
    headers.forEach(function (h, i) { obj[h] = row[i]; });
    return obj;
  });
}

// Appends a row aligned to the sheet's ACTUAL current header row (by name), not the
// headers array a caller happens to pass. This is what keeps old columns from getting
// silently misaligned when a future change adds/removes/reorders fields in code --
// ensureSheetWithHeaders only ever appends new header names, never reorders existing ones,
// so a column's position in the sheet is stable once created.
function appendRowByHeaders(sheet, valuesObj) {
  var lastCol = sheet.getLastColumn();
  var currentHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var row = currentHeaders.map(function (h) { return valuesObj[h] !== undefined ? valuesObj[h] : ''; });
  sheet.appendRow(row);
}

function getSpreadsheet() {
  var id = getProp('SHEET_ID');
  if (id) return SpreadsheetApp.openById(id);

  var ss = SpreadsheetApp.create('SFG Job Applications');
  setProp('SHEET_ID', ss.getId());
  ensureSheetWithHeaders(ss, 'Applications', APPLICATIONS_HEADERS);
  var defaultSheet = ss.getSheetByName('Sheet1');
  if (defaultSheet) ss.deleteSheet(defaultSheet);
  return ss;
}

function getOrCreateDriveFolder() {
  var id = getProp('DRIVE_FOLDER_ID');
  if (id) return DriveApp.getFolderById(id);

  var folder = DriveApp.createFolder('SFG Applications - Attachments');
  setProp('DRIVE_FOLDER_ID', folder.getId());
  return folder;
}

function ensureSheetWithHeaders(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
    return sheet;
  }
  // Existing sheet: append any header names the code now expects but the sheet doesn't
  // have yet, as new columns at the end. Never reorder or remove existing columns --
  // that would misalign every row already written under the old column positions.
  var lastCol = sheet.getLastColumn();
  var existingHeaders = lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];
  var missing = headers.filter(function (h) { return existingHeaders.indexOf(h) === -1; });
  if (missing.length) {
    sheet.getRange(1, existingHeaders.length + 1, 1, missing.length).setValues([missing]);
  }
  return sheet;
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
