const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const sheetsServicePath = path.resolve(__dirname, '../services/sheetsService.js');
const driveServicePath = path.resolve(__dirname, '../services/driveService.js');
const studentServicePath = path.resolve(__dirname, '../services/studentService.js');

const students = [
  { 'Intern ID': 'M26IP101', 'Date of Birth': '8/7/2006', 'Student Name': 'August Student', __rowNumber: 2 },
  { 'Intern ID': 'M26IP102', 'Date of Birth': '4/22/2006', 'Student Name': 'April Student', __rowNumber: 3 },
  { 'Intern ID': 'M26IP103', 'Date of Birth': '6/6/2007', 'Student Name': 'June Student', __rowNumber: 4 },
  { 'Intern ID': 'M26IP104', 'Date of Birth': '11/12/2004', 'Student Name': 'November Student', __rowNumber: 5 },
  { 'Intern ID': 'M26IP105', 'Date of Birth': '12/11/2004', 'Student Name': 'December Student', __rowNumber: 6 },
];

function normalizeHeader(value) {
  return String(value || '').trim().toLowerCase();
}

function pickValue(student, labels) {
  const entries = Object.entries(student);

  for (const label of labels) {
    if (student[label]) {
      return student[label];
    }

    const match = entries.find(([key]) => normalizeHeader(key) === normalizeHeader(label));
    if (match && match[1]) {
      return match[1];
    }
  }

  return '';
}

require.cache[sheetsServicePath] = {
  id: sheetsServicePath,
  filename: sheetsServicePath,
  loaded: true,
  exports: {
    countCompleteFields: (student) => Object.keys(student).length,
    findStudentByRowNumber: () => null,
    findStudentsByInternId: (rows, internId) => rows.filter((student) => {
      return pickValue(student, ['Intern ID', 'Intern_ID', 'intern_id']) === internId;
    }),
    getStudents: async () => students,
    normalizeText: (value) => String(value || '').trim().replace(/\s+/g, ' ').toLowerCase(),
    pickValue,
  },
};

require.cache[driveServicePath] = {
  id: driveServicePath,
  filename: driveServicePath,
  loaded: true,
  exports: {
    getStudentDocuments: async () => ({}),
  },
};

delete require.cache[studentServicePath];
const { authenticateStudent } = require(studentServicePath);

test('authenticates Google Sheets DOB values as MM/DD/YYYY', async () => {
  const cases = [
    ['M26IP101', '07-08-2006'],
    ['M26IP102', '22-04-2006'],
    ['M26IP103', '06-06-2007'],
    ['M26IP104', '12-11-2004'],
    ['M26IP105', '11-12-2004'],
  ];

  for (const [internId, password] of cases) {
    const profile = await authenticateStudent(internId, password);
    assert.equal(profile.internId, internId);
  }
});

test('rejects day-first password for ambiguous Google Sheets DOB', async () => {
  await assert.rejects(
    authenticateStudent('M26IP101', '08-07-2006'),
    /Student record not found/
  );
});
