const DOMAIN_COLUMNS = [
  'Software/IT - Domain',
  'Design & UI - Domain',
  'AI, Data & Cloud - Domain',
  'Security - Domain',
  'Electronics / Electrical - Domain',
  'Robotics & Automation - Domain',
  'Mechanical Engineering - Domain',
  'Civil Engineering - Domain',
  'Biomedical Engineering - Domain',
  'Marketing & Media - Domain',
  'Content & Communication - Domain',
  'Business & Entrepreneurship - Domain',
  'HR & Management - Domain',
  'Sales & Customer Management - Domain',
  'Branding & Public Relations - Domain',
  'Creative & Media - Domain',
  'Events - Domain',
];

function parseDomainValue(value) {
  const raw = String(value || '').trim();

  if (!raw) {
    return {
      domain: '-',
      domainId: '-',
      rawDomain: '',
    };
  }

  const match = raw.match(/^\s*\(([^)]+)\)\s*=\s*(.+?)\s*$/);

  if (match) {
    return {
      domainId: match[1].trim(),
      domain: match[2].trim(),
      rawDomain: raw,
    };
  }

  const hyphenParts = raw.split('-').map((part) => part.trim()).filter(Boolean);
  if (hyphenParts.length >= 4) {
    const domainId = hyphenParts.slice(-3).join('-');
    const domain = hyphenParts.slice(0, -3).join('-').trim();

    return {
      domain,
      domainId,
      rawDomain: raw,
    };
  }

  return {
    domain: raw,
    domainId: '-',
    rawDomain: raw,
  };
}

function normalizeHeader(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function getColumnValue(student, columnName) {
  if (student[columnName]) {
    return student[columnName];
  }

  const target = normalizeHeader(columnName);
  const match = Object.entries(student).find(([key]) => normalizeHeader(key) === target);

  return match ? match[1] : '';
}

function extractDomainDetails(student) {
  for (const column of DOMAIN_COLUMNS) {
    const selectedDomainValue = getColumnValue(student, column);

    if (String(selectedDomainValue || '').trim()) {
      const parsed = parseDomainValue(selectedDomainValue);

      console.log('Selected Domain Value:', selectedDomainValue);
      console.log('Parsed Domain:', parsed.domain);
      console.log('Parsed Domain ID:', parsed.domainId);

      return {
        column,
        ...parsed,
      };
    }
  }

  console.log('Selected Domain Value:', '');
  console.log('Parsed Domain:', '-');
  console.log('Parsed Domain ID:', '-');

  return {
    column: '',
    domain: '-',
    domainId: '-',
    rawDomain: '',
  };
}

module.exports = {
  DOMAIN_COLUMNS,
  extractDomain: extractDomainDetails,
  extractDomainDetails,
  parseDomainValue,
};
