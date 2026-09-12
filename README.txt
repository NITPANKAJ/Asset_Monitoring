JSDG Asset Dashboard - HTML/JavaScript + Google Sheet

This version uses ONLY front-end files:
- index.html
- data-entry.html
- analysis.html
- app.js
- style.css

No PHP
No MySQL
No Excel
No XAMPP database

Data storage:
HTML/JavaScript -> Google Apps Script Web App -> Google Sheet

HOW TO RUN
Option 1: VS Code Live Server
1. Open this folder in VS Code.
2. Install/enable Live Server.
3. Right-click index.html.
4. Click "Open with Live Server".

Option 2: Any normal web hosting / GitHub Pages
Upload all 5 files together and open index.html.

DEFAULT USERS
Data Entry: entry / entry123
Analysis: analysis / analysis123
Admin: admin / admin123

IMPORTANT
The Google Apps Script deployment must remain active and must be deployed with:
Execute as: Me
Who has access: Anyone

The Google Sheet tab name must be exactly:
Asset Data

SECURITY NOTE
Because this is a front-end-only version, login IDs/passwords are visible inside app.js.
For strong security, server-side authentication is required.
