# 🛡️ **Apollo.io Integration: Project Management & Coordination Protocol**

## 📍 **Document Purpose**

This document provides **strict guardrails** for any AI agent or developer working on the Apollo.io integration. It ensures continuity, prevents rework, and enables safe rollback if issues arise.

---

## 🎯 **Project State Tracking**

### **Current State: PHASE 1 READY FOR TESTING** ✅
- **Status**: Apollo.io integration code complete, API key configured
- **Last Updated**: 2025-01-05
- **Strategic Plan**: `files/apollo-integration-strategic-plan.md`
- **Next Action**: Test Phase 1 by generating 1 project → Verify contacts → Proceed to Phase 2

### **Implementation Phases Status**

| Phase | Status | Start Date | Completion Date | Blocker |
|-------|--------|------------|-----------------|---------|
| **Phase 0: Planning** | ✅ COMPLETE | - | - | None |
| **Phase 1: Apollo.io Core** | 🟢 READY FOR TESTING | 2025-01-05 | TBD | None - API key configured |
| **Phase 2: 1-Click Introduction** | ⏸️ NOT STARTED | TBD | TBD | Phase 1 testing + approval |
| **Phase 3: Database Optimization** | ⏸️ NOT STARTED | TBD | TBD | Phase 2 dependency |
| **Phase 4: Analytics** | ⏸️ NOT STARTED | TBD | TBD | Phase 3 dependency |

---

## 🔐 **Pre-Implementation Checklist**

### **Before ANY Code Changes:**

- [x] **User approval obtained** for the strategic plan
- [x] **API keys secured**:
  - [x] `APOLLO_API_KEY` added to Supabase secrets
  - [ ] `RESEND_API_KEY` added to Supabase secrets
  - [ ] Keys validated (test API call successful)
- [ ] **Backup created**: Current working state saved/tagged
- [ ] **Database schema reviewed**: Confirm `company_profiles` table structure
- [ ] **Edge function status**: Confirm existing functions are working
- [ ] **Current version tested**: Generate 1 test project to establish baseline

---

## 🚦 **Agent Check-In Protocol**

### **MANDATORY: Every Agent Must Start Here**

When taking over this project, **FIRST** complete this checklist:

#### **Step 1: Read Context**
- [ ] Read `files/apollo-integration-strategic-plan.md` (full strategic plan)
- [ ] Read `files/PROJECT-MANAGEMENT-COORDINATION.md` (this document)
- [ ] Read `IMPLEMENTATION_TRACKER.md` (existing system documentation)

#### **Step 2: Verify Current State**
- [ ] Check Phase Status table above
- [ ] Review last commit/change in version history
- [ ] Confirm which files were last modified
- [ ] Check Supabase secrets exist: `APOLLO_API_KEY`, `RESEND_API_KEY`, `LOVABLE_API_KEY`, `GOOGLE_PLACES_API_KEY`

#### **Step 3: Test Existing System**
- [ ] Run edge function logs for `discover-companies`
- [ ] Generate 1 test project to confirm baseline works
- [ ] Check database: Verify `company_profiles` has recent entries
- [ ] Review ContactTab UI: Confirm current behavior

#### **Step 4: Identify Continuation Point**
- [ ] Which phase are we in? (See Phase Status table)
- [ ] What was the last completed task?
- [ ] Are there any blockers or pending decisions?
- [ ] What is the next specific task?

#### **Step 5: Communicate Before Proceeding**
- [ ] Summarize current state to user
- [ ] Confirm next action aligns with strategic plan
- [ ] Get explicit approval before making changes
- [ ] Document the checkpoint in this file

---

## 🧩 **Phase-Specific Guardrails**

### **Phase 1: Apollo.io Core Integration**

#### **Files to Modify**
1. `supabase/functions/discover-companies/index.ts`

#### **Critical Rules**
- ✅ **DO**: Add Apollo.io interface and search function (lines 20-60)
- ✅ **DO**: Replace Lovable AI contact search (lines 224-289)
- ✅ **DO**: Add fallback if Apollo.io fails (log warning, continue without contact)
- ❌ **DON'T**: Modify `discoverCompaniesForCourse` function logic
- ❌ **DON'T**: Change Google Places API calls
- ❌ **DON'T**: Alter company discovery AI prompt
- ❌ **DON'T**: Modify database schema (company_profiles already has needed columns)

#### **Testing Requirements**
- [ ] Generate 1 project with Apollo.io enabled
- [ ] Verify `company_profiles.contact_email` is populated
- [ ] Check edge function logs for Apollo.io success/failure
- [ ] Confirm processing time < 30 seconds
- [ ] Test fallback: Disable Apollo.io key, confirm function still works

#### **Rollback Trigger**
If ANY of these occur, STOP and ROLLBACK:
- Edge function crashes/500 errors
- No companies returned (existing logic broken)
- Processing time > 2 minutes
- Database writes fail
- Apollo.io returns 401/403 (API key issue)

---

### **Phase 2: 1-Click Introduction System**

#### **Files to Create**
1. `supabase/functions/send-introduction/index.ts` (NEW)
2. `src/components/RequestIntroductionDialog.tsx` (NEW)

#### **Files to Modify**
3. `src/components/project-detail/ContactTab.tsx`
4. `supabase/config.toml`

#### **Critical Rules**
- ✅ **DO**: Hide contact data in ContactTab (replace lines 110-151)
- ✅ **DO**: Add "Request Introduction" button
- ✅ **DO**: Create send-introduction edge function with CORS
- ✅ **DO**: Use Resend API for email sending
- ❌ **DON'T**: Display contact_email, contact_phone, or contact_person in UI
- ❌ **DON'T**: Allow unauthenticated access to send-introduction function
- ❌ **DON'T**: Send emails without rate limiting (max 5 per user per day)
- ❌ **DON'T**: Remove ProposePartnershipDialog (keep for backward compatibility)

#### **Testing Requirements**
- [ ] UI: Verify NO contact data visible in ContactTab
- [ ] UI: Click "Request Introduction" button opens dialog
- [ ] Form: Fill out introduction message (test validation)
- [ ] Email: Check Resend dashboard for delivery
- [ ] Database: Verify `partnership_proposals` row created
- [ ] Edge function: Check logs for successful email send
- [ ] Error handling: Test with missing company_profile_id
- [ ] Authentication: Test without login (should fail)

#### **Rollback Trigger**
If ANY of these occur, STOP and ROLLBACK:
- Contact data exposed in UI
- Emails fail to send (check Resend API key)
- Edge function returns 500 error
- Database insert fails
- Authentication bypass detected
- Email delivery rate < 95%

---

## 🚨 **Failure Mode Analysis & Mitigation**

### **Critical Failure Modes**

| Failure Mode | Probability | Impact | Detection | Mitigation | Rollback Plan |
|--------------|-------------|--------|-----------|------------|---------------|
| **Apollo.io API Key Invalid** | Medium | High | 401/403 error | Fallback to AI contact search | Continue without Apollo |
| **Apollo.io Rate Limit Hit** | Medium | Medium | 429 error | Add 2-second delay between calls | Queue failed requests |
| **Resend API Key Invalid** | Low | High | 401 error | Edge function logs | Disable introduction feature |
| **Email Deliverability < 50%** | Medium | High | Resend dashboard | Check SPF/DKIM records | Notify user to fix DNS |
| **Contact Data Exposed in UI** | Low | CRITICAL | Code review | Immediate hotfix | Revert to previous version |
| **Database Schema Mismatch** | Low | High | Insert fails | Pre-flight schema check | Run migration if needed |
| **Edge Function Timeout** | Medium | Medium | Logs show timeout | Optimize Apollo.io call | Reduce companies per course |
| **Existing Projects Break** | Low | CRITICAL | Test project generation fails | Regression testing | Full rollback to backup |

---

### **Pre-Deployment Checks (MANDATORY)**

Before deploying ANY phase:

#### **Code Quality Checks**
- [ ] No `console.log` statements in production code (use proper logging)
- [ ] All API keys accessed via `Deno.env.get()` (never hardcoded)
- [ ] Error handling exists for ALL external API calls
- [ ] TypeScript types defined for all Apollo.io responses
- [ ] CORS headers included in all edge functions
- [ ] Input validation with Zod schemas for all user inputs

#### **Security Checks**
- [ ] Contact data NEVER passed to frontend
- [ ] Authentication required for send-introduction function
- [ ] Rate limiting implemented (5 introductions per user per day)
- [ ] SQL injection prevented (use Supabase SDK, not raw SQL)
- [ ] XSS prevention (sanitize user inputs in emails)

#### **Performance Checks**
- [ ] Edge function completes in < 30 seconds
- [ ] Database queries use proper indexes
- [ ] No N+1 query patterns
- [ ] Apollo.io calls are sequential, not parallel (avoid rate limits)

#### **Regression Checks**
- [ ] Generate 1 test project with NEW code
- [ ] Compare output to baseline project (before changes)
- [ ] Verify all existing tabs still work (Overview, Academic, Timeline, etc.)
- [ ] Check that old projects still load correctly
- [ ] Confirm no database migration errors

---

## 🔄 **Rollback Procedures**

### **Level 1: Single File Rollback** (Low Risk)
**When to use**: UI component has bug, edge function logic error

**Steps**:
1. Identify problematic file from version history
2. Use Lovable "Revert" button on that specific edit
3. Test immediately with 1 project generation
4. Document issue in this file

### **Level 2: Phase Rollback** (Medium Risk)
**When to use**: Multiple files broken, feature not working

**Steps**:
1. Identify last working state before phase started
2. Revert ALL files modified in that phase
3. Remove any new edge functions from `config.toml`
4. Test baseline functionality
5. Root cause analysis before re-attempting

### **Level 3: Full Rollback** (High Risk)
**When to use**: Database corruption, critical security issue, system-wide failure

**Steps**:
1. **STOP ALL WORK IMMEDIATELY**
2. Tag current state as "BROKEN" in version history
3. Revert to last known good version (before Apollo.io work started)
4. Verify baseline system works (generate 1 project)
5. Document failure in detail
6. User approval required before re-attempting

---

## 📊 **Success Criteria & Validation**

### **Phase 1 Success Criteria**
- [ ] Apollo.io API integration functional
- [ ] Contact person, email, phone stored in database
- [ ] Processing time < 30 seconds (down from 4-5 minutes)
- [ ] 90%+ of companies have contact_email populated
- [ ] Fallback works if Apollo.io fails
- [ ] Edge function logs show successful API calls
- [ ] No errors in console during project generation

### **Phase 2 Success Criteria**
- [ ] Contact data NOT visible in ContactTab UI
- [ ] "Request Introduction" button functional
- [ ] Email successfully sent via Resend API
- [ ] Professor receives confirmation toast
- [ ] `partnership_proposals` table updated correctly
- [ ] Email deliverability > 95%
- [ ] Company receives professional introduction email
- [ ] Reply-to works (company can respond to professor directly)

### **Overall Project Success Criteria**
- [ ] All 4 phases completed without rollback
- [ ] Processing time: 15-20 seconds (target met)
- [ ] Contact accuracy: 95%+ (target met)
- [ ] Email deliverability: 99%+ (target met)
- [ ] No security vulnerabilities introduced
- [ ] Professor satisfaction: 4.5/5 stars minimum
- [ ] Partnership conversion: 30%+ (measured after 30 days)

---

## 🔧 **Debugging Procedures**

### **When Things Go Wrong**

#### **Issue: Apollo.io Returns No Contacts**

**Check**:
1. API key valid? (Test with curl)
2. Company name correct? (Check spelling)
3. Location accurate? (Verify coordinates)
4. Rate limit hit? (Check response headers)

**Debug**:
```typescript
console.log('🔍 Apollo.io Request:', {
  companyName: discovery.name,
  location: discovery.location,
  apiKeyPresent: !!APOLLO_API_KEY
});

console.log('✅ Apollo.io Response:', {
  peopleFound: data.people?.length || 0,
  firstContact: data.people?.[0]?.email || 'none'
});
```

**Fallback**:
```typescript
if (!contact?.email) {
  console.warn(`⚠️ Apollo.io found no contact for ${companyName}, continuing without`);
  return null; // Function continues, just no contact stored
}
```

---

#### **Issue: Resend Email Fails to Send**

**Check**:
1. API key valid? (Test with Resend dashboard)
2. Domain authenticated? (SPF/DKIM records set)
3. Email addresses valid? (Check format)
4. Rate limit hit? (Free tier: 100/day)

**Debug**:
```typescript
console.log('📧 Resend Request:', {
  from: `${professorName} via eduthree <partnerships@eduthree.com>`,
  to: company.contact_email,
  replyTo: professorEmail
});

if (emailError) {
  console.error('❌ Resend Error:', {
    message: emailError.message,
    name: emailError.name
  });
}
```

**Fallback**:
```typescript
// Log failed email to database for retry
await supabase.from('partnership_proposals').insert({
  ...proposalData,
  status: 'failed',
  error_message: emailError.message
});
```

---

#### **Issue: Edge Function Timeout**

**Check**:
1. Too many API calls? (4 companies × 5 APIs = 20 calls)
2. Network latency? (Check API response times)
3. Database query slow? (Check indexes)

**Debug**:
```typescript
const startTime = Date.now();

// ... do work ...

const elapsedTime = Date.now() - startTime;
console.log(`⏱️ Processing took ${elapsedTime}ms`);

if (elapsedTime > 25000) {
  console.warn('⚠️ Processing time approaching timeout (30s limit)');
}
```

**Mitigation**:
- Add timeouts to individual API calls (5 seconds max)
- Process companies sequentially, not parallel
- Cache Google Places results

---

## 📝 **Agent Handoff Checklist**

### **Before Handing Off to Another Agent**

- [ ] **Update Phase Status** in this document
- [ ] **Document current state**:
  - Which files were modified?
  - What works? What doesn't?
  - Any blockers or pending decisions?
- [ ] **Tag version** in version history with descriptive name
- [ ] **Test current state**: Generate 1 project, verify it works
- [ ] **List next actions**:
  - What should the next agent do first?
  - Are there any dependencies?
  - Any known issues to watch for?

### **Example Handoff Note**

```
Agent Handoff - [Date] [Time]

CURRENT STATE: Phase 1 - Apollo.io Core Integration - 80% COMPLETE

COMPLETED:
✅ Apollo.io interface added (lines 20-60)
✅ searchApolloContact function implemented
✅ Integration tested with 1 company (success)

IN PROGRESS:
⏸️ Replacing Lovable AI contact search (lines 224-289) - 50% done
⏸️ Need to add error handling for 429 rate limit

BLOCKERS:
🚫 Waiting for user to confirm Apollo.io API key credit limit

NEXT ACTIONS:
1. Complete lines 224-289 replacement
2. Add rate limit handling (429 error)
3. Test with 4 companies (full course generation)
4. Verify database writes for all 4 companies
5. Check edge function logs for any errors

FILES MODIFIED:
- supabase/functions/discover-companies/index.ts (partial)

ROLLBACK POINT:
- Version tagged as "before-apollo-integration" (working baseline)

TESTING NOTES:
- Test company: "Acme Corp, Boston MA" (has verified contact)
- Processing time: 18 seconds (meets target)
- Contact found: sarah.johnson@acmecorp.com (verified deliverable)
```

---

## 🎯 **Critical Coordination Rules**

### **GOLDEN RULES (Never Break These)**

1. **NEVER modify database schema without migration tool**
   - Use `supabase--migration` tool ONLY
   - Never use `supabase--insert` for schema changes

2. **NEVER display contact data in UI**
   - No `contact_email`, `contact_phone`, `contact_person` in frontend
   - This is a legal/TOS compliance requirement

3. **ALWAYS test before declaring phase complete**
   - Generate 1 full test project
   - Check all tabs still work
   - Verify database writes
   - Review edge function logs

4. **ALWAYS use fallbacks for external APIs**
   - Apollo.io fails? Continue without contact
   - Resend fails? Log to database for retry
   - Never crash the entire flow due to 1 API failure

5. **ALWAYS communicate state changes**
   - Update Phase Status table in this document
   - Tag versions in version history
   - Document decisions and blockers
   - Get user approval before proceeding to next phase

---

## 📞 **Escalation Procedures**

### **When to Escalate to User**

- ⚠️ **Critical bug** that breaks existing functionality
- ⚠️ **Security vulnerability** discovered
- ⚠️ **API keys invalid** or need to be changed
- ⚠️ **Design decision** needed (not covered in strategic plan)
- ⚠️ **Scope change** requested (new feature not in plan)
- ⚠️ **Cost overrun** detected (Apollo.io credit usage too high)
- ⚠️ **Legal concern** identified (TOS violation risk)

### **How to Escalate**

1. **STOP work immediately**
2. **Document the issue** clearly
3. **Provide options** (Option A, B, C with pros/cons)
4. **Recommend** a course of action
5. **Wait for explicit user approval** before proceeding

---

## 🛠️ **Quick Reference: Key Files**

### **Edge Functions**
- `supabase/functions/discover-companies/index.ts` - Company discovery & Apollo.io integration
- `supabase/functions/generate-projects/index.ts` - Project generation (unchanged)
- `supabase/functions/parse-syllabus/index.ts` - Syllabus parsing (unchanged)
- `supabase/functions/send-introduction/index.ts` - NEW - Email introduction system

### **React Components**
- `src/components/project-detail/ContactTab.tsx` - MODIFIED - Hide contact data
- `src/components/RequestIntroductionDialog.tsx` - NEW - Introduction form
- `src/components/ProposePartnershipDialog.tsx` - DEPRECATED (keep for compatibility)

### **Configuration**
- `supabase/config.toml` - Edge function configuration
- `.env` - Environment variables (Supabase URL, keys)

### **Database Tables**
- `company_profiles` - Stores company data + Apollo.io contacts
- `partnership_proposals` - Tracks introduction requests
- `projects` - Generated projects (unchanged)
- `course_profiles` - Course data (unchanged)

---

## 📚 **Additional Documentation**

- **Strategic Plan**: `files/apollo-integration-strategic-plan.md`
- **Existing System**: `IMPLEMENTATION_TRACKER.md`
- **This Document**: `files/PROJECT-MANAGEMENT-COORDINATION.md`

---

## ✅ **Final Checklist Before Go-Live**

- [ ] All 4 phases completed
- [ ] All success criteria met
- [ ] Security audit passed
- [ ] Performance benchmarks met
- [ ] Regression tests passed
- [ ] User acceptance testing completed
- [ ] Rollback plan tested and validated
- [ ] Documentation updated
- [ ] Team trained on new features
- [ ] Monitoring dashboards configured
- [ ] User approval obtained for production deployment

---

**Last Updated**: [Date]  
**Current Phase**: Phase 0 - Planning Complete  
**Next Milestone**: User approval + API keys → Begin Phase 1
