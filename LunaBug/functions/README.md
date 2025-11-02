# 🌙 LunaBug Auto-Discovery Function System

**Drop JSON files here and LunaBug automatically loads them!**

## 🚀 How It Works

1. **Create** a `.json` file in this directory
2. **LunaBug** automatically detects and loads it on next boot
3. **Functions** become available in `window.LunaBug.functions`
4. **No restart needed** - hot-reloads in development

## 📝 JSON Function Format

```json
{
  "name": "functionName",
  "version": "1.0.0",
  "description": "What this function does",
  "category": "database|ui|api|performance|security|debug",
  "autoLoad": true,
  "triggers": ["pattern1", "pattern2"],
  "config": {
    "enabled": true,
    "priority": "medium",
    "dependencies": ["module1", "module2"]
  },
  "function": {
    "type": "analysis|fix|monitor|enhance",
    "input": {
      "schema": "Expected input format",
      "required": ["field1", "field2"]
    },
    "output": {
      "schema": "Expected output format"
    },
    "implementation": "javascript_code_as_string"
  }
}
```

## 🎯 Example Functions

- `camelcase-detector.json` - Detects camelCase vs snake_case issues
- `energy-validator.json` - Validates energy calculations
- `database-optimizer.json` - Suggests query optimizations
- `ui-performance.json` - Analyzes React component performance
- `error-classifier.json` - Categorizes and suggests fixes for errors

## 🔄 Hot-Reload Features

- **File Watcher**: Detects new `.json` files automatically
- **Version Check**: Only reloads if version changed
- **Dependency Check**: Ensures required modules are available
- **Error Handling**: Invalid JSONs don't crash LunaBug

## 🎮 Usage Examples

```javascript
// Access loaded functions
window.LunaBug.functions.list()           // Show all loaded functions
window.LunaBug.functions.run('myFunc', data)  // Execute a function
window.LunaBug.functions.reload()         // Reload all JSON files
```

## 🐛 Workflow Benefits

1. **See bug** while coding
2. **Write JSON** function to detect/fix it
3. **Drop in folder** - LunaBug auto-loads
4. **Keep coding** - function now available
5. **No interruption** to development flow

**Perfect for rapid prototyping and continuous improvement!** 🚀✨