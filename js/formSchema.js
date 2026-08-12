// Single source of truth for form fields, labels (Thai + English) and validation rules.
// Edit this file to add/rename/remove fields — render.js and validation.js both read from it.

// Ordered highest to lowest so the per-row level dropdown lists the most advanced
// qualifications first — applicants are asked to add their highest education first.
const EDUCATION_LEVELS = [
  { value: 'master', label: { th: 'ปริญญาโท', en: 'Master' } },
  { value: 'bachelor', label: { th: 'ปริญญาตรี', en: 'Bachelor' } },
  { value: 'vocational', label: { th: 'อาชีวศึกษา', en: 'Vocational' } },
  { value: 'upper_secondary', label: { th: 'มัธยมศึกษาตอนปลาย', en: 'Upper Secondary' } },
  { value: 'lower_secondary', label: { th: 'มัธยมศึกษาตอนต้น', en: 'Lower Secondary' } },
  { value: 'elementary', label: { th: 'ประถมศึกษา', en: 'Elementary' } },
  { value: 'other', label: { th: 'อื่น ๆ (โปรดระบุ)', en: 'Other (Please specify)' } },
];

const COMPUTER_APPS = [
  { value: 'word', label: { th: 'Word', en: 'Word' } },
  { value: 'excel', label: { th: 'Excel', en: 'Excel' } },
  { value: 'powerpoint', label: { th: 'PowerPoint', en: 'PowerPoint' } },
  { value: 'canva', label: { th: 'Canva', en: 'Canva' } },
  { value: 'chatgpt', label: { th: 'ChatGPT', en: 'ChatGPT' } },
  { value: 'claude', label: { th: 'Claude', en: 'Claude' } },
  { value: 'gemini', label: { th: 'Gemini', en: 'Gemini' } },
];

const NAME_PREFIX_OPTIONS = [
  { value: 'mr', label: { th: 'นาย', en: 'Mr.' } },
  { value: 'mrs', label: { th: 'นาง', en: 'Mrs.' } },
  { value: 'miss', label: { th: 'นางสาว', en: 'Miss' } },
];

const MARITAL_OPTIONS = [
  { value: 'single', label: { th: 'โสด', en: 'Single' } },
  { value: 'married_registered', label: { th: 'สมรสจดทะเบียน', en: 'Married' } },
  { value: 'married_not_registered', label: { th: 'สมรสไม่จดทะเบียน', en: 'Married not register' } },
  { value: 'widowed', label: { th: 'หม้าย', en: 'Widowed' } },
  { value: 'divorced', label: { th: 'หย่า', en: 'Divorced' } },
  { value: 'separated', label: { th: 'แยกกันอยู่', en: 'Separated' } },
];

// exempt_female removed — the military step itself is now hidden entirely for female applicants.
const MILITARY_OPTIONS = [
  { value: 'served', label: { th: 'ผ่านการเกณฑ์แล้ว เมื่อปี (พ.ศ.)', en: 'Served, when (A.D.)' }, hasYear: true },
  { value: 'not_yet', label: { th: 'ยังไม่ได้เกณฑ์ จะเกณฑ์ในปี (พ.ศ.)', en: 'Not yet, when (A.D.)' }, hasYear: true },
  { value: 'exempt_black_card', label: { th: 'ได้รับการยกเว้น เพราะจับได้ใบดำ', en: 'Exempted, drew the black draft card' } },
  { value: 'exempt_other', label: { th: 'ได้รับการยกเว้น เพราะ', en: 'Exempted, because' }, hasReason: true },
];

const RATING_OPTIONS = [
  { value: '5', label: { th: 'ดีมาก', en: 'Excellent' } },
  { value: '4', label: { th: 'ดี', en: 'Good' } },
  { value: '3', label: { th: 'พอใช้', en: 'Fair' } },
  { value: '2', label: { th: 'แย่', en: 'Poor' } },
  { value: '1', label: { th: 'ไม่สามารถใช้ได้', en: 'Unable to use' } },
];

const YES_NO_OPTIONS = [
  { value: 'no', label: { th: 'ไม่', en: 'No' } },
  { value: 'yes', label: { th: 'เคย / มี', en: 'Yes' } },
];

const PREGNANT_YES_NO_OPTIONS = [
  { value: 'no', label: { th: 'ไม่', en: 'No' } },
  { value: 'yes', label: { th: 'ใช่', en: 'Yes' } },
];

const PREGNANCY_MONTH_OPTIONS = [
  { value: '1-3', label: { th: '1-3 เดือน', en: '1-3 months' } },
  { value: '4-6', label: { th: '4-6 เดือน', en: '4-6 months' } },
  { value: '7-9', label: { th: '7-9 เดือน', en: '7-9 months' } },
];

// Steps counted toward the progress bar's percentage. 'language' and 'consentGate' are
// gating screens shown before this numbered flow and are excluded from the percentage.
const NUMBERED_STEP_IDS = ['positionSalary', 'personal', 'education', 'workHistory', 'skills', 'health', 'other', 'review'];

const STEPS = [
  {
    id: 'language',
    title: { th: 'เลือกภาษา', en: 'Choose Language' },
  },
  {
    id: 'consentGate',
    title: { th: 'ความยินยอมเปิดเผยข้อมูลส่วนบุคคล', en: 'Personal Data Consent' },
  },
  {
    id: 'positionSalary',
    title: { th: '1. ตำแหน่งงานที่ต้องการสมัคร', en: '1. Position Applied For' },
    tabLabel: { th: 'ตำแหน่งงาน', en: 'Position' },
    // position select + conditional area field are custom-rendered (dynamic position list from the backend) — see render.js.
    fields: [
      { id: 'expectedSalary', path: 'personal.expectedSalary', label: { th: 'เงินเดือนที่ต้องการ (บาท)', en: 'Expected Salary (Baht)' }, type: 'text' },
    ],
  },
  {
    id: 'personal',
    title: { th: '2. ข้อมูลส่วนตัว', en: '2. Personal Data' },
    fields: [
      { id: 'namePrefix', path: 'personal.namePrefix', label: { th: 'คำนำหน้า', en: 'Title' }, type: 'select', required: true, options: NAME_PREFIX_OPTIONS },
      { id: 'nameThai', path: 'personal.nameThai', label: { th: 'ชื่อ-นามสกุล (ภาษาไทย)', en: 'Name (In Thai)' }, type: 'text', required: true },
      { id: 'nameEnglish', path: 'personal.nameEnglish', label: { th: 'ชื่อ-นามสกุล (ภาษาอังกฤษ)', en: 'Name (In English)' }, type: 'text', required: true },
      { id: 'nickname', path: 'personal.nickname', label: { th: 'ชื่อเล่น', en: 'Nickname' }, type: 'text' },
      { id: 'gender', path: 'personal.gender', label: { th: 'เพศ', en: 'Gender' }, type: 'radio', required: true, options: [
        { value: 'M', label: { th: 'ชาย', en: 'Male' } },
        { value: 'F', label: { th: 'หญิง', en: 'Female' } },
        { value: 'LGBTQ+', label: { th: 'LGBTQ+', en: 'LGBTQ+' } },
      ] },
      { id: 'heightCm', path: 'personal.heightCm', label: { th: 'ส่วนสูง (ซม.)', en: 'Height (CM)' }, type: 'number' },
      { id: 'weightKg', path: 'personal.weightKg', label: { th: 'น้ำหนัก (กก.)', en: 'Weight (KG)' }, type: 'number' },
      { id: 'dobBE', path: 'personal.dobBE', label: { th: 'วัน/เดือน/ปีเกิด', en: 'Date of Birth' }, type: 'dob', required: true },
      { id: 'age', path: 'personal.age', label: { th: 'อายุ', en: 'Age' }, type: 'text', readonly: true },
      { id: 'idCardNo', path: 'personal.idCardNo', label: { th: 'เลขที่บัตรประชาชน', en: 'Identity Card No.' }, type: 'text', required: true, pattern: '^[0-9]{13}$', patternError: { th: 'กรอกเลขบัตรประชาชน 13 หลัก', en: 'Enter a 13-digit ID card number' } },
      { id: 'mobilePhone', path: 'personal.mobilePhone', label: { th: 'เบอร์โทรศัพท์มือถือ', en: 'Mobile Phone No.' }, type: 'tel', required: true },
      { id: 'email', path: 'personal.email', label: { th: 'อีเมล', en: 'Email' }, type: 'email', required: true },
      { id: 'lineId', path: 'personal.lineId', label: { th: 'ไลน์ ไอดี', en: 'Line ID' }, type: 'text', required: true },
      { id: 'address', path: 'personal.address', label: { th: 'ที่อยู่ปัจจุบัน', en: 'Current Address' }, type: 'textarea', required: true, colSpan: 'full' },
      { id: 'postalCode', path: 'personal.postalCode', label: { th: 'รหัสไปรษณีย์', en: 'Post / Zip' }, type: 'text', required: true },
      { id: 'maritalStatus', path: 'personal.maritalStatus', label: { th: 'สถานภาพการสมรส', en: 'Marital Status' }, type: 'select', required: true, options: MARITAL_OPTIONS, colSpan: 'full' },
      { id: 'spouseName', path: 'personal.spouseName', label: { th: 'ชื่อคู่สมรส', en: "Spouse's Name" }, type: 'text', condition: (s) => ['married_registered', 'married_not_registered'].includes(s.personal.maritalStatus) },
      { id: 'spouseAge', path: 'personal.spouseAge', label: { th: 'อายุคู่สมรส', en: 'Spouse Age' }, type: 'number', condition: (s) => ['married_registered', 'married_not_registered'].includes(s.personal.maritalStatus) },
      { id: 'numChildren', path: 'personal.numChildren', label: { th: 'จำนวนบุตร (หากมี)', en: 'No. of Children (If any)' }, type: 'number', condition: (s) => ['married_registered', 'married_not_registered'].includes(s.personal.maritalStatus) },
      { id: 'military', path: 'personal.military.status', label: { th: 'การรับราชการทหาร', en: 'Military Services' }, type: 'select', required: true, options: MILITARY_OPTIONS, condition: (s) => s.personal.gender === 'M', colSpan: 'full' },
      { id: 'militaryServedYearBE', path: 'personal.military.servedYearBE', label: { th: 'ปีที่ผ่านการเกณฑ์ (พ.ศ.)', en: 'Year served (A.D.)' }, type: 'text', condition: (s) => s.personal.gender === 'M' && s.personal.military.status === 'served', colSpan: 'full' },
      { id: 'militaryNotYetYearBE', path: 'personal.military.notYetYearBE', label: { th: 'ปีที่จะเกณฑ์ (พ.ศ.)', en: 'Year to be conscripted (A.D.)' }, type: 'text', condition: (s) => s.personal.gender === 'M' && s.personal.military.status === 'not_yet', colSpan: 'full' },
      { id: 'militaryExemptOtherReason', path: 'personal.military.exemptOtherReason', label: { th: 'โปรดระบุเหตุผลที่ได้รับการยกเว้น', en: 'Please specify the reason for exemption' }, type: 'text', condition: (s) => s.personal.gender === 'M' && s.personal.military.status === 'exempt_other', colSpan: 'full' },
    ],
  },
  {
    id: 'education',
    title: { th: '3. วุฒิการศึกษา', en: '3. Educational Background' },
    tabLabel: { th: 'การศึกษา', en: 'Education' },
    dynamicRepeater: 'education',
  },
  {
    id: 'workHistory',
    title: { th: '4. ประวัติการทำงาน/ฝึกงาน', en: '4. Working Record / Internship' },
    tabLabel: { th: 'การทำงาน/ฝึกงาน', en: 'Work History' },
    dynamicRepeater: 'workHistory',
  },
  {
    id: 'skills',
    title: { th: '5. ทักษะและความสามารถ', en: '5. Skills & Abilities' },
    fields: [
      { id: 'canUseComputer', path: 'skills.computer.canUse', label: { th: 'ความสามารถในการใช้คอมพิวเตอร์', en: 'Computer Abilities' }, type: 'radio', options: [
        { value: 'yes', label: { th: 'ใช้เป็น', en: 'Yes' } },
        { value: 'no', label: { th: 'ใช้ไม่เป็น', en: 'No' } },
      ], colSpan: 'full' },
    ],
  },
  {
    id: 'health',
    title: { th: '6. สุขภาพอนามัย', en: '6. Health' },
    tabLabel: { th: 'สุขภาพ', en: 'Health' },
    fields: [
      { id: 'illnessYn', path: 'health.illness.yn', label: { th: 'ในช่วง 3-5 ปีนี้ ท่านเคยเจ็บป่วย หรือเป็นโรคร้ายแรงหรือไม่', en: 'In the past 3-5 years, have you had any personal illness, contagious, infectious disease?' }, type: 'radio', required: true, options: YES_NO_OPTIONS, colSpan: 'full' },
      { id: 'illnessSpecify', path: 'health.illness.specify', label: { th: 'โปรดระบุ', en: 'Please specify' }, type: 'text', condition: (s) => s.health.illness.yn === 'yes', colSpan: 'full' },
      { id: 'chronicYn', path: 'health.chronicDisease.yn', label: { th: 'ท่านมีโรคประจำตัวหรือไม่', en: 'Do you have any disease?' }, type: 'radio', required: true, options: YES_NO_OPTIONS, colSpan: 'full' },
      { id: 'chronicSpecify', path: 'health.chronicDisease.specify', label: { th: 'โปรดระบุ', en: 'Please specify' }, type: 'text', condition: (s) => s.health.chronicDisease.yn === 'yes', colSpan: 'full' },
      { id: 'disabilityYn', path: 'health.disability.yn', label: { th: 'ท่านมีความบกพร่อง หรือมีความพิการทางร่างกายหรือไม่', en: 'Do you have physical disabilities or handicap?' }, type: 'radio', required: true, options: YES_NO_OPTIONS, colSpan: 'full' },
      { id: 'disabilitySpecify', path: 'health.disability.specify', label: { th: 'โปรดระบุ', en: 'Please specify' }, type: 'text', condition: (s) => s.health.disability.yn === 'yes', colSpan: 'full' },
      { id: 'pregnantYn', path: 'health.pregnant.yn', label: { th: 'ท่านกำลังตั้งครรภ์หรือไม่', en: 'Are you pregnant?' }, type: 'radio', required: true, options: PREGNANT_YES_NO_OPTIONS, condition: (s) => s.personal.gender === 'F', colSpan: 'full' },
      { id: 'pregnantSpecify', path: 'health.pregnant.specify', label: { th: 'โปรดระบุอายุครรภ์ของท่าน', en: 'Please specify your pregnancy duration' }, type: 'select', options: PREGNANCY_MONTH_OPTIONS, condition: (s) => s.personal.gender === 'F' && s.health.pregnant.yn === 'yes', colSpan: 'full' },
    ],
  },
  {
    id: 'other',
    title: { th: '7. รายละเอียดอื่น ๆ', en: '7. Other Information' },
    tabLabel: { th: 'อื่น ๆ', en: 'Other' },
    fields: [
      { id: 'sourceOfPosting', path: 'other.sourceOfPosting', label: { th: 'ท่านทราบว่ามีตำแหน่งงานว่างจากที่ใด', en: 'Where did you find the information about this position?' }, type: 'text', colSpan: 'full' },
      { id: 'referredBy', path: 'other.referredBy', label: { th: 'โปรดระบุชื่อบุคคลที่แนะนำท่านมาสมัครงาน (หากมี)', en: 'Who did you suggest you to apply for this position? (If any)' }, type: 'text', colSpan: 'full' },
      { id: 'criminalYn', path: 'other.criminalRecord.yn', label: { th: 'ท่านเคยต้องโทษ หรือมีส่วนพัวพันทั้งในคดีแพ่ง หรือคดีอาญาหรือไม่', en: 'Have you ever been involved in or convicted of civil/criminal offense?' }, type: 'radio', required: true, options: YES_NO_OPTIONS, colSpan: 'full' },
      { id: 'criminalSpecify', path: 'other.criminalRecord.specify', label: { th: 'โปรดระบุ', en: 'Please specify' }, type: 'text', condition: (s) => s.other.criminalRecord.yn === 'yes', colSpan: 'full' },
      { id: 'previousSfgYn', path: 'other.previousSFG.yn', label: { th: 'ท่านเคยมาสมัครงาน หรือเคยเป็นพนักงานของบริษัทมาก่อนหรือไม่', en: 'Have you ever applied or worked for SFG Group before?' }, type: 'radio', required: true, options: YES_NO_OPTIONS, colSpan: 'full' },
      { id: 'previousSfgSpecify', path: 'other.previousSFG.specify', label: { th: 'โปรดระบุ', en: 'Please specify' }, type: 'text', condition: (s) => s.other.previousSFG.yn === 'yes', colSpan: 'full' },
      { id: 'willingToRelocate', path: 'other.willingToRelocate', label: { th: 'หากบริษัทพิจารณารับเข้าทำงาน ท่านสามารถเดินทางไปปฏิบัติงานต่างจังหวัด หรือต่างประเทศได้หรือไม่', en: 'If offered, would you be able to occasionally work at up-country or abroad?' }, type: 'radio', required: true, options: [
        { value: 'yes', label: { th: 'ได้', en: 'Yes' } },
        { value: 'no', label: { th: 'ไม่ได้', en: 'No' } },
      ], colSpan: 'full' },
    ],
  },
  {
    id: 'review',
    title: { th: '8. ตรวจสอบและยืนยันข้อมูล', en: '8. Review & Submit' },
  },
];

window.SFGFormSchema = {
  STEPS,
  NUMBERED_STEP_IDS,
  EDUCATION_LEVELS,
  COMPUTER_APPS,
  NAME_PREFIX_OPTIONS,
  MARITAL_OPTIONS,
  MILITARY_OPTIONS,
  RATING_OPTIONS,
  YES_NO_OPTIONS,
};
