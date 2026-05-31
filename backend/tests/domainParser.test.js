const test = require('node:test');
const assert = require('node:assert/strict');
const { parseDomainValue } = require('../utils/domainParser');

test('parses bracketed domain id and domain name', () => {
  assert.deepEqual(parseDomainValue('(26T-A-FS) = Full Stack Web Development'), {
    domainId: '26T-A-FS',
    domain: 'Full Stack Web Development',
    rawDomain: '(26T-A-FS) = Full Stack Web Development',
  });
});

test('keeps raw domain when no id format is present', () => {
  assert.deepEqual(parseDomainValue('Digital Marketing'), {
    domainId: '-',
    domain: 'Digital Marketing',
    rawDomain: 'Digital Marketing',
  });
});

test('parses trailing hyphen-separated domain id', () => {
  assert.deepEqual(parseDomainValue('Frontend Development-26T-A-FE'), {
    domainId: '26T-A-FE',
    domain: 'Frontend Development',
    rawDomain: 'Frontend Development-26T-A-FE',
  });
});
