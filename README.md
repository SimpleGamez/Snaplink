# Snaplink

A lightning-fast, highly-polished URL shortener and management dashboard built natively without heavy frameworks.

## Architecture

This project is built using:
- **Vanilla HTML/CSS/JS**: Fast, lightweight frontend with no build tools or bundle steps required for deployment.
- **Firebase Authentication**: Seamless, secure user registration and login.
- **Firebase Realtime Database**: For immediately persisting link mappings, custom aliases, and advanced click analytics without polling.

## Setup & Local Development

Because this project relies completely on CDN module imports and native browser APIs, there are no `node_modules` to install.

### 1. Configure Firebase
- Create a new project on [Firebase](https://firebase.google.com/).
- Enable **Authentication** (Email/Password).
- Enable **Realtime Database**. 
- Set up the specific database rules for reading, writing, and analytical validation. *(See Database Rules section below)*.

### 2. Connect Your Credentials
- Open `app.js` and locate the `firebaseConfig` block at the top of the file.
- Replace `YOUR_API_KEY`, `YOUR_AUTH_DOMAIN`, etc., with the config values from your Firebase Project settings.

### 3. Run Locally 
- You can simply serve the directory using any local web server. 
- For example, if you have python installed:
  ```bash
  python -m http.server 3000
  ```
- Or using npx:
  ```bash
  npx serve .
  ```
- Open `http://localhost:3000` in your web browser.

## Database Rules
Ensure you have proper security rules configured in your Firebase Realtime database so that visitors can only edit their own links safely.

```json
{
  "rules": {
    "public_links": {
      ".read": true,
      "$code": {
        ".write": "auth != null && (!data.exists() || data.child('uid').val() === auth.uid)",
        ".validate": "newData.hasChildren(['uid', 'linkId']) && newData.child('uid').val() === auth.uid"
      }
    },
    "users": {
      "$uid": {
        "links": {
          ".read": "auth != null && auth.uid === $uid",
          ".write": "auth != null && auth.uid === $uid",
          "$linkId": {
            ".read": true,
            "clicks": {
              ".write": true,
              ".validate": "newData.isNumber() && (!data.exists() ? newData.val() === 1 : newData.val() === data.val() + 1)"
            }
          }
        }
      }
    }
  }
}
```

## Features

- **Lightning Fast Performance**: Links shorten and redirect instantly. No bloated libraries.
- **Unlimited Custom Aliases**: Craft personalized vanity URLs directly from the dashboard.
- **Realtime Analytics**: Visual dashboards updating total link counts and clicks seamlessly.
- **QR Code Generation**: Native local Canvas plotting so users can easily share links in real life.
- **No Paywalls**: Full features available directly upon signup.

