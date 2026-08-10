function assemblePayload(state, honeypotValue) {
  return {
    applicationId: state.applicationId,
    honeypot: honeypotValue || '',
    formLoadedAt: state.meta.formLoadedAt,
    personal: state.personal,
    education: state.education.filter((e) => e.institution && e.institution.trim()),
    workHistory: state.workHistory.filter((w) => w.employer && w.employer.trim()),
    skills: state.skills,
    health: state.health,
    other: state.other,
    consent: state.consent,
    attachments: state.attachments,
  };
}

async function submitApplication(state, honeypotValue) {
  const payload = assemblePayload(state, honeypotValue);
  const url = window.SFG_CONFIG && window.SFG_CONFIG.APPS_SCRIPT_URL;

  if (!url || url.includes('YOUR_DEPLOYMENT_ID')) {
    return { ok: false, error: 'not_configured' };
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      // text/plain avoids a CORS preflight OPTIONS request, which Apps Script
      // web apps don't answer — the body is still JSON, parsed manually in Code.gs.
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    return data;
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}
