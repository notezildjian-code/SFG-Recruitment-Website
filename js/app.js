function createInitialState() {
  return {
    applicationId: uuid(),
    meta: { formLoadedAt: Date.now() },
    language: null,
    consentGateAccepted: false,
    availablePositions: [],
    personal: {
      positionApplying: '', positionIsSalesPC: false, positionArea: '', expectedSalary: '',
      nameThai: '', nameEnglish: '', nickname: '',
      gender: '', heightCm: '', weightKg: '', dobBE: '', age: '',
      idCardNo: '', homePhone: '', mobilePhone: '', email: '', lineId: '', address: '', postalCode: '',
      maritalStatus: '', spouseName: '', spouseAge: '', numChildren: '',
      military: { status: '', servedYearBE: '', notYetYearBE: '', exemptOtherReason: '' },
    },
    education: SFGFormSchema.EDUCATION_LEVELS.map((l) => ({ level: l.value, institution: '', facultyMajor: '', gpa: '' })),
    workHistory: [{ from: '', to: '', employer: '', position: '', lastSalary: '', reasonForLeaving: '' }],
    skills: {
      languages: {
        english: { speaking: '', writing: '', reading: '', testResult: '' },
        other: { name: '', speaking: '', writing: '', reading: '' },
      },
      computer: {
        canUse: '',
        apps: Object.fromEntries(SFGFormSchema.COMPUTER_APPS.map((a) => [a.value, { used: false, note: '' }])),
      },
      otherSkills: '',
    },
    health: {
      illness: { yn: '', specify: '' },
      chronicDisease: { yn: '', specify: '' },
      disability: { yn: '', specify: '' },
      pregnant: { yn: null, specify: '' },
    },
    other: {
      sourceOfPosting: '', referredBy: '',
      criminalRecord: { yn: '', specify: '' },
      previousSFG: { yn: '', specify: '' },
      willingToRelocate: '',
      emergencyContacts: [{ name: '', mobile: '', relationship: '' }, { name: '', mobile: '', relationship: '' }],
    },
    consent: { documentsAttached: [], otherDocSpecify: '', consentGiven: false, signatureFullName: '', signatureDate: new Date().toISOString().slice(0, 10) },
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
    this.state = restored || createInitialState();
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
    const stepContainer = document.getElementById('step-container');
    stepContainer.innerHTML = `<div class="step-card">
      <h2 class="step-title">${bilingual(step.title)}</h2>
      ${renderStepBody(step, this.state)}
    </div>`;
    this.bindInputs(stepContainer);
    this.bindRepeaters(stepContainer);
    this.bindNav();
    if (step.id === 'language') this.bindLanguageStep(stepContainer);
    if (step.id === 'personal') this.bindAgeAutoCalc(stepContainer);
    if (step.id === 'review') this.bindReview(stepContainer);
    if (step.id === 'consentGate') this.bindConsentGate(stepContainer);
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
    const dobInput = container.querySelector('[data-path="personal.dobBE"]');
    if (!dobInput) return;
    dobInput.addEventListener('change', () => {
      const age = calculateAge(dobInput.value);
      this.state.personal.age = age;
      const ageInput = container.querySelector('[data-path="personal.age"]');
      if (ageInput) ageInput.value = age;
      saveDraft(this.state);
    });
  },

  bindInputs(container) {
    container.querySelectorAll('[data-path]').forEach((el) => {
      const eventName = el.type === 'checkbox' || el.type === 'radio' || el.tagName === 'SELECT' ? 'change' : 'input';
      el.addEventListener(eventName, () => {
        const path = el.getAttribute('data-path');
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
        if (key === 'workHistory') this.state.workHistory.push({ from: '', to: '', employer: '', position: '', lastSalary: '', reasonForLeaving: '' });
        if (key === 'emergencyContacts') this.state.other.emergencyContacts.push({ name: '', mobile: '', relationship: '' });
        saveDraft(this.state);
        this.render();
      });
    });
    container.querySelectorAll('[data-remove-repeater]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-remove-repeater');
        const index = Number(btn.getAttribute('data-index'));
        if (key === 'workHistory') this.state.workHistory.splice(index, 1);
        if (key === 'emergencyContacts') this.state.other.emergencyContacts.splice(index, 1);
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
    container.querySelectorAll('[data-doc-checklist]').forEach((cb) => {
      cb.addEventListener('change', () => {
        const doc = cb.getAttribute('data-doc-checklist');
        if (cb.checked) {
          if (!this.state.consent.documentsAttached.includes(doc)) this.state.consent.documentsAttached.push(doc);
        } else {
          this.state.consent.documentsAttached = this.state.consent.documentsAttached.filter((d) => d !== doc);
          removeAttachment(this.state, doc);
        }
        saveDraft(this.state);
        this.render();
      });
    });

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
