// Apps Script Web App backend for the SFG job application form.
// Deploy: Deploy > New deployment > Web app, Execute as: Me, Who has access: Anyone.
// First run auto-creates the Spreadsheet + Drive folder and stores their IDs in
// Script Properties -- no manual ID configuration needed. See README.md.

var MIN_SUBMIT_MS = 3000;

var APPLICATIONS_HEADERS = [
  'ApplicationID', 'SubmittedAt', 'PositionApplying', 'PositionArea', 'ExpectedSalary', 'NamePrefix', 'NameThai', 'NameEnglish', 'Nickname',
  'Gender', 'HeightCm', 'WeightKg', 'DobBE', 'Age', 'IdCardNo',
  'MobilePhone', 'Email', 'LineId', 'Address', 'PostalCode',
  'MaritalStatus', 'SpouseName', 'SpouseAge', 'NumChildren',
  'MilitaryStatus', 'MilitaryServedYearBE', 'MilitaryNotYetYearBE', 'MilitaryExemptOtherReason',
  'Lang_English_Overall', 'Lang_English_TestResult',
  'Computer_CanUse',
  'Computer_Word_Rating', 'Computer_Excel_Rating', 'Computer_PowerPoint_Rating',
  'Computer_Canva_Rating', 'Computer_ChatGPT_Rating', 'Computer_Claude_Rating', 'Computer_Gemini_Rating',
  'Health_Illness_YN', 'Health_Illness_Specify',
  'Health_Chronic_YN', 'Health_Chronic_Specify',
  'Health_Disability_YN', 'Health_Disability_Specify',
  'Health_Pregnant_YN', 'Health_Pregnant_Specify',
  'SourceOfPosting', 'ReferredBy',
  'CriminalRecord_YN', 'CriminalRecord_Specify',
  'PreviousSFG_YN', 'PreviousSFG_Specify',
  'WillingToRelocate',
  'Doc_Photo', 'Doc_EmploymentLetter', 'Doc_MarriageCert', 'Doc_IDCardCopy', 'Doc_ResidenceCert',
  'Doc_EducationCert', 'Doc_ChangedNameCert', 'Doc_MilitaryCert', 'Doc_Others_Specify',
  'ConsentGiven', 'SignatureFullName', 'SignatureDate', 'Status',
];

var EDUCATION_HEADERS = ['ApplicationID', 'Level', 'Institution', 'FacultyMajor', 'GPA'];
var WORKHISTORY_HEADERS = ['ApplicationID', 'From', 'To', 'Employer', 'Position', 'LastSalary', 'Responsibilities', 'ReasonForLeaving'];
var EMERGENCY_HEADERS = ['ApplicationID', 'Name', 'Mobile', 'Relationship'];
var ADDITIONAL_LANGUAGES_HEADERS = ['ApplicationID', 'Name', 'Overall'];
var ADDITIONAL_APPS_HEADERS = ['ApplicationID', 'AppName', 'Rating'];
var ATTACHMENTS_HEADERS = ['ApplicationID', 'DocumentType', 'FileName', 'DriveFileURL', 'MimeType', 'FileSizeBytes'];
var POSITIONS_HEADERS = ['PositionName', 'IsOpen', 'IsSalesPC'];

function doGet(e) {
  var action = e.parameter.action;
  if (action === 'positions') {
    var ss = getSpreadsheet();
    var sheet = ensureSheetWithHeaders(ss, 'Positions', POSITIONS_HEADERS);
    seedPositionsIfEmpty(sheet);
    var rows = sheet.getDataRange().getValues();
    var positions = [];
    for (var i = 1; i < rows.length; i++) {
      var name = rows[i][0];
      var isOpen = rows[i][1];
      var isSalesPC = rows[i][2];
      if (name && isOpen === true) positions.push({ name: name, isSalesPC: isSalesPC === true });
    }
    return jsonResponse({ positions: positions });
  }
  return jsonResponse({ ok: false, error: 'unknown_action' });
}

function seedPositionsIfEmpty(sheet) {
  if (sheet.getLastRow() > 1) return;
  sheet.appendRow(['พนักงานขาย (PC)', true, true]);
  sheet.appendRow(['เจ้าหน้าที่บัญชี', true, false]);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var payload = JSON.parse(e.postData.contents);

    if (payload.honeypot) return jsonResponse({ ok: true });
    if (!payload.formLoadedAt || Date.now() - payload.formLoadedAt < MIN_SUBMIT_MS) return jsonResponse({ ok: true });

    var validationError = validatePayload(payload);
    if (validationError) return jsonResponse({ ok: false, error: validationError });

    var ss = getSpreadsheet();
    writeApplicationRow(ss, payload);
    writeChildRows(ss, 'Education', EDUCATION_HEADERS, payload.applicationId, payload.education, function (row) {
      return { ApplicationID: payload.applicationId, Level: row.level, Institution: row.institution, FacultyMajor: row.facultyMajor, GPA: row.gpa };
    });
    writeChildRows(ss, 'WorkHistory', WORKHISTORY_HEADERS, payload.applicationId, payload.workHistory, function (row) {
      return { ApplicationID: payload.applicationId, From: row.from, To: row.to, Employer: row.employer, Position: row.position, LastSalary: row.lastSalary, Responsibilities: row.responsibilities, ReasonForLeaving: row.reasonForLeaving };
    });
    writeChildRows(ss, 'EmergencyContacts', EMERGENCY_HEADERS, payload.applicationId, payload.other.emergencyContacts, function (row) {
      return { ApplicationID: payload.applicationId, Name: row.name, Mobile: row.mobile, Relationship: row.relationship };
    });
    writeChildRows(ss, 'AdditionalLanguages', ADDITIONAL_LANGUAGES_HEADERS, payload.applicationId, payload.skills.languages.additional, function (row) {
      return { ApplicationID: payload.applicationId, Name: row.name, Overall: row.overall };
    });
    writeChildRows(ss, 'AdditionalComputerApps', ADDITIONAL_APPS_HEADERS, payload.applicationId, payload.skills.computer.additionalApps, function (row) {
      return { ApplicationID: payload.applicationId, AppName: row.name, Rating: row.rating };
    });

    if (payload.attachments && payload.attachments.length) {
      saveAttachments(ss, payload.applicationId, payload.attachments);
    }

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

function writeApplicationRow(ss, p) {
  var sheet = ensureSheetWithHeaders(ss, 'Applications', APPLICATIONS_HEADERS);
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
    ReferredBy: other.referredBy,
    CriminalRecord_YN: other.criminalRecord.yn,
    CriminalRecord_Specify: other.criminalRecord.specify,
    PreviousSFG_YN: other.previousSFG.yn,
    PreviousSFG_Specify: other.previousSFG.specify,
    WillingToRelocate: other.willingToRelocate,
    Doc_Photo: hasDoc(consent, 'photo'),
    Doc_EmploymentLetter: hasDoc(consent, 'employmentLetter'),
    Doc_MarriageCert: hasDoc(consent, 'marriageCert'),
    Doc_IDCardCopy: hasDoc(consent, 'idCardCopy'),
    Doc_ResidenceCert: hasDoc(consent, 'residenceCert'),
    Doc_EducationCert: hasDoc(consent, 'educationCert'),
    Doc_ChangedNameCert: hasDoc(consent, 'changedNameCert'),
    Doc_MilitaryCert: hasDoc(consent, 'militaryCert'),
    Doc_Others_Specify: hasDoc(consent, 'others') ? consent.otherDocSpecify : '',
    ConsentGiven: consent.consentGiven,
    SignatureFullName: consent.signatureFullName,
    SignatureDate: consent.signatureDate,
    Status: '',
  };

  sheet.appendRow(APPLICATIONS_HEADERS.map(function (h) { return rowObj[h] !== undefined ? rowObj[h] : ''; }));
}

function appRating(apps, key) { return apps[key] ? apps[key].rating : ''; }
function hasDoc(consent, key) { return consent.documentsAttached && consent.documentsAttached.indexOf(key) !== -1; }

function writeChildRows(ss, sheetName, headers, applicationId, rows, mapFn) {
  if (!rows || !rows.length) return;
  var sheet = ensureSheetWithHeaders(ss, sheetName, headers);
  rows.forEach(function (row) {
    var isEmpty = Object.keys(row).every(function (k) { return !row[k]; });
    if (isEmpty) return;
    var mapped = mapFn(row);
    sheet.appendRow(headers.map(function (h) { return mapped[h] !== undefined ? mapped[h] : ''; }));
  });
}

function saveAttachments(ss, applicationId, attachments) {
  var sheet = ensureSheetWithHeaders(ss, 'Attachments', ATTACHMENTS_HEADERS);
  var parentFolder = getOrCreateDriveFolder();
  var appFolder = parentFolder.createFolder(applicationId);

  attachments.forEach(function (att) {
    var blob = Utilities.newBlob(Utilities.base64Decode(att.base64Data), att.mimeType, att.fileName);
    var ext = (att.fileName.match(/\.[^.]+$/) || [''])[0];
    var file = appFolder.createFile(blob).setName(applicationId + '_' + att.documentType + ext);
    sheet.appendRow([applicationId, att.documentType, att.fileName, file.getUrl(), att.mimeType, att.sizeBytes]);
  });
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
  }
  return sheet;
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
