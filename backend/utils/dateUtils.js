function pad(value) {
  return String(value).padStart(2, '0');
}

function toUtcDate(date) {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

function buildValidUtcDate(year, month, day) {
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

function parseDateOnly(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return toUtcDate(value);
  }

  const text = String(value).trim();
  const numeric = Number(text);

  if (Number.isFinite(numeric) && numeric > 20000) {
    const excelEpoch = Date.UTC(1899, 11, 30);
    return new Date(excelEpoch + numeric * 24 * 60 * 60 * 1000);
  }

  const slashOrDash = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (slashOrDash) {
    const first = Number(slashOrDash[1]);
    const second = Number(slashOrDash[2]);
    const year = Number(slashOrDash[3]);

    if (first > 12 && second <= 12) {
      return buildValidUtcDate(year, second, first);
    }

    if (second > 12 && first <= 12) {
      return buildValidUtcDate(year, first, second);
    }

    return buildValidUtcDate(year, second, first);
  }

  const ymd = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (ymd) {
    return buildValidUtcDate(Number(ymd[1]), Number(ymd[2]), Number(ymd[3]));
  }

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return toUtcDate(parsed);
  }

  return null;
}

function normalizeDateForPassword(value) {
  const date = parseDateOnly(value);
  if (!date) {
    return '';
  }

  return [
    pad(date.getUTCDate()),
    pad(date.getUTCMonth() + 1),
    date.getUTCFullYear(),
  ].join('-');
}

function formatDisplayDate(date) {
  if (!date || Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function addDays(date, days) {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

module.exports = {
  addDays,
  formatDisplayDate,
  normalizeDateForPassword,
  parseDateOnly,
};
