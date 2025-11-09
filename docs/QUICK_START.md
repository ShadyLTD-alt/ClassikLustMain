# ⚡ Admin Panel Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Restart Dev Server (30 seconds)
```bash
# Stop server (Ctrl+C if running)
npm run dev
```

Wait for "Server ready" message.

---

### Step 2: Login as Admin (30 seconds)
```
1. Open game in browser
2. Login with dev account
3. Verify isAdmin: true in player-state.json
```

**Location**: `main-gamedata/player-data/{your-id}/player-state.json`

**Edit if needed**:
```json
{
  "isAdmin": true
}
```

---

### Step 3: Open Admin Panel (10 seconds)
```
1. Click settings/admin button in game
2. Admin panel opens
3. See 7 tabs at top
```

**You should see**:
- 🔧 Upgrades
- 👥 Characters  
- ⭐ Levels
- 🖼️ Images
- 📈 Tasks
- 🏆 Achievements
- 🌙 Luna DevTools

---

### Step 4: Test Each Tab (2 minutes)

#### Upgrades Tab:
```
✅ Click "Upgrades"
✅ See loading spinner
✅ Data loads (or empty state)
✅ No errors!
```

#### Characters Tab:
```
✅ Click "Characters"
✅ Data loads
✅ No errors!
```

#### Levels Tab:
```
✅ Click "Levels"
✅ Data loads
✅ Click "Edit" on any level
✅ See visual editing UI!
✅ No JSON blobs!
```

#### Images Tab:
```
✅ Click "Images"
✅ See upload zone
✅ Gallery displays images
```

#### Tasks Tab:
```
✅ Click "Tasks"
✅ NO CRASH! 🎉
✅ Tasks load
```

#### Achievements Tab:
```
✅ Click "Achievements"
✅ NO CRASH! 🎉
✅ Achievements load
```

#### Luna DevTools Tab:
```
✅ Click "🌙 Luna DevTools"
✅ See console viewer
✅ See performance stats
✅ Quick actions available
```

---

### Step 5: Test Create Operation (1 minute)

```
1. Go to any tab
2. Click "Create {Item}" button
3. Fill required fields
4. Click Create/Save
5. Success alert appears
6. New item in list
```

**Expected**: ✅ Item created successfully

---

### Step 6: Test Edit Operation (1 minute)

```
1. Click Edit on any item
2. Change a field
3. Click "Save Changes"
4. Success alert
5. Changes visible in list
```

**Expected**: ✅ Item updated successfully

---

### Step 7: Test Delete Operation (30 seconds)

```
1. Click Delete on any item
2. Confirm deletion
3. Success alert
4. Item removed from list
```

**Expected**: ✅ Item deleted successfully

---

### Step 8: Test Image Upload (1 minute)

```
1. Go to Images tab
2. Click "Choose Files"
3. Select an image
4. See preview card appear
5. Configure metadata:
   - Type: Character
   - Level: 1
   - Check "NSFW" (if applicable)
   - Add poses: "sitting" (press Enter)
6. Click "Upload All with Metadata"
7. Wait for upload
8. Image appears in gallery
9. Click "Copy" - URL copied
10. Click Delete - image removed
```

**Expected**: ✅ Image uploaded with metadata

---

## ✅ Success Indicators

You're all set when you see:

✅ Admin panel opens cleanly  
✅ All 7 tabs load  
✅ No crashes anywhere  
✅ Can create items  
✅ Can edit items with visual UI  
✅ Can delete items  
✅ Images upload manually  
✅ Metadata saves with images  
✅ Luna DevTools shows console  
✅ All tabs clickable (no overlays blocking)  
✅ Changes persist after reload  

---

## 🎯 What's Next?

### Create Sample Data:
```
1. Create 5-10 upgrades
2. Create 2-3 characters
3. Configure 10 levels
4. Upload character images
5. Create daily/weekly tasks
6. Set up achievements
```

### Test In-Game:
```
1. Close admin panel
2. Verify upgrades appear in shop
3. Test character unlocking
4. Test level-up system
5. View gallery images
6. Complete tasks
7. Earn achievements
```

### Team Setup:
```
1. Set isAdmin: true for team members
2. Share admin panel guide
3. Assign content creation tasks
4. Start managing live game!
```

---

## 🆘 Quick Troubleshooting

### "Failed to load" errors:
```
1. Check Network tab for actual error
2. Verify routes in server/index.ts
3. Check server logs
4. Verify isAdmin: true
```

### Tabs not clickable:
```
1. Check z-index in browser DevTools
2. Verify pointer-events: auto
3. Look for overlapping elements
4. Try closing/reopening admin panel
```

### Upload fails:
```
1. Check file size < 10MB
2. Check file type (JPG/PNG/GIF/WEBP)
3. Check uploads/ directory exists
4. Check file permissions
5. View Network tab for error details
```

### Changes don't save:
```
1. Check Network tab shows 200 status
2. Verify JSON files in progressive-data/
3. Check server logs
4. Try reloading page
```

---

## 📞 Support

If issues persist:

1. **Check Documentation**:
   - `/docs/ADMIN_PANEL_FIXES.md`
   - `/docs/TESTING_GUIDE.md`
   - `/FIX_VERIFICATION.md`

2. **Check Network Tab**:
   - Look for failed requests
   - Check response bodies
   - Verify status codes

3. **Check Console**:
   - Look for JavaScript errors
   - Check for warnings
   - Review stack traces

4. **Check Server Logs**:
   - Look for errors
   - Check file operations
   - Verify API calls

---

## 🎉 You're Ready!

**Admin panel is fully operational. Start managing your game! 🚀**

---

**Quick Reference**:
- Admin Panel: Settings → Admin
- Tabs: 7 total (Upgrades, Characters, Levels, Images, Tasks, Achievements, DevTools)
- Upload: Manual button (no auto-upload)
- Edit UI: Visual controls (no raw JSON)
- Luna: Integrated in DevTools tab

**Time to Test**: ~5-10 minutes  
**Difficulty**: Easy  
**Status**: ✅ Production Ready