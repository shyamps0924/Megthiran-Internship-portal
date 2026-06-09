const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const googleConfigPath = path.resolve(__dirname, '../config/google.js');
const driveServicePath = path.resolve(__dirname, '../services/driveService.js');

function loadDriveServiceWithFiles(files, fullTextResults = {}) {
  delete require.cache[driveServicePath];

  require.cache[googleConfigPath] = {
    id: googleConfigPath,
    filename: googleConfigPath,
    loaded: true,
    exports: {
      getDriveClient: async () => ({
        files: {
          list: async ({ q }) => {
            const fullTextMatch = String(q || '').match(/fullText contains '([^']+)'/);
            const responseFiles = fullTextMatch
              ? fullTextResults[fullTextMatch[1]] || []
              : files;

            return {
              data: {
                files: responseFiles,
              },
            };
          },
        },
      }),
    },
  };

  return require(driveServicePath);
}

test('single registration keeps existing Name - Offer Letter.pdf behavior', async () => {
  const { getStudentDocuments } = loadDriveServiceWithFiles([
    { id: 'legacy-offer', name: 'Kishore P - Offer Letter.pdf' },
  ]);

  const documents = await getStudentDocuments({
    name: 'Kishore P',
    internId: 'MT100',
    domainName: 'Web Development',
    isCompleted: false,
  });

  assert.equal(documents.offerLetter.available, true);
  assert.equal(documents.offerLetter.file.id, 'legacy-offer');
});

test('same student registered for two domains receives the domain-specific offer letter', async () => {
  const { getStudentDocuments } = loadDriveServiceWithFiles([
    { id: 'web-offer', name: 'John Doe - Web Development - Offer Letter.pdf' },
    { id: 'ux-offer', name: 'John Doe - UIUX - Offer Letter.pdf' },
  ]);

  const webDocuments = await getStudentDocuments({
    name: 'John Doe',
    internId: 'MT001',
    domainName: 'Web Development',
    hasDuplicateName: true,
    isCompleted: false,
  });
  const uxDocuments = await getStudentDocuments({
    name: 'John Doe',
    internId: 'MT002',
    domainName: 'UI/UX',
    hasDuplicateName: true,
    isCompleted: false,
  });

  assert.equal(webDocuments.offerLetter.file.id, 'web-offer');
  assert.equal(uxDocuments.offerLetter.file.id, 'ux-offer');
});

test('different students with the same name receive the Intern-ID-specific offer letter', async () => {
  const { getStudentDocuments } = loadDriveServiceWithFiles([
    { id: 'first-offer', name: 'MT001 - John Doe - Offer Letter.pdf' },
    { id: 'second-offer', name: 'MT002 - John Doe - Offer Letter.pdf' },
  ]);

  const firstDocuments = await getStudentDocuments({
    name: 'John Doe',
    internId: 'MT001',
    domainName: 'Web Development',
    hasDuplicateName: true,
    isCompleted: false,
  });
  const secondDocuments = await getStudentDocuments({
    name: 'John Doe',
    internId: 'MT002',
    domainName: 'Web Development',
    hasDuplicateName: true,
    isCompleted: false,
  });

  assert.equal(firstDocuments.offerLetter.file.id, 'first-offer');
  assert.equal(secondDocuments.offerLetter.file.id, 'second-offer');
});

test('duplicate-name registrations do not fall back to name-only offer letters', async () => {
  const { getStudentDocuments } = loadDriveServiceWithFiles([
    { id: 'ambiguous-offer', name: 'John Doe - Offer Letter.pdf' },
  ]);

  const documents = await getStudentDocuments({
    name: 'John Doe',
    internId: 'MT002',
    domainName: 'UI/UX',
    hasDuplicateName: true,
    isCompleted: false,
  });

  assert.equal(documents.offerLetter.available, false);
  assert.equal(documents.offerLetter.file, null);
});

test('multiple registrations use active Intern ID full-text hit before ambiguous filenames', async () => {
  const cadOffer = { id: 'cad-offer', name: 'ARUNA V - Offer Letter.pdf' };
  const cloudOffer = { id: 'cloud-offer', name: 'ARUNA V - Offer Letter.pdf' };
  const { getStudentDocuments } = loadDriveServiceWithFiles(
    [cadOffer, cloudOffer],
    {
      M26IP157: [cadOffer],
      M26IP200: [cloudOffer],
    },
  );

  const cadDocuments = await getStudentDocuments({
    name: 'ARUNA V',
    internId: 'M26IP157',
    domainName: 'CAD Design Fundamentals',
    hasDuplicateName: true,
    isCompleted: false,
  });
  const cloudDocuments = await getStudentDocuments({
    name: 'ARUNA V',
    internId: 'M26IP200',
    domainName: 'Cloud Computing',
    hasDuplicateName: true,
    isCompleted: false,
  });

  assert.equal(cadDocuments.offerLetter.file.id, 'cad-offer');
  assert.equal(cloudDocuments.offerLetter.file.id, 'cloud-offer');
});
