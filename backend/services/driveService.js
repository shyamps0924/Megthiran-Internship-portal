const config = require('../config/env');
const { getDriveClient } = require('../config/google');
const logger = require('../utils/logger');

function escapeDriveQueryValue(value) {
  return String(value || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function fileResponse(file) {
  if (!file) {
    return null;
  }

  return {
    id: file.id,
    name: file.name,
    viewUrl: file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`,
    downloadUrl: `https://drive.google.com/uc?export=download&id=${file.id}`,
  };
}

function documentUrlResponse(file) {
  if (!file) {
    return {
      available: false,
      viewUrl: null,
      downloadUrl: null,
    };
  }

  return {
    available: true,
    viewUrl: file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`,
    downloadUrl: `https://drive.google.com/uc?export=download&id=${file.id}`,
  };
}

function normalizeDriveName(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function normalizeText(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

function normalizeMatchValue(value) {
  return normalizeDriveName(value)
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function createDriveRequestContext() {
  return {
    folderIds: new Map(),
    searches: new Map(),
  };
}

async function findFolderByName(name, parentId) {
  const drive = await getDriveClient();
  const filters = [
    "mimeType = 'application/vnd.google-apps.folder'",
    `name = '${escapeDriveQueryValue(name)}'`,
    'trashed = false',
  ];

  if (parentId) {
    filters.push(`'${escapeDriveQueryValue(parentId)}' in parents`);
  }

  let response;
  try {
    response = await drive.files.list({
      q: filters.join(' and '),
      fields: 'files(id, name)',
      pageSize: 1,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
  } catch (error) {
    logger.error('Google Drive folder search failed.', {
      name,
      parentId,
      status: error.code || error.response?.status,
      message: error.message,
    });
    throw Object.assign(new Error('Unable to search Google Drive folders.'), { statusCode: 502 });
  }

  return response.data.files?.[0] || null;
}

async function resolveDocumentFolder(type) {
  return resolveDocumentFolderWithContext(type);
}

async function resolveDocumentFolderWithContext(type, context = createDriveRequestContext()) {
  if (context.folderIds.has(type)) {
    return context.folderIds.get(type);
  }

  const directIds = {
    offer: config.google.offerLettersFolderId,
    certificate: config.google.certificatesFolderId,
    lor: config.google.lorsFolderId,
  };

  if (directIds[type]) {
    context.folderIds.set(type, directIds[type]);
    return directIds[type];
  }

  const folderNames = {
    offer: 'Offer Letters',
    certificate: 'Completion Certificates',
    lor: 'LORs',
  };

  const root = await findFolderByName(config.google.driveRootFolderName);
  const folder = await findFolderByName(folderNames[type], root?.id);
  const folderId = folder?.id || '';

  context.folderIds.set(type, folderId);
  return folderId;
}

async function findFileByExactName(folderId, fileName) {
  if (!folderId) {
    return null;
  }

  const drive = await getDriveClient();
  let response;
  try {
    response = await drive.files.list({
      q: [
        `'${escapeDriveQueryValue(folderId)}' in parents`,
        `name = '${escapeDriveQueryValue(fileName)}'`,
        'trashed = false',
      ].join(' and '),
      fields: 'files(id, name, webViewLink)',
      pageSize: 1,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
  } catch (error) {
    logger.error('Google Drive exact file search failed.', {
      folderId,
      fileName,
      status: error.code || error.response?.status,
      message: error.message,
    });
    throw Object.assign(new Error('Unable to search Google Drive files.'), { statusCode: 502 });
  }

  return response.data.files?.[0] || null;
}

async function findFileByName(folderId, fileName) {
  const exact = await findFileByExactName(folderId, fileName);

  if (exact || !folderId) {
    return exact;
  }

  const suffix = fileName.split(' - ').slice(1).join(' - ') || fileName;
  const drive = await getDriveClient();
  let response;
  try {
    response = await drive.files.list({
      q: [
        `'${escapeDriveQueryValue(folderId)}' in parents`,
        `name contains '${escapeDriveQueryValue(suffix)}'`,
        'trashed = false',
      ].join(' and '),
      fields: 'files(id, name, webViewLink)',
      pageSize: 50,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
  } catch (error) {
    logger.error('Google Drive fallback file search failed.', {
      folderId,
      fileName,
      status: error.code || error.response?.status,
      message: error.message,
    });
    throw Object.assign(new Error('Unable to search Google Drive files.'), { statusCode: 502 });
  }

  const target = normalizeDriveName(fileName);
  return (response.data.files || []).find((file) => normalizeDriveName(file.name) === target) || null;
}

function buildExpectedFileNames(name, documentLabel) {
  const studentName = String(name || '').trim();

  return [
    `${studentName}-${documentLabel}.pdf`,
    `${studentName} - ${documentLabel}.pdf`,
  ];
}

function fileMatchesStudentAndPackage(file, studentName, packageSelected) {
  const fileName = normalizeMatchValue(file.name);
  const name = normalizeMatchValue(studentName);
  const packageName = normalizeMatchValue(packageSelected);

  if (!name || !fileName.includes(name)) {
    return false;
  }

  return !packageName || fileName.includes(packageName);
}

function selectBestDocumentFile(files, studentName, packageSelected, documentLabel) {
  const expectedNames = buildExpectedFileNames(studentName, documentLabel);
  const exact = files.find((file) => {
    return expectedNames.some((expected) => normalizeDriveName(file.name) === normalizeDriveName(expected));
  });

  if (exact) {
    return exact;
  }

  const matches = files.filter((file) => fileMatchesStudentAndPackage(file, studentName, packageSelected));

  return matches[0] || null;
}

async function searchDocumentFiles({ folderId, studentName, packageSelected, documentLabel, context }) {
  if (!folderId || !studentName) {
    return [];
  }

  const cacheKey = JSON.stringify({
    folderId,
    studentName: normalizeMatchValue(studentName),
    packageSelected: normalizeMatchValue(packageSelected),
    documentLabel,
  });

  if (context.searches.has(cacheKey)) {
    return context.searches.get(cacheKey);
  }

  const drive = await getDriveClient();
  let response;
  try {
    response = await drive.files.list({
      q: [
        `'${escapeDriveQueryValue(folderId)}' in parents`,
        `name contains '${escapeDriveQueryValue(String(studentName).trim())}'`,
        'trashed = false',
      ].join(' and '),
      fields: 'files(id, name, webViewLink)',
      pageSize: 50,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
  } catch (error) {
    logger.error('Google Drive document search failed.', {
      folderId,
      studentName,
      packageSelected,
      documentLabel,
      status: error.code || error.response?.status,
      message: error.message,
    });
    throw Object.assign(new Error('Unable to search Google Drive files.'), { statusCode: 502 });
  }

  const files = response.data.files || [];
  context.searches.set(cacheKey, files);
  return files;
}

async function findDocumentByStudentAndPackage({ type, studentName, packageSelected, documentLabel, context }) {
  const requestContext = context || createDriveRequestContext();
  const folderId = await resolveDocumentFolderWithContext(type, requestContext);
  const files = await searchDocumentFiles({
    folderId,
    studentName,
    packageSelected,
    documentLabel,
    context: requestContext,
  });
  const selected = selectBestDocumentFile(files, studentName, packageSelected, documentLabel);

  logger.info('DRIVE SEARCH', {
    studentName,
    package: packageSelected,
    documentType: type,
    filesFound: files.map((file) => file.name),
    selectedFile: selected ? selected.name : null,
  });

  return selected;
}

async function findOfferLetterFileByStudentName(studentName, context = createDriveRequestContext()) {
  const normalizedStudentName = normalizeText(studentName);
  const offerLettersFolderId = config.google.offerLettersFolderId ||
    '1WpP8HkFphTtFRhtUUvvxzStdZcHpGDKV';
  const cacheKey = JSON.stringify({
    type: 'offer',
    folderFiles: true,
  });

  console.log('Student Name:', studentName);
  console.log('Normalized Student:', normalizedStudentName);
  console.log('Folder ID:', offerLettersFolderId);

  if (!normalizedStudentName) {
    console.log('All Drive Files:', []);
    console.log('Files Found:', 0);
    console.log('Matched Offer Letter:', null);
    return null;
  }

  let files;

  if (context.searches.has(cacheKey)) {
    files = context.searches.get(cacheKey);
  } else {
    let response;

    try {
      const drive = await getDriveClient();
      response = await drive.files.list({
        q: [
          `'${escapeDriveQueryValue(offerLettersFolderId)}' in parents`,
          'trashed=false',
        ].join(' and '),
        fields: 'files(id,name)',
        pageSize: 1000,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });
    } catch (error) {
      console.error('Google Drive Search Failed:', error.message);
      logger.error('Google Drive offer letters folder fetch failed.', {
        folderId: offerLettersFolderId,
        studentName,
        status: error.code || error.response?.status,
        message: error.message,
      });
      console.log('All Drive Files:', []);
      console.log('Files Found:', 0);
      console.log('Matched Offer Letter:', null);
      return null;
    }

    files = response.data.files || [];
    console.log(
  'Drive File Names:',
  files.map(f => f.name)
);
    context.searches.set(cacheKey, files);
  }

  const matchedFile = files.find((file) => {
    const normalizedFileName = normalizeText(file.name);

    return normalizedFileName.includes(normalizedStudentName) &&
      normalizedFileName.includes('offer letter');
  }) || null;

  console.log('All Drive Files:', files);
  console.log('Files Found:', files.length);
  console.log('Matched Offer Letter:', matchedFile);

  return matchedFile;
}

async function findOfferLetter({ studentName, packageSelected, context }) {
  const file = await findOfferLetterFileByStudentName(studentName, context);

  return documentUrlResponse(file);
}

async function findCertificate({ studentName, packageSelected, context }) {
  const file = await findDocumentByStudentAndPackage({
    type: 'certificate',
    studentName,
    packageSelected,
    documentLabel: 'Completion Certificate',
    context,
  });

  return documentUrlResponse(file);
}

async function findLOR({ studentName, packageSelected, context }) {
  const file = await findDocumentByStudentAndPackage({
    type: 'lor',
    studentName,
    packageSelected,
    documentLabel: 'LOR',
    context,
  });

  return documentUrlResponse(file);
}

async function getStudentDocuments({ name, internId, packageSelected, isCompleted }) {
  const context = createDriveRequestContext();
  logger.info('Resolving student Drive documents.', { internId, name, packageSelected, isCompleted });

  const offerLetter = await findOfferLetterFileByStudentName(name, context);

  const documents = {
    offerLetter: {
      title: 'Offer Letter',
      visible: true,
      available: Boolean(offerLetter),
      message: offerLetter ? 'Available' : 'Offer Letter Not Available',
      file: fileResponse(offerLetter),
    },
    completionCertificate: {
      title: 'Completion Certificate',
      visible: isCompleted,
      available: false,
      message: isCompleted ? 'Certificate Not Available Yet' : 'Available after completion',
      file: null,
    },
    lor: {
      title: 'Letter of Recommendation',
      visible: false,
      available: false,
      message: isCompleted ? 'LOR Not Available' : 'Available after completion if selected',
      file: null,
    },
  };

  if (!isCompleted) {
    return documents;
  }

  const certificate = await findDocumentByStudentAndPackage({
    type: 'certificate',
    studentName: name,
    packageSelected,
    documentLabel: 'Completion Certificate',
    context,
  });
  documents.completionCertificate.available = Boolean(certificate);
  documents.completionCertificate.message = certificate ? 'Available' : 'Certificate Not Available Yet';
  documents.completionCertificate.file = fileResponse(certificate);

  const lor = await findDocumentByStudentAndPackage({
    type: 'lor',
    studentName: name,
    packageSelected,
    documentLabel: 'LOR',
    context,
  });
  documents.lor.visible = Boolean(lor);
  documents.lor.available = Boolean(lor);
  documents.lor.message = lor ? 'Available' : 'LOR Not Available';
  documents.lor.file = fileResponse(lor);

  return documents;
}

module.exports = {
  createDriveRequestContext,
  findCertificate,
  findFileByName,
  findLOR,
  findOfferLetter,
  getStudentDocuments,
};
