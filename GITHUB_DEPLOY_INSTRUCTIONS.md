# GitHub Repository Setup & Deployment Guide

All code changes, security layers, email deliverability services, and database persistence have been committed locally on branch `main`.

---

## How to Push to Your GitHub Repository

### Step 1: Create a New Repository on GitHub
1. Open [GitHub](https://github.com/new).
2. Create a new repository named `digiskool-portal` (or any name you prefer).
3. Do **not** check "Initialize with a README" or ".gitignore" (these already exist in the codebase).

### Step 2: Push to GitHub
Run the following commands in your terminal / console:

```bash
# Add your GitHub remote repository URL
git remote add origin https://github.com/<YOUR-GITHUB-USERNAME>/digiskool-portal.git

# Push the committed code to GitHub
git push -u origin main
```

*(If you are using a GitHub Personal Access Token or SSH key, use your standard GitHub credentials).*

---

## What is Included in this GitHub Release
- **Enterprise Security Protection**: HTTP Security Headers (HSTS, CSP, X-Frame-Options), Rate Limiting, SQL Injection Guard, and 5-attempt brute force account lockout.
- **Dual Email Deliverability Pipeline**: Direct SMTP (`nodemailer`) + Firebase Trigger Email queue (`mail` collection).
- **Persistent Cloud Database**: SQLite with persistent Google Cloud Firestore cloud storage backup and synchronization.
- **Android PWA & TWA**: Web App Manifest (`manifest.json`), service worker (`sw.js`), 192/512 icons, and Android app install prompts.
- **Clean Architecture**: Staff Directory removed; clean Student Management, Admissions, Fee Vouchers (2-part installments), Receipts, Expenses, Accounts, and Security.
