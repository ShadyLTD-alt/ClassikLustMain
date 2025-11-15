// LunaBug/plugins/luna/cli/errorQueueCommands.ts
/**
 * Luna CLI Commands for Error Queue
 * NO IMPORTS NEEDED - uses luna instance directly
 */

export function registerErrorQueueCommands(luna: any) {
  
  /**
   * list-errors - Display all errors with numbers
   */
  luna.cli.register('list-errors', async () => {
    const errors = luna.errorQueue.list();
    const pending = luna.errorQueue.listPending();
    const stats = luna.errorQueue.stats();

    if (errors.length === 0) {
      return {
        success: true,
        message: '✅ No errors detected!',
        data: { total: 0 }
      };
    }

    const output = [];
    output.push('🔍 ERROR QUEUE');
    output.push('='.repeat(60));
    output.push(`📊 Stats: ${pending.length} pending | ${stats.fixed} fixed | ${stats.ignored} ignored`);
    output.push('');

    // Group by status
    const pendingErrors = errors.filter(e => e.status === 'PENDING');
    const otherErrors = errors.filter(e => e.status !== 'PENDING');

    if (pendingErrors.length > 0) {
      output.push('🚨 PENDING ERRORS (sorted by severity):');
      output.push('');

      pendingErrors.forEach(err => {
        const icon = {
          CRITICAL: '🔴',
          HIGH: '🟠',
          MEDIUM: '🟡',
          LOW: '🟢'
        }[err.severity];

        const autofix = err.autoFixAvailable ? '🤖 Auto-fix available' : '🔧 Manual fix required';

        output.push(`${icon} #${err.number} [${err.severity}] ${err.type}`);
        output.push(`   📝 ${err.message}`);
        output.push(`   ${autofix}`);
        output.push('');
      });
    }

    if (otherErrors.length > 0) {
      output.push('');
      output.push('✅ PROCESSED:');
      otherErrors.forEach(err => {
        const statusIcon = {
          FIXED: '✅',
          MANUAL: '🔧',
          IGNORED: '⏭️'
        }[err.status] || '❓';

        output.push(`${statusIcon} #${err.number} ${err.type} - ${err.status}`);
      });
    }

    output.push('');
    output.push('💡 Commands:');
    output.push('   - fix <number> <action>  : Process error (action: auto/manual/ignore)');
    output.push('   - next-error            : Move to next error');
    output.push('   - clear-errors          : Clear all errors');

    return {
      success: true,
      message: output.join('\\n'),
      data: { errors, stats }
    };
  });

  /**
   * fix <number> <action> - Process a specific error
   */
  luna.cli.register('fix', async (args: string) => {
    // Parse args: "1 auto" or "2 manual" etc
    const parts = args.trim().split(/\\s+/);
    const number = parseInt(parts[0]);
    const action = parts[1];

    if (!number || !action) {
      return {
        success: false,
        error: 'Usage: fix <number> <action>\\nActions: auto, manual, ignore\\nExample: fix 1 auto'
      };
    }

    if (!['auto', 'manual', 'ignore'].includes(action)) {
      return {
        success: false,
        error: `Invalid action: ${action}. Use: auto, manual, or ignore`
      };
    }

    const result = await luna.errorQueue.process(number, action);

    if (result.success) {
      // Check if there's a next error
      const next = luna.errorQueue.next();
      
      let message = result.message;
      if (next) {
        message += `\\n\\n⏭️ Next Error:\\n#${next.number} [${next.severity}] ${next.type}\\n${next.message}`;
        message += `\\n💡 Run: fix ${next.number} <auto|manual|ignore>`;
      } else {
        message += '\\n\\n🎉 All errors processed!';
      }

      return {
        success: true,
        message,
        data: { processed: number, next: next?.number || null }
      };
    }

    return {
      success: false,
      error: result.message
    };
  });

  /**
   * next-error - Show current/next error details
   */
  luna.cli.register('next-error', async () => {
    const current = luna.errorQueue.current();

    if (!current) {
      return {
        success: true,
        message: '✅ No pending errors!',
        data: null
      };
    }

    const output = [];
    output.push(`🔍 Current Error: #${current.number}`);
    output.push('='.repeat(60));
    output.push(`📛 Type: ${current.type}`);
    output.push(`⚠️ Severity: ${current.severity}`);
    output.push(`📝 Message: ${current.message}`);
    output.push('');
    output.push(`📖 Description:\\n${current.description}`);
    output.push('');
    output.push(`🔧 Fix Instructions:\\n${current.fix}`);
    output.push('');
    
    if (current.autoFixAvailable) {
      output.push('🤖 Auto-fix is available!');
      output.push(`💡 Run: fix ${current.number} auto`);
    } else {
      output.push('🔧 Manual fix required');
      output.push(`💡 Run: fix ${current.number} manual (to mark as handled)`);
    }
    
    output.push(`⏭️ Or: fix ${current.number} ignore (to skip)`);

    return {
      success: true,
      message: output.join('\\n'),
      data: current
    };
  });

  /**
   * clear-errors - Clear all errors from queue
   */
  luna.cli.register('clear-errors', async () => {
    const stats = luna.errorQueue.stats();
    luna.errorQueue.clear();

    return {
      success: true,
      message: `✅ Cleared ${stats.total} errors from queue`,
      data: { cleared: stats.total }
    };
  });

  /**
   * auto-fix-all - Automatically fix all auto-fixable errors
   */
  luna.cli.register('auto-fix-all', async () => {
    const pending = luna.errorQueue.listPending();
    const autoFixable = pending.filter(e => e.autoFixAvailable);

    if (autoFixable.length === 0) {
      return {
        success: true,
        message: '✅ No auto-fixable errors in queue',
        data: { fixed: 0 }
      };
    }

    const results = [];
    for (const error of autoFixable) {
      const result = await luna.errorQueue.process(error.number, 'auto');
      results.push({
        number: error.number,
        type: error.type,
        success: result.success,
        message: result.message
      });
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    const output = [];
    output.push(`🤖 Auto-fix completed:`);
    output.push(`✅ Fixed: ${successful}`);
    output.push(`❌ Failed: ${failed}`);
    output.push('');

    results.forEach(r => {
      const icon = r.success ? '✅' : '❌';
      output.push(`${icon} #${r.number} ${r.type}`);
    });

    return {
      success: true,
      message: output.join('\\n'),
      data: { results, successful, failed }
    };
  });

  /**
   * error-stats - Show error queue statistics
   */
  luna.cli.register('error-stats', async () => {
    const stats = luna.errorQueue.stats();

    const output = [];
    output.push('📊 ERROR QUEUE STATISTICS');
    output.push('='.repeat(60));
    output.push(`📁 Total Errors: ${stats.total}`);
    output.push('');
    output.push('Status:');
    output.push(`  🚨 Pending: ${stats.pending}`);
    output.push(`  ✅ Fixed: ${stats.fixed}`);
    output.push(`  🔧 Manual: ${stats.manual}`);
    output.push(`  ⏭️ Ignored: ${stats.ignored}`);
    output.push('');
    output.push('Severity:');
    output.push(`  🔴 Critical: ${stats.critical}`);
    output.push(`  🟠 High: ${stats.high}`);
    output.push(`  🟡 Medium: ${stats.medium}`);
    output.push(`  🟢 Low: ${stats.low}`);

    return {
      success: true,
      message: output.join('\\n'),
      data: stats
    };
  });
}