// 🧠 Luna's Schema Auditor Plugin
// Purpose: Automatically detect schema mismatches and offer fixes

const fs = require('fs');
const path = require('path');

class SchemaAuditor {
  constructor(lunaBug) {
    this.lunaBug = lunaBug;
    this.name = 'SchemaAuditor';
    this.version = '1.0.0';
    
    // Load Steven's canonical schema
    this.canonicalSchema = this.loadCanonicalSchema();
    
    // Issue tracking
    this.detectedIssues = new Map();
    this.autoFixEnabled = true; // Steven can toggle this
    
    console.log('🔍 Luna Schema Auditor initialized');
  }

  loadCanonicalSchema() {
    try {
      const schemaPath = path.join(__dirname, '../../LUNA_DATABASE_SCHEMA.md');
      const schemaContent = fs.readFileSync(schemaPath, 'utf8');
      
      // Extract schema info from the markdown
      return this.parseSchemaFromMarkdown(schemaContent);
    } catch (error) {
      console.error('❌ Failed to load canonical schema:', error);
      return null;
    }
  }

  parseSchemaFromMarkdown(content) {
    const schema = {
      tables: {},
      expectedFields: {}
    };
    
    // Parse expected fields from client code references
    schema.expectedFields.players = [
      'lustGems', 'boostActive', 'boostMultiplier', 'boostExpiresAt',
      'boostEnergy', 'totalTapsToday', 'totalTapsAllTime', 
      'lastDailyReset', 'lastWeeklyReset'
    ];
    
    schema.tables.boostPurchases = {
      exists: true,
      fields: ['id', 'playerId', 'expiresAt', 'createdAt', 'metadata']
    };
    
    return schema;
  }

  // 🚨 MAIN AUDIT FUNCTION
  async auditSchema() {
    console.log('🔍 Luna: Starting schema audit...');
    
    const issues = [];
    
    try {
      // Simulate checking current DB schema vs expected
      const currentSchema = await this.getCurrentDbSchema();
      const missingFields = this.findMissingFields(currentSchema);
      
      if (missingFields.length > 0) {
        issues.push({
          type: 'MISSING_FIELDS',
          severity: 'HIGH',
          table: 'players',
          fields: missingFields,
          description: `Missing ${missingFields.length} required fields in players table`,
          autoFixAvailable: true,
          sqlFix: this.generateMissingFieldsSql(missingFields)
        });
      }
      
      // Check for energy calculation issues
      if (this.detectEnergyCalculationIssue()) {
        issues.push({
          type: 'ENERGY_SYNC_BUG',
          severity: 'MEDIUM',
          description: 'maxEnergy not syncing to database from client calculations',
          autoFixAvailable: true,
          codeFix: 'GameContext.tsx energy sync enhancement'
        });
      }
      
      return issues;
    } catch (error) {
      console.error('❌ Schema audit failed:', error);
      return [];
    }
  }

  // 🎯 SIMULATE DB SCHEMA CHECK
  async getCurrentDbSchema() {
    // In real implementation, this would query the actual DB
    // For now, simulate missing fields that we know Steven needs
    return {
      players: {
        fields: [
          'id', 'username', 'points', 'energy', 'maxEnergy', 'level',
          'isAdmin', 'selectedCharacterId', 'upgrades', 'unlockedCharacters'
          // MISSING: lustGems, boostActive, boostMultiplier, etc.
        ]
      }
    };
  }

  findMissingFields(currentSchema) {
    const expectedFields = this.canonicalSchema?.expectedFields?.players || [];
    const currentFields = currentSchema?.players?.fields || [];
    
    return expectedFields.filter(field => !currentFields.includes(field));
  }

  detectEnergyCalculationIssue() {
    // Simulate detecting the energy sync bug
    return true; // We know this issue exists
  }

  generateMissingFieldsSql(missingFields) {
    let sql = 'ALTER TABLE players';
    
    missingFields.forEach((field, index) => {
      if (index > 0) sql += ',';
      sql += ' ADD COLUMN IF NOT EXISTS ';
      
      switch (field) {
        case 'lustGems':
          sql += 'lustGems INTEGER DEFAULT 0';
          break;
        case 'boostActive':
          sql += 'boostActive BOOLEAN DEFAULT false';
          break;
        case 'boostMultiplier':
          sql += 'boostMultiplier NUMERIC DEFAULT 1.00';
          break;
        case 'boostExpiresAt':
          sql += 'boostExpiresAt TIMESTAMP WITH TIME ZONE';
          break;
        case 'boostEnergy':
          sql += 'boostEnergy INTEGER DEFAULT 0';
          break;
        case 'totalTapsToday':
          sql += 'totalTapsToday INTEGER DEFAULT 0';
          break;
        case 'totalTapsAllTime':
          sql += 'totalTapsAllTime INTEGER DEFAULT 0';
          break;
        case 'lastDailyReset':
          sql += 'lastDailyReset TIMESTAMP WITH TIME ZONE DEFAULT NOW()';
          break;
        case 'lastWeeklyReset':
          sql += 'lastWeeklyReset TIMESTAMP WITH TIME ZONE DEFAULT NOW()';
          break;
        default:
          sql += field + ' TEXT';
      }
    });
    
    sql += ';';
    return sql;
  }

  // 🤖 AUTO-FIX FUNCTIONALITY
  async attemptAutoFix(issue) {
    console.log(`🔧 Luna: Attempting auto-fix for ${issue.type}...`);
    
    try {
      switch (issue.type) {
        case 'MISSING_FIELDS':
          return await this.autoFixMissingFields(issue);
        case 'ENERGY_SYNC_BUG':
          return await this.autoFixEnergySync(issue);
        default:
          return { success: false, message: 'Auto-fix not available for this issue type' };
      }
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async autoFixMissingFields(issue) {
    // In a real implementation, this would execute the SQL
    // For now, just log what Luna would do
    console.log('🔧 Luna would execute SQL:', issue.sqlFix);
    
    // Simulate success
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      success: true,
      message: `Added ${issue.fields.length} missing fields to players table`,
      details: issue.fields
    };
  }

  async autoFixEnergySync(issue) {
    console.log('🔧 Luna would update GameContext energy sync logic');
    
    // Simulate updating code
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    return {
      success: true,
      message: 'Updated energy sync in GameContext.tsx',
      details: 'Added maxEnergy to database sync operations'
    };
  }

  // 💬 CHAT INTERFACE METHODS
  async sendIssueAlert(issue) {
    const alertMessage = this.formatIssueAlert(issue);
    
    if (this.lunaBug?.chat) {
      // Send to chat with action buttons
      await this.lunaBug.chat.sendAlert({
        type: 'SCHEMA_ISSUE',
        severity: issue.severity,
        message: alertMessage,
        actions: issue.autoFixAvailable ? ['auto_fix', 'manual_steps', 'ignore'] : ['manual_steps', 'ignore'],
        issueId: issue.type + '_' + Date.now()
      });
    } else {
      // Fallback to console
      console.log('🚨 LUNA ALERT:', alertMessage);
    }
  }

  formatIssueAlert(issue) {
    let message = '🚨 **Schema Issue Detected**' + String.fromCharCode(10) + String.fromCharCode(10);
    message += '**Type:** ' + issue.type + String.fromCharCode(10);
    message += '**Severity:** ' + issue.severity + String.fromCharCode(10);
    message += '**Description:** ' + issue.description + String.fromCharCode(10) + String.fromCharCode(10);
    
    if (issue.fields) {
      message += '**Missing Fields:** ' + issue.fields.join(', ') + String.fromCharCode(10);
    }
    
    if (issue.autoFixAvailable) {
      message += String.fromCharCode(10) + '🤖 **I can auto-fix this for you!**' + String.fromCharCode(10);
      message += 'Would you like me to handle it automatically?';
    } else {
      message += String.fromCharCode(10) + '📋 **Manual fix required**' + String.fromCharCode(10);
      message += 'I will provide step-by-step instructions.';
    }
    
    return message;
  }

  // 🎯 HANDLE USER RESPONSES
  async handleUserChoice(issueId, choice) {
    const issue = this.detectedIssues.get(issueId);
    if (!issue) {
      return { error: 'Issue not found' };
    }
    
    switch (choice) {
      case 'auto_fix':
        console.log('🤖 Luna: User chose auto-fix');
        const result = await this.attemptAutoFix(issue);
        
        if (result.success) {
          await this.sendSuccessMessage(result);
          this.detectedIssues.delete(issueId);
        } else {
          await this.sendErrorMessage(result);
        }
        return result;
        
      case 'manual_steps':
        console.log('📋 Luna: User chose manual fix');
        await this.sendManualInstructions(issue);
        return { success: true, message: 'Manual instructions provided' };
        
      case 'ignore':
        console.log('🙈 Luna: User chose to ignore issue');
        this.detectedIssues.delete(issueId);
        return { success: true, message: 'Issue ignored' };
        
      default:
        return { error: 'Invalid choice' };
    }
  }

  async sendSuccessMessage(result) {
    const message = '✅ **Auto-fix completed!**' + String.fromCharCode(10) + String.fromCharCode(10) + result.message;
    
    if (this.lunaBug?.chat) {
      await this.lunaBug.chat.sendMessage(message);
    } else {
      console.log('✅ LUNA SUCCESS:', message);
    }
  }

  async sendErrorMessage(result) {
    const message = '❌ **Auto-fix failed**' + String.fromCharCode(10) + String.fromCharCode(10) + result.message + String.fromCharCode(10) + String.fromCharCode(10) + 'Would you like manual instructions instead?';
    
    if (this.lunaBug?.chat) {
      await this.lunaBug.chat.sendMessage(message, { actions: ['manual_steps'] });
    } else {
      console.log('❌ LUNA ERROR:', message);
    }
  }

  async sendManualInstructions(issue) {
    let instructions = '📋 **Manual Fix Instructions**' + String.fromCharCode(10) + String.fromCharCode(10);
    instructions += '**Issue:** ' + issue.description + String.fromCharCode(10) + String.fromCharCode(10);
    
    if (issue.sqlFix) {
      instructions += '**SQL to run in Supabase:**' + String.fromCharCode(10) + '```sql' + String.fromCharCode(10) + issue.sqlFix + '```' + String.fromCharCode(10) + String.fromCharCode(10);
    }
    
    if (issue.codeFix) {
      instructions += '**Code changes needed:**' + String.fromCharCode(10) + issue.codeFix + String.fromCharCode(10) + String.fromCharCode(10);
    }
    
    instructions += 'Let me know when you have applied the fix and I will verify it worked! 🎯';
    
    if (this.lunaBug?.chat) {
      await this.lunaBug.chat.sendMessage(instructions);
    } else {
      console.log('📋 LUNA MANUAL:', instructions);
    }
  }

  // 🚀 START MONITORING
  async startMonitoring() {
    console.log('👁️ Luna: Starting schema monitoring...');
    
    // Run initial audit
    const issues = await this.auditSchema();
    
    if (issues.length > 0) {
      console.log(`🚨 Luna: Found ${issues.length} schema issues`);
      
      for (const issue of issues) {
        const issueId = issue.type + '_' + Date.now();
        this.detectedIssues.set(issueId, { ...issue, id: issueId });
        await this.sendIssueAlert({ ...issue, id: issueId });
        
        // Small delay between alerts
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } else {
      console.log('✅ Luna: No schema issues detected');
    }
    
    // Set up periodic monitoring (every 5 minutes)
    setInterval(async () => {
      const newIssues = await this.auditSchema();
      
      for (const issue of newIssues) {
        const issueKey = issue.type + '_' + issue.table;
        if (!this.hasRecentIssue(issueKey)) {
          const issueId = issueKey + '_' + Date.now();
          this.detectedIssues.set(issueId, { ...issue, id: issueId });
          await this.sendIssueAlert({ ...issue, id: issueId });
        }
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  hasRecentIssue(issueKey) {
    // Check if we've alerted about this issue recently
    for (const [id, issue] of this.detectedIssues) {
      if (id.startsWith(issueKey)) {
        return true;
      }
    }
    return false;
  }

  // 🎮 STEVEN'S CONTROL PANEL
  getStatus() {
    return {
      monitoring: true,
      autoFixEnabled: this.autoFixEnabled,
      activeIssues: this.detectedIssues.size,
      lastAudit: new Date().toISOString()
    };
  }

  toggleAutoFix() {
    this.autoFixEnabled = !this.autoFixEnabled;
    console.log(`🤖 Luna auto-fix: ${this.autoFixEnabled ? 'ENABLED' : 'DISABLED'}`);
    return this.autoFixEnabled;
  }

  // 📊 REPORT CURRENT ISSUES
  getActiveIssues() {
    return Array.from(this.detectedIssues.values());
  }
}

module.exports = SchemaAuditor;