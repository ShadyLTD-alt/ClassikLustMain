# Admin Menu Core System

## Overview
The Admin Menu Core is a modular plugin-based system for managing all game content through a centralized admin panel. Each feature (upgrades, levels, characters, achievements, tasks, images) is implemented as a self-contained module.

## Architecture

### Core Component
- **AdminMenuCore.tsx**: Main coordinator component
  - Tab-based navigation
  - Routes to individual module managers
  - Only visible to users with `isAdmin: true`
  - Accessed via floating action button (Settings icon)

### Module Structure
Each module follows the same pattern:
```
module-name/
  ├── ModuleCore.tsx     # Lists all items, CRUD operations
  ├── ModuleEdit.tsx     # Edit existing item form
  └── ModuleCreate.tsx   # Create new item form
```

### Available Modules
1. **Upgrades** - Manage game upgrades (tap power, energy, etc.)
2. **Characters** - Manage character roster
3. **Levels** - Manage player progression levels
4. **Achievements** - Manage achievement system
5. **Tasks** - Manage daily/repeatable tasks
6. **Image Uploader** - Upload and manage game images

## Data Flow

### Primary Storage: JSON Files
- **Location**: `main-gamedata/progressive-data/[module]/`
- **Purpose**: Primary live game data
- **Format**: Individual JSON files per item (e.g., `tap-power.json`)

### Secondary Storage: Database
- **Purpose**: Backup and snapshots
- **Sync**: Automatic on create/update/delete
- **Fallback**: Database sync failures are logged but don't block operations

### Template Storage
- **Location**: `main-gamedata/master-data/[module]/`
- **Purpose**: Templates used only during creation
- **Usage**: Provides default values for new items

## File Locking

All JSON operations use async file locking to prevent race conditions:

```typescript
await withFileLock(filePath, async () => {
  // Read current data
  const current = await readJSONFile(filePath);
  
  // Modify data
  const updated = { ...current, ...changes };
  
  // Write back to file
  await writeJSONFile(filePath, updated);
  
  // Sync to database (best effort)
  await storage.updateInDatabase(updated);
});
```

### Lock Mechanism
- Per-file locks using Promise-based queuing
- Concurrent requests wait for lock release
- Prevents data corruption from simultaneous writes
- Automatic lock cleanup on operation completion

## API Routes

All admin routes are prefixed with `/api/admin/` and require admin authentication.

### Pattern for Each Module
```
GET    /api/admin/[module]      # List all items
POST   /api/admin/[module]      # Create new item
PUT    /api/admin/[module]/:id  # Update existing item
DELETE /api/admin/[module]/:id  # Delete item
```

### Example: Upgrades
```bash
# List all upgrades
GET /api/admin/upgrades

# Create new upgrade
POST /api/admin/upgrades
Body: { id: "tap-power", name: "Tap Power", ... }

# Update upgrade
PUT /api/admin/upgrades/tap-power
Body: { maxLevel: 50 }

# Delete upgrade
DELETE /api/admin/upgrades/tap-power
```

## Integration

### In Game UI
The admin menu is integrated into `GameInterfaceV2.tsx`:

```tsx
// Show admin FAB only for admins
{state?.isAdmin && (
  <button onClick={() => setShowAdminPanel(true)}>
    <Settings />
  </button>
)}

// Admin panel modal
{state?.isAdmin && (
  <AdminMenuCore 
    isOpen={showAdminPanel} 
    onClose={() => setShowAdminPanel(false)} 
  />
)}
```

### Admin Permission Check
The `isAdmin` flag comes from the player's database record:
- Set in `players` table: `isAdmin: true`
- Loaded in game context via `/api/players/me`
- Used throughout UI to show/hide admin features

## Creating New Modules

To add a new admin module:

1. **Create module directory**:
   ```
   client/src/components/adminmenu-core/new-module/
   ```

2. **Create three components**:
   - `NewModuleCore.tsx` - List and manage items
   - `NewModuleEdit.tsx` - Edit form
   - `NewModuleCreate.tsx` - Create form

3. **Add API routes** in `server/routes/admin.ts`:
   ```typescript
   router.get('/new-module', async (req, res) => { ... });
   router.post('/new-module', async (req, res) => { ... });
   router.put('/new-module/:id', async (req, res) => { ... });
   router.delete('/new-module/:id', async (req, res) => { ... });
   ```

4. **Add tab** to `AdminMenuCore.tsx`:
   ```typescript
   { id: 'new-module', label: 'New Module', icon: SomeIcon }
   ```

5. **Create data directory**:
   ```
   main-gamedata/progressive-data/new-module/
   ```

## Error Handling

### Frontend
- All API calls wrapped in try/catch
- User-friendly error messages via alerts
- Loading states during operations
- Optimistic UI updates where appropriate

### Backend
- File lock timeout handling
- JSON parse error recovery
- Database sync failure logging (non-blocking)
- Detailed error messages in responses

## Best Practices

### When Creating Items
1. Always provide unique IDs
2. Use kebab-case for IDs (e.g., `tap-power`)
3. Validate required fields
4. Check for duplicates before creating

### When Editing Items
1. Load current data first
2. Merge changes (don't replace entirely)
3. Preserve the ID field
4. Update timestamps if applicable

### When Deleting Items
1. Confirm deletion with user
2. Check for dependencies (if applicable)
3. Clean up related files/images
4. Log deletion for audit trail

## Troubleshooting

### Issue: Changes not appearing in game
**Solution**: 
- Check if JSON file was updated in `progressive-data/`
- Verify file locking didn't timeout
- Check browser console for errors
- Refresh the page to reload data

### Issue: Cannot create new items
**Solution**:
- Verify directory exists: `main-gamedata/progressive-data/[module]/`
- Check file permissions
- Ensure ID is unique and valid
- Check server logs for detailed error

### Issue: Database out of sync
**Solution**:
- JSON is the source of truth, not database
- Run sync script if available
- Database is only for backup/analytics
- Game loads from JSON files directly

## LunaBug Integration Notes

### What LunaBug Should Monitor
1. **File Lock Timeouts**: Alert if operations take > 5 seconds
2. **Database Sync Failures**: Log but don't block operations
3. **JSON Parse Errors**: Indicate corrupted data files
4. **Concurrent Access Patterns**: Track lock queue depth
5. **API Error Rates**: Monitor admin endpoint failures

### Common Error Patterns
```typescript
// File already exists
Error: "Upgrade tap-power already exists"
Fix: Use edit instead of create, or choose different ID

// File not found
Error: "Level 10 not found"
Fix: Verify file exists in progressive-data directory

// Lock timeout
Error: "Operation timeout waiting for file lock"
Fix: Check for stuck processes, restart server

// Database sync failed
Warning: "Failed to sync to database: [error]"
Action: JSON is still updated, database will sync later
```

### Auto-Fix Capabilities
LunaBug can auto-fix:
- Missing directories (create them)
- Malformed JSON (repair or backup)
- Stale locks (clear after timeout)
- Missing database records (sync from JSON)

### Manual Intervention Required
- Duplicate IDs (user must rename)
- Data validation errors (user must fix input)
- Permission issues (admin must fix filesystem)
- Corrupted JSON (requires backup restore)

## Security Considerations

1. **Admin-Only Access**: All routes check `isAdmin` flag
2. **No Client-Side Validation Only**: Server validates all inputs
3. **File Path Sanitization**: Prevent directory traversal
4. **Input Sanitization**: Escape special characters
5. **Rate Limiting**: Consider adding for production

## Future Enhancements

- [ ] Bulk import/export functionality
- [ ] Version history and rollback
- [ ] Real-time collaboration (multiple admins)
- [ ] Advanced search and filtering
- [ ] Visual JSON editor with validation
- [ ] Audit log of all admin actions
- [ ] Automated backups before changes
- [ ] Template system for common patterns
