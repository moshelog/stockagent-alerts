# StockAgent Troubleshooting Guide

## Database Schema Mismatch Issue

### Problem
**500 Internal Server Error** when creating strategies after code reverts or major changes.

### Root Cause
**Database schema and application code are out of sync**:
- Code expects one schema (e.g., threshold-only)
- Database has different schema (e.g., with action column)
- API fails when trying to read/write incompatible fields

### Symptoms
- Frontend shows "Failed to create strategy. Please try again."
- Network tab shows 500 error from API
- Production works but local doesn't (or vice versa)
- Error occurs after reverting commits or major schema changes

### The Exact Fix That Worked
**Date**: 2025-08-11  
**Issue**: After reverting from buy/sell system back to threshold system
**Problem**: Production database still had `action` column, but reverted code expected threshold-only schema

**Solution**:
```sql
-- Run in Supabase SQL Editor
ALTER TABLE strategies DROP COLUMN IF EXISTS action;
```

### Prevention Strategy
**Before any major schema changes:**

1. **Document current schema state**
   ```bash
   # Save current schema
   curl -s https://api.stockagent.app/api/strategies | head -5
   ```

2. **Plan rollback strategy**
   - Identify which database columns will be added/removed
   - Write rollback SQL before making changes
   - Test rollback SQL on development database first

3. **Coordinate deployments**
   - Always match code changes with database changes
   - If reverting code, also revert database schema
   - Check both local AND production environments

### Emergency Rollback Checklist

When reverting major changes:

- [ ] Identify what database columns were added/removed
- [ ] Write SQL to undo database changes
- [ ] Test SQL on development database
- [ ] Apply SQL to production database
- [ ] Verify API endpoints work
- [ ] Test frontend functionality

### Common Schema Mismatch Scenarios

1. **Added column then reverted code**
   - Solution: Drop the added column

2. **Removed column then reverted code**  
   - Solution: Re-add the column with appropriate defaults

3. **Changed column type then reverted**
   - Solution: Change column type back to original

4. **Local vs Production mismatch**
   - Solution: Sync schemas by running same migrations on both

### Debugging Commands

```bash
# Check API health
curl https://api.stockagent.app/api/health

# Test strategy endpoint (will show auth error vs 500 error)
curl https://api.stockagent.app/api/strategies

# Check database schema in Supabase SQL Editor
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'strategies' ORDER BY ordinal_position;
```

### Key Lesson
**Always treat database schema and application code as a matched pair**. When reverting code changes, also revert corresponding database changes to maintain compatibility.