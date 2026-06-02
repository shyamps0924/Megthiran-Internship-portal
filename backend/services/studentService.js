const {
  countCompleteFields,
  findStudentByRowNumber,
  findStudentsByInternId,
  getStudents,
  normalizeText,
  pickValue,
} = require('./sheetsService');
const { getStudentDocuments } = require('./driveService');
const config = require('../config/env');
const { normalizeDateForPassword } = require('../utils/dateUtils');
const { extractDomain } = require('../utils/domainParser');
const { buildInternshipSummary } = require('../utils/internship');
const logger = require('../utils/logger');

const COLUMN_LABELS = {
  internId: ['Intern ID', 'Intern_ID', 'intern_id'],
  name: ['Student Name', 'Full Name', 'Name'],
  dob: ['Date of Birth', 'DOB'],
  personalMail: ['Email', 'Email Address', 'Personal Mail ID', 'Personal mail id'],
  packageSelected: ['Package', 'Package Selected', 'Internship Package'],
  status: ['Internship Status', 'Status'],
};

function firstProvided(...values) {
  return values.find((value) => String(value || '').trim()) || '';
}

function toStudentProfile(rawStudent) {
  const internId = pickValue(rawStudent, COLUMN_LABELS.internId);
  const name = pickValue(rawStudent, COLUMN_LABELS.name);
  const personalMail = pickValue(rawStudent, COLUMN_LABELS.personalMail);
  const parsedDomain = extractDomain(rawStudent);
  const packageValue = pickValue(rawStudent, COLUMN_LABELS.packageSelected);
  const internship = buildInternshipSummary(packageValue);
  const status = firstProvided(pickValue(rawStudent, COLUMN_LABELS.status), internship.status);

  return {
    name,
    internId,
    email: personalMail,
    personalMail,
    domain: parsedDomain.domain,
    domainId: parsedDomain.domainId,
    internshipPackage: packageValue,
    duration: internship.durationLabel,
    durationLabel: internship.durationLabel,
    startDate: internship.startDate,
    completionDate: internship.completionDate,
    status,
    completedCard: normalizeText(status) === 'completed' ? '1' : '-',
    rowNumber: rawStudent.__rowNumber,
  };
}

function selectMostCompleteStudent(students) {
  return [...students].sort((left, right) => {
    return countCompleteFields(right) - countCompleteFields(left);
  })[0] || null;
}

function selectMatchingStudent(matches, { packageSelected, studentName }) {
  const packageValue = normalizeText(packageSelected);
  const nameValue = normalizeText(studentName);

  if (matches.length <= 1) {
    return matches[0] || null;
  }

  const filters = [
    {
      label: 'Intern ID + DOB + Package Selected',
      enabled: Boolean(packageValue),
      apply: (student) => normalizeText(pickValue(student, COLUMN_LABELS.packageSelected)) === packageValue,
    },
    {
      label: 'Intern ID + DOB + Student Name',
      enabled: Boolean(nameValue),
      apply: (student) => normalizeText(pickValue(student, COLUMN_LABELS.name)) === nameValue,
    },
    {
      label: 'Intern ID + DOB + Package Selected + Student Name',
      enabled: Boolean(packageValue && nameValue),
      apply: (student) => (
        normalizeText(pickValue(student, COLUMN_LABELS.packageSelected)) === packageValue &&
        normalizeText(pickValue(student, COLUMN_LABELS.name)) === nameValue
      ),
    },
  ];

  for (const filter of filters) {
    if (!filter.enabled) {
      continue;
    }

    const filtered = matches.filter(filter.apply);
    logger.info('SHEET MATCHING priority filter.', {
      priority: filter.label,
      rowsAfterFilter: filtered.length,
    });

    if (filtered.length === 1) {
      return filtered[0];
    }
  }

  return selectMostCompleteStudent(matches);
}

function padDatePart(value) {
  return String(value).padStart(2, '0');
}

function buildSheetDobDate(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

function formatParsedSheetDob(year, month, day) {
  return [
    padDatePart(day),
    padDatePart(month),
    year,
  ].join('-');
}

function parseSheetDobForPassword(dobValue) {
  if (!dobValue) {
    return { formattedPassword: '', parsedDob: null };
  }

  if (dobValue instanceof Date && !Number.isNaN(dobValue.getTime())) {
    const year = dobValue.getFullYear();
    const month = dobValue.getMonth() + 1;
    const day = dobValue.getDate();

    return {
      formattedPassword: formatParsedSheetDob(year, month, day),
      parsedDob: `${year}-${padDatePart(month)}-${padDatePart(day)}`,
    };
  }

  const text = String(dobValue).trim();
  const mmddyyyy = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (!mmddyyyy) {
    return { formattedPassword: '', parsedDob: null };
  }

  const month = Number(mmddyyyy[1]);
  const day = Number(mmddyyyy[2]);
  const year = Number(mmddyyyy[3]);
  const date = buildSheetDobDate(year, month, day);

  if (!date || Number.isNaN(date.getTime())) {
    return { formattedPassword: '', parsedDob: null };
  }

  return {
    formattedPassword: formatParsedSheetDob(year, month, day),
    parsedDob: `${year}-${padDatePart(month)}-${padDatePart(day)}`,
  };
}

function unavailableDocuments() {
  return {
    offerLetter: {
      title: 'Offer Letter',
      visible: true,
      available: false,
      message: 'Offer Letter Not Available',
      file: null,
    },
    completionCertificate: {
      title: 'Completion Certificate',
      visible: false,
      available: false,
      message: 'Available after completion',
      file: null,
    },
    lor: {
      title: 'Letter of Recommendation',
      visible: false,
      available: false,
      message: 'Available after completion if selected',
      file: null,
    },
  };
}

async function authenticateStudent(internId, password, options = {}) {
  logger.info('LOGIN REQUEST', { internId, dob: password });

  const students = await getStudents();
  const internIdMatches = findStudentsByInternId(students, internId);

  logger.info('SHEET MATCHING', {
    rowsWithInternId: internIdMatches.length,
  });

  if (!internIdMatches.length) {
    throw Object.assign(new Error('Student record not found'), { statusCode: 404 });
  }

  const normalizedPassword = normalizeDateForPassword(password);
  const dobMatches = internIdMatches.filter((student) => {
    const rawDob = pickValue(student, COLUMN_LABELS.dob);
    const { formattedPassword, parsedDob } = parseSheetDobForPassword(rawDob);

    logger.info('DOB LOGIN VALIDATION DEBUG', {
      internId,
      rawDob,
      parsedDob,
      generatedPassword: formattedPassword,
    });

    return formattedPassword === normalizedPassword;
  });

  logger.info('SHEET MATCHING', {
    rowsAfterDobFilter: dobMatches.length,
  });

  if (!dobMatches.length) {
    throw Object.assign(new Error('Student record not found'), { statusCode: 404 });
  }

  const selected = selectMatchingStudent(dobMatches, options);

  if (!selected) {
    throw Object.assign(new Error('Student record not found'), { statusCode: 404 });
  }

  const profile = toStudentProfile(selected);
  logger.info('SHEET MATCHING', {
    selectedStudent: {
      rowNumber: selected.__rowNumber,
      internId: profile.internId,
      name: profile.name,
      package: profile.internshipPackage,
      completeFields: countCompleteFields(selected),
    },
  });

  return profile;
}

async function getDashboardData({ internId, rowNumber }) {
  const students = await getStudents();
  const rowStudent = findStudentByRowNumber(students, rowNumber, internId);
  const internIdMatches = findStudentsByInternId(students, internId);
  const student = rowStudent || (internIdMatches.length === 1 ? internIdMatches[0] : null);

  if (!student) {
    throw Object.assign(new Error('Student record not found'), { statusCode: rowNumber ? 404 : 401 });
  }

  const profile = toStudentProfile(student);
  let documents;
  const domainMaterialsUrl = config.google.projectDriveRootFolderId
    ? `https://drive.google.com/drive/folders/${config.google.projectDriveRootFolderId}`
    : '';
  const domainMaterial = domainMaterialsUrl
    ? {
      title: 'Domain Materials',
      openUrl: domainMaterialsUrl,
    }
    : null;

  try {
    documents = await getStudentDocuments({
      name: profile.name,
      internId: profile.internId,
      packageSelected: profile.internshipPackage,
      isCompleted: profile.status === 'Completed',
    });
  } catch (error) {
    console.error('Google Drive Search Failed:', error.message);
    documents = unavailableDocuments();
  }

  const offerLetter = documents.offerLetter?.file
    ? {
      available: true,
      viewUrl: documents.offerLetter.file.viewUrl,
      downloadUrl: documents.offerLetter.file.downloadUrl,
    }
    : {
      available: false,
      viewUrl: null,
      downloadUrl: null,
    };
  const offerLetterUrl = offerLetter.downloadUrl;
  const warning = offerLetterUrl ? undefined : 'Offer letter not found';

  if (!offerLetterUrl && documents.offerLetter) {
    documents.offerLetter.available = false;
    documents.offerLetter.message = 'Offer Letter Not Available';
    documents.offerLetter.file = null;
  }

  const response = {
    success: true,
    student: profile,
    offerLetter,
    offerLetterUrl,
    stats: {
      enrolledInternship: '1',
      completed: profile.completedCard,
      status: profile.status,
      duration: profile.durationLabel,
    },
    documents,
    domainMaterial,
    materials: domainMaterial ? [
      {
        title: domainMaterial.title,
        type: 'Drive Folder',
        description: 'Open the shared Google Drive folder for all domain materials.',
        viewUrl: domainMaterial.openUrl,
      },
    ] : [],
    webinars: [
      {
        title: 'Internship Orientation',
        date: '02 Jun 2026',
        time: '6:00 PM IST',
        link: 'https://meet.google.com/tpb-zqvy-ajv',
        note: 'Program flow, expectations, project access, and document walkthrough.',
      },
    ],
    announcements: [
      'Check your offer letter card after login.',
      'Completion documents unlock automatically after your package duration ends.',
      'Keep your Intern ID handy for all submissions.',
    ],
  };

  if (warning) {
    response.warning = warning;
  }

  logger.info('DASHBOARD RESPONSE', {
    finalStudentDataReturned: response.student,
    offerLetterUrl: response.offerLetterUrl,
    warning: response.warning,
  });

  return response;
}

module.exports = {
  authenticateStudent,
  getDashboardData,
};
