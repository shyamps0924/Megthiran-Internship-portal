# Megthiran Internship Portal

This project is now a frontend-only website.

## Structure

```text
internship_portal/
  assets/
  fonts/
  frontend/
    index.html
    login.html
    dashboard.html
    package-basic.html
    package-standard.html
    package-premium.html
    package-elite.html
    privacy-policy.html
    terms-and-conditions.html
    code-of-conduct.html
    style.css
    legal.css
    script.js
    legal-content.js
    legal.js
  PRIVACY POLICY.docx
  TERMS AND SERVICES.docx
  CODE OF CONDUCT.docx
```

## Run Locally

From the `frontend` folder:

```powershell
cd frontend
python -m http.server 5500
```

Open:

- `http://127.0.0.1:5500/index.html`

## Notes

- The legal pages are frontend-only and render from the bundled content in `frontend/legal-content.js`.
- The `.docx` files remain in the project root as the original source documents.
- No backend server, API, or runtime document parsing is required for the website to work.
# Megthiran-Internship-portal
Official website for the Megthiran internship platform.
