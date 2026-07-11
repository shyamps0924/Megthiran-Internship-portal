const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const {
  rootDir,
  loadCertificateRecords,
} = require('./certificate-records');

const verificationBaseUrl = process.env.CERTIFICATE_VERIFY_BASE_URL || 'https://megthiran.in/verify';
const outputDir = path.join(rootDir, 'generated-qrcodes');

function qrCodeUrl(internId) {
  const url = new URL(verificationBaseUrl);
  url.searchParams.set('internId', internId);
  return url.toString();
}

async function generateQrCodes() {
  const { records, workbookPath } = loadCertificateRecords();
  const seenInternIds = new Set();
  const uniqueRecords = records.filter((record) => {
    if (seenInternIds.has(record.internId)) {
      return false;
    }

    seenInternIds.add(record.internId);
    return true;
  });

  fs.rmSync(outputDir, { recursive: true, force: true });
  fs.mkdirSync(outputDir, { recursive: true });

  for (const record of uniqueRecords) {
    const filePath = path.join(outputDir, `${record.internId}.png`);
    await QRCode.toFile(filePath, qrCodeUrl(record.internId), {
      type: 'png',
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 512,
    });
  }

  console.log(`[qrcodes] Source workbook: ${path.relative(rootDir, workbookPath)}`);
  console.log(`[qrcodes] Generated ${uniqueRecords.length} QR codes in ${path.relative(rootDir, outputDir)}.`);
}

generateQrCodes().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
