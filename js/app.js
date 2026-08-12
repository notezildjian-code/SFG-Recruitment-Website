// Bumped whenever the state shape changes in a backwards-incompatible way.
// A saved draft from an older version is discarded on load instead of crashing
// against fields it no longer has (or fields it has that got renamed/removed).
const SCHEMA_VERSION = 9;

function createInitialState() {
  return {
    schemaVersion: SCHEMA_VERSION,
    applicationId: uuid(),
    meta: { formLoadedAt: Date.now() },
    language: null,
    consentGateAccepted: false,
    availablePositions: [],
    personal: {
      positionApplying: '', positionIsSalesPC: false, positionArea: '', expectedSalary: '',
      namePrefix: '', nameThai: '', nameEnglish: '', nickname: '',
      gender: '', heightCm: '', weightKg: '', dobBE: '', dobDay: '', dobMonth: '', dobYear: '', age: '',
      idCardNo: '', mobilePhone: '', email: '', lineId: '', address: '', postalCode: '',
      maritalStatus: '', spouseName: '', spouseAge: '', numChildren: '',
      military: { status: '', servedYearBE: '', notYetYearBE: '', exemptOtherReason: '' },
    },
    education: [{ level: '', institution: '', facultyMajor: '', gpa: '' }],
    workHistory: [{ from: '', to: '', fromMonth: '', fromYear: '', toMonth: '', toYear: '', isCurrent: false, duration: '', employer: '', position: '', lastSalary: '', responsibilities: '', reasonForLeaving: '' }],
    skills: {
      languages: {
        english: { overall: '', testResult: '' },
        additional: [],
      },
      computer: {
        canUse: '',
        apps: Object.fromEntries(SFGFormSchema.COMPUTER_APPS.map((a) => [a.value, { rating: '' }])),
        additionalApps: [],
      },
    },
    health: {
      illness: { yn: '', specify: '' },
      chronicDisease: { yn: '', specify: '' },
      disability: { yn: '', specify: '' },
      pregnant: { yn: null, specify: '' },
    },
    other: {
      sourceOfPosting: '', sourceOfPostingSpecify: '', referredBy: '',
      criminalRecord: { yn: '', specify: '' },
      previousSFG: { yn: '', specify: '' },
      willingToRelocate: '',
      emergencyContacts: [{ name: '', mobile: '', relationship: '' }],
    },
    consent: { additionalAttachments: [], portfolioLink: '', consentGiven: false, signatureFullName: '', signatureDate: new Date().toISOString().slice(0, 10) },
    attachments: [],
  };
}

const LANGUAGE_STEP_INDEX = 0;
const CONSENT_STEP_INDEX = 1;

const App = {
  state: null,
  currentStep: 0,

  init() {
    const restored = findAnyDraft();
    if (restored && restored.schemaVersion !== SCHEMA_VERSION) {
      clearDraft(restored.applicationId);
      this.state = createInitialState();
    } else {
      this.state = restored || createInitialState();
    }
    if (!this.state.meta) this.state.meta = { formLoadedAt: Date.now() };
    if (!('availablePositions' in this.state)) this.state.availablePositions = [];

    if (this.state.language) {
      window.SFG_LANG = this.state.language;
      this.currentStep = CONSENT_STEP_INDEX;
    } else {
      this.currentStep = LANGUAGE_STEP_INDEX;
    }

    this.render();

    fetchPositions().then((list) => {
      this.state.availablePositions = list;
      const step = SFGFormSchema.STEPS[this.currentStep];
      if (step.id === 'positionSalary') this.render();
    });
  },

  goToStep(index) {
    this.currentStep = index;
    this.render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  next() {
    const step = SFGFormSchema.STEPS[this.currentStep];
    const { valid, errors } = validateStep(step, this.state);
    if (!valid) {
      applyErrorsToDom(document.getElementById('step-container'), errors);
      return;
    }
    if (this.currentStep < SFGFormSchema.STEPS.length - 1) {
      this.goToStep(this.currentStep + 1);
    }
  },

  back() {
    if (this.currentStep > CONSENT_STEP_INDEX) this.goToStep(this.currentStep - 1);
  },

  render() {
    const step = SFGFormSchema.STEPS[this.currentStep];
    document.getElementById('progress-container').innerHTML = renderProgressBar(this.currentStep);
    this.bindProgressTabs();
    const stepContainer = document.getElementById('step-container');
    const stepTitle = step.id === 'language' ? '' : `<h2 class="step-title">${bilingual(step.title)}</h2>`;
    stepContainer.innerHTML = `<div class="step-card">
      ${stepTitle}
      ${renderStepBody(step, this.state)}
    </div>`;
    this.bindInputs(stepContainer);
    this.bindRepeaters(stepContainer);
    this.bindNav();
    if (step.id === 'language') this.bindLanguageStep(stepContainer);
    if (step.id === 'personal') {
      this.bindAgeAutoCalc(stepContainer);
      this.bindNamePrefixAutoGender(stepContainer);
    }
    if (step.id === 'workHistory') this.bindWorkHistoryAutoCalc(stepContainer);
    if (step.id === 'review') this.bindReview(stepContainer);
    if (step.id === 'consentGate') this.bindConsentGate(stepContainer);
  },

  bindProgressTabs() {
    document.querySelectorAll('[data-step-tab]').forEach((btn) => {
      btn.addEventListener('click', () => this.goToStep(Number(btn.getAttribute('data-step-tab'))));
    });
  },

  bindLanguageStep(container) {
    container.querySelectorAll('[data-lang-select]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const lang = btn.getAttribute('data-lang-select');
        this.state.language = lang;
        window.SFG_LANG = lang;
        saveDraft(this.state);
        this.goToStep(CONSENT_STEP_INDEX);
      });
    });
  },

  bindAgeAutoCalc(container) {
    const dayInput = container.querySelector('[data-path="personal.dobDay"]');
    const monthInput = container.querySelector('[data-path="personal.dobMonth"]');
    const yearInput = container.querySelector('[data-path="personal.dobYear"]');
    if (!dayInput || !monthInput || !yearInput) return;

    const recalc = () => {
      const iso = composeDobISO(dayInput.value, monthInput.value, yearInput.value);
      this.state.personal.dobBE = iso;
      const age = calculateAge(iso);
      this.state.personal.age = age;
      const ageInput = container.querySelector('[data-path="personal.age"]');
      if (ageInput) ageInput.value = age;
      saveDraft(this.state);
    };

    [dayInput, monthInput, yearInput].forEach((el) => el.addEventListener('change', recalc));
  },

  bindNamePrefixAutoGender(container) {
    const prefixSelect = container.querySelector('[data-path="personal.namePrefix"]');
    if (!prefixSelect) return;
    const genderForPrefix = { mr: 'M', mrs: 'F', miss: 'F' };
    prefixSelect.addEventListener('change', () => {
      const mapped = genderForPrefix[prefixSelect.value];
      if (mapped && this.state.personal.gender !== mapped) {
        this.state.personal.gender = mapped;
        saveDraft(this.state);
        this.render();
      }
    });
  },

  bindWorkHistoryAutoCalc(container) {
    container.querySelectorAll('[data-repeater="workHistory"]').forEach((row) => {
      const index = Number(row.getAttribute('data-index'));
      const entry = this.state.workHistory[index];
      const fromMonthInput = row.querySelector(`[data-path="workHistory.${index}.fromMonth"]`);
      const fromYearInput = row.querySelector(`[data-path="workHistory.${index}.fromYear"]`);
      const toMonthInput = row.querySelector(`[data-path="workHistory.${index}.toMonth"]`);
      const toYearInput = row.querySelector(`[data-path="workHistory.${index}.toYear"]`);
      const currentCheckbox = row.querySelector(`[data-path="workHistory.${index}.isCurrent"]`);
      const durationInput = row.querySelector(`[data-path="workHistory.${index}.duration"]`);

      const recalc = () => {
        entry.from = composeMonthYear(entry.fromMonth, entry.fromYear);
        entry.to = entry.isCurrent ? '' : composeMonthYear(entry.toMonth, entry.toYear);
        entry.duration = calculateWorkDuration(entry.from, entry.to, entry.isCurrent);
        if (durationInput) durationInput.value = entry.duration;
        saveDraft(this.state);
      };

      [fromMonthInput, fromYearInput, toMonthInput, toYearInput].forEach((el) => {
        if (el) el.addEventListener('change', recalc);
      });
      if (currentCheckbox) {
        currentCheckbox.addEventListener('change', () => {
          entry.isCurrent = currentCheckbox.checked;
          if (toMonthInput) toMonthInput.disabled = entry.isCurrent;
          if (toYearInput) toYearInput.disabled = entry.isCurrent;
          recalc();
        });
      }
    });
  },

  bindInputs(container) {
    container.querySelectorAll('[data-path]').forEach((el) => {
      const eventName = el.type === 'checkbox' || el.type === 'radio' || el.tagName === 'SELECT' ? 'change' : 'input';
      el.addEventListener(eventName, () => {
        const path = el.getAttribute('data-path');
        if (el.dataset.numeric === 'true') {
          const digitsOnly = el.value.replace(/\D/g, '');
          if (digitsOnly !== el.value) el.value = digitsOnly;
        }
        let value;
        if (el.type === 'checkbox') value = el.checked;
        else value = el.value;
        setPath(this.state, path, value);

        if (el.hasAttribute('data-position-select')) {
          const pos = (this.state.availablePositions || []).find((p) => p.name === value);
          this.state.personal.positionIsSalesPC = !!(pos && pos.isSalesPC);
          if (!this.state.personal.positionIsSalesPC) this.state.personal.positionArea = '';
        }

        saveDraft(this.state);
        if (el.getAttribute('data-trigger') === 'true') {
          this.render();
        }
      });
    });
  },

  bindRepeaters(container) {
    container.querySelectorAll('[data-add-repeater]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-add-repeater');
        if (key === 'education') this.state.education.push({ level: '', institution: '', facultyMajor: '', gpa: '' });
        if (key === 'workHistory') this.state.workHistory.push({ from: '', to: '', fromMonth: '', fromYear: '', toMonth: '', toYear: '', isCurrent: false, duration: '', employer: '', position: '', lastSalary: '', responsibilities: '', reasonForLeaving: '' });
        if (key === 'emergencyContacts') this.state.other.emergencyContacts.push({ name: '', mobile: '', relationship: '' });
        if (key === 'additionalLanguages') this.state.skills.languages.additional.push({ name: '', overall: '' });
        if (key === 'additionalApps') this.state.skills.computer.additionalApps.push({ name: '', rating: '' });
        if (key === 'additionalAttachments') {
          if (!this.state.consent.additionalAttachments) this.state.consent.additionalAttachments = [];
          this.state.consent.additionalAttachments.push({ id: uuid() });
        }
        saveDraft(this.state);
        this.render();
      });
    });
    container.querySelectorAll('[data-remove-repeater]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-remove-repeater');
        const index = Number(btn.getAttribute('data-index'));
        if (key === 'education') this.state.education.splice(index, 1);
        if (key === 'workHistory') this.state.workHistory.splice(index, 1);
        if (key === 'emergencyContacts') this.state.other.emergencyContacts.splice(index, 1);
        if (key === 'additionalLanguages') this.state.skills.languages.additional.splice(index, 1);
        if (key === 'additionalApps') this.state.skills.computer.additionalApps.splice(index, 1);
        if (key === 'additionalAttachments') {
          const removed = this.state.consent.additionalAttachments[index];
          if (removed) removeAttachment(this.state, removed.id);
          this.state.consent.additionalAttachments.splice(index, 1);
        }
        saveDraft(this.state);
        this.render();
      });
    });
  },

  bindConsentGate(container) {
    const checkbox = container.querySelector('#consentGateCheckbox');
    checkbox.addEventListener('change', () => {
      this.state.consentGateAccepted = checkbox.checked;
      saveDraft(this.state);
    });
  },

  bindReview(container) {
    container.querySelectorAll('[data-doc-upload]').forEach((input) => {
      input.addEventListener('change', async () => {
        const doc = input.getAttribute('data-doc-upload');
        const file = input.files[0];
        const result = await handleDocUpload(this.state, doc, file);
        if (!result.ok) {
          alert(`${result.message.th}\n${result.message.en}`);
          input.value = '';
          return;
        }
        saveDraft(this.state);
        this.render();
      });
    });

    const finalCheckbox = container.querySelector('#finalConsentCheckbox');
    finalCheckbox.addEventListener('change', () => {
      this.state.consent.consentGiven = finalCheckbox.checked;
      saveDraft(this.state);
    });

    const submitBtn = document.getElementById('btn-submit');
    if (submitBtn) {
      submitBtn.addEventListener('click', () => this.submit());
    }
  },

  async submit() {
    const step = SFGFormSchema.STEPS[this.currentStep];
    const { valid, errors } = validateStep(step, this.state);
    const container = document.getElementById('step-container');
    if (!valid) {
      applyErrorsToDom(container, errors);
      return;
    }

    const submitBtn = document.getElementById('btn-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
    const statusEl = document.getElementById('submit-status');
    statusEl.innerHTML = '';

    const honeypot = document.getElementById('honeypot-field').value;
    const result = await submitApplication(this.state, honeypot);

    if (result.ok) {
      clearDraft(this.state.applicationId);
      container.innerHTML = `<div class="success-screen">
        <h2>${bilingual({ th: 'ส่งใบสมัครสำเร็จ', en: 'Application Submitted' })}</h2>
        <p>${bilingual({ th: 'ขอบคุณที่สนใจร่วมงานกับเรา ทีมงานจะติดต่อกลับหากคุณสมบัติตรงกับตำแหน่งที่เปิดรับ', en: 'Thank you for your interest. Our team will contact you if your profile matches an open position.' })}</p>
      </div>`;
      document.getElementById('progress-container').innerHTML = '';
      document.getElementById('nav-container').innerHTML = '';
    } else {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit';
      const msg = result.error === 'not_configured'
        ? { th: 'ระบบยังไม่ได้ตั้งค่า Apps Script URL กรุณาติดต่อผู้ดูแลเว็บไซต์', en: 'The Apps Script URL is not configured yet. Please contact the site administrator.' }
        : { th: 'ส่งใบสมัครไม่สำเร็จ กรุณาลองใหม่อีกครั้ง', en: 'Submission failed. Please try again.' };
      statusEl.innerHTML = `<div class="error-banner">${escapeHtml(msg.th)} / ${escapeHtml(msg.en)}</div>`;
    }
  },

  bindNav() {
    const step = SFGFormSchema.STEPS[this.currentStep];
    const nav = document.getElementById('nav-container');

    if (step.id === 'language') {
      nav.innerHTML = '';
      return;
    }

    const isFirst = this.currentStep <= CONSENT_STEP_INDEX;
    const isLast = this.currentStep === SFGFormSchema.STEPS.length - 1;
    nav.innerHTML = `
      ${!isFirst ? `<button type="button" id="btn-back" class="btn btn-secondary">${bilingual({ th: 'ก่อนหน้า', en: 'Back' })}</button>` : '<span></span>'}
      ${!isLast ? `<button type="button" id="btn-next" class="btn btn-primary">${bilingual({ th: 'ถัดไป', en: 'Next' })}</button>` : `<button type="button" id="btn-submit" class="btn btn-primary">${bilingual({ th: 'ส่งใบสมัคร', en: 'Submit Application' })}</button>`}
    `;
    const backBtn = document.getElementById('btn-back');
    if (backBtn) backBtn.addEventListener('click', () => this.back());
    const nextBtn = document.getElementById('btn-next');
    if (nextBtn) nextBtn.addEventListener('click', () => this.next());
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());
