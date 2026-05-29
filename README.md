# WA Flow Sender

A static, consent-based WhatsApp `wa.me` message link generator.

## Features

- Two-page interface:
  - Message sending page
  - Settings / template management page
- Custom template management:
  - Add templates
  - Edit templates
  - Delete templates
  - Restore default templates
- Message editor with variables:
  - `{{name}}`
  - `{{phone}}`
  - `{{company}}`
- Recipient list input
- CSV import
- Duplicate and invalid phone detection
- Adjustable interval, default 3 seconds
- Opens `https://wa.me/[phone]?text=[message]`
- LocalStorage save
- Export logs
- GitHub Pages ready

## Important

This website only opens WhatsApp message drafts through `wa.me`. It does not bypass WhatsApp and does not automatically press the final send button. Use only for recipients who have agreed to receive your messages.

## Deploy to GitHub Pages

1. Create a new GitHub repository.
2. Upload all files in this folder.
3. Go to **Settings** → **Pages**.
4. Under **Build and deployment**, choose:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/root`
5. Save.
6. Your site will be available at:

`https://YOUR-USERNAME.github.io/YOUR-REPOSITORY-NAME/`
