// Admin dashboard: Google Sign-In + positions management + applications viewer/export.
// Kept deliberately separate from the public form's js files -- nothing here is loaded
// by index.html, and nothing the public form loads is needed here.

const AdminState = {
  idToken: null,
  email: '',
  positions: [],
  applications: [],
};

function adminApiUrl() {
  return window.SFG_CONFIG && window.SFG_CONFIG.APPS_SCRIPT_URL;
}

// Same text/plain no-preflight POST trick js/submit.js uses for the public form.
async function callAdmin(action, extraFields) {
  const url = adminApiUrl();
  if (!url || url.includes('YOUR_DEPLOYMENT_ID')) {
    return { ok: false, error: 'not_configured' };
  }
  const body = Object.assign({ action, idToken: AdminState.idToken }, extraFields || {});
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body),
    });
    return await response.json();
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

const AUTH_ERROR_CODES = ['missing_idToken', 'invalid_idToken', 'invalid_audience', 'email_not_verified', 'not_authorized'];

function isAuthError(result) {
  return result && result.ok === false && AUTH_ERROR_CODES.indexOf(result.error) !== -1;
}

function showSignInScreen(message) {
  AdminState.idToken = null;
  document.getElementById('admin-app').style.display = 'none';
  document.getElementById('signin-section').style.display = 'block';
  const errEl = document.getElementById('signin-error');
  if (message) {
    errEl.textContent = message;
    errEl.style.display = 'block';
  } else {
    errEl.style.display = 'none';
  }
}

function handleCredentialResponse(response) {
  AdminState.idToken = response.credential;
  try {
    const payload = JSON.parse(atob(response.credential.split('.')[1]));
    AdminState.email = payload.email || '';
  } catch (err) {
    AdminState.email = '';
  }
  verifyAndLoadAdminApp();
}

function initGoogleSignIn() {
  if (typeof google === 'undefined' || !google.accounts) {
    showSignInScreen('โหลด Google Sign-In ไม่สำเร็จ กรุณาลองรีเฟรชหน้า / Failed to load Google Sign-In, please refresh.');
    return;
  }
  google.accounts.id.initialize({
    client_id: window.SFG_ADMIN_CONFIG.GOOGLE_CLIENT_ID,
    callback: handleCredentialResponse,
  });
  google.accounts.id.renderButton(document.getElementById('g_id_signin'), {
    theme: 'outline',
    size: 'large',
    text: 'signin_with',
  });
}

async function verifyAndLoadAdminApp() {
  const result = await callAdmin('adminListPositions');
  if (isAuthError(result)) {
    showSignInScreen('เข้าสู่ระบบไม่สำเร็จ หรือไม่มีสิทธิ์เข้าถึง / Sign-in failed or not authorized (' + result.error + ')');
    return;
  }
  if (!result.ok) {
    showSignInScreen('เกิดข้อผิดพลาด / Error: ' + result.error);
    return;
  }
  AdminState.positions = result.positions;
  document.getElementById('signin-section').style.display = 'none';
  document.getElementById('admin-app').style.display = 'block';
  document.getElementById('admin-user-email').textContent = AdminState.email;
  renderPositionsTable();
}

function signOut() {
  if (typeof google !== 'undefined' && google.accounts) google.accounts.id.disableAutoSelect();
  showSignInScreen(null);
}

// ---- Tabs ----

function bindAdminTabs() {
  document.querySelectorAll('[data-admin-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-admin-tab');
      document.querySelectorAll('[data-admin-tab]').forEach((b) => b.classList.toggle('active', b === btn));
      document.getElementById('tab-positions').style.display = target === 'positions' ? 'block' : 'none';
      document.getElementById('tab-applications').style.display = target === 'applications' ? 'block' : 'none';
      if (target === 'applications' && AdminState.applications.length === 0) loadApplications();
    });
  });
}

// ---- Positions ----

function renderPositionsTable() {
  const tbody = document.getElementById('positions-tbody');
  const list = AdminState.positions;
  tbody.innerHTML = list
    .map(
      (p, i) => `<tr data-position-id="${escapeHtml(p.id)}">
        <td class="admin-editable-name">${escapeHtml(p.name)}</td>
        <td><input type="checkbox" data-position-field="isSalesPC" ${p.isSalesPC ? 'checked' : ''} /></td>
        <td>${p.isOpen ? '<span class="admin-badge admin-badge-open">เปิดรับ / Open</span>' : '<span class="admin-badge admin-badge-closed">ปิดรับ / Closed</span>'}</td>
        <td class="admin-row-actions">
          <button type="button" class="btn btn-secondary admin-btn-small" data-position-action="move-up" title="เลื่อนขึ้น / Move up" ${i === 0 ? 'disabled' : ''}>&#9650;</button>
          <button type="button" class="btn btn-secondary admin-btn-small" data-position-action="move-down" title="เลื่อนลง / Move down" ${i === list.length - 1 ? 'disabled' : ''}>&#9660;</button>
          <button type="button" class="btn btn-secondary admin-btn-small" data-position-action="edit-name">แก้ไขชื่อ</button>
          <button type="button" class="btn btn-secondary admin-btn-small" data-position-action="toggle-open">${p.isOpen ? 'ปิดรับ' : 'เปิดรับ'}</button>
          ${!p.isOpen ? '<button type="button" class="btn btn-secondary admin-btn-small admin-btn-danger" data-position-action="delete">ลบ / Delete</button>' : ''}
        </td>
      </tr>`
    )
    .join('');

  tbody.querySelectorAll('[data-position-field="isSalesPC"]').forEach((checkbox) => {
    checkbox.addEventListener('change', (e) => {
      const id = e.target.closest('tr').getAttribute('data-position-id');
      savePositionField(id, { isSalesPC: e.target.checked });
    });
  });

  tbody.querySelectorAll('[data-position-action="toggle-open"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const row = e.target.closest('tr');
      const id = row.getAttribute('data-position-id');
      const position = AdminState.positions.find((p) => p.id === id);
      savePositionField(id, { isOpen: !position.isOpen });
    });
  });

  tbody.querySelectorAll('[data-position-action="edit-name"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const row = e.target.closest('tr');
      const id = row.getAttribute('data-position-id');
      const position = AdminState.positions.find((p) => p.id === id);
      const newName = prompt('ชื่อตำแหน่งใหม่ / New position name:', position.name);
      if (newName && newName.trim() && newName.trim() !== position.name) {
        savePositionField(id, { name: newName.trim() });
      }
    });
  });

  tbody.querySelectorAll('[data-position-action="move-up"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const id = e.target.closest('tr').getAttribute('data-position-id');
      movePosition(id, 'up');
    });
  });

  tbody.querySelectorAll('[data-position-action="move-down"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const id = e.target.closest('tr').getAttribute('data-position-id');
      movePosition(id, 'down');
    });
  });

  tbody.querySelectorAll('[data-position-action="delete"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const id = e.target.closest('tr').getAttribute('data-position-id');
      const position = AdminState.positions.find((p) => p.id === id);
      if (confirm(`ยืนยันการลบตำแหน่ง "${position.name}" ถาวร? / Permanently delete "${position.name}"?`)) {
        deletePosition(id);
      }
    });
  });
}

async function movePosition(id, direction) {
  const statusEl = document.getElementById('positions-status');
  statusEl.textContent = 'กำลังย้าย... / Moving...';
  const result = await callAdmin('adminMovePosition', { id, direction });
  if (isAuthError(result)) return showSignInScreen('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่ / Session expired, please sign in again.');
  if (!result.ok) {
    statusEl.textContent = 'ย้ายไม่สำเร็จ / Move failed: ' + result.error;
    return;
  }
  statusEl.textContent = '';
  await loadPositions();
}

async function deletePosition(id) {
  const statusEl = document.getElementById('positions-status');
  statusEl.textContent = 'กำลังลบ... / Deleting...';
  const result = await callAdmin('adminDeletePosition', { id });
  if (isAuthError(result)) return showSignInScreen('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่ / Session expired, please sign in again.');
  if (!result.ok) {
    statusEl.textContent = 'ลบไม่สำเร็จ / Delete failed: ' + result.error;
    return;
  }
  statusEl.textContent = '';
  await loadPositions();
}

async function savePositionField(id, fields) {
  const statusEl = document.getElementById('positions-status');
  statusEl.textContent = 'กำลังบันทึก... / Saving...';
  const result = await callAdmin('adminUpdatePosition', Object.assign({ id }, fields));
  if (isAuthError(result)) return showSignInScreen('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่ / Session expired, please sign in again.');
  if (!result.ok) {
    statusEl.textContent = 'บันทึกไม่สำเร็จ / Save failed: ' + result.error;
    return;
  }
  statusEl.textContent = '';
  await loadPositions();
}

async function loadPositions() {
  const result = await callAdmin('adminListPositions');
  if (isAuthError(result)) return showSignInScreen('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่ / Session expired, please sign in again.');
  if (!result.ok) {
    document.getElementById('positions-status').textContent = 'โหลดข้อมูลไม่สำเร็จ / Load failed: ' + result.error;
    return;
  }
  AdminState.positions = result.positions;
  renderPositionsTable();
}

function bindAddPositionForm() {
  document.getElementById('add-position-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nameInput = document.getElementById('new-position-name');
    const salesPcInput = document.getElementById('new-position-salespc');
    const name = nameInput.value.trim();
    if (!name) return;
    const statusEl = document.getElementById('positions-status');
    statusEl.textContent = 'กำลังเพิ่ม... / Adding...';
    const result = await callAdmin('adminAddPosition', { name, isOpen: true, isSalesPC: salesPcInput.checked });
    if (isAuthError(result)) return showSignInScreen('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่ / Session expired, please sign in again.');
    if (!result.ok) {
      statusEl.textContent = 'เพิ่มไม่สำเร็จ / Add failed: ' + result.error;
      return;
    }
    nameInput.value = '';
    salesPcInput.checked = false;
    statusEl.textContent = '';
    await loadPositions();
  });
}

// ---- Applications ----

async function loadApplications() {
  const statusEl = document.getElementById('applications-status');
  statusEl.textContent = 'กำลังโหลด... / Loading...';
  const result = await callAdmin('adminListApplications');
  if (isAuthError(result)) return showSignInScreen('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่ / Session expired, please sign in again.');
  if (!result.ok) {
    statusEl.textContent = 'โหลดข้อมูลไม่สำเร็จ / Load failed: ' + result.error;
    return;
  }
  AdminState.applications = result.applications;
  statusEl.textContent = `พบ ${result.applications.length} ใบสมัคร / ${result.applications.length} applications found`;
  renderApplicationsTable(AdminState.applications);
}

function renderApplicationsTable(rows) {
  const tbody = document.getElementById('applications-tbody');
  tbody.innerHTML = rows
    .map((app, i) => {
      const submittedAt = app.SubmittedAt ? new Date(app.SubmittedAt).toLocaleString('th-TH') : '';
      return `<tr data-app-index="${i}" class="admin-clickable-row">
        <td>${escapeHtml(submittedAt)}</td>
        <td>${escapeHtml(app.NameThai || '')}<br><span class="admin-subtext">${escapeHtml(app.NameEnglish || '')}</span></td>
        <td>${escapeHtml(app.PositionApplying || '')}</td>
        <td>${escapeHtml(app.MobilePhone || '')}</td>
        <td>${escapeHtml(app.Status || '-')}</td>
      </tr>`;
    })
    .join('');

  tbody.querySelectorAll('tr').forEach((row) => {
    row.addEventListener('click', () => {
      const app = rows[Number(row.getAttribute('data-app-index'))];
      renderApplicationDetail(app);
    });
  });
}

function bindApplicationsSearch() {
  document.getElementById('applications-search').addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    if (!q) return renderApplicationsTable(AdminState.applications);
    const filtered = AdminState.applications.filter((app) =>
      [app.NameThai, app.NameEnglish, app.PositionApplying, app.MobilePhone, app.Email]
        .some((v) => v && String(v).toLowerCase().includes(q))
    );
    renderApplicationsTable(filtered);
  });
}

const DETAIL_FIELD_GROUPS = [
  {
    title: 'ตำแหน่งงาน / Position',
    fields: [['PositionApplying', 'ตำแหน่งที่สมัคร'], ['PositionArea', 'พื้นที่/ห้างที่สะดวก'], ['ExpectedSalary', 'เงินเดือนที่ต้องการ']],
  },
  {
    title: 'ข้อมูลส่วนตัว / Personal',
    fields: [
      ['NamePrefix', 'คำนำหน้า'], ['NameThai', 'ชื่อ (ไทย)'], ['NameEnglish', 'ชื่อ (อังกฤษ)'], ['Nickname', 'ชื่อเล่น'],
      ['Gender', 'เพศ'], ['HeightCm', 'ส่วนสูง'], ['WeightKg', 'น้ำหนัก'], ['DobBE', 'วันเกิด'], ['Age', 'อายุ'],
      ['IdCardNo', 'เลขบัตรประชาชน'], ['MobilePhone', 'มือถือ'], ['Email', 'อีเมล'], ['LineId', 'Line ID'],
      ['Address', 'ที่อยู่'], ['PostalCode', 'รหัสไปรษณีย์'], ['MaritalStatus', 'สถานภาพสมรส'],
      ['SpouseName', 'ชื่อคู่สมรส'], ['SpouseAge', 'อายุคู่สมรส'], ['NumChildren', 'จำนวนบุตร'],
      ['MilitaryStatus', 'การรับราชการทหาร'], ['MilitaryServedYearBE', 'ปีที่ผ่านการเกณฑ์'],
      ['MilitaryNotYetYearBE', 'ปีที่จะเกณฑ์'], ['MilitaryExemptOtherReason', 'เหตุผลที่ยกเว้น'],
    ],
  },
  {
    title: 'วุฒิการศึกษา / Education',
    fields: [1, 2, 3].flatMap((n) => [
      [`Education${n}_Level`, `วุฒิ #${n} ระดับ`], [`Education${n}_Institution`, `วุฒิ #${n} สถาบัน`],
      [`Education${n}_FacultyMajor`, `วุฒิ #${n} คณะ/สาขา`], [`Education${n}_GPA`, `วุฒิ #${n} GPA`],
    ]).concat([['EducationExtra', 'วุฒิการศึกษาเพิ่มเติม (เกินจำนวนที่แสดง)']]),
  },
  {
    title: 'ประวัติการทำงาน / Work History',
    fields: [1, 2, 3, 4, 5].flatMap((n) => [
      [`WorkHistory${n}_From`, `งาน #${n} จาก`], [`WorkHistory${n}_To`, `งาน #${n} ถึง`],
      [`WorkHistory${n}_IsCurrent`, `งาน #${n} ปัจจุบัน`], [`WorkHistory${n}_Duration`, `งาน #${n} อายุงาน`],
      [`WorkHistory${n}_Employer`, `งาน #${n} นายจ้าง`], [`WorkHistory${n}_Position`, `งาน #${n} ตำแหน่ง`],
      [`WorkHistory${n}_LastSalary`, `งาน #${n} เงินเดือนล่าสุด`], [`WorkHistory${n}_Responsibilities`, `งาน #${n} หน้าที่`],
      [`WorkHistory${n}_ReasonForLeaving`, `งาน #${n} เหตุผลที่ลาออก`],
    ]).concat([['WorkHistoryExtra', 'ประวัติการทำงานเพิ่มเติม (เกินจำนวนที่แสดง)']]),
  },
  {
    title: 'ทักษะและความสามารถ / Skills',
    fields: [
      ['Lang_English_Overall', 'ภาษาอังกฤษ (คะแนน)'], ['Lang_English_TestResult', 'ผลสอบภาษาอังกฤษ'],
      ['AdditionalLanguage1_Name', 'ภาษาเพิ่มเติม #1'], ['AdditionalLanguage1_Overall', 'ภาษาเพิ่มเติม #1 คะแนน'],
      ['AdditionalLanguage2_Name', 'ภาษาเพิ่มเติม #2'], ['AdditionalLanguage2_Overall', 'ภาษาเพิ่มเติม #2 คะแนน'],
      ['AdditionalLanguage3_Name', 'ภาษาเพิ่มเติม #3'], ['AdditionalLanguage3_Overall', 'ภาษาเพิ่มเติม #3 คะแนน'],
      ['AdditionalLanguageExtra', 'ภาษาเพิ่มเติม (เกินจำนวนที่แสดง)'],
      ['Computer_CanUse', 'ใช้คอมพิวเตอร์ได้'],
      ['Computer_Word_Rating', 'Word'], ['Computer_Excel_Rating', 'Excel'], ['Computer_PowerPoint_Rating', 'PowerPoint'],
      ['Computer_Canva_Rating', 'Canva'], ['Computer_CapCut_Rating', 'CapCut'], ['Computer_ChatGPT_Rating', 'ChatGPT'],
      ['Computer_Claude_Rating', 'Claude'], ['Computer_Gemini_Rating', 'Gemini'],
      ['AdditionalApp1_Name', 'โปรแกรมเพิ่มเติม #1'], ['AdditionalApp1_Rating', 'โปรแกรมเพิ่มเติม #1 คะแนน'],
      ['AdditionalApp2_Name', 'โปรแกรมเพิ่มเติม #2'], ['AdditionalApp2_Rating', 'โปรแกรมเพิ่มเติม #2 คะแนน'],
      ['AdditionalApp3_Name', 'โปรแกรมเพิ่มเติม #3'], ['AdditionalApp3_Rating', 'โปรแกรมเพิ่มเติม #3 คะแนน'],
      ['AdditionalAppExtra', 'โปรแกรมเพิ่มเติม (เกินจำนวนที่แสดง)'],
    ],
  },
  {
    title: 'สุขภาพอนามัย / Health',
    fields: [
      ['Health_Illness_YN', 'เคยเจ็บป่วยร้ายแรง'], ['Health_Illness_Specify', 'ระบุ'],
      ['Health_Chronic_YN', 'โรคประจำตัว'], ['Health_Chronic_Specify', 'ระบุ'],
      ['Health_Disability_YN', 'ความบกพร่องทางร่างกาย'], ['Health_Disability_Specify', 'ระบุ'],
      ['Health_Pregnant_YN', 'ตั้งครรภ์'], ['Health_Pregnant_Specify', 'ระบุ'],
    ],
  },
  {
    title: 'ข้อมูลอื่น ๆ / Other',
    fields: [
      ['SourceOfPosting', 'ทราบข่าวจาก'], ['SourceOfPostingSpecify', 'ระบุ'], ['ReferredBy', 'ผู้แนะนำ'],
      ['CriminalRecord_YN', 'เคยต้องโทษ'], ['CriminalRecord_Specify', 'ระบุ'],
      ['PreviousSFG_YN', 'เคยเป็นพนักงาน SFG'], ['PreviousSFG_Specify', 'ระบุ'],
      ['WillingToRelocate', 'ยินดีไปต่างจังหวัด/ต่างประเทศ'],
      ...[1, 2, 3].flatMap((n) => [
        [`EmergencyContact${n}_Name`, `ผู้ติดต่อฉุกเฉิน #${n} ชื่อ`],
        [`EmergencyContact${n}_Mobile`, `ผู้ติดต่อฉุกเฉิน #${n} มือถือ`],
        [`EmergencyContact${n}_Relationship`, `ผู้ติดต่อฉุกเฉิน #${n} ความสัมพันธ์`],
      ]),
      ['EmergencyContactExtra', 'ผู้ติดต่อฉุกเฉินเพิ่มเติม (เกินจำนวนที่แสดง)'],
    ],
  },
  {
    title: 'เอกสารแนบ / Attachments',
    fields: [
      ['PhotoURL', 'รูปถ่าย'], ['CVURL', 'ประวัติส่วนตัว (CV)'],
      ['AdditionalAttachment1_URL', 'ไฟล์แนบเพิ่มเติม #1'], ['AdditionalAttachment2_URL', 'ไฟล์แนบเพิ่มเติม #2'],
      ['AdditionalAttachment3_URL', 'ไฟล์แนบเพิ่มเติม #3'], ['AdditionalAttachmentsExtra', 'ไฟล์แนบเพิ่มเติม (เกินจำนวนที่แสดง)'],
      ['PortfolioLink', 'ลิงก์ผลงาน / Portfolio'],
    ],
  },
  {
    title: 'การยืนยัน / Consent',
    fields: [
      ['ConsentGiven', 'ยินยอม'], ['SignatureFullName', 'ลายมือชื่อ (พิมพ์ชื่อ)'], ['SignatureDate', 'วันที่'],
      ['Status', 'สถานะ (HR)'], ['ApplicationID', 'Application ID'],
    ],
  },
];

const URL_LIKE_HEADERS = ['PhotoURL', 'CVURL', 'AdditionalAttachment1_URL', 'AdditionalAttachment2_URL', 'AdditionalAttachment3_URL', 'PortfolioLink'];

function detailValueHtml(header, value) {
  if (value == null || value === '') return '<span class="admin-subtext">-</span>';
  if (URL_LIKE_HEADERS.indexOf(header) !== -1 && /^https?:\/\//.test(String(value))) {
    return `<a href="${escapeHtml(value)}" target="_blank" rel="noopener">เปิดไฟล์ / Open</a>`;
  }
  return escapeHtml(String(value)).replace(/\n/g, '<br>');
}

function renderApplicationDetail(app) {
  const detailEl = document.getElementById('application-detail');
  const sections = DETAIL_FIELD_GROUPS.map((group) => {
    const rows = group.fields
      .filter(([header]) => app[header] != null && app[header] !== '')
      .map(([header, label]) => `<div class="review-row"><span class="review-label">${escapeHtml(label)}</span><span class="review-value">${detailValueHtml(header, app[header])}</span></div>`)
      .join('');
    if (!rows) return '';
    return `<div class="review-section"><h3>${escapeHtml(group.title)}</h3>${rows}</div>`;
  }).join('');

  detailEl.innerHTML = `<button type="button" class="btn btn-secondary admin-btn-small" id="btn-close-detail">ปิด / Close</button>${sections}`;
  detailEl.style.display = 'block';
  detailEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  document.getElementById('btn-close-detail').addEventListener('click', () => {
    detailEl.style.display = 'none';
  });
}

// ---- Export ----

function base64ToBlob(base64, mimeType) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
}

async function exportToExcel() {
  const btn = document.getElementById('btn-export-excel');
  const statusEl = document.getElementById('applications-status');
  btn.disabled = true;
  statusEl.textContent = 'กำลังสร้างไฟล์ Excel... / Preparing Excel file...';
  const result = await callAdmin('adminExportXlsx');
  btn.disabled = false;
  if (isAuthError(result)) return showSignInScreen('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่ / Session expired, please sign in again.');
  if (!result.ok) {
    statusEl.textContent = 'Export ไม่สำเร็จ / Export failed: ' + result.error;
    return;
  }
  const blob = base64ToBlob(result.base64, result.mimeType);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = result.filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  statusEl.textContent = 'ดาวน์โหลดไฟล์แล้ว / File downloaded.';
}

// ---- Init ----

document.addEventListener('DOMContentLoaded', () => {
  initGoogleSignIn();
  bindAdminTabs();
  bindAddPositionForm();
  bindApplicationsSearch();
  document.getElementById('btn-signout').addEventListener('click', signOut);
  document.getElementById('btn-refresh-applications').addEventListener('click', loadApplications);
  document.getElementById('btn-export-excel').addEventListener('click', exportToExcel);
});
