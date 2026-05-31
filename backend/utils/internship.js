const config = require('../config/env');
const { addDays, parseDateOnly } = require('./dateUtils');

const PACKAGE_DURATIONS = {
  Basic: 15,
  Standard: 25,
  Premium: 30,
  Elite: 45,
};

const DISPLAY_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function normalizePackage(value) {
  const text = String(value || '').trim();
  const match = Object.keys(PACKAGE_DURATIONS).find((packageName) => {
    return text.toLowerCase().includes(packageName.toLowerCase());
  });

  return match || text || '-';
}

function getDurationDays(packageValue) {
  const packageName = normalizePackage(packageValue);
  return PACKAGE_DURATIONS[packageName] || 0;
}

function formatLongDate(date) {
  if (!date || Number.isNaN(date.getTime())) {
    return '-';
  }

  return [
    String(date.getUTCDate()).padStart(2, '0'),
    DISPLAY_MONTHS[date.getUTCMonth()],
    date.getUTCFullYear(),
  ].join(' ');
}

function calculateCompletionDate(packageValue, startDateValue = config.internship.startDate) {
  const durationDays = getDurationDays(packageValue);
  const startDate = parseDateOnly(startDateValue);

  if (!startDate || !durationDays) {
    return null;
  }

  return addDays(startDate, durationDays - 1);
}

function buildInternshipSummary(packageValue) {
  const packageName = normalizePackage(packageValue);
  const durationDays = getDurationDays(packageName);
  const startDate = parseDateOnly(config.internship.startDate);
  const completionDate = calculateCompletionDate(packageName);
  const today = parseDateOnly(new Date());
  const isCompleted = Boolean(completionDate && today && today.getTime() >= completionDate.getTime());

  return {
    package: packageName,
    durationDays,
    durationLabel: durationDays ? `${durationDays} Days` : '-',
    startDate: formatLongDate(startDate),
    completionDate: formatLongDate(completionDate),
    status: isCompleted ? 'Completed' : 'Active',
    completedCard: isCompleted ? '1' : '-',
  };
}

module.exports = {
  PACKAGE_DURATIONS,
  buildInternshipSummary,
  calculateCompletionDate,
  formatLongDate,
  getDurationDays,
  normalizePackage,
};
