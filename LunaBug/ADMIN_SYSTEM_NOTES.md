# LunaBug - Admin System Integration Notes

## System Overview
The new Admin Menu Core system manages all game content through modular plugins. Each module (upgrades, levels, characters, etc.) handles its own CRUD operations with proper file locking.

## Critical Architecture Points

### 1. Data Source Hierarchy
```
Primary:   JSON files in main-gamedata/progressive-data/
Secondary: PostgreSQL database (backup/snapshot)
Templates: JSON files in main-gamedata/master-data/ (creation only)
```

**Key Rule**: JSON files are the source of truth. Database is for backup only.

### 2. File Locking Mechanism
Location: `server/routes/admin.ts`

```typescript
const locks = new Map<string, Promise<void>>();

async function withFileLock<T>(filePath: string, operation: () => Promise<T>): Promise<T> {
  // Wait for existing lock
  while (locks.has(filePath)) {
    await locks.get(filePath);
  }
  
  // Create new lock
  let releaseLock: () => void;
  const lockPromise = new Promise<void>((resolve) => {
    releaseLock = resolve;
  });
  locks.set(filePath, lockPromise);
  
  try {
    return await operation();
  } finally {
    locks.delete(filePath);
    releaseLock!();
  }
}
```

**What to Monitor**:
- Lock queue depth (if > 5, there's contention)
- Lock duration (if > 5s, possible deadlock)
- Stale locks (clean up after crashes)

### 3. Data Flow Pattern

Every admin operation follows this flow:
```
1. Acquire file lock for JSON file
2. Read current data from JSON
3. Validate and merge changes
4. Write updated data to JSON
5. Attempt database sync (best effort)
6. Release file lock
7. Return success/failure to client
```

**Important**: Database sync failures are logged but don't block the operation.

## Error Patterns You'll See

### Normal Operations
```
✅ Successfully created upgrade: tap-power
✅ Updated level 5 configuration
⚠️ Failed to sync character to database: [error] (JSON updated)
```

### Problems Requiring Attention
```
❌ Upgrade tap-power already exists
   Fix: File exists in progressive-data/upgrades/
   Action: User should edit instead of create

❌ Level 10 not found
   Fix: File missing from progressive-data/levelup/
   Action: Check if file was deleted manually

❌ Operation timeout waiting for file lock
   Fix: Lock wasn't released (crash during operation)
   Action: Clear stale locks, restart if needed
```

## Auto-Diagnostic Checklist

When an admin operation fails:

1. **Check File Exists**
   ```bash
   ls main-gamedata/progressive-data/[module]/[id].json
   ```

2. **Verify JSON is Valid**
   ```bash
   cat main-gamedata/progressive-data/[module]/[id].json | jq .
   ```

3. **Check File Permissions**
   ```bash
   ls -la main-gamedata/progressive-data/[module]/
   ```

4. **Inspect Lock State**
   ```typescript
   console.log('Active locks:', Array.from(locks.keys()));
   ```

5. **Database Sync Status**
   ```sql
   SELECT * FROM [table] WHERE id = '[id]' ORDER BY "updatedAt" DESC;
   ```

## Auto-Fix Strategies

### Fix 1: Recreate Missing Directories
```typescript
const dirs = [
  'main-gamedata/progressive-data/upgrades',
  'main-gamedata/progressive-data/levelup',
  'main-gamedata/progressive-data/characters',
  'main-gamedata/progressive-data/achievements',
  'main-gamedata/progressive-data/tasks',
];

for (const dir of dirs) {
  await fs.mkdir(dir, { recursive: true });
}
```

### Fix 2: Repair Corrupted JSON
```typescript
try {
  const data = await fs.readFile(filePath, 'utf-8');
  JSON.parse(data); // Will throw if invalid
} catch (error) {
  // Backup corrupted file
  await fs.copyFile(filePath, `${filePath}.backup.${Date.now()}`);
  
  // Attempt to load from database
  const dbRecord = await storage.getItem(id);
  if (dbRecord) {
    await fs.writeFile(filePath, JSON.stringify(dbRecord, null, 2));
  }
}
```

### Fix 3: Clear Stale Locks
```typescript
// Run on server startup or periodic cleanup
function clearStaleLocks() {
  locks.clear();
  console.log('🧼 Cleared all file locks');
}
```

### Fix 4: Sync Database from JSON
```typescript
async function syncAllToDatabase() {
  const modules = ['upgrades', 'levelup', 'characters', 'achievements', 'tasks'];
  
  for (const module of modules) {
    const dir = `main-gamedata/progressive-data/${module}`;
    const files = await fs.readdir(dir);
    
    for (const file of files.filter(f => f.endsWith('.json'))) {
      const data = await readJSONFile(path.join(dir, file));
      await storage.createOrUpdate(module, data);
    }
  }
}
```

## Integration with Existing Systems

### Upgrades System
The upgrades module uses the exact same pattern as the existing upgrades code:
- Same file locking
- Same JSON structure
- Same database sync
- **New**: Create functionality now works correctly

### Player Data
Admin changes don't directly modify player data:
- Upgrades: Players have `playerUpgrades` separate from upgrade definitions
- Levels: Players have `playerLevelUps` separate from level definitions
- Characters: Players have `playerCharacters` separate from character definitions

Changing an upgrade's `maxLevel` doesn't affect players who already own it.

### Real-time Updates
Currently, changes require page refresh:
- Client caches game data on load
- Admin changes update files immediately
- Players need to refresh to see changes
- **Future**: WebSocket push for real-time updates

## Monitoring Metrics

Track these metrics for health monitoring:

1. **Operation Success Rate**
   - Target: > 99% for all CRUD operations
   - Alert if: < 95% over 5 minutes

2. **File Lock Duration**
   - Target: < 100ms average
   - Alert if: > 1s average or > 5s max

3. **Database Sync Success Rate**
   - Target: > 95% (not critical)
   - Alert if: < 80% over 1 hour

4. **JSON File Integrity**
   - Target: 100% valid JSON
   - Alert if: Any parse failures

5. **Concurrent Admin Sessions**
   - Track: How many admins editing simultaneously
   - Alert if: > 3 (possible contention)

## Common User Errors

### Error: "ID already exists"
**Cause**: User trying to create item with duplicate ID
**Fix**: Guide user to edit existing item instead
**Prevention**: Client-side ID uniqueness check

### Error: "Invalid JSON format"
**Cause**: User entering malformed JSON in textarea fields
**Fix**: Validate JSON before submit
**Prevention**: Visual JSON editor or form fields

### Error: "Changes not appearing"
**Cause**: Client cached old data
**Fix**: Force page refresh
**Prevention**: Cache invalidation or real-time updates

## Testing Scenarios

Test these scenarios regularly:

1. **Concurrent Creates**
   - Two admins create different items simultaneously
   - Expected: Both succeed, no data loss

2. **Concurrent Edits (Same Item)**
   - Two admins edit same item simultaneously
   - Expected: Last write wins (documented behavior)

3. **Create During Database Down**
   - Database connection fails
   - Expected: JSON still updates, sync failure logged

4. **Server Crash During Write**
   - Server crashes mid-operation
   - Expected: Lock released on restart, JSON either old or new (atomic)

5. **Malformed Input**
   - User submits invalid data
   - Expected: Validation error before file write

## Rollback Procedures

If admin makes a mistake:

1. **Recent Change (< 1 hour)**
   - Check Git history: `git log main-gamedata/`
   - Restore file: `git checkout HEAD~1 main-gamedata/progressive-data/[module]/[id].json`

2. **Database Backup**
   - Query latest good state from database
   - Write to JSON file manually

3. **Full Directory Backup**
   - Keep daily snapshots: `tar -czf backup-$(date +%Y%m%d).tar.gz main-gamedata/`
   - Restore: `tar -xzf backup-YYYYMMDD.tar.gz`

## Performance Considerations

- Each operation is file I/O bound (not CPU)
- Lock contention only occurs on same file
- Database sync is async and non-blocking
- Expected throughput: 100+ operations/second
- Bottleneck: Disk I/O speed

## Security Notes

1. **Admin Route Protection**
   - All routes check `isAdmin` flag
   - Session-based authentication required
   - No public access to admin endpoints

2. **File Path Validation**
   - IDs sanitized to prevent directory traversal
   - Only alphanumeric and hyphens allowed
   - No `../` or absolute paths accepted

3. **Input Sanitization**
   - All user input validated server-side
   - JSON structure validated before write
   - File size limits enforced

## Next Steps for LunaBug

1. **Implement Monitoring**
   - Add metrics collection for lock duration
   - Track operation success rates
   - Alert on anomalies

2. **Auto-Recovery**
   - Clear stale locks on startup
   - Repair corrupted JSON files
   - Sync database from JSON on demand

3. **Enhanced Diagnostics**
   - Add admin health dashboard
   - Show lock queue in real-time
   - Display sync status per module

4. **Audit Trail**
   - Log all admin actions
   - Track who changed what when
   - Enable rollback to specific versions
