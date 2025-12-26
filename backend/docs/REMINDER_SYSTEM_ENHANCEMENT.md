# Reminder System Enhancement - Implementation Plan

## Overview

Transform the reminder system into a fully configurable, production-ready feature with:
- ✅ Configurable cron schedules
- ✅ Manual trigger capabilities
- ✅ Queue-based email delivery (already implemented with BullMQ)
- ✅ Admin settings management
- ✅ Enhanced features and best practices

---

## 1. Configurable Settings (What to Include)

### A. Reminder Timing Configuration

#### **Due Soon Reminders**
```typescript
dueSoonReminder: {
  enabled: boolean;                    // Enable/disable this reminder type
  daysBeforeDue: number;              // Days before due date (default: 3)
  sendTime: string;                   // Time to send "09:00" (24h format)
  cronSchedule: string;               // Cron expression (auto-generated or custom)
  skipWeekends: boolean;              // Skip Saturday/Sunday
  skipHolidays: boolean;              // Skip configured holidays
}
```

**Examples:**
- Send 3 days before due date at 9:00 AM
- Send 7 days before due date at 8:00 AM
- Send both 7 days and 3 days before (multiple reminders)

#### **Overdue Reminders**
```typescript
overdueReminder: {
  enabled: boolean;
  escalationLevels: [
    {
      daysAfterDue: number;           // 1, 3, 7, 14, 30 days
      sendTime: string;               // "10:00"
      templateType: string;           // 'gentle', 'firm', 'urgent', 'legal'
      enabled: boolean;
    }
  ];
  cronSchedule: string;
  maxEscalations: number;             // Stop after X reminders
  stopIfPaid: boolean;                // Auto-stop when invoice is paid
}
```

**Examples:**
- Day 1: Gentle reminder "Payment is now overdue"
- Day 3: Firm reminder "Please pay immediately"
- Day 7: Urgent reminder "Late fees may apply"
- Day 14: Legal notice "Account will be sent to collections"

#### **Welcome Messages**
```typescript
welcomeMessage: {
  enabled: boolean;
  sendOn: string;                     // 'move_in_date' | 'lease_start' | 'immediate'
  sendTime: string;                   // "09:00"
  includeDocuments: boolean;          // Attach lease PDF, rules, etc.
}
```

#### **Payment Receipts**
```typescript
paymentReceipt: {
  enabled: boolean;
  sendImmediately: boolean;           // Send as soon as payment recorded
  includeInvoiceDetails: boolean;
  includeTaxBreakdown: boolean;
}
```

### B. Email Configuration

```typescript
emailSettings: {
  fromName: string;                   // "Apartment Management"
  fromEmail: string;                  // "noreply@apartment.app"
  replyToEmail: string;               // "support@apartment.app"

  // Oversight
  bccAllReminders: string[];          // ["admin@apartment.app"]
  notifyAdminOnFailure: boolean;

  // Branding
  companyLogo: string;                // URL to logo
  emailSignature: string;             // HTML signature
  footerText: string;                 // "© 2025 Your Company"

  // Behavior
  maxRetriesOnFailure: number;        // 3 attempts
  retryDelayMinutes: number;          // 30 minutes between retries
}
```

### C. Queue & Performance Settings

```typescript
queueSettings: {
  enabled: boolean;                   // Use queue (should always be true)

  // Rate Limiting (respect Brevo's 300/day limit)
  maxEmailsPerHour: number;           // 50 emails/hour
  maxEmailsPerDay: number;            // 250 (buffer under 300)
  batchSize: number;                  // 10 emails per batch
  delayBetweenBatches: number;        // 60 seconds

  // Priority
  priorityLevels: {
    urgent: number;                   // 1 (highest)
    normal: number;                   // 5
    low: number;                      // 10
  };

  // Monitoring
  alertOnQueueBacklog: boolean;
  backlogThreshold: number;           // 100 pending jobs
}
```

### D. Business Rules

```typescript
businessRules: {
  // Automatic pausing
  pauseDuringHolidays: boolean;
  holidays: Date[];                   // ["2025-12-25", "2025-01-01"]
  pauseOnWeekends: boolean;

  // Smart sending
  skipIfPaid: boolean;                // Don't send reminders if invoice paid
  skipIfPartiallyPaid: boolean;       // Skip if >50% paid

  // Grace period
  gracePeriodDays: number;            // 2 days grace before overdue

  // Tenant preferences
  respectTenantPreferences: boolean;  // Let tenants opt-out of certain types
  allowTenantOptOut: boolean;

  // Compliance
  includeUnsubscribeLink: boolean;
  includeCompanyAddress: boolean;     // Legal requirement in some regions
  gdprCompliant: boolean;
}
```

### E. Templates Configuration

```typescript
templates: {
  dueSoon: {
    enabled: boolean;
    subject: string;                  // With variables: "Rent Due Soon - {{unitNumber}}"
    template: string;                 // Template file name
    customVariables: object;          // Additional data for template
  };
  overdue: {
    levels: {
      gentle: { subject: string; template: string; };
      firm: { subject: string; template: string; };
      urgent: { subject: string; template: string; };
      legal: { subject: string; template: string; };
    };
  };
  // ... similar for other types
}
```

---

## 2. Additional Features (Recommended)

### A. Reminder History & Audit Log ✅

**Purpose:** Track all sent reminders for compliance and debugging

```typescript
ReminderLog {
  id: string;
  reminderId: string;
  status: 'sent' | 'failed' | 'bounced' | 'opened' | 'clicked';
  sentAt: Date;
  failureReason?: string;
  emailProvider: string;              // 'brevo'
  messageId: string;                  // Provider's message ID
  recipient: string;
  subject: string;
  attempts: number;                   // Retry count
  metadata: object;                   // Full context
}
```

**Features:**
- View all reminders sent to a tenant
- Filter by status, date, type
- Export to CSV for reporting
- Track delivery/open rates (if provider supports)

### B. Preview Before Send ✅

**Purpose:** Let admins preview the email before sending

**Implementation:**
```typescript
POST /api/reminders/preview
Body: {
  type: 'DUE_SOON',
  invoiceId: '123',
  tenantId: '456'
}

Response: {
  subject: "Rent Due Soon - Unit 101",
  htmlPreview: "...",  // Rendered HTML
  textPreview: "...",  // Plain text version
  recipients: ["tenant@example.com"],
  variables: { ... }   // Data used in template
}
```

### C. Batch Operations ✅

**Purpose:** Send reminders to multiple tenants at once

**Use Cases:**
- Send rent reminders to all tenants at once
- Send seasonal notices (holiday closures, maintenance)
- Emergency notifications

**Implementation:**
```typescript
POST /api/reminders/batch/send-due-soon
Body: {
  criteria: {
    daysUntilDue: 3,
    propertyId?: '123',    // Optional: specific property
    status: 'active'       // Only active leases
  },
  dryRun: boolean          // Preview who will receive
}

Response: {
  totalRecipients: 25,
  estimatedSendTime: "10 minutes",
  recipients: [...]        // List of tenants
}
```

### D. Smart Scheduling ✅

**Purpose:** Optimize send times for better engagement

**Features:**
- **Send Time Optimization:** Send at times when emails are more likely to be opened
  - Weekday mornings (9-11 AM) for business
  - Avoid late nights, early mornings

- **Timezone Awareness:** Send at 9 AM in tenant's timezone (if multi-timezone)

- **Rate Limiting:** Respect provider limits (300/day for Brevo)
  - Queue emails if limit reached
  - Spread sends throughout the day

### E. Escalation Workflows ✅

**Purpose:** Automatically escalate based on payment status

**Example Workflow:**
```
Day 0: Invoice due
Day 1: Gentle reminder (email)
Day 3: Firm reminder (email) + notification to property manager
Day 7: Urgent reminder (email) + SMS (optional) + add late fee
Day 14: Legal notice (email) + CC property manager
Day 30: Send to collections (manual approval required)
```

### F. Tenant Communication Portal (Future) 🔮

**Purpose:** Let tenants manage their notification preferences

**Features:**
- Opt-in/out of reminder types
- Preferred contact method (email/SMS)
- Preferred send times
- Snooze reminders (delay by 1 day)

### G. Analytics Dashboard 📊

**Purpose:** Track reminder effectiveness

**Metrics:**
- **Delivery Rate:** % of emails successfully delivered
- **Open Rate:** % of emails opened (if provider supports)
- **Response Rate:** % of tenants who paid after reminder
- **Time to Payment:** Avg days from reminder to payment
- **Most Effective Time:** Which send times get best results
- **Template Performance:** Which templates perform best

### H. Multi-Channel Support (Future) 🔮

**Purpose:** Reach tenants through multiple channels

**Channels:**
- ✅ Email (current)
- 📱 SMS (via Twilio/Brevo SMS)
- 🔔 In-app notifications
- 📞 Voice calls (for critical notices)
- 📬 Physical mail (for legal notices)

**Priority Fallback:**
```
1. Try email first
2. If bounced → try SMS
3. If no response in 24h → in-app notification
4. If still no response → escalate to property manager
```

---

## 3. Database Schema

### Settings Table

```typescript
@Entity('reminder_settings')
export class ReminderSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  companyId: string;

  // Due Soon Settings
  @Column({ type: 'json' })
  dueSoonConfig: {
    enabled: boolean;
    daysBeforeDue: number;
    sendTime: string;
    skipWeekends: boolean;
    skipHolidays: boolean;
  };

  // Overdue Settings
  @Column({ type: 'json' })
  overdueConfig: {
    enabled: boolean;
    escalationLevels: Array<{
      daysAfterDue: number;
      sendTime: string;
      templateType: 'gentle' | 'firm' | 'urgent' | 'legal';
      enabled: boolean;
    }>;
    maxEscalations: number;
    stopIfPaid: boolean;
  };

  // Welcome & Receipt Settings
  @Column({ type: 'json' })
  welcomeConfig: { enabled: boolean; sendTime: string; };

  @Column({ type: 'json' })
  receiptConfig: { enabled: boolean; sendImmediately: boolean; };

  // Email Settings
  @Column({ type: 'json' })
  emailSettings: {
    fromName: string;
    fromEmail: string;
    replyToEmail: string;
    bccAllReminders: string[];
    signature: string;
  };

  // Queue Settings
  @Column({ type: 'json' })
  queueSettings: {
    maxEmailsPerDay: number;
    maxEmailsPerHour: number;
    batchSize: number;
  };

  // Business Rules
  @Column({ type: 'json' })
  businessRules: {
    gracePeriodDays: number;
    skipIfPaid: boolean;
    pauseOnWeekends: boolean;
    holidays: string[];
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### Reminder Log Table

```typescript
@Entity('reminder_logs')
export class ReminderLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  companyId: string;

  @Column()
  reminderId: string;

  @Column()
  type: ReminderType;

  @Column()
  status: 'queued' | 'sent' | 'failed' | 'bounced';

  @Column({ nullable: true })
  messageId: string;

  @Column()
  recipient: string;

  @Column({ nullable: true })
  failureReason: string;

  @Column({ default: 0 })
  attempts: number;

  @Column({ type: 'json' })
  metadata: object;

  @Column()
  queuedAt: Date;

  @Column({ nullable: true })
  sentAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
```

---

## 4. API Endpoints

### Settings Management

```typescript
// Get company reminder settings
GET /api/settings/reminders

// Update reminder settings
PUT /api/settings/reminders
Body: { dueSoonConfig: {...}, overdueConfig: {...}, ... }

// Reset to defaults
POST /api/settings/reminders/reset

// Test configuration (send test email)
POST /api/settings/reminders/test
Body: { type: 'DUE_SOON', recipient: 'test@example.com' }
```

### Manual Reminder Operations

```typescript
// Send specific reminder manually
POST /api/reminders/:id/send
Response: { success: true, messageId: '...' }

// Preview reminder before sending
POST /api/reminders/:id/preview
Response: { subject: '...', html: '...', text: '...' }

// Retry failed reminder
POST /api/reminders/:id/retry

// Cancel pending reminder
POST /api/reminders/:id/cancel
```

### Batch Operations

```typescript
// Send reminders to all tenants with due invoices
POST /api/reminders/batch/send-due-soon
Body: { daysBeforeDue: 3, propertyId?: '123', dryRun: false }

// Send reminders to all tenants with overdue invoices
POST /api/reminders/batch/send-overdue
Body: { daysOverdue: [1, 3, 7], propertyId?: '123', dryRun: false }

// Send custom announcement to tenants
POST /api/reminders/batch/announcement
Body: {
  subject: 'Holiday Notice',
  message: '...',
  recipients: { propertyId: '123', status: 'active' }
}
```

### Analytics & Reporting

```typescript
// Get reminder statistics
GET /api/reminders/analytics
Query: { startDate, endDate, type?, status? }
Response: {
  totalSent: 150,
  deliveryRate: 98.5,
  averageResponseTime: '2.3 days',
  byType: { DUE_SOON: 100, OVERDUE: 50 }
}

// Get reminder history for tenant
GET /api/reminders/history/:tenantId

// Export reminder logs
GET /api/reminders/export
Query: { format: 'csv' | 'excel', startDate, endDate }
```

---

## 5. Frontend Implementation

### A. Settings Page (`/settings/reminders`)

**Sections:**

1. **General Settings**
   - Enable/disable reminder system globally
   - Default from email, reply-to email
   - Email signature

2. **Due Soon Reminders**
   - Days before due date: `[3]` (slider or input)
   - Send time: `[09:00]` (time picker)
   - Skip weekends: `[✓]`
   - Preview template button

3. **Overdue Reminders**
   - Escalation levels (table):
     | Days After Due | Send Time | Template | Actions |
     |----------------|-----------|----------|---------|
     | 1              | 10:00     | Gentle   | Edit ✏️  |
     | 3              | 10:00     | Firm     | Edit ✏️  |
     | 7              | 10:00     | Urgent   | Edit ✏️  |
   - Add new level button
   - Max escalations: `[3]`
   - Stop if paid: `[✓]`

4. **Queue & Performance**
   - Max emails per day: `[250]` (with Brevo limit warning)
   - Batch size: `[10]`
   - Rate limiting enabled: `[✓]`

5. **Business Rules**
   - Grace period days: `[2]`
   - Skip if already paid: `[✓]`
   - Holidays calendar picker

6. **Test & Preview**
   - Send test email button
   - Preview templates dropdown

### B. Reminder List Page Updates (`/reminders`)

**Add Actions Column:**

| ID | Type | Tenant | Invoice | Status | Scheduled | Actions |
|----|------|--------|---------|--------|-----------|---------|
| 001 | Due Soon | John Doe | #INV-123 | Pending | 2025-12-28 09:00 | 🔍 Preview • 📤 Send Now • ❌ Cancel |
| 002 | Overdue | Jane Smith | #INV-124 | Sent | 2025-12-26 10:00 | ✉️ Resend • 📊 View Log |

**Actions:**
- **Preview** - Show modal with email preview
- **Send Now** - Immediately send (skip schedule)
- **Cancel** - Remove from queue
- **Resend** - Send again (for failed/bounced)
- **View Log** - Show delivery history

**Filters:**
- Status: All, Pending, Sent, Failed
- Type: All types
- Date range
- Tenant search

### C. Batch Send Modal

**Trigger:** "Send Batch Reminders" button on reminders page

**Modal Content:**
```
┌─────────────────────────────────────┐
│ Send Batch Reminders               │
├─────────────────────────────────────┤
│ Reminder Type: [Due Soon ▼]        │
│ Days Before Due: [3]                │
│                                     │
│ Filters (Optional):                 │
│ Property: [All Properties ▼]       │
│ Status: [Active Only ▼]            │
│                                     │
│ Preview Recipients: [25 tenants]    │
│ Estimated Send Time: 5 minutes      │
│                                     │
│ [Preview List] [Send Reminders]     │
└─────────────────────────────────────┘
```

---

## 6. Queue Confirmation (Already Implemented ✅)

**Yes, emails already use BullMQ queue system!**

**Current Implementation:**
- ✅ Queue: BullMQ with Redis backend
- ✅ Processor: `reminder.processor.ts` handles async email sending
- ✅ Retry logic: Configurable attempts and backoff
- ✅ Job persistence: Failed jobs retained for debugging

**File:** `backend/src/common/queue/processors/reminder.processor.ts`

**How it works:**
1. Reminder is created → Job added to queue
2. Queue processes job asynchronously
3. Email sent via Brevo
4. On failure → retry with exponential backoff
5. After max retries → job marked as failed

**Benefits:**
- ✅ No blocking - API responds immediately
- ✅ Handles email provider downtime gracefully
- ✅ Rate limiting built-in
- ✅ Retry on transient failures
- ✅ Visibility into queue status

**Enhancements Needed:**
- Add rate limiting (respect Brevo's 300/day limit)
- Add priority levels (urgent reminders first)
- Add batch processing for bulk sends
- Add monitoring/alerting on queue backlog

---

## 7. Implementation Phases

### Phase 1: Settings Infrastructure (Week 1)
- ✅ Create settings entity and migration
- ✅ Implement settings service with validation
- ✅ Create settings CRUD endpoints
- ✅ Add default settings seeder
- ✅ Unit tests for settings service

### Phase 2: Dynamic Cron Jobs (Week 1-2)
- ✅ Refactor cron jobs to read from settings
- ✅ Implement timezone handling
- ✅ Add holiday/weekend skip logic
- ✅ Update cron schedules dynamically
- ✅ Add grace period logic

### Phase 3: Manual & Batch Operations (Week 2)
- ✅ Add manual send endpoint
- ✅ Add preview endpoint
- ✅ Implement batch send logic
- ✅ Add dry-run mode for testing
- ✅ Rate limiting for batch operations

### Phase 4: Frontend Settings Page (Week 2-3)
- ✅ Create settings page UI
- ✅ Form with validation
- ✅ Test email functionality
- ✅ Preview templates
- ✅ Save/reset functionality

### Phase 5: Enhanced Reminder List (Week 3)
- ✅ Add action buttons to table
- ✅ Preview modal
- ✅ Send now functionality
- ✅ Cancel/retry actions
- ✅ Filters and search

### Phase 6: Logging & Analytics (Week 3-4)
- ✅ Create reminder log entity
- ✅ Log all sent emails
- ✅ Analytics endpoints
- ✅ Export functionality
- ✅ Dashboard charts

### Phase 7: Advanced Features (Week 4+)
- 🔮 Escalation workflows
- 🔮 Template customization UI
- 🔮 Tenant preference portal
- 🔮 Multi-channel support (SMS)
- 🔮 A/B testing templates

---

## 8. Configuration Examples

### Example 1: Conservative Setup (Small Property)
```json
{
  "dueSoonConfig": {
    "enabled": true,
    "daysBeforeDue": 5,
    "sendTime": "09:00",
    "skipWeekends": true
  },
  "overdueConfig": {
    "enabled": true,
    "escalationLevels": [
      { "daysAfterDue": 1, "sendTime": "10:00", "templateType": "gentle" }
    ],
    "stopIfPaid": true
  },
  "queueSettings": {
    "maxEmailsPerDay": 50
  }
}
```

### Example 2: Aggressive Setup (Large Property)
```json
{
  "dueSoonConfig": {
    "enabled": true,
    "daysBeforeDue": 7,
    "sendTime": "08:00",
    "skipWeekends": false
  },
  "overdueConfig": {
    "enabled": true,
    "escalationLevels": [
      { "daysAfterDue": 1, "sendTime": "09:00", "templateType": "gentle" },
      { "daysAfterDue": 3, "sendTime": "09:00", "templateType": "firm" },
      { "daysAfterDue": 7, "sendTime": "09:00", "templateType": "urgent" },
      { "daysAfterDue": 14, "sendTime": "09:00", "templateType": "legal" }
    ],
    "maxEscalations": 4,
    "stopIfPaid": true
  },
  "queueSettings": {
    "maxEmailsPerDay": 250,
    "batchSize": 25
  }
}
```

---

## 9. Success Metrics

After implementation:

✅ **Configuration Flexibility**
- Admins can change reminder timing without code changes
- Settings persist per company
- Changes take effect immediately

✅ **Operational Efficiency**
- Manual send for urgent cases
- Batch operations for seasonal notices
- Preview before send to avoid mistakes

✅ **Reliability**
- Queue handles Brevo outages gracefully
- Rate limiting prevents hitting provider limits
- Retry logic for transient failures

✅ **Visibility**
- Track all sent reminders
- Know which tenants received which emails
- Analytics on reminder effectiveness

✅ **Compliance**
- Audit trail of all communications
- Respect tenant preferences
- Include unsubscribe links (GDPR)

---

## 10. Recommended Priority

**Must Have (MVP):**
1. ✅ Settings entity and API
2. ✅ Configurable cron timing
3. ✅ Manual send from UI
4. ✅ Preview functionality
5. ✅ Basic logging

**Should Have (Phase 2):**
6. ✅ Batch operations
7. ✅ Escalation levels
8. ✅ Rate limiting
9. ✅ Analytics dashboard
10. ✅ Export logs

**Nice to Have (Future):**
11. 🔮 Template customization UI
12. 🔮 Tenant preference portal
13. 🔮 SMS notifications
14. 🔮 A/B testing
15. 🔮 AI-powered send time optimization

---

## Summary

This plan transforms the reminder system from basic cron jobs to a **production-grade, configurable notification system** with:

- ✅ **Flexibility:** Admins control when, how, and to whom reminders are sent
- ✅ **Reliability:** Queue-based with retries and rate limiting
- ✅ **Visibility:** Full audit trail and analytics
- ✅ **Scalability:** Handles hundreds of properties with thousands of tenants
- ✅ **Compliance:** Logging, opt-out, and legal requirements

**Estimated Timeline:** 3-4 weeks for MVP (Phases 1-5)

**Tech Stack:**
- Backend: NestJS + TypeORM + BullMQ (already in place ✅)
- Queue: Redis + BullMQ (already in place ✅)
- Email: Brevo via nodemailer (already configured ✅)
- Frontend: Next.js + React + shadcn/ui (already in place ✅)

Ready to start implementation? 🚀
