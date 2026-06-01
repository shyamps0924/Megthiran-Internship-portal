const { google } = require('googleapis');
const config = require('../config/env');

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY,
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

async function getGoogleSheetsInstance() {
  const client = await auth.getClient();

  return google.sheets({
    version: 'v4',
    auth: client,
  });
}

async function getSheetData() {
  const sheets = await getGoogleSheetsInstance();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: config.google.spreadsheetId,
    range: config.google.sheetRange,
  });

  const rows = response.data.values || [];

  if (rows.length === 0) {
    return [];
  }

  const headers = rows[0];

  const data = rows.slice(1).map((row) => {
    const obj = {};

    headers.forEach((header, index) => {
      obj[header] = row[index] || '';
    });

    return obj;
  });

  return data;
}

module.exports = {
  getSheetData,
};