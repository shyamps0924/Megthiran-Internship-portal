const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ quiet: true });

const rootDir = path.resolve(__dirname, '..', '..');

function parseList(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

const config = {
  nodeEnv: process.env.NODE_ENV || 'development',

  port: Number(process.env.PORT || 5000),

  jwtSecret:
    process.env.JWT_SECRET ||
    'megthiran-super-secret-key',

  jwtExpiresIn:
    process.env.JWT_EXPIRES_IN || '8h',

  frontendOrigin:
    process.env.FRONTEND_ORIGIN || '',

  frontendOrigins: parseList(
    process.env.FRONTEND_ORIGINS ||
      process.env.FRONTEND_ORIGIN
  ),

  google: {
    credentialsPath:
      process.env.GOOGLE_APPLICATION_CREDENTIALS ||
      path.join(rootDir, 'credentials.json'),

    spreadsheetId:
      process.env.GOOGLE_SPREADSHEET_ID ||
      '1KkjgV5GqLtsKORtxT7XysD8vLUMXzSDcQdAjFkyCw78',

    // TAKEN FROM YOUR IMAGE
    sheetRange:
      process.env.GOOGLE_SHEET_RANGE ||
      'Form Responses 2!A:AM',

    driveRootFolderName:
      process.env.GOOGLE_DRIVE_ROOT_FOLDER_NAME ||
      'MEGTHIRAN Documents',

    offerLettersFolderId:
      process.env.GOOGLE_DRIVE_OFFER_LETTERS_FOLDER_ID ||
      '1WpP8HkFphTtFRhtUUvvxzStdZcHpGDKV',

    certificatesFolderId:
      process.env.GOOGLE_DRIVE_COMPLETION_CERTIFICATES_FOLDER_ID || '',

    lorsFolderId:
      process.env.GOOGLE_DRIVE_LORS_FOLDER_ID || '',
  },

  internship: {
    startDate:
      process.env.INTERNSHIP_START_DATE ||
      '2026-06-01',
  },
};

module.exports = config;
