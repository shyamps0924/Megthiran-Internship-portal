const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const XLSX = require('xlsx');

const { loadCertificateRecords } = require('../../scripts/certificate-records');

test('certificate parser includes final non-empty row and ignores only empty rows', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'certificate-records-'));
  const workbookPath = path.join(tempDir, 'Premium Final Submission.xlsx');

  const rows = [
    ['Full Name', 'Intern ID', 'Domain Name', 'Domain ID', 'Package', 'Completed Status'],
    ['First Student', 'M26IP001', '', 'D01', 'Premium', 'Completed'],
    ['Partially Filled Student', '', '', '', '', 'Completed'],
    ['', '', '', '', '', ''],
    ['Last Student', ' m26ip999 ', 'Cloud Computing', '', 'Premium', 'Completed'],
  ];

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  XLSX.writeFile(workbook, workbookPath);

  try {
    const { records } = loadCertificateRecords(workbookPath);

    assert.equal(records.length, 3);
    assert.equal(records[0].internId, 'M26IP001');
    assert.equal(records[1].studentName, 'Partially Filled Student');
    assert.equal(records[1].internId, '');
    assert.equal(records[2].studentName, 'Last Student');
    assert.equal(records[2].internId, 'M26IP999');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
