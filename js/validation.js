function validateStep(step, state) {
  const errors = [];

  if (step.id === 'consentGate') {
    if (!state.consentGateAccepted) {
      errors.push({ fieldId: 'consentGateCheckbox', message: { th: 'กรุณายินยอมก่อนเริ่มกรอกใบสมัคร', en: 'You must consent before continuing.' } });
    }
    return { valid: errors.length === 0, errors };
  }

  if (step.id === 'positionSalary') {
    if (!state.personal.positionApplying || !state.personal.positionApplying.trim()) {
      errors.push({ fieldId: 'positionApplying', message: { th: 'กรุณาเลือกตำแหน่งงาน', en: 'Please select a position.' } });
    }
    if (state.personal.positionIsSalesPC && (!state.personal.positionArea || !state.personal.positionArea.trim())) {
      errors.push({ fieldId: 'positionArea', message: { th: 'กรุณากรอกพื้นที่หรือห้างที่สะดวก', en: 'Please specify your preferred area.' } });
    }
  }

  if (step.fields) {
    step.fields.forEach((field) => {
      if (field.condition && !field.condition(state)) return;
      const value = getPath(state, field.path);
      if (field.required && (value == null || value === '')) {
        errors.push({ fieldId: field.id, message: { th: 'กรุณากรอกข้อมูล', en: 'This field is required.' } });
        return;
      }
      if (field.pattern && value) {
        const re = new RegExp(field.pattern);
        if (!re.test(value)) {
          errors.push({ fieldId: field.id, message: field.patternError || { th: 'ข้อมูลไม่ถูกต้อง', en: 'Invalid value.' } });
        }
      }
    });
  }

  if (step.id === 'other') {
    const first = state.other.emergencyContacts[0];
    const filled = first && first.name && first.name.trim() && first.mobile && first.mobile.trim() && first.relationship && first.relationship.trim();
    if (!filled) {
      errors.push({ fieldId: 'emergencyContacts', message: { th: 'กรุณากรอกข้อมูลผู้ที่สามารถติดต่อได้ในกรณีฉุกเฉินอย่างน้อย 1 คน', en: 'Please provide at least one emergency contact.' } });
    }
  }

  if (step.id === 'review') {
    if (!state.consent.consentGiven) {
      errors.push({ fieldId: 'finalConsentCheckbox', message: { th: 'กรุณายืนยันความยินยอมก่อนส่งใบสมัคร', en: 'You must certify and agree before submitting.' } });
    }
    if (!state.consent.signatureFullName || !state.consent.signatureFullName.trim()) {
      errors.push({ fieldId: 'signatureFullName', message: { th: 'กรุณาพิมพ์ชื่อ-นามสกุลเต็ม', en: 'Please type your full name.' } });
    }
  }

  return { valid: errors.length === 0, errors };
}

function applyErrorsToDom(container, errors) {
  container.querySelectorAll('.field-error').forEach((el) => (el.textContent = ''));
  container.querySelectorAll('.has-error').forEach((el) => el.classList.remove('has-error'));

  let firstInvalidEl = null;
  errors.forEach((err) => {
    const errEl = container.querySelector(`[data-error-for="${err.fieldId}"]`);
    if (errEl) {
      errEl.textContent = `${err.message.th} / ${err.message.en}`;
      const prevIsConsentCheckbox = errEl.previousElementSibling && errEl.previousElementSibling.classList.contains('consent-checkbox');
      const target = errEl.closest('.field-group') || (prevIsConsentCheckbox ? errEl.previousElementSibling : null);
      if (target) target.classList.add('has-error');
      if (!firstInvalidEl) firstInvalidEl = target || errEl;
    } else {
      const statusEl = container.querySelector('#submit-status');
      if (statusEl) statusEl.innerHTML = `<div class="error-banner">${escapeHtml(err.message.th)} / ${escapeHtml(err.message.en)}</div>`;
    }
  });

  if (firstInvalidEl) firstInvalidEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
