const test = require('node:test');
const assert = require('node:assert/strict');
const { buildInternshipSummary, getDurationDays, normalizePackage } = require('../utils/internship');

test('maps internship package names to durations', () => {
  assert.equal(getDurationDays('Basic'), 15);
  assert.equal(getDurationDays('Standard Package'), 25);
  assert.equal(getDurationDays('Premium'), 30);
  assert.equal(getDurationDays('Elite'), 45);
});

test('normalizes package labels', () => {
  assert.equal(normalizePackage('Premium - paid'), 'Premium');
  assert.equal(normalizePackage(''), '-');
});

test('calculates fixed internship dates from package duration', () => {
  const basic = buildInternshipSummary('Basic - ₹49');
  const elite = buildInternshipSummary('Elite Package');

  assert.equal(basic.durationLabel, '15 Days');
  assert.equal(basic.startDate, '01 June 2026');
  assert.equal(basic.completionDate, '15 June 2026');
  assert.equal(elite.durationLabel, '45 Days');
  assert.equal(elite.completionDate, '15 July 2026');
});
