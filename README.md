# Megthiran Internship Portal

Official Megthiran internship website with a secure student dashboard backend.

## What is included

- Static Megthiran public website in `frontend/`
- Student login using Intern ID + DOB password
- Protected student dashboard route
- Express backend in `backend/`
- Google Sheets API integration for student records
- Google Drive API integration for offer letters, certificates, and LORs
- Domain ID/name parsing from spreadsheet domain columns
- Package-based internship duration/status calculation

## Local setup

```powershell
npm install
Copy-Item .env.example .env
npm start
```

Open:

- `http://127.0.0.1:5000/index.html`
- `http://127.0.0.1:5000/login.html`

## Environment

Set these in `.env`:

```text
JWT_SECRET=replace-with-a-long-random-secret
GOOGLE_APPLICATION_CREDENTIALS=./credentials.json
GOOGLE_SPREADSHEET_ID=your-google-sheet-id
GOOGLE_SHEET_RANGE=Form Responses 1!A:AZ
```

Optional Drive folder IDs:

```text
GOOGLE_DRIVE_OFFER_LETTERS_FOLDER_ID=
GOOGLE_DRIVE_COMPLETION_CERTIFICATES_FOLDER_ID=
GOOGLE_DRIVE_LORS_FOLDER_ID=
```

If folder IDs are omitted, the backend searches for:

```text
MEGTHIRAN Documents
  Offer Letters
  Completion Certificates
  LORs
```

Share the spreadsheet and Drive folders with the service account email from `credentials.json`.

## Tests

```powershell
npm test
```
