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

  return `<input type="${field.type}" ${commonAttrs} value="${escapeHtml(value || '')}" ${field.pattern ? `pattern="${field.pattern}"` : ''} ${field.readonly ? 'readonly' : ''} />`;
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
        <div class="field-group"><label class="field-label">${bilingual({ th: 'คณะ / สาขา', en: 'Faculty / Major' })}</label><input type="text" data-path="education.${i}.facultyMajor" value="${escapeHtml(row.facultyMajor || '')}" /></div>
        <div class="field-group"><label class="field-label">${bilingual({ th: 'เกรดเฉลี่ย (GPA)', en: 'GPA' })}</label><input type="text" data-path="education.${i}.gpa" value="${escapeHtml(row.gpa || '')}" /></div>
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
        <div class="field-group"><label class="field-label">${bilingual({ th: 'จากเดือน/ปี', en: 'From (Month/Year)' })}</label><input type="text" placeholder="MM/YYYY" data-path="workHistory.${i}.from" value="${escapeHtml(row.from || '')}" /></div>
        <div class="field-group"><label class="field-label">${bilingual({ th: 'ถึงเดือน/ปี', en: 'To (Month/Year)' })}</label><input type="text" placeholder="MM/YYYY" data-path="workHistory.${i}.to" value="${escapeHtml(row.to || '')}" /></div>
        <div class="field-group field-full"><label class="field-label">${bilingual({ th: 'ชื่อนายจ้าง / บริษัท', en: "Employer's Name" })}</label><input type="text" data-path="workHistory.${i}.employer" value="${escapeHtml(row.employer || '')}" /></div>
        <div class="field-group"><label class="field-label">${bilingual({ th: 'ตำแหน่ง', en: 'Position' })}</label><input type="text" data-path="workHistory.${i}.position" value="${escapeHtml(row.position || '')}" /></div>
        <div class="field-group"><label class="field-label">${bilingual({ th: 'เงินเดือนสุดท้าย', en: 'Last Salary' })}</label><input type="text" data-path="workHistory.${i}.lastSalary" value="${escapeHtml(row.lastSalary || '')}" /></div>
        <div class="field-group field-full"><label class="field-label">${bilingual({ th: 'หน้าที่ความรับผิดชอบ (อย่างย่อ)', en: 'Responsibilities (brief)' })}</label><textarea rows="2" data-path="workHistory.${i}.responsibilities">${escapeHtml(row.responsibilities || '')}</textarea></div>
        <div class="field-group field-full"><label class="field-label">${bilingual({ th: 'เหตุผลที่ออกจากงาน', en: 'Reason for Leaving' })}</label><input type="text" data-path="workHistory.${i}.reasonForLeaving" value="${escapeHtml(row.reasonForLeaving || '')}" /></div>
      </div>
      ${state.workHistory.length > 1 ? `<button type="button" class="btn-remove-row" data-remove-repeater="workHistory" data-index="${i}">${bilingual({ th: 'ลบแถว', en: 'Remove' })}</button>` : ''}
    </div>`
    )
    .join('');
  return `<p class="step-hint">${bilingual({ th: 'เริ่มจากประสบการณ์ทำงานล่าสุดก่อน แล้วกด + เพื่อเพิ่มประสบการณ์การทำงานอื่น ๆ', en: 'Start with your most recent job, then use + to add other work experience' })}</p>
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
        <div class="field-group"><label class="field-label">${bilingual({ th: 'ชื่อ', en: 'Name' })}</label><input type="text" data-path="other.emergencyContacts.${i}.name" value="${escapeHtml(c.name || '')}" /></div>
        <div class="field-group"><label class="field-label">${bilingual({ th: 'เบอร์โทรศัพท์มือถือ', en: 'Mobile Phone No.' })}</label><input type="tel" data-path="other.emergencyContacts.${i}.mobile" value="${escapeHtml(c.mobile || '')}" /></div>
        <div class="field-group"><label class="field-label">${bilingual({ th: 'ความสัมพันธ์', en: 'Relationship' })}</label><input type="text" data-path="other.emergencyContacts.${i}.relationship" value="${escapeHtml(c.relationship || '')}" /></div>
      </div>
      ${contacts.length > 2 ? `<button type="button" class="btn-remove-row" data-remove-repeater="emergencyContacts" data-index="${i}">${bilingual({ th: 'ลบแถว', en: 'Remove' })}</button>` : ''}
    </div>`
    )
    .join('');

  return `
    ${renderFieldsList(step.fields, state)}
    <div class="subsection">
      <h3>${bilingual({ th: 'ผู้ที่สามารถติดต่อได้ในกรณีฉุกเฉิน', en: 'Emergency Contacts' })}</h3>
      <div id="emergencyContacts-rows">${rows}</div>
      <button type="button" class="btn-add-row" data-add-repeater="emergencyContacts">${bilingual({ th: '+ เพิ่มผู้ติดต่อ', en: '+ Add Contact' })}</button>
    </div>`;
}

function reviewRow(label, value) {
  if (value == null || value === '') return '';
  return `<div class="review-row"><span class="review-label">${bilingual(label)}</span><span class="review-value">${escapeHtml(value)}</span></div>`;
}

function renderReviewStep(state) {
  const p = state.personal;
  const docChecklist = SFGFormSchema.DOCUMENT_CHECKLIST_ITEMS.map((doc) => {
    const checked = state.consent.documentsAttached.includes(doc.value);
    const att = state.attachments.find((a) => a.documentType === doc.value);
    return `<div class="doc-checklist-item">
      <label class="checkbox-inline">
        <input type="checkbox" data-doc-checklist="${doc.value}" ${checked ? 'checked' : ''} />
        <span>${bilingual(doc.label)}</span>
      </label>
      ${checked ? `<input type="file" accept="image/*,.pdf" data-doc-upload="${doc.value}" />` : ''}
      ${att ? `<span class="file-attached-note">${escapeHtml(att.fileName)} (${Math.round(att.sizeBytes / 1024)} KB)</span>` : ''}
      ${checked && doc.value === 'others' ? `<input type="text" placeholder="Specify" data-path="consent.otherDocSpecify" value="${escapeHtml(state.consent.otherDocSpecify || '')}" />` : ''}
    </div>`;
  }).join('');

  return `
    <div class="review-section">
      <h3>${bilingual({ th: '1. ตำแหน่งงานที่ต้องการสมัคร', en: '1. Position Applied For' })}</h3>
      ${reviewRow({ th: 'ตำแหน่งที่สมัคร', en: 'Position' }, p.positionApplying)}
      ${reviewRow({ th: 'เงินเดือนที่ต้องการ', en: 'Expected Salary' }, p.expectedSalary)}
      ${reviewRow({ th: 'พื้นที่/ห้างที่สะดวก', en: 'Preferred Area' }, p.positionArea)}
    </div>
    <div class="review-section">
      <h3>${bilingual({ th: '2. ข้อมูลส่วนตัว', en: '2. Personal Data' })}</h3>
      ${reviewRow({ th: 'ชื่อ (ไทย)', en: 'Name (TH)' }, p.nameThai)}
      ${reviewRow({ th: 'ชื่อ (อังกฤษ)', en: 'Name (EN)' }, p.nameEnglish)}
      ${reviewRow({ th: 'เพศ', en: 'Gender' }, p.gender)}
      ${reviewRow({ th: 'วันเกิด', en: 'DOB' }, p.dobBE)}
      ${reviewRow({ th: 'อายุ', en: 'Age' }, p.age)}
      ${reviewRow({ th: 'เลขบัตรประชาชน', en: 'ID Card No.' }, p.idCardNo)}
      ${reviewRow({ th: 'มือถือ', en: 'Mobile' }, p.mobilePhone)}
      ${reviewRow({ th: 'อีเมล', en: 'Email' }, p.email)}
    </div>
    <div class="review-section">
      <h3>${bilingual({ th: '3-7. ข้อมูลอื่น ๆ', en: '3-7. Other Sections' })}</h3>
      <p class="step-hint">${bilingual({ th: 'ระดับการศึกษา ประวัติการทำงาน ทักษะ สุขภาพ และข้อมูลอื่น ๆ ที่กรอกไว้จะถูกส่งไปพร้อมใบสมัครนี้', en: 'Education, work history, skills, health, and other information you entered will be submitted with this application.' })}</p>
    </div>
    <div class="review-section consent-final">
      <h3>${bilingual({ th: '8. การยินยอมเปิดเผยและให้ข้อมูลส่วนตัว', en: '8. Disclosure of Personal Information' })}</h3>
      <p class="consent-text-th">ในการสมัครงานครั้งนี้ ข้าพเจ้ายินยอมเปิดเผยและให้ข้อมูลส่วนตัว อาทิเช่น ข้อมูลส่วนบุคคล การศึกษา ประวัติการทำงาน สุขภาพอนามัย ตลอดจนข้อมูลอื่น ๆ ให้กับบริษัท เพื่อใช้ในการติดต่อกับข้าพเจ้า หรือเพื่อพิจารณาในการสมัครงาน หรือเพื่อประโยชน์โดยชอบด้วยกฎหมาย หรือเพื่อปฏิบัติตามกฎหมาย หรือข้อยกเว้นตามกฎหมาย ไม่ว่าตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล หรือกฎหมายใด โดยข้าพเจ้าได้แนบเอกสารที่เกี่ยวข้อง ดังนี้</p>
      <p class="consent-text-en">To applying for this job, I agree to disclose and provide personal information such as personal information, educational background, working record, health and other information to the company for use in contacting, for consideration a job, for comply with the Personal Data Protection Act or any other laws. I have attached the following relevant documents:</p>
      <div class="doc-checklist">${docChecklist}</div>
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
        <span>${bilingual({ th: 'ข้าพเจ้ายืนยันว่าข้อมูลทั้งหมดเป็นความจริง และยินยอมตามข้อความข้างต้น', en: 'I certify the above is true and I agree to the statement above.' })}</span>
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

  return `<div class="progress-bar-track"><div class="progress-bar-fill" style="width:${percent}%"></div></div>
  <div class="progress-caption">${bilingual(step.title)} &middot; ${percent}%</div>`;
}
