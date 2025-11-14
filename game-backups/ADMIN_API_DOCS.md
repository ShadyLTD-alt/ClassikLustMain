# 🎮 Admin API Backend - Complete Documentation

## ✅ Status: **READY FOR PRODUCTION**

Your admin panel backend is now fully operational with complete CRUD operations for all game entities.

---

## 🚀 Quick Start

The admin API is automatically registered at server startup. All routes are protected by authentication and admin-only middleware.

### Base URL
```
http://your-server:5000/api/admin
```

### Authentication
All admin routes require:
1. Valid session token (from `/api/auth/dev` or Telegram login)
2. `isAdmin: true` flag in player account

---

## 📁 Data Architecture

### Single Source of Truth
```
main-gamedata/progressive-data/
├── upgrades/           # All upgrade definitions
├── characters/         # Character configurations
├── levelup/           # Level progression data
├── tasks/             # Daily/weekly tasks
└── achievements/      # Achievement milestones
```

### How It Works
1. **Frontend** → Makes API request to `/api/admin/{entity}`
2. **Backend** → Reads/writes JSON files in `progressive-data/`
3. **Database** → Optionally synced (with fallback handling)
4. **Cache** → Automatically reloaded via `unifiedDataLoader`

---

## 🔧 API Endpoints

### **Upgrades**

#### List All Upgrades
```http
GET /api/admin/upgrades
```
**Response:**
```json
{
  "success": true,
  "upgrades": [
    {
      "id": "tap-power",
      "name": "Tap Power",
      "description": "Increase points earned per tap",
      "maxLevel": 30,
      "baseCost": 10,
      "costMultiplier": 1.15,
      "baseValue": 1,
      "valueIncrement": 1,
      "icon": "Hand",
      "type": "perTap"
    }
  ]
}
```

#### Create New Upgrade
```http
POST /api/admin/upgrades
Content-Type: application/json

{
  "id": "energy-capacity",
  "name": "Energy Capacity",
  "description": "Increase maximum energy",
  "maxLevel": 50,
  "baseCost": 20,
  "costMultiplier": 1.2,
  "baseValue": 100,
  "valueIncrement": 50,
  "icon": "Battery",
  "type": "energyMax"
}
```

#### Update Existing Upgrade
```http
PUT /api/admin/upgrades/tap-power
Content-Type: application/json

{
  "maxLevel": 40,
  "baseCost": 15
}
```

#### Delete Upgrade
```http
DELETE /api/admin/upgrades/tap-power
```

---

### **Characters**

#### List All Characters
```http
GET /api/admin/characters
```

#### Create New Character
```http
POST /api/admin/characters
Content-Type: application/json

{
  "id": "luna",
  "name": "Luna",
  "description": "Mysterious night character",
  "unlockLevel": 5,
  "baseTapBonus": 1.5,
  "specialAbility": "Night vision",
  "rarity": "rare"
}
```

#### Update Character
```http
PUT /api/admin/characters/aria
```

#### Delete Character
```http
DELETE /api/admin/characters/aria
```

---

### **Levels**

#### List All Levels
```http
GET /api/admin/levels
```

#### Create New Level
```http
POST /api/admin/levels
Content-Type: application/json

{
  "level": 10,
  "cost": 5000,
  "requirements": [
    {
      "upgradeId": "tap-power",
      "minLevel": 5
    }
  ],
  "unlocks": ["new-character"],
  "rewards": {
    "lustGems": 100,
    "bonusMultiplier": 1.1
  }
}
```

#### Update Level
```http
PUT /api/admin/levels/10
```

#### Delete Level
```http
DELETE /api/admin/levels/10
```

---

### **Tasks**

#### List All Tasks
```http
GET /api/admin/tasks
```

#### Create New Task
```http
POST /api/admin/tasks
Content-Type: application/json

{
  "id": "daily-taps",
  "name": "Daily Taps",
  "description": "Tap 1000 times today",
  "requirementType": "tapCount",
  "target": 1000,
  "rewardType": "lp",
  "rewardAmount": 500,
  "resetInterval": "daily"
}
```

#### Update Task
```http
PUT /api/admin/tasks/daily-taps
```

#### Delete Task
```http
DELETE /api/admin/tasks/daily-taps
```

---

### **Achievements**

#### List All Achievements
```http
GET /api/admin/achievements
```

#### Create New Achievement
```http
POST /api/admin/achievements
Content-Type: application/json

{
  "id": "first-million",
  "name": "Millionaire",
  "description": "Earn 1,000,000 LP",
  "requirementType": "lpTotal",
  "target": 1000000,
  "rewardType": "lg",
  "rewardAmount": 100,
  "icon": "Trophy"
}
```

#### Update Achievement
```http
PUT /api/admin/achievements/first-million
```

#### Delete Achievement
```http
DELETE /api/admin/achievements/first-million
```

---

### **Images/Media**

#### List All Images
```http
GET /api/admin/images
```

**Response:**
```json
{
  "success": true,
  "images": [
    {
      "filename": "character-aria.png",
      "path": "/uploads/character-aria.png",
      "size": 245678,
      "uploadedAt": "2025-11-09T12:00:00.000Z"
    }
  ]
}
```

#### Delete Image
```http
DELETE /api/admin/images/character-aria.png
```

---

## 🔒 Security Features

### Authentication Middleware
- All routes require `requireAuth` middleware
- Admin routes additionally require `requireAdmin` middleware
- Session tokens validated on every request

### File Locking
- Prevents race conditions during concurrent edits
- Queue-based system ensures sequential writes
- Automatic lock release after operation

### Input Validation
- ID validation (required, type checking)
- Error messages for missing/invalid data
- Graceful handling of malformed requests

---

## 🐛 Error Handling

### Error Response Format
```json
{
  "success": false,
  "error": "Human-readable error message",
  "details": "Technical details (optional)"
}
```

### Common HTTP Status Codes
- `200` - Success
- `400` - Bad Request (missing/invalid data)
- `404` - Not Found (entity doesn't exist)
- `500` - Internal Server Error

### Database Sync Failures
If database sync fails, the operation will:
1. ✅ Still complete successfully on JSON files
2. ⚠️ Log a warning (not an error)
3. 🔄 Continue serving from JSON (single source of truth)

---

## 🧪 Testing Your Admin Panel

### 1. Test Authentication
```bash
curl -X POST http://localhost:5000/api/auth/dev \
  -H "Content-Type: application/json" \
  -d '{"username": "admin_test"}'
```

### 2. Set Admin Flag
Manually edit `main-gamedata/player-data/dev_admin_test/player-state.json`:
```json
{
  "isAdmin": true
}
```

### 3. Test Admin Endpoint
```bash
curl http://localhost:5000/api/admin/upgrades \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"
```

---

## 📊 Frontend Integration

### React/TypeScript Example
```typescript
import { useQuery, useMutation } from '@tanstack/react-query';

// Fetch all upgrades
const { data: upgrades } = useQuery({
  queryKey: ['admin', 'upgrades'],
  queryFn: async () => {
    const res = await fetch('/api/admin/upgrades', {
      headers: {
        'Authorization': `Bearer ${sessionToken}`
      }
    });
    return res.json();
  }
});

// Create new upgrade
const createUpgrade = useMutation({
  mutationFn: async (newUpgrade) => {
    const res = await fetch('/api/admin/upgrades', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionToken}`
      },
      body: JSON.stringify(newUpgrade)
    });
    return res.json();
  }
});
```

---

## 🔄 Data Sync Flow

```
┌─────────────────┐
│  Admin Panel    │
│   (Frontend)    │
└────────┬────────┘
         │ HTTP Request
         ▼
┌─────────────────┐
│  Admin Router   │ ◄── Authentication & Authorization
│  (Backend API)  │
└────────┬────────┘
         │
         ├──► JSON File (progressive-data/) ✅ PRIMARY
         │
         └──► Database (optional sync) ⚠️ SECONDARY
                │
                ▼
         ┌──────────────┐
         │ Memory Cache │ (unifiedDataLoader)
         └──────────────┘
```

---

## 🎯 Next Steps

### Your admin panel is now ready! Here's what to do:

1. ✅ **Test each endpoint** with the examples above
2. ✅ **Connect your frontend** to the API routes
3. ✅ **Create admin accounts** by setting `isAdmin: true`
4. ✅ **Monitor logs** for any errors or warnings
5. ✅ **Backup your data** regularly from `progressive-data/`

---

## 📞 Support

If you encounter any issues:
1. Check server logs for detailed error messages
2. Verify file permissions on `progressive-data/` directories
3. Ensure authentication tokens are valid
4. Confirm admin flag is set correctly

---

## 🎉 You're All Set!

Your game now has a fully functional admin backend with:
- ✅ Complete CRUD operations for all entities
- ✅ File-based storage (progressive-data)
- ✅ Optional database sync
- ✅ Security & authentication
- ✅ Error handling & validation
- ✅ Live data reloading

**No more empty admin panels! Everything is wired up and ready to use! 🚀**