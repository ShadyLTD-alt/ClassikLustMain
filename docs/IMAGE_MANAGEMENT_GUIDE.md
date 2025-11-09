# 🖼️ Image Management System - Complete Guide

## 🎯 Overview

Professional image management with:
- 📁 Auto folder organization
- 🏷️ Persistent poses library
- 🅰️ Character-based sorting
- 📤 Full metadata capture
- 🖼️ Gallery browsing

---

## 📁 Folder Structure

### Auto-Created Organization:
```
/uploads/
  aria/
    avatar/
      image1.jpg
      image2.jpg
    nsfw/
      image3.jpg
    character/
      image4.jpg
  frost/
    avatar/
      image5.jpg
    character/
      image6.jpg
  luna/
    avatar/
      image7.jpg
```

### How It Works:
1. Upload image with character + type
2. Server auto-creates folders if missing
3. Image moved to organized location
4. Metadata saved separately

---

## 📤 Upload Process

### Step 1: Select Files
```
1. Go to Admin Panel → Upload tab
2. Click "Choose Files" or drag & drop
3. Files show in preview cards
```

### Step 2: Configure Metadata

For each image:

**Character**: Select from dropdown
- Aria
- Frost
- Shadow
- Ember
- Luna
- Stella
- Nova
- Other

**Type**: Select category
- Avatar
- Character
- NSFW
- Background
- Other

**Level Required**: Min level to unlock (default: 1)

**Flags**: Check boxes
- ✅ NSFW Content
- ✅ VIP Only
- ✅ Event Limited
- ✅ Random Content
- ✅ Hide from Gallery
- ✅ Enable for Chat

**Chat Send %**: If chat enabled, set probability (0-100%)

**Poses**: Toggle from global library
- Click pose to activate/deactivate
- Active poses show checkmark
- Purple = active, gray = inactive

### Step 3: Upload
```
Click "Upload All with Metadata"
→ Server organizes into folders
→ Metadata saved
→ Gallery updates
```

---

## 🏷️ Persistent Poses System

### Global Poses Library

Stored in localStorage, persists across sessions.

**Default Poses**:
- standing
- sitting
- laying
- bikini
- nude
- clothed

### Creating New Poses:

```
1. Type pose name in input field
2. Click "+ Add Pose" button
3. Pose added to global library
4. Available for all future uploads
```

### Using Poses:

```
1. In upload metadata section
2. Click pose buttons to toggle
3. Active poses show:
   - Purple background
   - White text
   - Checkmark (✓)
4. Inactive poses show:
   - Gray background
   - Gray text
   - No checkmark
```

### Removing Poses:

```
1. In Global Poses Library section
2. Click X button on pose chip
3. Pose removed from library
4. Won't appear in future uploads
```

---

## 🖼️ Character Gallery

### Accessing:
```
Admin Panel → Gallery tab
```

### Features:

**Filters**:
- Character dropdown (All, Aria, Frost, etc.)
- Type dropdown (All, Avatar, NSFW, etc.)
- Search by filename

**Display**:
- Card grid layout
- Image preview
- Filename
- Character badge
- Type badge
- NSFW/VIP badges

**Actions per Image**:
- 📝 Edit - Update metadata
- 🗑️ Delete - Remove image

### Editing Images:

```
1. Click "Edit" button
2. Modal opens
3. Update:
   - Character
   - Type
   - NSFW flag
   - VIP flag
   - Chat enable
4. Click "Save Changes"
5. Metadata updated
```

---

## 🛠️ API Endpoints

### GET /api/media
Returns all images with metadata.

**Response**:
```json
{
  "media": [
    {
      "filename": "image1.jpg",
      "path": "/uploads/aria/avatar/image1.jpg",
      "size": 1024000,
      "uploadedAt": "2025-11-09T...",
      "metadata": {
        "characterId": "aria",
        "type": "Avatar",
        "levelRequired": 1,
        "nsfw": false,
        "vip": false,
        "enableForChat": true,
        "chatSendPercent": 50,
        "poses": ["standing", "smiling"]
      }
    }
  ]
}
```

### POST /api/media
Upload image with metadata.

**Request**: FormData
- `file`: Image file
- `metadata`: JSON string

**Process**:
1. Validate file type/size
2. Create character folder if missing
3. Create type subfolder if missing
4. Move file to organized location
5. Save metadata as .meta.json
6. Return file info

### PUT /api/media/:filename
Update image metadata.

**Request Body**:
```json
{
  "metadata": {
    "characterId": "frost",
    "type": "NSFW",
    "nsfw": true
  }
}
```

### DELETE /api/media/:filename
Delete image and metadata.

**Process**:
1. Search organized folders for file
2. Delete image file
3. Delete .meta.json file
4. Return success

---

## 📊 Best Practices

### Naming:
- Use descriptive filenames
- Include character name
- Include pose/type hint
- Example: `aria-sitting-bikini.jpg`

### Organization:
- Set correct character ID
- Choose appropriate type
- Set realistic level requirements
- Use poses consistently

### Metadata:
- Mark NSFW content accurately
- Set VIP for premium content
- Use chat enable sparingly
- Set appropriate chat %

### Poses:
- Create poses once, reuse
- Use consistent naming
- Remove unused poses
- Keep library organized

---

## 🔧 Troubleshooting

### Images Not Showing:
```
1. Check Network tab for 404 errors
2. Verify folder permissions
3. Check file path in metadata
4. Refresh gallery
```

### Upload Fails:
```
1. Check file size < 10MB
2. Verify file type (JPG, PNG, GIF, WEBP)
3. Check server logs
4. Verify disk space
```

### Poses Not Saving:
```
1. Check localStorage quota
2. Verify browser allows localStorage
3. Check console for errors
4. Try clearing cache
```

### Folders Not Created:
```
1. Check server file permissions
2. Verify uploads directory exists
3. Check server logs for errors
4. Verify character ID is valid
```

---

## 🎓 Advanced Usage

### Bulk Operations:

**Upload Multiple Characters**:
```
1. Select 10+ images
2. Configure metadata for each
3. Mix characters/types
4. Click "Upload All"
5. Server organizes automatically
```

**Batch Update Metadata**:
```
1. Go to Gallery
2. Filter by character
3. Edit each image
4. Update common fields
5. Save changes
```

### Migration:

**Moving Existing Images**:
```
1. Upload images through admin panel
2. Server auto-organizes
3. Old flat structure deprecated
4. New organized structure used
```

---

## 📝 Summary

✅ **Auto folder organization** by character/type  
✅ **Persistent poses library** saved globally  
✅ **Full metadata capture** with all fields  
✅ **Character gallery** with filters  
✅ **Edit uploaded images** after upload  
✅ **Complete API** for all operations  
✅ **Professional workflow** for content management  

**Image management is now production-ready! 🚀**

---

**Last Updated**: November 9, 2025  
**Version**: 2.0 (Complete System)  
**Status**: ✅ Production Ready