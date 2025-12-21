# Occupancy Management Improvements Plan

**Created**: 2025-12-17
**Status**: In Progress
**Priority**: High

---

## Executive Summary

This document outlines comprehensive improvements to the occupancy management system, focusing on:
- Fixing critical bugs in property filtering
- Enhancing user experience with searchable dropdowns
- Adding detailed views with full context
- Enabling workflow actions from multiple entry points
- Implementing proper lease lifecycle management

---

## Issues Identified

### 🐛 Critical Bugs

#### 1. Property Filter Not Updating Apartment List
- **Location**: `/frontend/src/components/occupancies/occupancy-form-dialog.tsx`
- **Issue**: When selecting a property, the apartment dropdown still shows all apartments instead of filtering by selected property
- **Root Cause**: The "all" value handling and useEffect dependency may not be triggering properly
- **Impact**: Users cannot filter apartments by property when creating occupancies
- **Priority**: P0 - Critical

---

## Planned Improvements

### 🎯 Priority 1: Fix Critical Bug (Immediate)

#### 1.1 Fix Property Filter Bug
- **Files to modify**:
  - `frontend/src/components/occupancies/occupancy-form-dialog.tsx`
- **Changes**:
  - Debug and fix the compound selection → apartment filtering logic
  - Ensure `useEffect` properly triggers when compound changes
  - Verify `fetchApartmentsByCompound()` is called with correct ID
  - Add loading state during apartment refetch
- **Acceptance Criteria**:
  - [ ] Selecting a property filters apartments to only that property
  - [ ] Selecting "All Properties" shows all available apartments
  - [ ] Apartment dropdown updates immediately when property changes
  - [ ] Loading indicator shows during apartment fetch

---

### 🎯 Priority 2: Enhanced UX with Searchable Dropdowns (High Impact)

#### 2.1 Replace Select with Combobox for Tenants
- **Component**: Tenant selection in occupancy form
- **Implementation**:
  - Use Radix UI Command + Popover
  - Add real-time search/filter by name, email, phone
  - Show tenant details in dropdown (name + email)
  - Support keyboard navigation
  - Add "No results" state
- **Files to modify**:
  - `frontend/src/components/occupancies/occupancy-form-dialog.tsx`
  - Create new: `frontend/src/components/ui/combobox.tsx`
- **Acceptance Criteria**:
  - [ ] Type to search tenants by name, email, or phone
  - [ ] Search results update in real-time
  - [ ] Keyboard navigation works (arrow keys, enter, escape)
  - [ ] Shows clear "No tenants found" message
  - [ ] Selected tenant displays properly

#### 2.2 Replace Select with Combobox for Apartments
- **Component**: Apartment selection in occupancy form
- **Implementation**:
  - Use same Combobox component
  - Search by unit number, property name
  - Show apartment details (unit number + property name)
  - Filter by availability status
- **Files to modify**:
  - `frontend/src/components/occupancies/occupancy-form-dialog.tsx`
- **Acceptance Criteria**:
  - [ ] Type to search apartments by unit number or property
  - [ ] Only shows available apartments (or current if editing)
  - [ ] Search results filter properly
  - [ ] Selected apartment displays with property name

#### 2.3 Keep Property as Regular Select
- **Reasoning**: Usually <20 properties, Select is adequate
- **Enhancement**: Add clear "All Properties" option that works correctly

---

### 🎯 Priority 3: Apartment Detail Page Enhancements (Core Workflow)

#### 3.1 Create Comprehensive Apartment Detail Page
- **Route**: `/apartments/[id]`
- **Current State**: Basic details only
- **New Features**:

**A. Current Occupancy Section**
- Show current lease if apartment is occupied:
  - Tenant name, photo, contact info
  - Lease dates (start, end, remaining days)
  - Monthly rent amount
  - Lease status with color-coded badge
  - Quick actions:
    - "View Full Lease Details" → Goes to `/occupancies/[occupancyId]`
    - "End Lease" → Opens end lease dialog
    - "Contact Tenant" → Email/phone actions
- Show availability if vacant:
  - "Available since [date]"
  - Days vacant
  - "Assign Tenant" button → Opens occupancy form with apartment preselected

**B. Occupancy History Section**
- Timeline of past occupancies
- Each entry shows:
  - Tenant name
  - Lease period
  - Monthly rent
  - Status (completed/cancelled)
  - Link to view details

**C. Apartment Details Card**
- Unit information (bedrooms, bathrooms, size)
- Property/compound name
- Amenities list
- Monthly rent (default)
- Status indicator
- Edit button (for admin/owner)

**D. Financial Summary Card**
- Total revenue from this unit (all time)
- Current monthly revenue (if occupied)
- Average occupancy rate
- Total days rented vs vacant

- **Files to create/modify**:
  - `frontend/src/app/(dashboard)/apartments/[id]/page.tsx` (enhance existing)
  - `frontend/src/components/apartments/apartment-occupancy-card.tsx` (new)
  - `frontend/src/components/apartments/apartment-history-timeline.tsx` (new)
  - `frontend/src/components/apartments/quick-assign-dialog.tsx` (new)

- **Backend endpoints needed**:
  - `GET /api/v1/apartments/:id/current-occupancy` (new)
  - `GET /api/v1/apartments/:id/occupancy-history` (new)
  - `GET /api/v1/apartments/:id/financial-summary` (new)

- **Acceptance Criteria**:
  - [ ] View current tenant and lease details if occupied
  - [ ] See availability status if vacant
  - [ ] Quick "Assign Tenant" from apartment page
  - [ ] Quick "End Lease" with confirmation dialog
  - [ ] View complete occupancy history
  - [ ] See financial summary for the apartment

---

### 🎯 Priority 4: Occupancy Detail Page (Comprehensive View)

#### 4.1 Create Full Occupancy Detail Page
- **Route**: `/occupancies/[id]`
- **Purpose**: Single source of truth for lease information

**A. Lease Overview Section**
- Header with occupancy status badge
- Key information at a glance:
  - Lease period with progress bar
  - Days remaining/elapsed
  - Status timeline
  - Monthly rent amount

**B. Apartment Information Card**
- Unit number and property name
- Link to apartment detail page
- Bedrooms, bathrooms, size
- Amenities
- Monthly rent (base)
- Current status

**C. Tenant Information Card**
- Full name with avatar
- Link to tenant detail page
- Contact information (email, phone)
- Emergency contact details
- Employer information
- ID number

**D. Financial Details Section**
- Lease terms:
  - Monthly rent
  - Security deposit (required vs paid)
  - Deposit status
- Payment summary:
  - Total amount due (lease duration × monthly rent)
  - Total paid to date
  - Outstanding balance
  - Linked invoices (table)
  - Linked payments (table)
- Actions:
  - "Generate Invoice" button
  - "Record Payment" button

**E. Important Dates Card**
- Lease start date
- Lease end date
- Move-in date (actual)
- Move-out date (if ended)
- Created date
- Last modified date

**F. Lease Lifecycle Actions**
- Status-dependent actions:
  - **Pending**: "Activate Lease", "Cancel Lease"
  - **Active**: "End Lease" (move-out), "Edit Lease", "Renew Lease"
  - **Ended**: "View History", "Archive"
  - **Cancelled**: "View Reason", "Archive"
- Each action opens confirmation dialog

**G. Notes & Documents Section**
- Lease notes (editable)
- Attached documents:
  - Signed lease agreement
  - Move-in checklist
  - Inspection reports
- File upload capability

**H. Activity Log**
- Timeline of all changes:
  - Status changes
  - Edits made
  - Payments recorded
  - Invoices generated
  - Documents uploaded
- Each entry shows user, timestamp, action

- **Files to create**:
  - `frontend/src/app/(dashboard)/occupancies/[id]/page.tsx`
  - `frontend/src/components/occupancies/occupancy-detail-header.tsx`
  - `frontend/src/components/occupancies/occupancy-financial-section.tsx`
  - `frontend/src/components/occupancies/occupancy-timeline.tsx`
  - `frontend/src/components/occupancies/end-lease-dialog.tsx`
  - `frontend/src/components/occupancies/renew-lease-dialog.tsx`

- **Backend endpoints needed**:
  - `GET /api/v1/occupancies/:id/full-details` (with all relations)
  - `PATCH /api/v1/occupancies/:id/end` (end lease)
  - `PATCH /api/v1/occupancies/:id/cancel` (cancel lease)
  - `POST /api/v1/occupancies/:id/renew` (renew lease)
  - `GET /api/v1/occupancies/:id/activity-log` (audit trail)

- **Acceptance Criteria**:
  - [ ] View complete lease information
  - [ ] See full apartment and tenant details
  - [ ] Access all related financial records
  - [ ] Perform status-appropriate actions
  - [ ] View complete activity history
  - [ ] Upload and manage documents

---

### 🎯 Priority 5: Tenant Detail Page Enhancements

#### 5.1 Enhance Tenant Detail Page
- **Route**: `/tenants/[id]`
- **Current State**: Basic profile information
- **New Features**:

**A. Current Lease Section**
- If tenant has active lease:
  - Apartment unit and property
  - Lease dates and status
  - Monthly rent
  - Quick action: "View Lease Details"
- If no active lease:
  - "Available for assignment"
  - "Assign to Apartment" button

**B. Lease History Section**
- Timeline of all past and current leases
- Each entry shows:
  - Apartment unit
  - Property name
  - Lease period
  - Status
  - Monthly rent
  - Payment history summary

**C. Financial Overview Card**
- Total paid (all time)
- Current balance
- Payment history
- Average payment timeliness
- Outstanding invoices

**D. Documents Section**
- ID documents
- Contracts
- Reference letters
- Rental history

**E. Contact & Emergency Information**
- Primary contact details
- Emergency contacts
- Employer information
- References

- **Files to create/modify**:
  - `frontend/src/app/(dashboard)/tenants/[id]/page.tsx` (enhance)
  - `frontend/src/components/tenants/tenant-lease-history.tsx` (new)
  - `frontend/src/components/tenants/tenant-financial-summary.tsx` (new)

- **Backend endpoints needed**:
  - `GET /api/v1/tenants/:id/current-occupancy` (new)
  - `GET /api/v1/tenants/:id/financial-summary` (new)

- **Acceptance Criteria**:
  - [ ] View current apartment if tenant has active lease
  - [ ] Quick assign to apartment if available
  - [ ] View complete lease history
  - [ ] Access financial summary
  - [ ] Manage documents

---

## Technical Implementation Details

### Backend Changes Required

#### 1. New Endpoints

```typescript
// Apartment endpoints
GET    /api/v1/apartments/:id/current-occupancy
GET    /api/v1/apartments/:id/occupancy-history
GET    /api/v1/apartments/:id/financial-summary

// Tenant endpoints
GET    /api/v1/tenants/:id/current-occupancy
GET    /api/v1/tenants/:id/occupancy-history
GET    /api/v1/tenants/:id/financial-summary

// Occupancy endpoints
GET    /api/v1/occupancies/:id/full-details
PATCH  /api/v1/occupancies/:id/end
PATCH  /api/v1/occupancies/:id/cancel
POST   /api/v1/occupancies/:id/renew
GET    /api/v1/occupancies/:id/activity-log
POST   /api/v1/occupancies/:id/documents/upload
```

#### 2. Service Layer Enhancements

**ApartmentsService**
- `getCurrentOccupancy(apartmentId, companyId)`
- `getOccupancyHistory(apartmentId, companyId)`
- `getFinancialSummary(apartmentId, companyId)`

**TenantsService**
- `getCurrentOccupancy(tenantId, companyId)`
- `getFinancialSummary(tenantId, companyId)`

**OccupanciesService**
- `getFullDetails(occupancyId, companyId)` - with all relations
- `endLease(occupancyId, companyId, moveOutDate, notes)`
- `cancelLease(occupancyId, companyId, reason)`
- `renewLease(occupancyId, companyId, renewalData)`
- `getActivityLog(occupancyId, companyId)`

#### 3. Business Logic

**Ending a Lease**
- Set occupancy status to 'ended'
- Set moveOutDate
- Set apartment status to 'available'
- Generate final invoice if applicable
- Trigger deposit return workflow
- Create activity log entry

**Cancelling a Lease**
- Set occupancy status to 'cancelled'
- Set apartment status to 'available'
- Record cancellation reason
- Handle deposit return/forfeit
- Create activity log entry

**Renewing a Lease**
- Create new occupancy record
- Link to previous occupancy
- Set new dates
- Optionally update rent
- Keep same apartment and tenant
- Create activity log entry

### Frontend Changes Required

#### 1. New Components

```
frontend/src/components/ui/
├── combobox.tsx                           (searchable dropdown)
└── command.tsx                            (if not exists)

frontend/src/components/occupancies/
├── occupancy-detail-header.tsx
├── occupancy-financial-section.tsx
├── occupancy-timeline.tsx
├── end-lease-dialog.tsx
├── renew-lease-dialog.tsx
└── cancel-lease-dialog.tsx

frontend/src/components/apartments/
├── apartment-occupancy-card.tsx
├── apartment-history-timeline.tsx
├── quick-assign-dialog.tsx
└── apartment-financial-summary.tsx

frontend/src/components/tenants/
├── tenant-lease-history.tsx
├── tenant-financial-summary.tsx
└── quick-assign-button.tsx
```

#### 2. Enhanced Pages

```
frontend/src/app/(dashboard)/
├── occupancies/[id]/page.tsx              (new - detail page)
├── apartments/[id]/page.tsx               (enhance existing)
└── tenants/[id]/page.tsx                  (enhance existing)
```

#### 3. Service Updates

```typescript
// occupancies.service.ts
getFullDetails(id: string)
endLease(id: string, data: EndLeaseDto)
cancelLease(id: string, data: CancelLeaseDto)
renewLease(id: string, data: RenewLeaseDto)
getActivityLog(id: string)
uploadDocument(id: string, file: File)

// apartments.service.ts
getCurrentOccupancy(id: string)
getOccupancyHistory(id: string)
getFinancialSummary(id: string)

// tenants.service.ts
getCurrentOccupancy(id: string)
getFinancialSummary(id: string)
```

---

## Data Flow & State Management

### 1. Occupancy Lifecycle States

```
pending → active → ended
    ↓        ↓
cancelled  cancelled
```

**State Transitions**:
- `pending → active`: When move-in happens
- `pending → cancelled`: If tenant doesn't move in
- `active → ended`: Normal lease completion
- `active → cancelled`: Early termination
- `ended → [new pending]`: Renewal (creates new record)

### 2. Apartment Status Sync

**Rules**:
- When occupancy is `active` → apartment is `occupied`
- When occupancy is `ended` or `cancelled` → apartment is `available`
- When occupancy is `pending` → apartment can be `reserved`

**Implementation**:
- Use database triggers or event listeners
- Update apartment status automatically on occupancy status change
- Add validation to prevent multiple active occupancies

### 3. Cache Invalidation Strategy

**When occupancy changes**:
- Invalidate: apartment details cache
- Invalidate: tenant details cache
- Invalidate: occupancy stats cache
- Invalidate: dashboard stats cache
- Refresh: relevant lists

---

## Validation Rules

### 1. Assignment Validations

**Before creating occupancy**:
- [ ] Apartment must be 'available' or 'reserved'
- [ ] Tenant must not have another active lease
- [ ] Tenant must be 'active' status (not blacklisted)
- [ ] Lease end date must be after start date
- [ ] No overlapping leases for same apartment
- [ ] Move-in date must be between start and end dates

### 2. End Lease Validations

**Before ending lease**:
- [ ] Occupancy must be 'active'
- [ ] Move-out date must be >= lease start date
- [ ] Must specify move-out date
- [ ] Handle deposit return process
- [ ] Check for unpaid invoices (warn user)

### 3. Cancel Lease Validations

**Before cancelling**:
- [ ] Can only cancel 'pending' or 'active' leases
- [ ] Must provide cancellation reason
- [ ] Handle deposit refund/forfeit rules
- [ ] Update any generated invoices

### 4. Renew Lease Validations

**Before renewal**:
- [ ] Original lease must be 'active' or 'ended'
- [ ] New start date should be close to original end date
- [ ] Tenant must still be active
- [ ] Apartment must still exist and be available (if ended)
- [ ] No conflicts with other leases

---

## User Experience Considerations

### 1. Loading States

**Add spinners/skeletons for**:
- Fetching apartment list when property changes
- Loading occupancy details
- Loading tenant/apartment history
- Submitting forms (assign, end, cancel, renew)

### 2. Error Handling

**Graceful error messages for**:
- Apartment already occupied
- Tenant already has active lease
- Invalid date ranges
- Network errors
- Permission errors

### 3. Confirmation Dialogs

**Require confirmation for**:
- Ending a lease (show impact: apartment becomes available)
- Cancelling a lease (show impact: deposit handling)
- Deleting an occupancy (prevent if has invoices)

### 4. Success Feedback

**Show toast notifications for**:
- Lease created successfully
- Lease ended successfully
- Lease cancelled successfully
- Document uploaded successfully

### 5. Navigation Flow

**Quick navigation between related entities**:
- From occupancy → apartment → property
- From occupancy → tenant → other occupancies
- From apartment → current tenant → tenant detail
- Breadcrumbs on detail pages

---

## Testing Strategy

### 1. Unit Tests

**Backend**:
- [ ] Test occupancy lifecycle transitions
- [ ] Test validation rules
- [ ] Test apartment status updates
- [ ] Test date calculations
- [ ] Test financial summaries

**Frontend**:
- [ ] Test combobox search functionality
- [ ] Test form validations
- [ ] Test status badge displays
- [ ] Test date formatting

### 2. Integration Tests

- [ ] Test full assign tenant flow
- [ ] Test end lease flow with apartment status update
- [ ] Test cancel lease flow
- [ ] Test renewal flow
- [ ] Test property filter → apartment list update

### 3. E2E Tests

- [ ] User can assign tenant to apartment
- [ ] User can end active lease
- [ ] User can view occupancy history
- [ ] Search works in tenant dropdown
- [ ] Property filter updates apartment list

---

## Performance Considerations

### 1. Query Optimization

**Optimize queries for**:
- Occupancy history (paginate if >50 records)
- Financial summaries (use aggregations)
- Search in combobox (debounce + server-side filter)
- Activity logs (paginate)

### 2. Caching Strategy

**Cache these endpoints**:
- Apartment list (5 min TTL)
- Tenant list (5 min TTL)
- Property list (15 min TTL)
- Occupancy stats (1 min TTL)

**Invalidate cache when**:
- New occupancy created
- Occupancy status changes
- Apartment details updated
- Tenant details updated

### 3. Pagination

**Implement pagination for**:
- Occupancy history (10 per page)
- Activity logs (20 per page)
- Invoice list in occupancy details (10 per page)
- Payment list in occupancy details (10 per page)

---

## Security Considerations

### 1. Authorization

**Verify user has permission to**:
- View occupancy details (same company)
- Create occupancy (OWNER, ADMIN roles)
- End/cancel lease (OWNER, ADMIN roles)
- Delete occupancy (OWNER only)
- View financial data (not AUDITOR in read-only mode)

### 2. Data Validation

**Server-side validation for**:
- All date inputs (prevent past dates for new leases)
- Monetary amounts (prevent negative values)
- User input sanitization
- File uploads (type, size validation)

### 3. Audit Trail

**Log all sensitive actions**:
- Lease created (who, when, details)
- Lease ended (who, when, reason)
- Lease cancelled (who, when, reason)
- Status changes
- Document uploads/deletions

---

## Deployment Plan

### Phase 1: Bug Fixes & Core UX (Week 1)
- [ ] Fix property filter bug
- [ ] Add combobox for tenants
- [ ] Add combobox for apartments
- [ ] Deploy to staging
- [ ] QA testing

### Phase 2: Apartment Enhancements (Week 2)
- [ ] Backend endpoints for apartment occupancy
- [ ] Apartment detail page enhancements
- [ ] Quick assign from apartment page
- [ ] Occupancy history timeline
- [ ] Deploy to staging
- [ ] QA testing

### Phase 3: Occupancy Detail Page (Week 3)
- [ ] Backend endpoints for occupancy details
- [ ] Create occupancy detail page
- [ ] Implement end lease functionality
- [ ] Implement cancel lease functionality
- [ ] Activity log
- [ ] Deploy to staging
- [ ] QA testing

### Phase 4: Tenant Enhancements (Week 4)
- [ ] Backend endpoints for tenant occupancy
- [ ] Tenant detail page enhancements
- [ ] Tenant financial summary
- [ ] Tenant lease history
- [ ] Deploy to staging
- [ ] QA testing

### Phase 5: Advanced Features (Week 5)
- [ ] Lease renewal functionality
- [ ] Document management
- [ ] Advanced financial reporting
- [ ] Final integration testing
- [ ] Deploy to production

---

## Success Metrics

### 1. Bug Fixes
- [ ] Property filter works 100% of the time
- [ ] Zero runtime errors on occupancy page

### 2. User Experience
- [ ] <2 seconds to search and select tenant
- [ ] <3 clicks to assign tenant to apartment
- [ ] <5 seconds to view complete occupancy details

### 3. Functionality
- [ ] Can assign tenant from apartment page
- [ ] Can end lease from occupancy detail page
- [ ] Can view complete lease history
- [ ] Search works for 1000+ tenants/apartments

### 4. Code Quality
- [ ] 80%+ test coverage
- [ ] Zero TypeScript errors
- [ ] Passes all linting rules
- [ ] Proper error handling everywhere

---

## Future Enhancements (Post-MVP)

1. **Automated Lease Renewals**
   - Email reminders 60/30 days before expiry
   - One-click renewal option for tenants
   - Auto-generate renewal paperwork

2. **Digital Signatures**
   - E-signature integration for lease agreements
   - Track signature status

3. **Move-in/Move-out Checklists**
   - Digital inspection forms
   - Photo upload for condition documentation
   - Compare move-in vs move-out

4. **Tenant Portal**
   - Tenants can view their lease details
   - Request maintenance
   - View payment history

5. **Advanced Analytics**
   - Occupancy trends over time
   - Revenue forecasting
   - Tenant retention analysis
   - Average lease duration by property

6. **Bulk Operations**
   - Bulk assign tenants
   - Bulk lease renewals
   - Bulk document generation

---

## Notes & Decisions Log

### Decision 1: Combobox vs Select
**Decision**: Use Combobox for tenants and apartments, keep Select for properties
**Reasoning**: Scalability - tenant/apartment lists can grow to 100s, properties usually <20
**Date**: 2025-12-17

### Decision 2: Separate Detail Pages
**Decision**: Create dedicated detail pages for occupancies instead of modals
**Reasoning**: Too much information to fit in modal, better UX with full page layout
**Date**: 2025-12-17

### Decision 3: Automatic Apartment Status Updates
**Decision**: Update apartment status automatically when occupancy status changes
**Reasoning**: Prevents inconsistent state, reduces manual work
**Date**: 2025-12-17

### Decision 4: Activity Log Implementation
**Decision**: Store activity log in separate table, not as JSON field
**Reasoning**: Better queryability, filtering, and reporting
**Date**: 2025-12-17

---

## Questions & Answers

**Q: Should we allow multiple active leases for one tenant?**
A: No. One tenant can only have one active lease at a time. They can have multiple pending leases though (e.g., future move-in).

**Q: What happens to invoices when a lease is cancelled?**
A: Mark related invoices as cancelled, but don't delete them for audit purposes.

**Q: Can users delete occupancies?**
A: Only OWNER role can delete, and only if no invoices/payments exist. Otherwise, soft delete (set isActive=false).

**Q: How to handle lease renewals for rent increases?**
A: Create new occupancy record with new rent, link to previous occupancy via `previousOccupancyId` field.

---

## Appendix: Database Schema Changes

### New Fields

**occupancies table**:
- `previousOccupancyId` (UUID, nullable) - for tracking renewals
- `cancellationReason` (TEXT, nullable) - why lease was cancelled
- `depositReturnDate` (DATE, nullable) - when deposit was returned
- `depositReturnAmount` (DECIMAL, nullable) - amount returned

**New table: occupancy_activity_logs**:
```sql
CREATE TABLE occupancy_activity_logs (
  id UUID PRIMARY KEY,
  occupancy_id UUID NOT NULL REFERENCES occupancies(id),
  user_id UUID NOT NULL REFERENCES users(id),
  action VARCHAR(50) NOT NULL, -- 'created', 'status_changed', 'ended', etc.
  details JSONB, -- additional context
  created_at TIMESTAMP DEFAULT NOW()
);
```

**New table: occupancy_documents**:
```sql
CREATE TABLE occupancy_documents (
  id UUID PRIMARY KEY,
  occupancy_id UUID NOT NULL REFERENCES occupancies(id),
  document_type VARCHAR(50) NOT NULL, -- 'lease_agreement', 'move_in_checklist', etc.
  file_name VARCHAR(255) NOT NULL,
  file_url VARCHAR(500) NOT NULL,
  file_size INTEGER,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  uploaded_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);
```

---

**End of Document**

*This is a living document and will be updated as implementation progresses.*
