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
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeIdentifier(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function normalizeDomain(name) {
  return String(name || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[&/_,.\-()[\]{}]+/g, ' ')
    .replace(/\s+/g, ' ')
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

async function findFolderById(folderId) {
  if (!folderId) {
    return null;
  }

  const drive = await getDriveClient();
  let response;

  try {
    response = await drive.files.get({
      fileId: folderId,
      fields: 'id, name, mimeType',
      supportsAllDrives: true,
    });
  } catch (error) {
    logger.error('Google Drive folder fetch by ID failed.', {
      folderId,
      status: error.code || error.response?.status,
      message: error.message,
    });
    return null;
  }

  return isDriveFolder(response.data) ? response.data : null;
}

async function listChildFolders(parentId, context = createDriveRequestContext()) {
  if (!parentId) {
    return [];
  }

  const cacheKey = JSON.stringify({
    type: 'childFolders',
    parentId,
  });

  if (context.searches.has(cacheKey)) {
    return context.searches.get(cacheKey);
  }

  const drive = await getDriveClient();
  let response;

  try {
    response = await drive.files.list({
      q: [
        `'${escapeDriveQueryValue(parentId)}' in parents`,
        "mimeType = 'application/vnd.google-apps.folder'",
        'trashed = false',
      ].join(' and '),
      fields: 'files(id, name)',
      pageSize: 1000,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
  } catch (error) {
    logger.error('Google Drive child folder fetch failed.', {
      parentId,
      status: error.code || error.response?.status,
      message: error.message,
    });
    throw Object.assign(new Error('Unable to search Google Drive folders.'), { statusCode: 502 });
  }

  const folders = response.data.files || [];
  folders.forEach((folder) => {
    console.log('Child Folder:', folder.name, folder.id);
  });
  context.searches.set(cacheKey, folders);
  return folders;
}

async function listPdfFiles(parentId, context = createDriveRequestContext()) {
  if (!parentId) {
    return [];
  }

  const cacheKey = JSON.stringify({
    type: 'pdfFiles',
    parentId,
  });

  if (context.searches.has(cacheKey)) {
    return context.searches.get(cacheKey);
  }

  const drive = await getDriveClient();
  let response;

  try {
    response = await drive.files.list({
      q: [
        `'${escapeDriveQueryValue(parentId)}' in parents`,
        'trashed = false',
      ].join(' and '),
      fields: 'files(id, name, webViewLink, mimeType)',
      pageSize: 50,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
  } catch (error) {
    logger.error('Google Drive PDF file fetch failed.', {
      parentId,
      status: error.code || error.response?.status,
      message: error.message,
    });
    throw Object.assign(new Error('Unable to search Google Drive files.'), { statusCode: 502 });
  }

  const files = (response.data.files || []).filter((file) => {
    return file.mimeType === 'application/pdf' || /\.pdf$/i.test(file.name || '');
  });

  context.searches.set(cacheKey, files);
  return files;
}

async function listFolderItems(parentId, context = createDriveRequestContext()) {
  if (!parentId) {
    return [];
  }

  const cacheKey = JSON.stringify({
    type: 'folderItems',
    parentId,
  });

  if (context.searches.has(cacheKey)) {
    return context.searches.get(cacheKey);
  }

  const drive = await getDriveClient();
  let response;

  try {
    response = await drive.files.list({
      q: [
        `'${escapeDriveQueryValue(parentId)}' in parents`,
        'trashed = false',
      ].join(' and '),
      fields: 'files(id, name, webViewLink, mimeType)',
      pageSize: 1000,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
  } catch (error) {
    logger.error('Google Drive folder item fetch failed.', {
      parentId,
      status: error.code || error.response?.status,
      message: error.message,
    });
    throw Object.assign(new Error('Unable to search Google Drive files.'), { statusCode: 502 });
  }

  const items = response.data.files || [];
  context.searches.set(cacheKey, items);
  return items;
}

function isDriveFolder(file) {
  return file?.mimeType === 'application/vnd.google-apps.folder';
}

function isPdfFile(file) {
  return file?.mimeType === 'application/pdf' || /\.pdf$/i.test(file?.name || '');
}

async function findMatchingDomainFolder(projectListFolderId, domainName, context = createDriveRequestContext()) {
  const target = normalizeDomain(domainName);

  if (!projectListFolderId || !target) {
    return {
      domainFolder: null,
      folderPath: [],
      normalizedDomain: target,
    };
  }

  const firstLevelFolders = await listChildFolders(projectListFolderId, context);
  const queue = firstLevelFolders.map((folder) => ({
    folder,
    path: [folder],
  }));

  while (queue.length) {
    const { folder, path: folderPath } = queue.shift();

    console.log('Checking Folder:', folder.name, folder.id);

    if (normalizeDomain(folder.name) === target) {
      console.log('Matched Domain Folder:', folder.name, folder.id);
      return {
        domainFolder: folder,
        folderPath,
        normalizedDomain: target,
      };
    }

    console.log('Entering Folder:', folder.name, folder.id);
    const childFolders = await listChildFolders(folder.id, context);
    queue.push(...childFolders.map((childFolder) => ({
      folder: childFolder,
      path: [...folderPath, childFolder],
    })));
  }

  return {
    domainFolder: null,
    folderPath: [],
    normalizedDomain: target,
  };
}

async function findFirstPdfRecursively(folder, context = createDriveRequestContext()) {
  if (!folder?.id) {
    return null;
  }

  console.log('Entering Folder:', folder.name, folder.id);
  const items = await listFolderItems(folder.id, context);

  for (const item of items) {
    if (isDriveFolder(item)) {
      console.log('Checking Folder:', item.name, item.id);
      const pdfFile = await findFirstPdfRecursively(item, context);

      if (pdfFile) {
        return pdfFile;
      }

      continue;
    }

    if (isPdfFile(item)) {
      console.log('PDF Found:', item.name, item.id);
      return item;
    }
  }

  return null;
}

async function findDomainMaterial({ domainName, context }) {
  const requestContext = context || createDriveRequestContext();
  const normalizedDomain = normalizeDomain(domainName);
  const ROOT_FOLDER_ID = config.google.projectDriveRootFolderId;

  console.log('Configured Root Folder Name:', config.google.projectDriveRootFolderName);
  console.log('Configured Root Folder ID:', config.google.projectDriveRootFolderId);
  console.log('Root Folder ID:', ROOT_FOLDER_ID);

  const projectRoot = ROOT_FOLDER_ID
    ? await findFolderById(ROOT_FOLDER_ID)
    : await findFolderByName(config.google.projectDriveRootFolderName);
  const rootChildFolders = await listChildFolders(projectRoot?.id, requestContext);
  const projectList = rootChildFolders.find((folder) => normalizeDomain(folder.name) === 'project list') || null;

  console.log('Project Root Found:', projectRoot);
  console.log('Project List Found:', projectList);

  const topLevelFolders = await listChildFolders(projectList?.id, requestContext);
  const technicalFolder = topLevelFolders.find((folder) => normalizeDomain(folder.name) === 'technical') || null;
  const match = await findMatchingDomainFolder(projectList?.id, domainName, requestContext);
  const domainFolder = match.domainFolder;
  const clusterFolder = match.folderPath.length > 1
    ? match.folderPath[match.folderPath.length - 2]
    : null;
  const pdfFile = await findFirstPdfRecursively(domainFolder, requestContext);
  const material = fileResponse(pdfFile);
  const domainMaterial = material ? {
    fileId: material.id,
    fileName: material.name,
    openUrl: material.viewUrl,
    downloadUrl: material.downloadUrl,
  } : null;

  console.log('Student Domain:', domainName);
  console.log('Normalized Domain:', normalizedDomain);
  console.log('Technical Folder Found:', technicalFolder);
  console.log('Cluster Found:', clusterFolder);
  console.log('Domain Folder Found:', domainFolder);
  console.log('PDF Found:', pdfFile);
  console.log('Generated Open URL:', domainMaterial?.openUrl || null);
  console.log('Generated Download URL:', domainMaterial?.downloadUrl || null);
  console.log('Final Domain Material:', domainMaterial);

  logger.info('DRIVE DOMAIN MATERIAL SEARCH', {
    domainName,
    normalizedDomain: match.normalizedDomain,
    projectRoot: projectRoot?.name || null,
    projectList: projectList?.name || null,
    technicalFolder: technicalFolder?.name || null,
    clusterFolder: clusterFolder?.name || null,
    matchedDomainFolder: domainFolder?.name || null,
    selectedPdf: pdfFile?.name || null,
  });

  return material;
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

function isOfferLetterFile(file) {
  return normalizeMatchValue(file?.name).includes('offer letter');
}

function fileContainsIdentifier(file, identifier) {
  const normalizedIdentifier = normalizeIdentifier(identifier);

  if (!normalizedIdentifier) {
    return false;
  }

  return normalizeIdentifier(file?.name).includes(normalizedIdentifier);
}

function fileContainsMatchValue(file, value) {
  const normalizedValue = normalizeMatchValue(value);

  if (!normalizedValue) {
    return false;
  }

  return normalizeMatchValue(file?.name).includes(normalizedValue) ||
    normalizeIdentifier(file?.name).includes(normalizeIdentifier(value));
}

function fileMatchesLegacyOfferLetterName(file, studentName) {
  const expectedNames = buildExpectedFileNames(studentName, 'Offer Letter');

  return expectedNames.some((expected) => normalizeDriveName(file.name) === normalizeDriveName(expected));
}

function selectOfferLetterFile(files, { studentName, internId, domainName, domainId, hasDuplicateName }) {
  const offerLetterFiles = files.filter(isOfferLetterFile);

  const internMatches = offerLetterFiles.filter((file) => fileContainsIdentifier(file, internId));
  if (internMatches.length) {
    return internMatches.find((file) => fileContainsMatchValue(file, studentName)) || internMatches[0];
  }

  const domainIdMatches = offerLetterFiles.filter((file) => (
    fileContainsMatchValue(file, studentName) &&
    fileContainsIdentifier(file, domainId)
  ));
  if (domainIdMatches.length) {
    return domainIdMatches[0];
  }

  const domainAndNameMatches = offerLetterFiles.filter((file) => (
    fileContainsMatchValue(file, studentName) &&
    fileContainsMatchValue(file, domainName)
  ));
  if (domainAndNameMatches.length) {
    return domainAndNameMatches[0];
  }

  if (hasDuplicateName) {
    return null;
  }

  const legacyExactMatches = offerLetterFiles.filter((file) => fileMatchesLegacyOfferLetterName(file, studentName));
  if (legacyExactMatches.length === 1) {
    return legacyExactMatches[0];
  }

  const nameMatches = offerLetterFiles.filter((file) => fileContainsMatchValue(file, studentName));
  return nameMatches.length === 1 ? nameMatches[0] : null;
}

async function searchOfferLetterFilesByFullText({ folderId, searchText, context }) {
  if (!folderId || !searchText) {
    return [];
  }

  const query = [
    `'${escapeDriveQueryValue(folderId)}' in parents`,
    `fullText contains '${escapeDriveQueryValue(searchText)}'`,
    'trashed=false',
  ].join(' and ');
  const cacheKey = JSON.stringify({
    type: 'offer',
    fullText: normalizeIdentifier(searchText),
  });

  console.log('Offer Letter Search Query:', query);

  if (context.searches.has(cacheKey)) {
    return context.searches.get(cacheKey);
  }

  let response;

  try {
    const drive = await getDriveClient();
    response = await drive.files.list({
      q: query,
      fields: 'files(id,name,webViewLink)',
      pageSize: 50,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
  } catch (error) {
    logger.error('Google Drive offer letter full text search failed.', {
      folderId,
      searchText,
      status: error.code || error.response?.status,
      message: error.message,
    });
    return [];
  }

  const files = response.data.files || [];
  console.log('Offer Letter Full Text Files Found:', files.length);
  console.log('Offer Letter Full Text File Names:', files.map((file) => file.name));
  context.searches.set(cacheKey, files);
  return files;
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

async function findOfferLetterFileByStudentRegistration({
  studentName,
  internId,
  domainName,
  domainId,
  hasDuplicateName,
  context = createDriveRequestContext(),
}) {
  const normalizedStudentName = normalizeText(studentName);
  const offerLettersFolderId = config.google.offerLettersFolderId ||
    '1WpP8HkFphTtFRhtUUvvxzStdZcHpGDKV';
  const cacheKey = JSON.stringify({
    type: 'offer',
    folderFiles: true,
  });

  console.log('Student Name:', studentName);
  console.log('Normalized Student:', normalizedStudentName);
  console.log('Current Intern ID:', internId || '');
  console.log('Current Domain:', domainName || '');
  console.log('Current Domain ID:', domainId || '');
  console.log('Folder ID:', offerLettersFolderId);

  if (!normalizedStudentName) {
    console.log('All Drive Files:', []);
    console.log('Files Found:', 0);
    console.log('Matched Offer Letter:', null);
    return null;
  }

  const internSearchFiles = await searchOfferLetterFilesByFullText({
    folderId: offerLettersFolderId,
    searchText: internId,
    context,
  });
  const internSearchOfferLetterFiles = internSearchFiles.filter(isOfferLetterFile);
  const internSearchMatch = selectOfferLetterFile(internSearchFiles, {
    studentName,
    internId,
    domainName,
    domainId,
    hasDuplicateName,
  }) || (internSearchOfferLetterFiles.length === 1 ? internSearchOfferLetterFiles[0] : null);

  if (internSearchMatch) {
    console.log('Matched Offer Letter:', internSearchMatch);
    return internSearchMatch;
  }

  let files;

  if (context.searches.has(cacheKey)) {
    files = context.searches.get(cacheKey);
  } else {
    let response;

    try {
      const drive = await getDriveClient();
      const query = [
        `'${escapeDriveQueryValue(offerLettersFolderId)}' in parents`,
        'trashed=false',
      ].join(' and ');

      console.log('Offer Letter Search Query:', query);
      response = await drive.files.list({
        q: query,
        fields: 'files(id,name,webViewLink)',
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

  const matchedFile = selectOfferLetterFile(files, {
    studentName,
    internId,
    domainName,
    domainId,
    hasDuplicateName,
  });

  console.log('All Drive Files:', files);
  console.log('Files Found:', files.length);
  console.log('Matched Offer Letter:', matchedFile);

  return matchedFile;
}

async function findOfferLetterFileByStudentName(studentName, context = createDriveRequestContext()) {
  return findOfferLetterFileByStudentRegistration({
    studentName,
    context,
  });
}

async function findOfferLetter({ studentName, internId, domainName, domainId, hasDuplicateName, packageSelected, context }) {
  const file = await findOfferLetterFileByStudentRegistration({
    studentName,
    internId,
    domainName,
    domainId,
    hasDuplicateName,
    context,
  });

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

async function getStudentDocuments({ name, internId, domainName, domainId, hasDuplicateName, packageSelected, isCompleted }) {
  const context = createDriveRequestContext();
  logger.info('Resolving student Drive documents.', { internId, name, domainName, domainId, hasDuplicateName, packageSelected, isCompleted });

  const offerLetter = await findOfferLetterFileByStudentRegistration({
    studentName: name,
    internId,
    domainName,
    domainId,
    hasDuplicateName,
    context,
  });

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
  findDomainMaterial,
  findFileByName,
  findLOR,
  findOfferLetter,
  getStudentDocuments,
};
