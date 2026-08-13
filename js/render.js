// Builds DOM for each wizard step from formSchema + current state.
// Fields whose visibility gates other fields are marked TRIGGER_FIELDS so app.js
// knows to fully re-render the step (not just update state) when they change.

const TRIGGER_FIELDS = new Set([
  'personal.gender',
  'personal.maritalStatus',
  'personal.military.status',
  'skills.computer.canUse',
  'health.illness.yn',
  'health.chronicDisease.yn',
  'health.disability.yn',
  'health.pregnant.yn',
  'other.criminalRecord.yn',
  'other.previousSFG.yn',
  'other.sourceOfPosting',
]);

function fieldWrapperClass(field) {
  return field.colSpan === 'full' ? 'field-group field-full' : 'field-group';
}

function renderInput(field, state) {
  const value = getPath(state, field.path);
  const isTrigger = TRIGGER_FIELDS.has(field.path);
  const commonAttrs = `data-path="${field.path}" data-trigger="${isTrigger}"`;

  if (field.type === 'radio') {
    const items = field.options
      .map((opt) => {
        const checked = value === opt.value ? 'checked' : '';
        return `<label class="radio-option">
          <input type="radio" name="${field.path}" value="${opt.value}" ${commonAttrs} ${checked} />
          <span>${bilingual(opt.label)}</span>
        </label>`;
      })
      .join('');
    return `<div class="radio-group">${items}</div>`;
  }

  if (field.type === 'select') {
    const placeholder = `<option value="" disabled ${!value ? 'selected' : ''}>-- ${bilingual({ th: 'เลือก', en: 'Select' })} --</option>`;
    const opts = field.options
      .map((opt) => `<option value="${opt.value}" ${value === opt.value ? 'selected' : ''}>${bilingual(opt.label)}</option>`)
      .join('');
    return `<select ${commonAttrs}>${placeholder}${opts}</select>`;
  }

  if (field.type === 'textarea') {
    return `<textarea ${commonAttrs} rows="3">${escapeHtml(value || '')}</textarea>`;
  }

  if (field.type === 'dob') {
    return renderDobInputs(state);
  }

  return `<input type="${field.type}" ${commonAttrs} value="${escapeHtml(value || '')}" ${field.pattern ? `pattern="${field.pattern}"` : ''} ${field.readonly ? 'readonly' : ''} ${field.numeric ? 'inputmode="numeric" data-numeric="true"' : ''} />`;
}

const MONTH_NAMES = {
  th: ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};

// Renders separate day/month/year dropdowns instead of a native date input so the year
// list can show พ.ศ. (Buddhist Era) in Thai and ค.ศ. (Anno Domini) in English -- native
// <input type="date"> always uses the Gregorian calendar and can't be switched per-language.
function renderDobInputs(state) {
  const lang = window.SFG_LANG === 'en' ? 'en' : 'th';
  const day = state.personal.dobDay || '';
  const month = state.personal.dobMonth || '';
  const yearDisplay = state.personal.dobYear || '';

  const placeholder = (label) => `<option value="" disabled ${'selected'}>-- ${bilingual(label)} --</option>`;

  const dayOptions = Array.from({ length: 31 }, (_, i) => i + 1)
    .map((d) => `<option value="${d}" ${String(d) === String(day) ? 'selected' : ''}>${d}</option>`)
    .join('');

  const monthOptions = MONTH_NAMES[lang]
    .map((name, i) => `<option value="${i + 1}" ${String(i + 1) === String(month) ? 'selected' : ''}>${name}</option>`)
    .join('');

  const currentAdYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 56 }, (_, i) => currentAdYear - 15 - i)
    .map((adYear) => {
      const displayYear = lang === 'th' ? adYear + 543 : adYear;
      return `<option value="${displayYear}" ${String(displayYear) === String(yearDisplay) ? 'selected' : ''}>${displayYear}</option>`;
    })
    .join('');

  return `<div class="dob-select-group">
    <select data-path="personal.dobDay" data-trigger="false">${placeholder({ th: 'วัน', en: 'Day' })}${dayOptions}</select>
    <select data-path="personal.dobMonth" data-trigger="false">${placeholder({ th: 'เดือน', en: 'Month' })}${monthOptions}</select>
    <select data-path="personal.dobYear" data-trigger="false">${placeholder({ th: lang === 'th' ? 'ปี (พ.ศ.)' : 'Year (A.D.)', en: 'Year (A.D.)' })}${yearOptions}</select>
  </div>`;
}

// Same idea as renderDobInputs but month/year only (no day) -- used for work history
// from/to fields, which only need month-level precision.
function renderMonthYearSelect(monthPath, yearPath, monthValue, yearValue, disabled) {
  const lang = window.SFG_LANG === 'en' ? 'en' : 'th';
  const placeholder = (label) => `<option value="" disabled selected>-- ${bilingual(label)} --</option>`;

  const monthOptions = MONTH_NAMES[lang]
    .map((name, i) => `<option value="${i + 1}" ${String(i + 1) === String(monthValue) ? 'selected' : ''}>${name}</option>`)
    .join('');

  const currentAdYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 61 }, (_, i) => currentAdYear - i)
    .map((adYear) => {
      const displayYear = lang === 'th' ? adYear + 543 : adYear;
      return `<option value="${displayYear}" ${String(displayYear) === String(yearValue) ? 'selected' : ''}>${displayYear}</option>`;
    })
    .join('');

  const disabledAttr = disabled ? 'disabled' : '';
  return `<div class="dob-select-group month-year-select-group">
    <select data-path="${monthPath}" data-trigger="false" ${disabledAttr}>${placeholder({ th: 'เดือน', en: 'Month' })}${monthOptions}</select>
    <select data-path="${yearPath}" data-trigger="false" ${disabledAttr}>${placeholder({ th: lang === 'th' ? 'ปี (พ.ศ.)' : 'Year (A.D.)', en: 'Year (A.D.)' })}${yearOptions}</select>
  </div>`;
}

function renderField(field, state) {
  if (field.condition && !field.condition(state)) return '';
  return `<div class="${fieldWrapperClass(field)}" data-field-id="${field.id}">
    <label class="field-label">${bilingual(field.label)}${field.required ? '<span class="required-mark">*</span>' : ''}</label>
    ${renderInput(field, state)}
    <div class="field-error" data-error-for="${field.id}"></div>
  </div>`;
}

function renderFieldsList(fields, state) {
  return `<div class="field-grid">${fields.map((f) => renderField(f, state)).join('')}</div>`;
}

const FLAG_TH_SVG = `<svg class="language-flag" viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg">
  <rect width="60" height="40" fill="#fff"/>
  <rect y="0" width="60" height="6.67" fill="#a51931"/>
  <rect y="6.67" width="60" height="6.66" fill="#fff"/>
  <rect y="13.33" width="60" height="13.34" fill="#2d2a4a"/>
  <rect y="26.67" width="60" height="6.66" fill="#fff"/>
  <rect y="33.33" width="60" height="6.67" fill="#a51931"/>
</svg>`;

const FLAG_UK_SVG = `<svg class="language-flag" viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg">
  <rect width="60" height="40" fill="#00247d"/>
  <path d="M0,0 L60,40 M60,0 L0,40" stroke="#fff" stroke-width="8"/>
  <path d="M0,0 L60,40 M60,0 L0,40" stroke="#cf142b" stroke-width="3"/>
  <path d="M30,0 V40 M0,20 H60" stroke="#fff" stroke-width="13"/>
  <path d="M30,0 V40 M0,20 H60" stroke="#cf142b" stroke-width="8"/>
</svg>`;

function renderLanguageStep(state) {
  return `
    <div class="language-picker">
      <h2>${bilingual({ th: 'กรุณาเลือกภาษาที่ต้องการใช้งาน', en: 'Please choose your language' })}</h2>
      <div class="language-cards">
        <button type="button" class="language-card" data-lang-select="th">
          ${FLAG_TH_SVG}
          <span class="language-name">ไทย</span>
        </button>
        <button type="button" class="language-card" data-lang-select="en">
          ${FLAG_UK_SVG}
          <span class="language-name">English</span>
        </button>
      </div>
    </div>`;
}

function renderConsentGate(state) {
  return `
    <div class="consent-gate">
      <h2>${bilingual({ th: 'ก่อนเริ่มกรอกใบสมัคร', en: 'Before You Begin' })}</h2>
      <p class="consent-text-th">
        กลุ่มบริษัทสตาร์ แฟชั่น ("บริษัท") มีความจำเป็นต้องเก็บรวบรวม ใช้ และเปิดเผยข้อมูลส่วนบุคคลของท่าน
        รวมถึงข้อมูลส่วนบุคคลที่มีความอ่อนไหว (เช่น เลขบัตรประชาชน ข้อมูลสุขภาพ และประวัติอาชญากรรม)
        เพื่อวัตถุประสงค์ในการพิจารณารับสมัครงานเท่านั้น ก่อนกรอกแบบฟอร์มนี้ ท่านต้องยินยอมให้บริษัทเก็บรวบรวมข้อมูลดังกล่าว
      </p>
      <p class="consent-text-en">
        SFG | star fashion group ("the Company") needs to collect, use, and disclose your personal data, including
        sensitive personal data (e.g. ID card number, health information, and criminal record), solely for
        recruitment purposes. Before filling in this form, you must consent to this data collection.
      </p>
      <p><a href="privacy-policy.html" target="_blank" rel="noopener">${bilingual({ th: 'อ่านนโยบายความเป็นส่วนตัวฉบับเต็ม', en: 'Read the full Privacy Policy' })}</a></p>
      <label class="consent-checkbox">
        <input type="checkbox" id="consentGateCheckbox" ${state.consentGateAccepted ? 'checked' : ''} />
        <span>${bilingual({ th: 'ข้าพเจ้ายินยอมให้เก็บรวบรวม ใช้ และเปิดเผยข้อมูลส่วนบุคคลของข้าพเจ้าเพื่อการสมัครงาน', en: 'I consent to the collection, use, and disclosure of my personal data for recruitment purposes.' })}</span>
      </label>
      <div class="field-error" data-error-for="consentGateCheckbox"></div>
    </div>`;
}

function renderPositionSalaryStep(state) {
  const step = SFGFormSchema.STEPS.find((s) => s.id === 'positionSalary');
  const positions = state.availablePositions || [];
  const selectedName = state.personal.positionApplying || '';

  let positionField;
  if (positions.length > 0) {
    const placeholder = `<option value="" disabled ${!selectedName ? 'selected' : ''}>-- ${bilingual({ th: 'เลือกตำแหน่ง', en: 'Select position' })} --</option>`;
    const opts = positions
      .map((p) => `<option value="${escapeHtml(p.name)}" ${p.name === selectedName ? 'selected' : ''}>${escapeHtml(p.name)}</option>`)
      .join('');
    positionField = `<select data-position-select="true" data-path="personal.positionApplying" data-trigger="true">${placeholder}${opts}</select>`;
  } else {
    positionField = `<input type="text" data-path="personal.positionApplying" value="${escapeHtml(selectedName)}" />`;
  }

  const areaField = state.personal.positionIsSalesPC
    ? `<div class="field-group field-full" data-field-id="positionArea">
        <label class="field-label">${bilingual({ th: 'พื้นที่หรือห้างสรรพสินค้าที่สะดวกเดินทางไปทำงาน', en: 'Preferred area or department store branch' })}<span class="required-mark">*</span></label>
        <input type="text" data-path="personal.positionArea" value="${escapeHtml(state.personal.positionArea || '')}" />
        <div class="field-error" data-error-for="positionArea"></div>
      </div>`
    : '';

  return `
    <div class="field-grid">
      <div class="field-group field-full" data-field-id="positionApplying">
        <label class="field-label">${bilingual({ th: 'ตำแหน่งงานที่ต้องการสมัคร', en: 'Position Applied For' })}<span class="required-mark">*</span></label>
        ${positionField}
        <div class="field-error" data-error-for="positionApplying"></div>
      </div>
      ${areaField}
    </div>
    ${renderFieldsList(step.fields, state)}`;
}

function renderPersonalStep(state) {
  const step = SFGFormSchema.STEPS.find((s) => s.id === 'personal');
  return renderFieldsList(step.fields, state);
}

function renderEducationLevelSelect(path, value) {
  const placeholder = `<option value="" disabled ${!value ? 'selected' : ''}>-- ${bilingual({ th: 'เลือกระดับ', en: 'Select level' })} --</option>`;
  const opts = SFGFormSchema.EDUCATION_LEVELS
    .map((opt) => `<option value="${opt.value}" ${value === opt.value ? 'selected' : ''}>${bilingual(opt.label)}</option>`)
    .join('');
  return `<select data-path="${path}">${placeholder}${opts}</select>`;
}

function renderEducationStep(state) {
  const rows = state.education
    .map(
      (row, i) => `
    <div class="repeater-row" data-repeater="education" data-index="${i}">
      <div class="field-grid">
        <div class="field-group"><label class="field-label">${bilingual({ th: 'ระดับวุฒิการศึกษา', en: 'Education Level' })}</label>${renderEducationLevelSelect(`education.${i}.level`, row.level)}</div>
        <div class="field-group"><label class="field-label">${bilingual({ th: 'ชื่อสถาบันการศึกษา', en: 'Institution' })}</label><input type="text" data-path="education.${i}.institution" value="${escapeHtml(row.institution || '')}" /></div>
        <div class="field-group"><label class="field-label">${bilingual({ th: 'คณะ/สาขา/หลักสูตร', en: 'Faculty / Major / Program' })}</label><input type="text" data-path="education.${i}.facultyMajor" value="${escapeHtml(row.facultyMajor || '')}" /></div>
        <div class="field-group"><label class="field-label">${bilingual({ th: 'เกรดเฉลี่ย (GPA)', en: 'GPA' })}</label><input type="text" inputmode="decimal" data-decimal="true" data-path="education.${i}.gpa" value="${escapeHtml(row.gpa || '')}" /></div>
      </div>
      ${state.education.length > 1 ? `<button type="button" class="btn-remove-row" data-remove-repeater="education" data-index="${i}">${bilingual({ th: 'ลบแถว', en: 'Remove' })}</button>` : ''}
    </div>`
    )
    .join('');
  return `<p class="step-hint">${bilingual({ th: 'เริ่มจากวุฒิการศึกษาสูงสุดก่อน แล้วกด + เพื่อเพิ่มวุฒิการศึกษาระดับอื่น ๆ', en: 'Start with your highest qualification, then use + to add other education levels' })}</p>
    <div id="education-rows">${rows}</div>
    <button type="button" class="btn-add-row" data-add-repeater="education">${bilingual({ th: '+ เพิ่มวุฒิการศึกษา', en: '+ Add Education' })}</button>`;
}

function renderWorkHistoryStep(state) {
  const rows = state.workHistory
    .map(
      (row, i) => `
    <div class="repeater-row" data-repeater="workHistory" data-index="${i}">
      <div class="field-grid">
        <div class="field-group">
          <label class="field-label">${bilingual({ th: 'จากเดือน/ปี', en: 'From (Month/Year)' })}</label>
          ${renderMonthYearSelect(`workHistory.${i}.fromMonth`, `workHistory.${i}.fromYear`, row.fromMonth, row.fromYear, false)}
        </div>
        <div class="field-group">
          <label class="field-label">${bilingual({ th: 'ถึงเดือน/ปี', en: 'To (Month/Year)' })}</label>
          ${renderMonthYearSelect(`workHistory.${i}.toMonth`, `workHistory.${i}.toYear`, row.toMonth, row.toYear, row.isCurrent)}
          <label class="checkbox-inline"><input type="checkbox" data-path="workHistory.${i}.isCurrent" ${row.isCurrent ? 'checked' : ''} />${bilingual({ th: 'ถึงปัจจุบัน', en: 'Present' })}</label>
        </div>
        <div class="field-group"><label class="field-label">${bilingual({ th: 'อายุงาน', en: 'Duration' })}</label><input type="text" data-path="workHistory.${i}.duration" value="${escapeHtml(row.duration || '')}" readonly /></div>
        <div class="field-group field-full"><label class="field-label">${bilingual({ th: 'ชื่อนายจ้าง / บริษัท', en: "Employer's Name" })}</label><input type="text" data-path="workHistory.${i}.employer" value="${escapeHtml(row.employer || '')}" /></div>
        <div class="field-group"><label class="field-label">${bilingual({ th: 'ตำแหน่ง', en: 'Position' })}</label><input type="text" data-path="workHistory.${i}.position" value="${escapeHtml(row.position || '')}" /></div>
        <div class="field-group"><label class="field-label">${bilingual({ th: 'เงินเดือนสุดท้าย', en: 'Last Salary' })}</label><input type="text" data-path="workHistory.${i}.lastSalary" value="${escapeHtml(row.lastSalary || '')}" /></div>
        <div class="field-group field-full"><label class="field-label">${bilingual({ th: 'หน้าที่ความรับผิดชอบ (อย่างย่อ)', en: 'Responsibilities (brief)' })}</label><textarea rows="2" data-path="workHistory.${i}.responsibilities">${escapeHtml(row.responsibilities || '')}</textarea></div>
        <div class="field-group field-full"><label class="field-label">${bilingual({ th: 'เหตุผลที่ลาออก/สิ้นสุดการทำงาน', en: 'Reason for Leaving' })}</label><input type="text" data-path="workHistory.${i}.reasonForLeaving" value="${escapeHtml(row.reasonForLeaving || '')}" /></div>
      </div>
      ${state.workHistory.length > 1 ? `<button type="button" class="btn-remove-row" data-remove-repeater="workHistory" data-index="${i}">${bilingual({ th: 'ลบแถว', en: 'Remove' })}</button>` : ''}
    </div>`
    )
    .join('');
  return `<p class="step-hint">${bilingual({ th: 'เริ่มจากประสบการณ์ล่าสุดก่อน แล้วกด + เพื่อเพิ่มประสบการณ์การทำงาน/ฝึกงานอื่น ๆ', en: 'Start with your most recent job, then use + to add other work/internship experience' })}</p>
    <div id="workHistory-rows">${rows}</div>
    <button type="button" class="btn-add-row" data-add-repeater="workHistory">${bilingual({ th: '+ เพิ่มประวัติการทำงาน', en: '+ Add Work Record' })}</button>`;
}

function renderRatingRadios(path, value) {
  return SFGFormSchema.RATING_OPTIONS.map(
    (opt) => `<label class="rating-option">
      <input type="radio" name="${path}" value="${opt.value}" data-path="${path}" ${value === opt.value ? 'checked' : ''} />
      <span class="rating-word">${bilingual(opt.label)}</span>
    </label>`
  ).join('');
}

function ratingColumnHeader(label) {
  return `<th>${bilingual(label)}</th>`;
}

function renderSkillsStep(state) {
  const step = SFGFormSchema.STEPS.find((s) => s.id === 'skills');
  const lang = state.skills.languages;
  const additionalLangRows = (lang.additional || [])
    .map(
      (row, i) => `
      <tr data-repeater="additionalLanguages" data-index="${i}">
        <td><input type="text" placeholder="${escapeHtml(bilingualPlain({ th: 'ชื่อภาษา', en: 'Language name' }))}" data-path="skills.languages.additional.${i}.name" value="${escapeHtml(row.name || '')}" /></td>
        <td>
          <div class="rating-group">${renderRatingRadios(`skills.languages.additional.${i}.overall`, row.overall)}</div>
          <button type="button" class="btn-remove-row" data-remove-repeater="additionalLanguages" data-index="${i}">${bilingual({ th: 'ลบ', en: 'Remove' })}</button>
        </td>
      </tr>`
    )
    .join('');

  const langTable = `
    <table class="skills-table">
      <thead><tr>
        <th>${bilingual({ th: 'ภาษา', en: 'Language' })}</th>
        ${ratingColumnHeader({ th: 'ความสามารถโดยรวม', en: 'Overall Ability' })}
      </tr></thead>
      <tbody>
        <tr>
          <td>${bilingual({ th: 'ภาษาอังกฤษ', en: 'English' })}</td>
          <td><div class="rating-group">${renderRatingRadios('skills.languages.english.overall', lang.english.overall)}</div></td>
        </tr>
        ${additionalLangRows}
      </tbody>
    </table>
    <button type="button" class="btn-add-row" data-add-repeater="additionalLanguages">${bilingual({ th: '+ เพิ่มภาษา', en: '+ Add Language' })}</button>`;

  const canUseComputer = state.skills.computer.canUse === 'yes';
  const additionalAppRows = (state.skills.computer.additionalApps || [])
    .map(
      (row, i) => `
      <div class="computer-app-row" data-repeater="additionalApps" data-index="${i}">
        <input type="text" class="app-note" placeholder="${escapeHtml(bilingualPlain({ th: 'ชื่อโปรแกรม', en: 'Application name' }))}" data-path="skills.computer.additionalApps.${i}.name" value="${escapeHtml(row.name || '')}" />
        <div class="rating-group">${renderRatingRadios(`skills.computer.additionalApps.${i}.rating`, row.rating)}</div>
        <button type="button" class="btn-remove-row" data-remove-repeater="additionalApps" data-index="${i}">${bilingual({ th: 'ลบ', en: 'Remove' })}</button>
      </div>`
    )
    .join('');

  const appsSection = canUseComputer
    ? `<div class="subsection">
      <h3>${bilingual({ th: 'ความสามารถในการใช้งานคอมพิวเตอร์', en: 'Computer Application Skills' })}</h3>
      <div class="computer-apps-list">
      ${SFGFormSchema.COMPUTER_APPS.map((app) => {
        const appState = state.skills.computer.apps[app.value] || { rating: '' };
        return `<div class="computer-app-row">
          <span class="computer-app-name">${bilingual(app.label)}</span>
          <div class="rating-group">${renderRatingRadios(`skills.computer.apps.${app.value}.rating`, appState.rating)}</div>
        </div>`;
      }).join('')}
      ${additionalAppRows}
      </div>
      <button type="button" class="btn-add-row" data-add-repeater="additionalApps">${bilingual({ th: '+ เพิ่มโปรแกรม', en: '+ Add Application' })}</button>
      </div>`
    : '';

  return `
    <div class="subsection"><h3>${bilingual({ th: 'ความสามารถทางภาษา', en: 'Language Abilities' })}</h3>${langTable}</div>
    ${renderFieldsList(step.fields, state)}
    ${appsSection}`;
}

function renderHealthStep(state) {
  const step = SFGFormSchema.STEPS.find((s) => s.id === 'health');
  return renderFieldsList(step.fields, state);
}

function renderOtherStep(state) {
  const step = SFGFormSchema.STEPS.find((s) => s.id === 'other');
  const contacts = state.other.emergencyContacts;
  const rows = contacts
    .map(
      (c, i) => `
    <div class="repeater-row" data-repeater="emergencyContacts" data-index="${i}">
      <div class="field-grid">
        <div class="field-group"><label class="field-label">${bilingual({ th: 'ชื่อ', en: 'Name' })}${i === 0 ? '<span class="required-mark">*</span>' : ''}</label><input type="text" data-path="other.emergencyContacts.${i}.name" value="${escapeHtml(c.name || '')}" /></div>
        <div class="field-group"><label class="field-label">${bilingual({ th: 'เบอร์โทรศัพท์มือถือ', en: 'Mobile Phone No.' })}${i === 0 ? '<span class="required-mark">*</span>' : ''}</label><input type="tel" data-path="other.emergencyContacts.${i}.mobile" value="${escapeHtml(c.mobile || '')}" /></div>
        <div class="field-group"><label class="field-label">${bilingual({ th: 'ความสัมพันธ์', en: 'Relationship' })}${i === 0 ? '<span class="required-mark">*</span>' : ''}</label><input type="text" data-path="other.emergencyContacts.${i}.relationship" value="${escapeHtml(c.relationship || '')}" /></div>
      </div>
      ${contacts.length > 1 ? `<button type="button" class="btn-remove-row" data-remove-repeater="emergencyContacts" data-index="${i}">${bilingual({ th: 'ลบแถว', en: 'Remove' })}</button>` : ''}
    </div>`
    )
    .join('');

  return `
    ${renderFieldsList(step.fields, state)}
    <div class="subsection">
      <h3>${bilingual({ th: 'ผู้ที่สามารถติดต่อได้ในกรณีฉุกเฉิน', en: 'Emergency Contacts' })}</h3>
      <div id="emergencyContacts-rows">${rows}</div>
      <button type="button" class="btn-add-row" data-add-repeater="emergencyContacts">${bilingual({ th: '+ เพิ่มผู้ติดต่อ', en: '+ Add Contact' })}</button>
      <div class="field-error" data-error-for="emergencyContacts"></div>
    </div>`;
}

// Pass { long: true } for free-text answers (specify fields, responsibilities, etc.) so the
// value wraps on its own line below the label instead of being squeezed flex-right next to it.
function reviewRow(label, value, options) {
  if (value == null || value === '') return '';
  const cls = options && options.long ? 'review-row review-row-block' : 'review-row';
  return `<div class="${cls}"><span class="review-label">${bilingual(label)}</span><span class="review-value">${escapeHtml(value)}</span></div>`;
}

const ATTACHMENT_ACCEPT = '.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.pdf';

function attachmentNote(state, documentType) {
  const att = state.attachments.find((a) => a.documentType === documentType);
  return att ? `<span class="file-attached-note">${escapeHtml(att.fileName)} (${Math.round(att.sizeBytes / 1024)} KB)</span>` : '';
}

// Builds a data: URL so an already-uploaded (not-yet-submitted) attachment can be previewed
// as an <img> before the base64 blob is ever sent to the server.
function attachmentDataUrl(state, documentType) {
  const att = (state.attachments || []).find((a) => a.documentType === documentType);
  if (!att || !att.base64Data) return null;
  return `data:${att.mimeType};base64,${att.base64Data}`;
}

function reviewStepTitle(id) {
  return SFGFormSchema.STEPS.find((s) => s.id === id).title;
}

function reviewOptionLabel(stepId, fieldId, value) {
  if (value == null || value === '') return '';
  const step = SFGFormSchema.STEPS.find((s) => s.id === stepId);
  const field = step && step.fields && step.fields.find((f) => f.id === fieldId);
  const opt = field && field.options && field.options.find((o) => o.value === value);
  return opt ? bilingualPlain(opt.label) : value;
}

function reviewEducationLevelLabel(value) {
  const opt = SFGFormSchema.EDUCATION_LEVELS.find((o) => o.value === value);
  return opt ? bilingualPlain(opt.label) : value || '';
}

function reviewRatingLabel(value) {
  const opt = SFGFormSchema.RATING_OPTIONS.find((o) => o.value === value);
  return opt ? bilingualPlain(opt.label) : value || '';
}

function reviewEducationSummary(state) {
  const rows = state.education
    .filter((row) => row.level || row.institution || row.facultyMajor || row.gpa)
    .map(
      (row) => `<div class="review-subitem"><div class="review-grid">
      ${reviewRow({ th: 'ระดับวุฒิการศึกษา', en: 'Education Level' }, reviewEducationLevelLabel(row.level))}
      ${reviewRow({ th: 'สถาบัน', en: 'Institution' }, row.institution)}
      ${reviewRow({ th: 'คณะ/สาขา/หลักสูตร', en: 'Faculty / Major' }, row.facultyMajor)}
      ${reviewRow({ th: 'GPA', en: 'GPA' }, row.gpa)}
    </div></div>`
    )
    .join('');
  return rows || `<p class="step-hint">${bilingual({ th: 'ไม่ได้กรอกข้อมูล', en: 'Not provided' })}</p>`;
}

function reviewWorkHistorySummary(state) {
  const rows = state.workHistory
    .filter((row) => row.employer || row.position || row.from)
    .map((row) => {
      const period = `${row.from || '-'} - ${row.isCurrent ? bilingualPlain({ th: 'ปัจจุบัน', en: 'Present' }) : row.to || '-'}`;
      return `<div class="review-subitem">
      <div class="review-grid">
      ${reviewRow({ th: 'ช่วงเวลาทำงาน', en: 'Employment Period' }, period)}
      ${reviewRow({ th: 'อายุงาน', en: 'Duration' }, row.duration)}
      ${reviewRow({ th: 'ชื่อนายจ้าง / บริษัท', en: "Employer's Name" }, row.employer)}
      ${reviewRow({ th: 'ตำแหน่ง', en: 'Position' }, row.position)}
      ${reviewRow({ th: 'เงินเดือนสุดท้าย', en: 'Last Salary' }, row.lastSalary)}
      </div>
      ${reviewRow({ th: 'หน้าที่ความรับผิดชอบ', en: 'Responsibilities' }, row.responsibilities, { long: true })}
      ${reviewRow({ th: 'เหตุผลที่ลาออก/สิ้นสุดการทำงาน', en: 'Reason for Leaving' }, row.reasonForLeaving, { long: true })}
    </div>`;
    })
    .join('');
  return rows || `<p class="step-hint">${bilingual({ th: 'ไม่ได้กรอกข้อมูล', en: 'Not provided' })}</p>`;
}

function reviewSkillsSummary(state) {
  const lang = state.skills.languages;
  const langRows = [
    reviewRow({ th: 'ภาษาอังกฤษ', en: 'English' }, reviewRatingLabel(lang.english.overall)),
    ...(lang.additional || []).map((row) => reviewRow({ th: row.name || '', en: row.name || '' }, reviewRatingLabel(row.overall))),
  ].join('');

  const canUseComputer = state.skills.computer.canUse === 'yes';
  let computerSection = reviewRow(
    { th: 'ความสามารถในการใช้คอมพิวเตอร์', en: 'Computer Abilities' },
    reviewOptionLabel('skills', 'canUseComputer', state.skills.computer.canUse)
  );
  if (canUseComputer) {
    const appRows = SFGFormSchema.COMPUTER_APPS.filter((app) => (state.skills.computer.apps[app.value] || {}).rating)
      .map((app) => reviewRow(app.label, reviewRatingLabel(state.skills.computer.apps[app.value].rating)))
      .join('');
    const additionalAppRows = (state.skills.computer.additionalApps || [])
      .filter((row) => row.name)
      .map((row) => reviewRow({ th: row.name, en: row.name }, reviewRatingLabel(row.rating)))
      .join('');
    computerSection += appRows + additionalAppRows;
  }

  return `<div class="review-subitem"><div class="review-grid">${langRows}</div></div><div class="review-subitem"><div class="review-grid">${computerSection}</div></div>`;
}

function reviewHealthSummary(state) {
  const h = state.health;
  const gridRows = [
    reviewRow({ th: 'เจ็บป่วย/โรคติดต่อร้ายแรง', en: 'Illness / contagious disease' }, reviewOptionLabel('health', 'illnessYn', h.illness.yn)),
    reviewRow({ th: 'โรคประจำตัว', en: 'Chronic disease' }, reviewOptionLabel('health', 'chronicYn', h.chronicDisease.yn)),
    reviewRow({ th: 'ความบกพร่อง/ความพิการทางร่างกาย', en: 'Physical disability' }, reviewOptionLabel('health', 'disabilityYn', h.disability.yn)),
  ];
  const longRows = [
    reviewRow({ th: 'โปรดระบุ (เจ็บป่วย)', en: 'Please specify (illness)' }, h.illness.yn === 'yes' ? h.illness.specify : '', { long: true }),
    reviewRow({ th: 'โปรดระบุ (โรคประจำตัว)', en: 'Please specify (chronic disease)' }, h.chronicDisease.yn === 'yes' ? h.chronicDisease.specify : '', { long: true }),
    reviewRow({ th: 'โปรดระบุ (ความบกพร่อง)', en: 'Please specify (disability)' }, h.disability.yn === 'yes' ? h.disability.specify : '', { long: true }),
  ];
  if (state.personal.gender === 'F' || state.personal.gender === 'LGBTQ+') {
    gridRows.push(reviewRow({ th: 'ตั้งครรภ์', en: 'Pregnant' }, reviewOptionLabel('health', 'pregnantYn', h.pregnant.yn)));
    if (h.pregnant.yn === 'yes') {
      gridRows.push(reviewRow({ th: 'อายุครรภ์', en: 'Pregnancy duration' }, reviewOptionLabel('health', 'pregnantSpecify', h.pregnant.specify)));
    }
  }
  return `<div class="review-grid">${gridRows.join('')}</div>${longRows.join('')}`;
}

function reviewOtherSummary(state) {
  const o = state.other;
  const gridRows = [
    reviewRow({ th: 'ท่านทราบว่ามีตำแหน่งงานว่างจากที่ใด', en: 'Source of Posting' }, reviewOptionLabel('other', 'sourceOfPosting', o.sourceOfPosting)),
    reviewRow({ th: 'เคยต้องโทษ/พัวพันคดีแพ่งหรืออาญา', en: 'Civil/criminal offense' }, reviewOptionLabel('other', 'criminalYn', o.criminalRecord.yn)),
    reviewRow(
      { th: 'เคยสมัคร/เป็นพนักงาน SFG มาก่อน', en: 'Previously applied/worked at SFG' },
      reviewOptionLabel('other', 'previousSfgYn', o.previousSFG.yn)
    ),
    reviewRow({ th: 'ยินดีไปปฏิบัติงานต่างจังหวัด/ต่างประเทศ', en: 'Willing to relocate' }, reviewOptionLabel('other', 'willingToRelocate', o.willingToRelocate)),
  ];
  const longRows = [];
  if (o.sourceOfPosting === 'other') longRows.push(reviewRow({ th: 'โปรดระบุ (แหล่งที่มา)', en: 'Please specify (source)' }, o.sourceOfPostingSpecify, { long: true }));
  if (o.sourceOfPosting === 'employee') longRows.push(reviewRow({ th: 'ชื่อพนักงานที่แนะนำ', en: 'Referred by' }, o.referredBy, { long: true }));
  if (o.criminalRecord.yn === 'yes') longRows.push(reviewRow({ th: 'โปรดระบุ (คดี)', en: 'Please specify (offense)' }, o.criminalRecord.specify, { long: true }));
  if (o.previousSFG.yn === 'yes') longRows.push(reviewRow({ th: 'โปรดระบุ (SFG)', en: 'Please specify (SFG)' }, o.previousSFG.specify, { long: true }));

  const contactRows = (o.emergencyContacts || [])
    .filter((c) => c.name || c.mobile || c.relationship)
    .map(
      (c) => `<div class="review-subitem"><div class="review-grid">
      ${reviewRow({ th: 'ชื่อ', en: 'Name' }, c.name)}
      ${reviewRow({ th: 'เบอร์โทรศัพท์มือถือ', en: 'Mobile Phone' }, c.mobile)}
      ${reviewRow({ th: 'ความสัมพันธ์', en: 'Relationship' }, c.relationship)}
    </div></div>`
    )
    .join('');

  return `<div class="review-grid">${gridRows.join('')}</div>${longRows.join('')}
    <h4>${bilingual({ th: 'ผู้ที่สามารถติดต่อได้ในกรณีฉุกเฉิน', en: 'Emergency Contacts' })}</h4>
    ${contactRows}`;
}

function renderReviewStep(state) {
  const p = state.personal;

  const additionalAttachmentRows = (state.consent.additionalAttachments || [])
    .map(
      (row, i) => `
    <div class="doc-checklist-item" data-repeater="additionalAttachments" data-index="${i}">
      <input type="file" accept="${ATTACHMENT_ACCEPT}" data-doc-upload="${row.id}" />
      ${attachmentNote(state, row.id)}
      <button type="button" class="btn-remove-row" data-remove-repeater="additionalAttachments" data-index="${i}">${bilingual({ th: 'ลบ', en: 'Remove' })}</button>
    </div>`
    )
    .join('');

  const photoUrl = attachmentDataUrl(state, 'photo');

  return `
    <div class="review-profile-header">
      <div class="review-profile-photo">
        ${
          photoUrl
            ? `<img src="${photoUrl}" alt="${escapeHtml(p.nameEnglish || p.nameThai || '')}" />`
            : `<div class="review-photo-placeholder">${bilingual({ th: 'ไม่มีรูปถ่าย', en: 'No Photo' })}</div>`
        }
      </div>
      <div class="review-profile-info">
        <h2>${escapeHtml(p.nameThai || '')}</h2>
        <p class="review-profile-sub">${escapeHtml(p.nameEnglish || '')}</p>
        <p class="review-profile-position">${escapeHtml(p.positionApplying || '')}</p>
      </div>
    </div>
    <div class="review-section">
      <h3>${bilingual({ th: '1. ตำแหน่งงานที่ต้องการสมัคร', en: '1. Position Applied For' })}</h3>
      <div class="review-grid">
      ${reviewRow({ th: 'ตำแหน่งที่สมัคร', en: 'Position' }, p.positionApplying)}
      ${reviewRow({ th: 'เงินเดือนที่ต้องการ', en: 'Expected Salary' }, p.expectedSalary)}
      ${reviewRow({ th: 'พื้นที่/ห้างที่สะดวก', en: 'Preferred Area' }, p.positionArea)}
      </div>
    </div>
    <div class="review-section">
      <h3>${bilingual({ th: '2. ข้อมูลส่วนตัว', en: '2. Personal Data' })}</h3>
      <div class="review-grid">
      ${reviewRow({ th: 'ชื่อ (ไทย)', en: 'Name (TH)' }, p.nameThai)}
      ${reviewRow({ th: 'ชื่อ (อังกฤษ)', en: 'Name (EN)' }, p.nameEnglish)}
      ${reviewRow({ th: 'เพศ', en: 'Gender' }, reviewOptionLabel('personal', 'gender', p.gender))}
      ${reviewRow({ th: 'วันเกิด', en: 'DOB' }, p.dobBE)}
      ${reviewRow({ th: 'อายุ', en: 'Age' }, p.age)}
      ${reviewRow({ th: 'เลขบัตรประชาชน', en: 'ID Card No.' }, p.idCardNo)}
      ${reviewRow({ th: 'มือถือ', en: 'Mobile' }, p.mobilePhone)}
      ${reviewRow({ th: 'อีเมล', en: 'Email' }, p.email)}
      </div>
    </div>
    <div class="review-section">
      <h3>${bilingual(reviewStepTitle('education'))}</h3>
      ${reviewEducationSummary(state)}
    </div>
    <div class="review-section">
      <h3>${bilingual(reviewStepTitle('workHistory'))}</h3>
      ${reviewWorkHistorySummary(state)}
    </div>
    <div class="review-section">
      <h3>${bilingual(reviewStepTitle('skills'))}</h3>
      ${reviewSkillsSummary(state)}
    </div>
    <div class="review-section">
      <h3>${bilingual(reviewStepTitle('health'))}</h3>
      ${reviewHealthSummary(state)}
    </div>
    <div class="review-section">
      <h3>${bilingual(reviewStepTitle('other'))}</h3>
      ${reviewOtherSummary(state)}
    </div>
    <div class="review-section consent-final">
      <div class="subsection">
        <h4>${bilingual({ th: 'เอกสารแนบ', en: 'Attachments' })}</h4>
        <p class="step-hint">${bilingual({ th: 'รองรับไฟล์ประเภท .JPG, .PNG, .DOC, .DOCX, .XLS, .XLSX และ .PDF เท่านั้น', en: 'Supported file types: .JPG, .PNG, .DOC, .DOCX, .XLS, .XLSX and .PDF only.' })}</p>
        <div class="doc-checklist">
          <div class="doc-checklist-item">
            <label class="field-label">${bilingual({ th: 'รูปถ่าย', en: 'Photo' })}</label>
            <input type="file" accept="${ATTACHMENT_ACCEPT}" data-doc-upload="photo" />
            ${attachmentNote(state, 'photo')}
          </div>
          <div class="doc-checklist-item">
            <label class="field-label">${bilingual({ th: 'ประวัติส่วนตัว (CV)', en: 'Resume / CV' })}</label>
            <input type="file" accept="${ATTACHMENT_ACCEPT}" data-doc-upload="cv" />
            ${attachmentNote(state, 'cv')}
          </div>
          ${additionalAttachmentRows}
        </div>
        <button type="button" class="btn-add-row" data-add-repeater="additionalAttachments">${bilingual({ th: '+ เพิ่มไฟล์แนบ', en: '+ Add Attachment' })}</button>
        <div class="field-group field-full">
          <label class="field-label">${bilingual({ th: 'ลิงก์ผลงาน / Portfolio (ถ้ามี)', en: 'Portfolio link (if any)' })}</label>
          <input type="url" placeholder="https://..." data-path="consent.portfolioLink" value="${escapeHtml(state.consent.portfolioLink || '')}" />
        </div>
      </div>
      <p class="certification-text">"I hereby certify that all the information and documents in this application are CORRECT and TRUE. I am aware that if any information is found to be false by intention, I agree be justified and immediately dismissed without any warning and/or compensation."</p>
      <div class="field-group field-full">
        <label class="field-label">${bilingual({ th: 'ลายมือชื่อผู้สมัคร (พิมพ์ชื่อ-นามสกุลเต็ม)', en: 'Signature of Applicant (type full name)' })}</label>
        <input type="text" data-path="consent.signatureFullName" value="${escapeHtml(state.consent.signatureFullName || '')}" />
        <div class="field-error" data-error-for="signatureFullName"></div>
      </div>
      <div class="field-group">
        <label class="field-label">${bilingual({ th: 'วันที่', en: 'Date' })}</label>
        <input type="text" value="${escapeHtml(state.consent.signatureDate)}" disabled />
      </div>
      <label class="consent-checkbox">
        <input type="checkbox" id="finalConsentCheckbox" ${state.consent.consentGiven ? 'checked' : ''} />
        <span>${bilingual({ th: 'ข้าพเจ้ายืนยันว่าข้อมูลที่กรอกไว้ทั้งหมดเป็นความจริงและถูกต้องทุกประการ', en: 'I certify that all the information I have provided is true and correct.' })}</span>
      </label>
      <div class="field-error" data-error-for="finalConsentCheckbox"></div>
    </div>
    <div id="submit-status" class="submit-status"></div>`;
}

function renderStepBody(step, state) {
  switch (step.id) {
    case 'language':
      return renderLanguageStep(state);
    case 'consentGate':
      return renderConsentGate(state);
    case 'positionSalary':
      return renderPositionSalaryStep(state);
    case 'personal':
      return renderPersonalStep(state);
    case 'education':
      return renderEducationStep(state);
    case 'workHistory':
      return renderWorkHistoryStep(state);
    case 'skills':
      return renderSkillsStep(state);
    case 'health':
      return renderHealthStep(state);
    case 'other':
      return renderOtherStep(state);
    case 'review':
      return renderReviewStep(state);
    default:
      return '';
  }
}

function renderProgressBar(currentIndex) {
  const steps = SFGFormSchema.STEPS;
  const step = steps[currentIndex];

  if (step.id === 'language') return '';

  if (step.id === 'consentGate') {
    return `<div class="progress-caption">${bilingual(step.title)}</div>`;
  }

  const numberedIds = SFGFormSchema.NUMBERED_STEP_IDS;
  const numberedIndex = numberedIds.indexOf(step.id);
  const percent = Math.round(((numberedIndex + 1) / numberedIds.length) * 100);

  const tabs = numberedIds
    .map((id) => {
      const targetIndex = steps.findIndex((s) => s.id === id);
      const targetStep = steps[targetIndex];
      const label = targetStep.tabLabel || stripStepNumber(targetStep.title);
      return `<button type="button" class="progress-tab ${id === step.id ? 'active' : ''}" data-step-tab="${targetIndex}">${bilingual(label)}</button>`;
    })
    .join('');

  return `<div class="progress-bar-track"><div class="progress-bar-fill" style="width:${percent}%"></div></div>
  <div class="progress-caption">${bilingual(step.title)} &middot; ${percent}%</div>
  <div class="progress-tabs">${tabs}</div>`;
}

// Tab-strip labels reuse each step's numbered title with the leading "N. " stripped,
// unless the step defines a shorter dedicated tabLabel.
function stripStepNumber(title) {
  return { th: title.th.replace(/^\d+\.\s*/, ''), en: title.en.replace(/^\d+\.\s*/, '') };
}
