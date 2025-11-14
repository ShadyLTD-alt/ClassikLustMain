# 🚀 Admin Panel - Quick Start Guide

## ⚡ Get Started in 3 Minutes

### Step 1: Enable Admin Access

1. Log in to your game with dev credentials:
```bash
POST /api/auth/dev
{
  "username": "your_username"
}
```

2. Find your player state file:
```bash
main-gamedata/player-data/dev_your_username/player-state.json
```

3. Set admin flag:
```json
{
  "isAdmin": true,
  "username": "your_username",
  ... other fields ...
}
```

4. Reload the game - you now have admin access!

---

### Step 2: Open Admin Panel

**Method 1: In-Game Button**
- Look for admin/settings button (usually gear icon)
- Click to open admin panel

**Method 2: Keyboard Shortcut**
- Press the admin hotkey (check your game settings)

**Method 3: Direct Component**
- AdminMenuCore component should be accessible from main game interface

---

### Step 3: Test Each Module

#### ✅ **Upgrades Module**
1. Click "Upgrades" tab
2. Click "Create Upgrade"
3. Fill in:
   - ID: `test-upgrade`
   - Name: `Test Upgrade`
   - Description: `Testing the admin panel`
   - Type: `perTap`
   - Max Level: `10`
   - Base Cost: `100`
4. Click "Create Upgrade"
5. Verify it appears in the list
6. Try editing it
7. Try deleting it

#### ✅ **Characters Module**
1. Click "Characters" tab
2. Create a test character
3. Verify CRUD operations work

#### ✅ **Levels Module**
1. Click "Levels" tab  
2. Create a test level
3. Set cost and requirements
4. Verify it saves

#### ✅ **Images Module**
1. Click "Images" tab
2. Upload a test image
3. Verify it appears
4. Try deleting it

#### ✅ **Tasks Module**
1. Click "Tasks" tab
2. Create a daily task
3. Set requirements and rewards
4. Verify it saves

#### ✅ **Achievements Module**
1. Click "Achievements" tab
2. Create a milestone achievement
3. Set targets and rewards
4. Verify it saves

---

## 🐛 Troubleshooting

### Issue: Admin Panel Won't Open
**Solutions:**
- ✅ Check browser console (F12) for errors
- ✅ Verify `isAdmin: true` in player-state.json
- ✅ Clear browser cache and reload
- ✅ Check if AdminMenuCore is imported in main game

### Issue: "Unauthorized" or 401 Errors
**Solutions:**
- ✅ Verify session token exists in localStorage
- ✅ Log out and log back in
- ✅ Check server logs for auth errors
- ✅ Confirm admin flag is set correctly

### Issue: Lists Are Empty
**Solutions:**
- ✅ Check `progressive-data/` directories exist
- ✅ Verify JSON files are present
- ✅ Check file permissions
- ✅ Look at server logs for loading errors
- ✅ Try creating a new item to test write access

### Issue: Saves Not Working
**Solutions:**
- ✅ Check browser Network tab for 500 errors
- ✅ Verify all required fields are filled
- ✅ Check server logs for validation errors
- ✅ Ensure file system has write permissions

### Issue: PlayerInfoMenu Won't Open
**Solutions:**
- ✅ FIXED in latest commit (z-index issue)
- ✅ Click on the LP/LG display area in top-left
- ✅ Check console for JavaScript errors
- ✅ Verify MenuCore is rendering correctly

---

## 🎯 Pro Tips

### Backup Before Editing
```bash
cp -r main-gamedata/progressive-data main-gamedata/progressive-data-backup
```

### Test in Dev First
- Always test changes in development before deploying
- Use separate admin account for testing
- Keep production data backed up

### Use Browser DevTools
- **Network tab**: Monitor API requests
- **Console tab**: Check for errors
- **Application tab**: Verify session token

### Check Server Logs
```bash
tail -f logs/combined.log
```

Look for:
- `✅ [ADMIN API]` messages for successful operations
- `❌ [ADMIN API]` messages for errors
- Authentication failures
- File system errors

---

## 📊 Expected Behavior

### When Creating an Item:
1. Fill out form
2. Click "Create"
3. See "Creating..." loading state
4. Get success alert
5. Return to list view
6. New item appears in list
7. JSON file created in `progressive-data/`
8. Server logs show success message

### When Editing an Item:
1. Click "Edit" button
2. Modify fields
3. Click "Save Changes"
4. See "Saving..." loading state
5. Get success alert
6. Return to list view
7. Changes visible in list
8. JSON file updated in `progressive-data/`

### When Deleting an Item:
1. Click "Delete" button
2. Confirm deletion in popup
3. Item removed from list
4. Success alert appears
5. JSON file deleted from `progressive-data/`
6. Server logs show deletion

---

## ✅ Checklist

Before considering admin panel "working":

- [ ] Can open admin panel
- [ ] All 6 tabs visible and clickable
- [ ] Upgrades: List loads
- [ ] Upgrades: Can create new
- [ ] Upgrades: Can edit existing
- [ ] Upgrades: Can delete
- [ ] Characters: All CRUD works
- [ ] Levels: All CRUD works
- [ ] Tasks: All CRUD works
- [ ] Achievements: All CRUD works
- [ ] Images: Can upload
- [ ] Images: Can delete
- [ ] Changes persist after reload
- [ ] No console errors
- [ ] Server logs show operations

---

## 🎉 You're Done!

If all the above works, your admin panel is fully operational!

### What You Can Do Now:
- Manage all game content without touching code
- Make live updates that players see immediately  
- Configure progression systems visually
- Upload and organize media
- Empower your team to manage content

### Next Steps:
- Create your actual game content
- Set up multiple admin accounts
- Configure backup schedules
- Train your team on the admin panel
- Start building your game! 🎮

---

**Need help? Check:**
- `ADMIN_API_DOCS.md` - Complete API documentation
- `ADMIN_PANEL_COMPLETE.md` - Full feature list
- Server logs - Detailed operation logs
- Browser console - Frontend error messages

**Your admin system is production-ready! 🚀✨**