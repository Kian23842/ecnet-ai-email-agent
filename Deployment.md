# ECNET AI Email Agent v2: Full Deployment Guide

This guide provides step-by-step, beginner-friendly instructions on how to take the ECNET AI Email Agent from its source code and get it running on your own live server.

## Prerequisites

Before starting, make sure you have:
1. **A web server (VPS or Shared Hosting)** running Linux (e.g., Ubuntu, Debian, or Rocky Linux).
2. **Apache** or **Nginx** web server installed. (This guide will focus on Apache, as the project includes an `.htaccess` file already).
3. **PHP 8.2** or higher installed, along with essential extensions (`php-pdo`, `php-mysql`, `php-curl`, `php-json`).
4. **MySQL 8.x** or **MariaDB 10.x** installed.
5. **Node.js** (v18 or higher) and **npm** installed on your local machine (for compiling the frontend).
6. **A domain name or subdomain** (e.g., `agent.yourdomain.com`) pointing to your server's IP address.

---

## Step 1: Prepare the Frontend on your Local Machine

The frontend of this application is built with React 19 and Vite. Since Vite serves files meant for local development out of the box, we must "build" them into static files before deploying.

1. Open your terminal and navigate to the project folder on your computer.
2. Install the necessary dependencies (if you haven't yet):
   ```bash
   npm install
   ```
3. Build the frontend for production:
   ```bash
   npm run build
   ```
4. This command will create a new folder named `dist` in your project directory. This `dist` folder now contains the optimized, final frontend code.

---

## Step 2: Upload Files to your Server

Now we need to get the project files onto your web server. You can use SSH/SFTP (via a program like FileZilla or Cyberduck) or a Control Panel File Manager (like cPanel).

1. Connect to your server.
2. Navigate to your web root folder (usually `/var/www/html/`, `/var/www/yourdomain.com/public_html`, or similar).
3. Upload **everything inside** your local `dist` folder directly into the web root folder.
4. Next, upload all the PHP files and directories from your project source:
    * The `api/` folder
    * The `lib/` folder
    * The `config/` folder
    * `schema/schema.sql` (can be deleted after Step 3)
    * `seed.php`
    * `.env.example`
    * `.htaccess` (Make sure hidden files are visible to upload this!)

> **Important**: Your server's web root should now contain an `assets` folder and `index.html` (from `dist`), along with `api/`, `lib/`, `.htaccess`, etc.

---

## Step 3: Setup the Database

1. Log into your MySQL server (either via command line, phpMyAdmin, or your hosting control panel).
2. Create a new, blank database named `ecnet_email_agent` (or any name you prefer).
3. Import the `schema/schema.sql` file into this new database.
   * If via Command Line:
     ```bash
     mysql -u your_db_user -p ecnet_email_agent < schema/schema.sql
     ```
   * If via phpMyAdmin: Click your new database, go to the **Import** tab, upload `schema.sql`, and click **Go**.

---

## Step 4: Configure Environment Variables

1. On your server, rename the `.env.example` file to `.env`.
   ```bash
   mv .env.example .env
   ```
2. Open the `.env` file using a text editor (e.g., `nano .env` or through your File Manager editor).
3. Fill in your configurations:

   * **Application URL**:
     ```ini
     APP_URL="https://agent.yourdomain.com"
     ```
   * **Database Credentials**: Enter the database name, user, and password you used in Step 3.
     ```ini
     DB_HOST="127.0.0.1"
     DB_PORT="3306"
     DB_NAME="ecnet_email_agent"
     DB_USER="your_db_user"
     DB_PASS="your_db_password"
     ```
   * **Encryption Key**: Generate a strong 32-character random string. This encrypts the tokens stored in the database.
     ```ini
     ENCRYPTION_KEY="TypeArandom32CharacterStringHere!"
     ```
   * **Gemini API Key**: Go to [Google AI Studio](https://aistudio.google.com/), get a Gemini API key, and paste it here:
     ```ini
     GEMINI_API_KEY="YOUR_GEMINI_KEY"
     ```
   * **Initial Admin Setup**: Decide your default admin's email and temporary password for the very first login.
     ```ini
     ADMIN_EMAIL="admin@yourdomain.com"
     ADMIN_PASSWORD="super_secret_password"
     ```

4. Save your changes and exist the editor.

---

## Step 5: Seed the Database

We need to create the root Administrator account using the credentials you just provided in the `.env` file.

1. SSH into your server, navigate to your web root, and run:
   ```bash
   php seed.php
   ```
2. You should see a success message (`✓ Seed complete!`).
3. For security, **delete the `seed.php` file** from your server after running it.
   ```bash
   rm seed.php
   ```

---

## Step 6: Configure Apache (.htaccess)

The included `.htaccess` ensures that any API requests go precisely to the PHP backend (`/api/index.php`), and everything else routes to React (`index.html`).

For this to work, ensure Apache has `mod_rewrite` enabled:
```bash
sudo a2enmod rewrite
sudo systemctl restart apache2
```

Additionally, in your Apache VirtualHost configuration file (e.g., `/etc/apache2/sites-available/yourdomain.conf`), make sure `AllowOverride All` is set so the `.htaccess` file takes effect:
```apache
<Directory /var/www/yourdomain.com/public_html>
    AllowOverride All
</Directory>
```
*(Remember to restart Apache if you edit this file).*

---

## Step 7: Logging In and Connecting APIs

1. Go to your site URL: `https://agent.yourdomain.com`
2. You will be greeted by the Login portal. Enter the `ADMIN_EMAIL` and `ADMIN_PASSWORD` you set in the `.env` file.
3. Once inside, you're the Administrator. Use the left sidebar to assign new users to your organization.

### Connecting External Mail Providers (OAuth)

To allow the platform to read and reply to emails, you need OAuth API Keys.

#### Setting up Gmail / Google Workspace
1. Go to the [Google Cloud Console](https://console.cloud.google.com).
2. Create a Project, go to **APIs & Services**, and enable the **Gmail API**.
3. Under **OAuth consent screen**, set up your application details.
4. Under **Credentials**, create an **OAuth Client ID** (Web Application).
5. Add your redirect URI: `https://agent.yourdomain.com/api/gmail/callback`
6. Go back to your ECNET Admin Dashboard. Go to the **GCP / OAuth** tab, select your Organization, and securely paste the Client ID and Client Secret there.

#### Setting up Microsoft Outlook / Office 365
1. Go to the [Azure Portal](https://portal.azure.com).
2. Look for **Microsoft Entra ID** (formerly Azure Active Directory) -> **App registrations**.
3. Create a **New registration**.
4. Set the Redirect URI to Web, and point it to: `https://agent.yourdomain.com/api/outlook/callback`
5. Go to **Certificates & secrets** and generate a Client Secret.
6. In your ECNET Admin Dashboard, navigate to the **GCP / OAuth** tab, and enter your Azure Application (Client) ID and secret.

---

## Troubleshooting

- **White Screen on Load?** Check your Web Browser's console. Ensure you uploaded the `dist` folder contents correctly and that the JavaScript is not throwing 404 errors.
- **"Not Found" or 404 on Login?** The `.htaccess` file is being ignored by Apache. Make sure `AllowOverride All` is set in your Apache VirtualHost configuration.
- **Database Connection Errors?** Double check the passwords and database names in your `.env` file. Make sure your MySQL server is running.
- **Tokens not syncing?** Make sure you filled out the `ENCRYPTION_KEY` in the `.env` file. It must be exactly 32-characters if relying on robust AES-256 blocks.

**Congratulations! Your ECNET AI Email Agent is fully deployed!**
