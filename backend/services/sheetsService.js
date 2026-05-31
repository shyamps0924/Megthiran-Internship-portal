const config = require('../config/env');
const { getSheetsClient } = require('../config/google');
const logger = require('../utils/logger');

function normalizeHeader(value) {
  return String(value || '').trim().toLowerCase();
}

function rowToObject(headers, row) {
  return headers.reduce((student, header, index) => {
    if (header) {
      student[header] = row[index] || '';
    }
    return student;
  }, {});
}

async function getStudents() {
  if (!config.google.spreadsheetId) {
    logger.error('Google Sheets configuration missing.', {
      requiredEnv: 'GOOGLE_SPREADSHEET_ID',
    });
    throw Object.assign(new Error('Student data source is not configured. Set GOOGLE_SPREADSHEET_ID in .env.'), { statusCode: 503 });
  }

  logger.info('Fetching student rows from Google Sheets.', {
    spreadsheetId: config.google.spreadsheetId,
    range: config.google.sheetRange,
  });

  let response;
  try {
    const sheets = await getSheetsClient();
    response = await sheets.spreadsheets.values.get({
      spreadsheetId: config.google.spreadsheetId,
      range: config.google.sheetRange,
      valueRenderOption: 'FORMATTED_VALUE',
      dateTimeRenderOption: 'FORMATTED_STRING',
    });
  } catch (error) {
    logger.error('Google Sheets fetch failed.', {
      spreadsheetId: config.google.spreadsheetId,
      range: config.google.sheetRange,
      status: error.code || error.response?.status,
      message: error.message,
    });
    throw Object.assign(new Error('Unable to fetch student data from Google Sheets.'), { statusCode: 502 });
  }

  const rows = response.data.values || [];
  const [headers = [], ...dataRows] = rows;

  logger.info('Google Sheets rows loaded.', {
    rowCount: dataRows.length,
    headerCount: headers.length,
  });

  return dataRows
    .filter((row) => row.some((cell) => String(cell || '').trim()))
    .map((row, index) => ({
      ...rowToObject(headers, row),
      __rowNumber: index + 2,
    }));
}

function normalizeText(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function normalizeInternId(value) {
  return String(value || '').trim().toUpperCase();
}

function countCompleteFields(student) {
  return Object.entries(student).filter(([key, value]) => {
    return !key.startsWith('__') && String(value || '').trim();
  }).length;
}

function findStudentsByInternId(students, internId) {
  const target = String(internId || '').trim().toUpperCase();

  return students.filter((student) => {
    return normalizeInternId(pickValue(student, ['Intern ID', 'Intern_ID', 'intern_id'])) === target;
  });
}

function findStudentByRowNumber(students, rowNumber, internId) {
  const targetRowNumber = Number(rowNumber);

  if (!Number.isInteger(targetRowNumber)) {
    return null;
  }

  return students.find((student) => {
    if (student.__rowNumber !== targetRowNumber) {
      return false;
    }

    if (!internId) {
      return true;
    }

    return normalizeInternId(pickValue(student, ['Intern ID', 'Intern_ID', 'intern_id'])) === normalizeInternId(internId);
  }) || null;
}

async function findStudentByInternId(internId) {
  const students = await getStudents();
  return findStudentsByInternId(students, internId)[0] || null;
}

function pickValue(student, labels) {
  const entries = Object.entries(student);
  for (const label of labels) {
    const exact = student[label];
    if (exact) {
      return exact;
    }

    const normalizedLabel = normalizeHeader(label);
    const match = entries.find(([key]) => normalizeHeader(key) === normalizedLabel);
    if (match && match[1]) {
      return match[1];
    }
  }

  return '';
}

module.exports = {
  countCompleteFields,
  findStudentByRowNumber,
  findStudentByInternId,
  findStudentsByInternId,
  getStudents,
  normalizeText,
  pickValue,
};
