const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeDateForPassword } = require('../utils/dateUtils');

test('normalizes common DOB formats to DD-MM-YYYY password format', () => {
  assert.equal(normalizeDateForPassword('2004-07-09'), '09-07-2004');
  assert.equal(normalizeDateForPassword('09/07/2004'), '09-07-2004');
  assert.equal(normalizeDateForPassword('09-07-2004'), '09-07-2004');
  assert.equal(normalizeDateForPassword('5/14/2007'), '14-05-2007');
  assert.equal(normalizeDateForPassword('14/05/2007'), '14-05-2007');
  assert.equal(normalizeDateForPassword('31/02/2007'), '');
});
