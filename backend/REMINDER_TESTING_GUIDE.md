# Reminder System - Testing & Validation Guide

## Overview

This guide explains how to test and validate the Reminder system end-to-end, including:
- Manual testing of reminder creation and sending
- Simulating cron jobs without waiting for scheduled times
- Testing email templates with sample data
- Validating the complete workflow from creation to delivery

---

## Prerequisites

1. **Backend running** on http://localhost:3000
2. **Authentication token** - Login to get JWT token
3. **SMTP configured** - Check `.env` for email settings:
   ```
   SMTP_HOST=your-smtp-host
   SMTP_PORT=587
   SMTP_USER=your-email
   SMTP_PASS=your-password
   SMTP_FROM=noreply@example.com
   ```
4. **Redis running** - Required for BullMQ queue
5. **API client** - Postman, Insomnia, or curl

---

## 1. Testing Endpoints

### 1.1 Simulate Test Reminder (Quickest Test)

**Endpoint:** `POST /api/v1/reminders/test/simulate`

**Purpose:** Creates a test reminder with sample data and sends it immediately.

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Body:**
```json
{
  "type": "DUE_SOON",
  "recipient": "your-email@example.com"
}
```

**Available Types:**
- `DUE_SOON` - Tests rent due soon template
- `OVERDUE` - Tests overdue payment template
- `WELCOME` - Tests welcome message template
- `RECEIPT` - Tests payment receipt template

**Response:**
```json
{
  "message": "Test reminder created and queued for immediate sending",
  "reminder": {
    "id": "uuid-here",
    "companyId": "your-company-id",
    "type": "DUE_SOON",
    "subject": "TEST: Rent Due Soon - Unit 101",
    "recipient": "your-email@example.com",
    "status": "PENDING",
    "scheduledFor": "2025-12-26T09:00:00.000Z",
    "metadata": {
      "templateName": "rent-due-soon",
      "tenantName": "Test Tenant",
      "unitNumber": "101",
      "amount": "1500.00",
      "dueDate": "12/29/2025",
      "paymentUrl": "https://example.com/invoices/test",
      "year": 2025
    }
  },
  "recipient": "your-email@example.com",
  "type": "DUE_SOON"
}
```

**What Happens:**
1. Creates a test reminder in the database
2. Queues it to BullMQ with 0 delay (immediate)
3. Reminder processor picks it up within seconds
4. Email sent using the MJML template
5. Check your email inbox for the test email

---

### 1.2 Force Send Existing Reminder

**Endpoint:** `POST /api/v1/reminders/:id/send-now`

**Purpose:** Force an existing reminder to send immediately, bypassing scheduled delay.

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/v1/reminders/abc-123-def/send-now \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Use Case:** You created a reminder scheduled for tomorrow but want to test it now.

---

### 1.3 Test Due Invoices Cron Job

**Endpoint:** `POST /api/v1/reminders/test/cron-due-soon`

**Purpose:** Manually trigger the cron job that checks for invoices due in 3 days.

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/v1/reminders/test/cron-due-soon \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "message": "Due invoices cron job executed successfully",
  "timestamp": "2025-12-26T09:00:00.000Z"
}
```

**What It Does:**
1. Queries database for invoices with status='sent' and dueDate within 3 days
2. For each invoice found, creates a DUE_SOON reminder
3. Reminders are queued and sent automatically
4. Checks backend logs for: `Found X invoices due soon`

**Configuration:**
- Days threshold: `REMINDER_DUE_SOON_DAYS` (default: 3)
- Schedule: `REMINDER_DUE_SOON_CRON` or daily at 8 AM

---

### 1.4 Test Overdue Invoices Cron Job

**Endpoint:** `POST /api/v1/reminders/test/cron-overdue`

**Purpose:** Manually trigger the cron job that checks for overdue invoices.

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/v1/reminders/test/cron-overdue \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**What It Does:**
1. Queries database for invoices with status='overdue' and dueDate < today
2. For each invoice, checks if last OVERDUE reminder was sent > 7 days ago
3. Creates new OVERDUE reminders only if interval passed
4. Reminders are queued and sent automatically

**Configuration:**
- Repeat interval: `REMINDER_OVERDUE_INTERVAL_DAYS` (default: 7)
- Schedule: `REMINDER_OVERDUE_CRON` or daily at 9 AM

---

## 2. Validation Checklist

### Email Delivery Validation

1. **Check Email Inbox:**
   - Subject line matches reminder type
   - Email renders correctly (MJML template)
   - All placeholders replaced with actual data
   - Links/buttons work correctly

2. **Check Database:**
   ```sql
   SELECT * FROM reminders
   WHERE recipient = 'your-email@example.com'
   ORDER BY created_at DESC
   LIMIT 10;
   ```
   - Status should change from `PENDING` → `SENT`
   - `sent_at` timestamp should be populated
   - `error_message` should be NULL

3. **Check Backend Logs:**
   ```bash
   docker logs apartment-backend --tail 100 -f
   ```
   Look for:
   - `Processing reminder job {job-id}: DUE_SOON`
   - `Sending due soon reminder for invoice {invoice-id}`
   - `Reminder job {job-id} completed successfully`
   - NO errors like "Reminder job failed"

4. **Check Redis Queue (Optional):**
   ```bash
   docker exec -it apartment-redis redis-cli
   > KEYS bull:reminders:*
   > LRANGE bull:reminders:waiting 0 -1
   > LRANGE bull:reminders:completed 0 -1
   ```

---

### Cron Job Validation

**Setup Test Data:**
```sql
-- Create an invoice due in 2 days (will trigger DUE_SOON)
UPDATE invoices
SET due_date = DATE_ADD(NOW(), INTERVAL 2 DAY),
    status = 'sent'
WHERE id = 'your-invoice-id';

-- Create an overdue invoice (will trigger OVERDUE)
UPDATE invoices
SET due_date = DATE_SUB(NOW(), INTERVAL 5 DAY),
    status = 'overdue'
WHERE id = 'your-invoice-id';
```

**Test:**
1. Call `POST /api/v1/reminders/test/cron-due-soon`
2. Check logs: `Found 1 invoices due soon`
3. Check reminders table: New reminder created with type=`DUE_SOON`
4. Wait 5-10 seconds, check email inbox
5. Repeat for overdue cron

---

## 3. Complete Workflow Test

### Scenario: New Tenant Welcome Email

**Step 1: Create Tenant via API/UI**

**Step 2: Send Welcome Reminder**
```bash
curl -X POST http://localhost:3000/api/v1/reminders/welcome/{tenantId} \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"apartmentCode": "101"}'
```

**Step 3: Verify**
- Check reminder created in database
- Check email received
- Verify template rendering (tenant name, unit, move-in date)

---

### Scenario: Payment Receipt Email

**Step 1: Record Payment via API/UI**

**Step 2: Send Receipt**
```bash
curl -X POST http://localhost:3000/api/v1/reminders/receipt \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "tenant-uuid",
    "invoiceId": "invoice-uuid",
    "amount": 1500,
    "currency": "USD"
  }'
```

**Step 3: Verify**
- Receipt email received
- Payment details correct
- Invoice balance updated

---

## 4. Email Template Testing

All templates are located in `/backend/src/common/email/templates/`:

1. **rent-due-soon.mjml** - Blue theme, friendly reminder
2. **rent-overdue.mjml** - Red theme, urgent notice
3. **tenant-welcome.mjml** - Green theme, welcoming
4. **payment-receipt.mjml** - Blue theme, confirmation

**Test Each Template:**
```bash
# Due Soon
curl -X POST http://localhost:3000/api/v1/reminders/test/simulate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type": "DUE_SOON", "recipient": "your-email@example.com"}'

# Overdue (wait 30 seconds between tests)
curl -X POST http://localhost:3000/api/v1/reminders/test/simulate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type": "OVERDUE", "recipient": "your-email@example.com"}'

# Welcome
curl -X POST http://localhost:3000/api/v1/reminders/test/simulate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type": "WELCOME", "recipient": "your-email@example.com"}'

# Receipt
curl -X POST http://localhost:3000/api/v1/reminders/test/simulate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type": "RECEIPT", "recipient": "your-email@example.com"}'
```

---

## 5. Common Issues & Troubleshooting

### Issue: Emails Not Sending

**Check:**
1. SMTP credentials in `.env` are correct
2. Redis is running: `docker ps | grep redis`
3. Backend logs show queue processing
4. Email service initialized: Check startup logs for `Email service initialized`

**Debug:**
```bash
# Check reminder status
curl http://localhost:3000/api/v1/reminders?status=FAILED \
  -H "Authorization: Bearer YOUR_TOKEN"

# Check error_message column for failures
```

---

### Issue: Cron Jobs Not Running Automatically

**Check:**
1. `@nestjs/schedule` module initialized (should see in startup logs)
2. Cron expressions valid
3. Server timezone correct

**Note:** Cron jobs run automatically, but you can test them manually without waiting.

---

### Issue: Reminders Created But Status Stays PENDING

**Possible Causes:**
1. Queue worker not processing jobs
2. Redis connection issue
3. Email service throwing errors

**Debug:**
```bash
# Check Redis connection
docker exec -it apartment-redis redis-cli ping
# Should return: PONG

# Check queue
docker logs apartment-backend | grep "reminder"

# Force send a pending reminder
curl -X POST http://localhost:3000/api/v1/reminders/{id}/send-now \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 6. Performance Testing

### Test Queue Load

```bash
# Create 10 test reminders rapidly
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/v1/reminders/test/simulate \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"type": "DUE_SOON", "recipient": "your-email@example.com"}' &
done
```

**Expected:** All 10 emails send within 30 seconds.

---

### Test Retry Mechanism

1. Configure invalid SMTP temporarily
2. Create a test reminder
3. Check database: `retry_count` should increment
4. Check `error_message` populated
5. Fix SMTP configuration
6. Reminder should retry and eventually send

---

## 7. API Documentation

All endpoints are documented in Swagger:
- **URL:** http://localhost:3000/api/docs
- **Section:** Reminders → Testing
- Try endpoints directly from Swagger UI

---

## 8. Environment Variables

```env
# Reminder Cron Configuration
REMINDER_DUE_SOON_DAYS=3                # Days before due date to send reminder
REMINDER_DUE_SOON_CRON=0 8 * * *        # Daily at 8 AM
REMINDER_OVERDUE_INTERVAL_DAYS=7        # Send overdue reminder every 7 days
REMINDER_OVERDUE_CRON=0 9 * * *         # Daily at 9 AM

# Queue Configuration
QUEUE_JOB_ATTEMPTS=3                    # Retry failed jobs 3 times
QUEUE_JOB_BACKOFF_DELAY=60000           # 60 seconds between retries
QUEUE_COMPLETED_JOB_AGE=86400           # Keep completed jobs for 24 hours
QUEUE_FAILED_JOB_AGE=604800             # Keep failed jobs for 7 days

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=                         # Optional
REDIS_DB=0                              # Queue uses DB + 1

# Email/SMTP
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@example.com
SMTP_PASS=your-password
SMTP_FROM=noreply@example.com
```

---

## Summary

✅ **Critical Bug Fixed:** Reminder processor now sends emails with complete data
✅ **Email Templates:** All 4 templates created and tested
✅ **Testing Endpoints:** 4 new endpoints for manual testing
✅ **Cron Jobs:** Running automatically at 8 AM and 9 AM daily
✅ **Queue System:** BullMQ processing reminders asynchronously
✅ **Retry Logic:** Exponential backoff with 3 attempts

**Start Testing:**
1. Use `POST /reminders/test/simulate` to send a test email to yourself
2. Check your inbox within 10 seconds
3. Review the rendered template
4. Test all 4 reminder types

**Questions?** Check backend logs with: `docker logs apartment-backend -f`
