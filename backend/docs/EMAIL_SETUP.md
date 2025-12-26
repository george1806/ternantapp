# Email Setup Guide

## Overview

The Apartment Management SaaS uses a **provider-based email architecture** that allows you to easily switch between different email providers by simply changing environment variables.

**Supported Providers:**
- **Mailpit** (Development only) - Local email testing
- **Brevo** (Recommended for production) - 300 emails/day free
- **SendGrid** - 100 emails/day free (3,000/month)
- **Gmail SMTP** - 500 emails/day (personal use only)

## Quick Start

### Development (Default)

By default, the application uses **Mailpit** for local email testing. No configuration needed!

```bash
# Already configured in docker-compose.yml
MAIL_PROVIDER=mailpit
```

View emails at: http://localhost:8025

### Production (Brevo - Recommended)

For production, we recommend **Brevo** (formerly Sendinblue):

1. Sign up at https://www.brevo.com/
2. Verify your email address
3. Go to **Settings → SMTP & API**
4. Click **Create a new SMTP key**
5. Copy your SMTP key

Update your `.env` file:

```bash
MAIL_PROVIDER=brevo
MAIL_USER=your-login-email@example.com
MAIL_PASSWORD=your-smtp-key-here
MAIL_FROM_NAME=Apartment Management
MAIL_FROM_EMAIL=noreply@yourdomain.com
```

That's it! Restart your application and you're ready to send emails.

---

## Detailed Provider Setup

### 1. Mailpit (Development)

**Best for:** Local development and testing

**Free Tier:** Unlimited (local only)

**Setup:**

Already configured in `docker-compose.yml`. Emails are caught locally and never sent to real addresses.

```yaml
# docker-compose.yml (already configured)
mailpit:
  image: axllent/mailpit:latest
  ports:
    - "1025:1025"  # SMTP port
    - "8025:8025"  # Web UI
```

**Environment Variables:**

```bash
MAIL_PROVIDER=mailpit
# No MAIL_USER or MAIL_PASSWORD needed
```

**Web UI:** http://localhost:8025

**Notes:**
- Emails are NOT sent to real addresses
- Perfect for testing email templates
- See all sent emails in the web interface

---

### 2. Brevo (Recommended for Production)

**Best for:** Production applications

**Free Tier:** 300 emails/day (9,000/month)

**Why Brevo?**
- Generous free tier
- Excellent deliverability
- Easy setup
- No credit card required for free tier
- Great dashboard and analytics

**Step-by-Step Setup:**

1. **Create Account**
   - Go to https://www.brevo.com/
   - Click "Sign up free"
   - Fill in your details
   - Verify your email address

2. **Get SMTP Credentials**
   - Log in to your Brevo account
   - Go to **Settings** (top right)
   - Click **SMTP & API** in the left menu
   - Click **Create a new SMTP key**
   - Give it a name (e.g., "Apartment App Production")
   - Copy the generated SMTP key (starts with `xkeysib-...`)

3. **Configure Environment Variables**

   Update your `.env` file:

   ```bash
   MAIL_PROVIDER=brevo
   MAIL_USER=your-brevo-login-email@example.com
   MAIL_PASSWORD=xkeysib-your-smtp-key-here
   MAIL_FROM_NAME=Apartment Management
   MAIL_FROM_EMAIL=noreply@yourdomain.com
   ```

   **Important:**
   - `MAIL_USER`: Your Brevo login email (the one you signed up with)
   - `MAIL_PASSWORD`: The SMTP key you just generated (NOT your login password)

4. **Verify Sender Domain (Optional but Recommended)**

   For better deliverability:
   - Go to **Senders & IP** → **Domains**
   - Add your domain
   - Add the DNS records they provide
   - Wait for verification (usually a few hours)

5. **Restart Application**

   ```bash
   docker-compose restart backend
   ```

6. **Test Email Sending**

   ```bash
   curl -X POST http://localhost:3000/api/super-admin/settings/test-email \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -d '{"to": "your-email@example.com"}'
   ```

**Troubleshooting:**

- **Error: "MAIL_PASSWORD is required"**
  - Make sure you set the SMTP key in `.env`
  - Restart the backend: `docker-compose restart backend`

- **Error: "Authentication failed"**
  - Double-check your `MAIL_USER` matches your Brevo login email
  - Regenerate your SMTP key if needed

- **Emails going to spam:**
  - Verify your sender domain (step 4 above)
  - Add SPF and DKIM records to your domain

---

### 3. SendGrid

**Best for:** Established applications with existing SendGrid accounts

**Free Tier:** 100 emails/day (3,000/month)

**Step-by-Step Setup:**

1. **Create Account**
   - Go to https://sendgrid.com/
   - Sign up for free account
   - Verify your email

2. **Create API Key**
   - Go to **Settings → API Keys**
   - Click **Create API Key**
   - Choose "Full Access" or "Mail Send" only
   - Copy the API key (starts with `SG.`)

3. **Configure Environment Variables**

   ```bash
   MAIL_PROVIDER=sendgrid
   MAIL_USER=apikey
   MAIL_PASSWORD=SG.your-api-key-here
   MAIL_FROM_NAME=Apartment Management
   MAIL_FROM_EMAIL=noreply@yourdomain.com
   ```

   **Important:**
   - `MAIL_USER` must ALWAYS be the literal string `"apikey"`
   - `MAIL_PASSWORD` is your SendGrid API key (starts with `SG.`)

4. **Verify Sender Identity**
   - Go to **Settings → Sender Authentication**
   - Either verify a single sender email OR verify your domain
   - Follow the verification steps

5. **Restart Application**

   ```bash
   docker-compose restart backend
   ```

**Notes:**
- SendGrid requires sender verification
- API key must start with `SG.`
- Industry-standard solution with excellent docs

---

### 4. Gmail SMTP

**Best for:** Personal projects and testing

**Free Tier:** 500 emails/day

**⚠️ Warning:** Not recommended for production! Use Brevo or SendGrid instead.

**Step-by-Step Setup:**

1. **Enable 2-Step Verification**
   - Go to https://myaccount.google.com/
   - Security → 2-Step Verification
   - Follow the setup process

2. **Generate App Password**
   - Go to https://myaccount.google.com/
   - Security → 2-Step Verification
   - Scroll to bottom: **App passwords**
   - Select **Mail** and your device
   - Copy the 16-character password (format: `xxxx xxxx xxxx xxxx`)

3. **Configure Environment Variables**

   ```bash
   MAIL_PROVIDER=gmail
   MAIL_USER=yourgmail@gmail.com
   MAIL_PASSWORD=xxxx-xxxx-xxxx-xxxx
   MAIL_FROM_NAME=Apartment Management
   MAIL_FROM_EMAIL=yourgmail@gmail.com
   ```

   **Important:**
   - `MAIL_USER`: Your Gmail address
   - `MAIL_PASSWORD`: The 16-character app password (NOT your Gmail password)
   - `MAIL_FROM_EMAIL`: Should match your Gmail address

4. **Restart Application**

   ```bash
   docker-compose restart backend
   ```

**Limitations:**
- 500 emails per day limit
- Not suitable for production
- Emails appear to come from your personal Gmail
- May trigger spam filters

---

## Switching Between Providers

The architecture makes switching providers extremely easy:

1. **Update `.env` file:**

   ```bash
   # From Mailpit to Brevo
   MAIL_PROVIDER=brevo  # Change this line
   MAIL_USER=your-brevo-email@example.com
   MAIL_PASSWORD=your-brevo-smtp-key
   ```

2. **Restart backend:**

   ```bash
   docker-compose restart backend
   ```

3. **Verify in logs:**

   ```bash
   docker logs apartment-backend | grep "Email Provider"
   ```

   You should see:
   ```
   ✓ Email Provider: Brevo (Sendinblue)
   ✓ Free Tier: 300 emails/day (9,000/month)
   ```

That's it! No code changes needed.

---

## Environment Variables Reference

```bash
# Email Provider Configuration
MAIL_PROVIDER=mailpit              # mailpit | brevo | sendgrid | gmail
MAIL_USER=your-email@example.com   # Provider-specific username/email
MAIL_PASSWORD=your-smtp-key        # Provider-specific password/API key

# Email Sender Configuration
MAIL_FROM_NAME=Apartment Management  # Display name in "From" field
MAIL_FROM_EMAIL=noreply@yourdomain.com  # Email address in "From" field

# Optional: Application Info
APP_NAME=Apartment Management SaaS
```

**Provider-Specific Values:**

| Provider   | MAIL_USER                    | MAIL_PASSWORD               |
|------------|------------------------------|----------------------------|
| Mailpit    | *(not needed)*               | *(not needed)*             |
| Brevo      | Your Brevo login email       | SMTP key from dashboard    |
| SendGrid   | `apikey` (literal string)    | API key starting with `SG.`|
| Gmail      | Your Gmail address           | 16-char app password       |

---

## Testing Email Delivery

### Method 1: Use Test Endpoint

```bash
curl -X POST http://localhost:3000/api/super-admin/settings/test-email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "to": "recipient@example.com",
    "subject": "Test Email",
    "message": "Testing email provider configuration"
  }'
```

### Method 2: Use Reminder Test Endpoints

```bash
# Send test rent due reminder
curl -X POST http://localhost:3000/api/reminders/test/simulate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "type": "DUE_SOON",
    "recipient": "test@example.com"
  }'
```

### Method 3: Check Application Logs

```bash
docker logs apartment-backend --tail 100 | grep -E "(Email|SMTP)"
```

Look for:
- ✓ Email provider connection test passed
- Email sent successfully: <message-id>

---

## Troubleshooting

### Connection Failed

**Symptom:** `⚠️ Email provider connection test failed`

**Solutions:**
1. Check your internet connection
2. Verify `MAIL_USER` and `MAIL_PASSWORD` are correct
3. For Brevo/SendGrid: Make sure API key is still valid
4. For Gmail: Regenerate app password if needed
5. Restart backend: `docker-compose restart backend`

### Authentication Failed

**Symptom:** `Error: Invalid login` or `Authentication failed`

**Solutions:**
1. **Brevo:** Use your login email as `MAIL_USER`, not "apikey"
2. **SendGrid:** Use literal string `"apikey"` as `MAIL_USER`
3. **Gmail:** Use 16-character app password, not Gmail password
4. Double-check for typos in credentials

### Emails Not Being Received

**Symptom:** No error but emails don't arrive

**Solutions:**
1. Check spam/junk folder
2. Verify sender email is correct
3. For production: Verify your domain with the provider
4. Check provider dashboard for delivery logs
5. For Mailpit: Check http://localhost:8025

### Rate Limit Exceeded

**Symptom:** `Error: Daily sending quota exceeded`

**Solutions:**
1. **Brevo free tier:** 300 emails/day
2. **SendGrid free tier:** 100 emails/day
3. **Gmail:** 500 emails/day
4. Upgrade to paid plan or switch providers
5. Implement email queuing/batching

---

## Production Checklist

Before going to production:

- [ ] Switch from Mailpit to Brevo/SendGrid/Gmail
- [ ] Set `MAIL_PROVIDER` environment variable
- [ ] Configure `MAIL_USER` and `MAIL_PASSWORD`
- [ ] Set appropriate `MAIL_FROM_NAME` and `MAIL_FROM_EMAIL`
- [ ] Verify sender domain with your provider (recommended)
- [ ] Test email delivery to real addresses
- [ ] Check spam score (use mail-tester.com)
- [ ] Monitor email logs for first few days
- [ ] Set up DKIM and SPF records for your domain

---

## Architecture Details

### How It Works

The application uses the **Strategy Pattern** with a **Factory**:

1. **Abstract Base Class:** `BaseEmailProvider`
   - Defines the contract for all providers
   - Handles common logic (initialization, connection testing)

2. **Concrete Implementations:**
   - `BrevoEmailProvider`
   - `MailpitEmailProvider`
   - `SendGridEmailProvider`
   - `GmailEmailProvider`

3. **Factory:** `EmailProviderFactory`
   - Creates the appropriate provider based on `MAIL_PROVIDER`
   - Validates provider configuration
   - Returns initialized provider instance

4. **Email Service:** `EmailService`
   - Uses the factory to create a provider
   - Calls provider methods to send emails
   - Handles template rendering and logging

### File Structure

```
backend/src/common/email/
├── providers/
│   ├── base-email.provider.ts        # Abstract base class
│   ├── brevo.provider.ts             # Brevo implementation
│   ├── mailpit.provider.ts           # Mailpit implementation
│   ├── sendgrid.provider.ts          # SendGrid implementation
│   ├── gmail.provider.ts             # Gmail implementation
│   ├── email-provider.factory.ts     # Factory pattern
│   └── index.ts                      # Barrel exports
├── services/
│   └── email.service.ts              # Main email service
└── templates/
    ├── rent-due-soon.mjml            # Rent reminder template
    ├── rent-overdue.mjml             # Overdue notice template
    ├── tenant-welcome.mjml           # Welcome email template
    └── payment-receipt.mjml          # Receipt template
```

---

## Adding New Providers

Want to add a new email provider? Follow these steps:

1. **Create Provider Class:**

   ```typescript
   // src/common/email/providers/newprovider.provider.ts
   import { BaseEmailProvider, SMTPConfig } from './base-email.provider';

   export class NewProviderEmailProvider extends BaseEmailProvider {
     readonly name = 'New Provider';
     readonly freeLimit = '1000 emails/day';
     readonly documentation = 'https://docs.newprovider.com';

     protected getSmtpConfig(user: string, password: string): SMTPConfig {
       return {
         host: 'smtp.newprovider.com',
         port: 587,
         secure: false,
         auth: { user, pass: password },
       };
     }

     validate(): { valid: boolean; errors: string[] } {
       const errors: string[] = [];

       if (!process.env.MAIL_USER) {
         errors.push('MAIL_USER is required');
       }

       if (!process.env.MAIL_PASSWORD) {
         errors.push('MAIL_PASSWORD is required');
       }

       return { valid: errors.length === 0, errors };
     }
   }
   ```

2. **Update Factory:**

   ```typescript
   // src/common/email/providers/email-provider.factory.ts
   import { NewProviderEmailProvider } from './newprovider.provider';

   export type EmailProviderType =
     | 'mailpit'
     | 'brevo'
     | 'sendgrid'
     | 'gmail'
     | 'newprovider';  // Add here

   // In the create() method switch statement:
   case 'newprovider':
     provider = new NewProviderEmailProvider();
     break;
   ```

3. **Export Provider:**

   ```typescript
   // src/common/email/providers/index.ts
   export * from './newprovider.provider';
   ```

4. **Update Documentation:** Add setup instructions to this file

5. **Test:** Build, restart, and verify

---

## Support

If you encounter issues not covered in this guide:

1. Check application logs: `docker logs apartment-backend`
2. Check provider dashboard for error messages
3. Review provider documentation
4. Contact support or create an issue

**Provider Documentation:**
- Brevo: https://developers.brevo.com/
- SendGrid: https://docs.sendgrid.com/
- Gmail: https://support.google.com/mail/answer/7126229
- Mailpit: https://github.com/axllent/mailpit

---

## Summary

**For Development:**
- Use **Mailpit** (default, no setup needed)
- Access web UI at http://localhost:8025

**For Production:**
- Use **Brevo** (recommended, 300 emails/day free)
- Or use **SendGrid** (100 emails/day free)
- Set environment variables and restart

**Switching Providers:**
- Change `MAIL_PROVIDER` in `.env`
- Update `MAIL_USER` and `MAIL_PASSWORD`
- Restart backend

It's that simple!
