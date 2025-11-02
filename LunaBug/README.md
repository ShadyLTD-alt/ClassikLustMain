# 🌙 LunaBug - Standalone AI Debugging System

**LunaBug** is a completely independent AI-powered debugging assistant for ClassikLust. She operates as a standalone system that monitors, logs, and debugs your game from the outside.

## 🚀 Key Features

### **Complete Independence**
- ✅ **Boots BEFORE React** - Initializes before game systems
- ✅ **Survives Game Crashes** - Keeps running even if GameContext fails
- ✅ **Emergency Mode** - Accessible via `window.LunaBug.emergency()`
- ✅ **No Dependencies** - Doesn't rely on game state or components

### **Comprehensive Monitoring**
- 🔍 **Database Module** - Monitors queries, schema issues, connection health
- 🎮 **Gameplay Module** - Tracks taps, achievements, upgrades, performance
- 🤖 **AI Integration** - Full Mistral API support for code analysis
- 📊 **Real-time Logging** - Everything is logged and cached locally

### **AI-Powered Debugging**
- 💬 **Chat Interface** - Ask LunaBug questions about your code
- 🐛 **Code Analysis** - Submit code + errors for AI-powered solutions
- 📚 **Memory Cache** - LunaBug remembers all debug sessions
- 🎯 **Smart Suggestions** - Context-aware debugging recommendations

## 📁 Directory Structure

```
LunaBug/
├── core/                 # Standalone system core
│   ├── DebuggerCore.js   # Main orchestrator
│   └── DebugPlugin.js    # Base plugin class
├── modules/              # Monitoring plugins
│   ├── DatabaseModule.js # Database monitoring
│   └── GameplayModule.js # Gameplay monitoring
├── interface/            # React UI components
│   └── MistralDebugger.tsx # Main debugging interface
├── logs/                 # Log storage
├── config/               # Configuration files
│   └── lunabug.json      # Main config
├── init.js              # Bootstrap system
└── README.md            # This file
```

## 🔧 How It Works

### **Bootstrap Sequence**
1. **LunaBug initializes FIRST** (before React loads)
2. **Modules register** in dependency order
3. **Global monitoring begins** (errors, performance, database)
4. **React loads** with LunaBug already watching
5. **Game integrates** with existing LunaBug instance

### **Emergency Access**
Even if your game completely breaks, LunaBug is still accessible:

```javascript
// In browser console:
window.LunaBug.emergency()  // Open emergency debugging overlay
window.LunaBug.logs()       // View all logs
window.LunaBug.status()     // System status report
window.LunaBug.clear()      // Clear logs
```

### **Module System**
Each module extends `DebugPlugin` and provides:
- `init(context)` - Initialize monitoring
- `run(command, data)` - Execute commands
- `stop()` - Clean shutdown

### **Data Collection**
LunaBug automatically collects:
- ❌ **All errors** (global, unhandled promises)
- 🐛 **Console output** (logs, warnings, errors)
- 🎯 **Tap events** (position, value, energy)
- 🏆 **Achievement unlocks**
- 📊 **Performance metrics** (FPS, memory, long tasks)
- 🔄 **Database queries** (success/failure, timing)
- 🔧 **Schema issues** (column mismatches, constraints)

## 🎮 Game Integration

### **AdminFAB Integration**
The floating admin button provides access to:
- 🌙 **LunaBug Debugger** - Full AI interface
- 📈 **Dev HUD** - Real-time stats from LunaBug
- 🎯 **Emergency Tools** - Direct access to LunaBug commands

### **GameContext Integration**
GameContext now includes:
- `calculateTapValue()` - Exposed for CharacterDisplay sync
- `lastTapValue` - Stores actual earned points per tap
- LunaBug event logging on key actions

## 🌟 Future Expansion

LunaBug is designed for easy expansion:
- 📱 **Telegram Integration Module** - Monitor bot interactions
- 🖼️ **Image Processing Module** - Monitor uploads/generation
- 📊 **Analytics Module** - Player behavior analysis
- 🔐 **Security Module** - Monitor for suspicious activity
- 🌐 **Network Module** - API performance monitoring

## 💡 Usage Tips

1. **Always check LunaBug first** when debugging issues
2. **Use the emergency mode** if React won't load
3. **Monitor the logs** for patterns in errors
4. **Ask LunaBug** to analyze your code before submitting PRs
5. **Export debug history** for team collaboration

---

*LunaBug: Your tireless debugging companion* 🌙✨