# Quick Fix Instructions

## Fix 1: Replace executeConsoleCommand

Find the `executeConsoleCommand` function and replace it with:

```typescript
const executeConsoleCommand = async (command: string) => {
  try {
    setConsoleHistory(prev => [...prev, command]);
    setHistoryIndex(-1);
    addLog('info', `> ${command}`);
    
    if (command.includes('luna.cli.')) {
      const methodMatch = command.match(/luna\.cli\.(\w+)\(/);
      if (methodMatch) {
        const method = methodMatch[1];
        addLog('info', `⏳ Executing ${method}...`);
        const response = await fetch(`/api/luna/${method}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) throw new Error(`Luna API error: ${response.statusText}`);
        const result = await response.json();
        const resultStr = typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result);
        addLog('info', `✅ ${resultStr}`);
      } else {
        addLog('error', '❌ Invalid luna.cli command format');
      }
    } else {
      const result = eval(command);
      if (result !== undefined) {
        const resultStr = typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result);
        addLog('info', `← ${resultStr}`);
      }
    }
  } catch (error: any) {
    addLog('error', `❌ ${error.message}`);
  }
};
```

## Fix 2: Move AI Settings Panel

Cut the entire `{showSettings && (` block and paste it right after the header div, before Quick Stats.

The order should be:
1. Header with AI Settings button
2. AI Settings panel (conditional)
3. Quick Stats
4. View Toggle
5. Console/Luna views
