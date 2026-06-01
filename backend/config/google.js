const { google } = require('googleapis');
const config = require('./env');

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets.readonly',
  'https://www.googleapis.com/auth/drive.readonly',
];

let authClientPromise;

function getGoogleAuthClient() {
  if (!authClientPromise) {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: SCOPES,
    });

    authClientPromise = auth.getClient();
  }

  return authClientPromise;
}

async function getSheetsClient() {
  const auth = await getGoogleAuthClient();
  return google.sheets({ version: 'v4', auth });
}

async function getDriveClient() {
  const auth = await getGoogleAuthClient();
  return google.drive({ version: 'v3', auth });
}

module.exports = {
  getDriveClient,
  getSheetsClient,
};
