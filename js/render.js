// Builds DOM for each wizard step from formSchema + current state.
// Fields whose visibility gates other fields are marked TRIGGER_FIELDS so app.js
// knows to fully re-render the step (not just update state) when they change.

const TRIGGER_FIELDS = new Set([
  'personal.gender',
  'personal.maritalStatus',
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

  if (field.type === 'textarea') {
    return `<textarea ${commonAttrs} rows="3">${escapeHtml(value || '')}</textarea>`;
  }

  return `<input type="${field.type}" ${commonAttrs} value="${escapeHtml(value || '')}" ${field.pattern ? `pattern="${field.pattern}"` : ''} />`;
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

function renderConsentGate(state) {
  return `
    <div class="consent-gate">
      <h2>${bilingual({ th: 'ก่อนเริ่มกรอกใบสมัคร', en: 'Before You Begin' })}</h2>
      <p class="consent-text-th">
        บริษัท สตาร์ แฟชั่น กรุ๊ป จำกัด ("บริษัท") มีความจำเป็นต้องเก็บรวบรวม ใช้ และเปิดเผยข้อมูลส่วนบุคคลของท่าน
        รวมถึงข้อมูลส่วนบุคคลที่มีความอ่อนไหว (เช่น เลขบัตรประชาชน ศาสนา ข้อมูลสุขภาพ และประวัติอาชญากรรม)
        เพื่อวัตถุประสงค์ในการพิจารณารับสมัครงานเท่านั้น ก่อนกรอกแบบฟอร์มนี้ ท่านต้องยินยอมให้บริษัทเก็บรวบรวมข้อมูลดังกล่าว
      </p>
      <p class="consent-text-en">
        Star Fashion Group Co., Ltd. ("the Company") needs to collect, use, and disclose your personal data, including
        sensitive personal data (e.g. ID card number, religion, health information, and criminal record), solely for
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

function renderPersonalStep(state) {
  const step = SFGFormSchema.STEPS.find((s) => s.id === 'personal');
  const siblings = state.personal.siblings;
  const rows = siblings
    .map(
      (sib, i) => `
    <div class="repeater-row" data-repeater="siblings" data-index="${i}">
      <div class="field-grid">
        <div class="field-group"><label class="field-label">${bilingual({ th: 'ชื่อ', en: 'Name' })}</label><input type="text" data-path="personal.siblings.${i}.name" value="${escapeHtml(sib.name || '')}" /></div>
        <div class="field-group"><label class="field-label">${bilingual({ th: 'อายุ', en: 'Age' })}</label><input type="number" data-path="personal.siblings.${i}.age" value="${escapeHtml(sib.age || '')}" /></div>
        <div class="field-group"><label class="field-label">${bilingual({ th: 'อาชีพ (หากมี)', en: 'Occupation (If any)' })}</label><input type="text" data-path="personal.siblings.${i}.occupation" value="${escapeHtml(sib.occupation || '')}" /></div>
        <div class="field-group"><label class="field-label">${bilingual({ th: 'เบอร์โทรศัพท์มือถือ', en: 'Mobile Phone No.' })}</label><input type="tel" data-path="personal.siblings.${i}.mobile" value="${escapeHtml(sib.mobile || '')}" /></div>
      </div>
      <button type="button" class="btn-remove-row" data-remove-repeater="siblings" data-index="${i}">${bilingual({ th: 'ลบแถว', en: 'Remove' })}</button>
    </div>`
    )
    .join('');

  return `
    ${renderFieldsList(step.fields, state)}
    <div class="subsection">
      <h3>${bilingual({ th: 'ชื่อพี่น้องในครอบครัว (หากมี)', en: 'Siblings (If any)' })}</h3>
      <div id="siblings-rows">${rows}</div>
      <button type="button" class="btn-add-row" data-add-repeater="siblings">${bilingual({ th: '+ เพิ่มพี่น้อง', en: '+ Add Sibling' })}</button>
    </div>`;
}

function renderEducationStep(state) {
  const rows = state.education
    .map(
      (row, i) => `
    <div class="repeater-row education-row">
      <div class="edu-level-label">${bilingual(SFGFormSchema.EDUCATION_LEVELS[i].label)}</div>
      <div class="field-grid">
        <div class="field-group"><label class="field-label">${bilingual({ th: 'ชื่อสถาบันการศึกษา', en: 'Institution' })}</label><input type="text" data-path="education.${i}.institution" value="${escapeHtml(row.institution || '')}" /></div>
        <div class="field-group"><label class="field-label">${bilingual({ th: 'คณะ / สาขา', en: 'Faculty / Major' })}</label><input type="text" data-path="education.${i}.facultyMajor" value="${escapeHtml(row.facultyMajor || '')}" /></div>
        <div class="field-group"><label class="field-label">${bilingual({ th: 'คะแนนเฉลี่ย', en: 'GPA' })}</label><input type="text" data-path="education.${i}.gpa" value="${escapeHtml(row.gpa || '')}" /></div>
      </div>
    </div>`
    )
    .join('');
  return `<p class="step-hint">${bilingual({ th: 'กรอกเฉพาะระดับการศึกษาที่เกี่ยวข้อง', en: 'Fill in only the education levels that apply to you' })}</p>${rows}`;
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
        <div class="field-group field-full"><label class="field-label">${bilingual({ th: 'เหตุผลที่ออกจากงาน', en: 'Reason for Leaving' })}</label><input type="text" data-path="workHistory.${i}.reasonForLeaving" value="${escapeHtml(row.reasonForLeaving || '')}" /></div>
      </div>
      ${state.workHistory.length > 1 ? `<button type="button" class="btn-remove-row" data-remove-repeater="workHistory" data-index="${i}">${bilingual({ th: 'ลบแถว', en: 'Remove' })}</button>` : ''}
    </div>`
    )
    .join('');
  return `<div id="workHistory-rows">${rows}</div>
    <button type="button" class="btn-add-row" data-add-repeater="workHistory">${bilingual({ th: '+ เพิ่มประวัติการทำงาน', en: '+ Add Work Record' })}</button>`;
}

function renderRatingRadios(path, value) {
  return SFGFormSchema.RATING_OPTIONS.map(
    (opt) => `<label class="rating-option">
      <input type="radio" name="${path}" value="${opt.value}" data-path="${path}" ${value === opt.value ? 'checked' : ''} />
      <span title="${escapeHtml(opt.label.en)}">${opt.value}</span>
    </label>`
  ).join('');
}

function renderSkillsStep(state) {
  const step = SFGFormSchema.STEPS.find((s) => s.id === 'skills');
  const lang = state.skills.languages;
  const langRows = `
    <table class="skills-table">
      <thead><tr>
        <th>${bilingual({ th: 'ภาษา', en: 'Language' })}</th>
        <th>${bilingual({ th: 'พูด', en: 'Speaking' })}</th>
        <th>${bilingual({ th: 'เขียน', en: 'Writing' })}</th>
        <th>${bilingual({ th: 'อ่าน', en: 'Reading' })}</th>
      </tr></thead>
      <tbody>
        <tr>
          <td>${bilingual({ th: 'ภาษาอังกฤษ', en: 'English' })}</td>
          <td><div class="rating-group">${renderRatingRadios('skills.languages.english.speaking', lang.english.speaking)}</div></td>
          <td><div class="rating-group">${renderRatingRadios('skills.languages.english.writing', lang.english.writing)}</div></td>
          <td><div class="rating-group">${renderRatingRadios('skills.languages.english.reading', lang.english.reading)}</div></td>
        </tr>
        <tr>
          <td>${bilingual({ th: 'ภาษาอื่น ๆ', en: 'Other' })}</td>
          <td><div class="rating-group">${renderRatingRadios('skills.languages.other.speaking', lang.other.speaking)}</div></td>
          <td><div class="rating-group">${renderRatingRadios('skills.languages.other.writing', lang.other.writing)}</div></td>
          <td><div class="rating-group">${renderRatingRadios('skills.languages.other.reading', lang.other.reading)}</div></td>
        </tr>
      </tbody>
    </table>`;

  const canUseComputer = state.skills.computer.canUse === 'yes';
  const appsRows = canUseComputer
    ? `<div class="subsection"><h3>${bilingual({ th: 'โปรแกรมที่ใช้เป็น', en: 'Applications You Can Use' })}</h3>
      <div class="computer-apps-list">
      ${SFGFormSchema.COMPUTER_APPS.map((app) => {
        const appState = state.skills.computer.apps[app.value];
        return `<div class="computer-app-row">
          <label class="checkbox-inline">
            <input type="checkbox" data-path="skills.computer.apps.${app.value}.used" ${appState.used ? 'checked' : ''} />
            <span>${bilingual(app.label)}</span>
          </label>
          <input type="text" class="app-note" placeholder="Note" data-path="skills.computer.apps.${app.value}.note" value="${escapeHtml(appState.note || '')}" />
        </div>`;
      }).join('')}
      </div></div>`
    : '';

  return `
    <div class="subsection"><h3>${bilingual({ th: 'ความสามารถทางภาษา', en: 'Language Abilities' })}</h3>${langRows}</div>
    ${renderFieldsList(step.fields, state)}
    ${appsRows}`;
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
      <h3>${bilingual({ th: '1. ประวัติส่วนตัว', en: '1. Personal Data' })}</h3>
      ${reviewRow({ th: 'ตำแหน่งที่สมัคร', en: 'Position' }, p.positionApplying)}
      ${reviewRow({ th: 'ชื่อ (ไทย)', en: 'Name (TH)' }, p.nameThai)}
      ${reviewRow({ th: 'ชื่อ (อังกฤษ)', en: 'Name (EN)' }, p.nameEnglish)}
      ${reviewRow({ th: 'เพศ', en: 'Gender' }, p.gender)}
      ${reviewRow({ th: 'วันเกิด', en: 'DOB' }, p.dobBE)}
      ${reviewRow({ th: 'เลขบัตรประชาชน', en: 'ID Card No.' }, p.idCardNo)}
      ${reviewRow({ th: 'มือถือ', en: 'Mobile' }, p.mobilePhone)}
      ${reviewRow({ th: 'อีเมล', en: 'Email' }, p.email)}
    </div>
    <div class="review-section">
      <h3>${bilingual({ th: '2-6. ข้อมูลอื่น ๆ', en: '2-6. Other Sections' })}</h3>
      <p class="step-hint">${bilingual({ th: 'ระดับการศึกษา ประวัติการทำงาน ทักษะ สุขภาพ และข้อมูลอื่น ๆ ที่กรอกไว้จะถูกส่งไปพร้อมใบสมัครนี้', en: 'Education, work history, skills, health, and other information you entered will be submitted with this application.' })}</p>
    </div>
    <div class="review-section consent-final">
      <h3>${bilingual({ th: '7. การยินยอมเปิดเผยและให้ข้อมูลส่วนตัว', en: '7. Disclosure of Personal Information' })}</h3>
      <p class="consent-text-th">ในการสมัครงานครั้งนี้ ข้าพเจ้ายินยอมเปิดเผยและให้ข้อมูลส่วนตัว อาทิเช่น ข้อมูลส่วนบุคคล ข้อมูลครอบครัว การศึกษา ประวัติการทำงาน สุขภาพอนามัย ตลอดจนข้อมูลอื่น ๆ ให้กับบริษัท เพื่อใช้ในการติดต่อกับข้าพเจ้า หรือเพื่อพิจารณาในการสมัครงาน หรือเพื่อประโยชน์โดยชอบด้วยกฎหมาย หรือเพื่อปฏิบัติตามกฎหมาย หรือข้อยกเว้นตามกฎหมาย ไม่ว่าตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล หรือกฎหมายใด โดยข้าพเจ้าได้แนบเอกสารที่เกี่ยวข้อง ดังนี้</p>
      <p class="consent-text-en">To applying for this job, I agree to disclose and provide personal information such as personal information, family information, educational background, working record, health and other information to the company for use in contacting, for consideration a job, for comply with the Personal Data Protection Act or any other laws. I have attached the following relevant documents:</p>
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
    case 'consentGate':
      return renderConsentGate(state);
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
  return `<div class="progress-bar">
    ${steps
      .map((s, i) => {
        let cls = 'progress-step';
        if (i < currentIndex) cls += ' done';
        if (i === currentIndex) cls += ' active';
        return `<div class="${cls}"><span class="progress-dot">${i + 1}</span></div>`;
      })
      .join('')}
  </div>
  <div class="progress-caption">${bilingual(steps[currentIndex].title)} (${currentIndex + 1}/${steps.length})</div>`;
}
