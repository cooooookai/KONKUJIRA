# Stats Overlay Debug Guide

## Problem Summary
The user reported that despite saving data for the COKAI user, the statistics preview is not showing any data on the calendar.

## Changes Made

### 1. Enhanced Stats Overlay (`src/frontend/js/stats-overlay.js`)
- Added better error handling and debugging logs
- Improved initialization to handle both DOM ready states
- Added fallback demo stats when no real data is available
- Enhanced data loading with better date format handling
- Added comprehensive logging for troubleshooting

### 2. Updated Main App (`src/frontend/js/app.js`)
- Added explicit stats overlay initialization in the main app
- Ensured stats overlay is initialized after calendar setup

### 3. Created Debug Tools
- `test-stats-debug.html` - Comprehensive debugging interface
- `test-stats-simple.html` - Simple stats overlay test
- `verify-stats.html` - Complete verification tool

## Testing Steps

### Step 1: Use the Verification Tool
1. Open `verify-stats.html` in your browser
2. Click through the verification buttons in order:
   - **Check Current User** - Verify user is set correctly
   - **Test API Connection** - Ensure API is working
   - **Check Saved Data** - See if data exists for current user
   - **Test Stats Overlay** - Test the overlay functionality
   - **Check All Users Data** - See data for all users

### Step 2: Test the Main Application
1. Open `src/frontend/index.html`
2. Look for the **📊 統計** button in the header
3. Click the button to toggle stats display
4. Check browser console for debug messages

### Step 3: Debug with Enhanced Tools
If issues persist, use `test-stats-debug.html`:
- Set user to COKAI
- Add test data
- Check API responses
- Force stats display

## Expected Behavior

### When Stats Work Correctly:
1. **📊 統計** button appears in header
2. Clicking button shows **📊 統計 ON**
3. Calendar dates show overlay with symbols:
   - **○** = Available (green)
   - **△** = Conditional (orange) 
   - **×** = Busy (red)
4. Numbers show count of each status per date

### When No Data Available:
- Stats overlay will show demo data as fallback
- Console will log "No stats data available, showing demo data"

## Common Issues & Solutions

### Issue 1: Stats Button Missing
**Cause**: Stats overlay not initialized
**Solution**: Check browser console for initialization errors

### Issue 2: No Stats Display
**Cause**: No data in database or API issues
**Solution**: Use verification tool to check data existence

### Issue 3: API Errors
**Cause**: Network issues or server problems
**Solution**: Check API endpoint in `src/frontend/js/config.js`

### Issue 4: Wrong User Data
**Cause**: User switching not working properly
**Solution**: Verify user selection in nickname modal

## Debug Console Commands

Open browser console and try these commands:

```javascript
// Check current user
storage.getNickname()

// Check if stats overlay exists
typeof statsOverlay

// Manually toggle stats
statsOverlay.toggle()

// Check stats data
statsOverlay.statsData

// Force demo stats
statsOverlay.showDemoStats()
```

## Next Steps

1. **First**: Use `verify-stats.html` to identify the exact issue
2. **If API works but no data**: Check if COKAI user actually saved data
3. **If data exists but stats don't show**: Check CSS styles and DOM structure
4. **If everything fails**: Use demo stats mode for testing

## Files Modified
- `src/frontend/js/stats-overlay.js` - Enhanced with debugging
- `src/frontend/js/app.js` - Added stats initialization
- `test-stats-debug.html` - Comprehensive debug tool
- `test-stats-simple.html` - Simple test interface
- `verify-stats.html` - Verification tool

The stats overlay should now work more reliably and provide better debugging information when issues occur.