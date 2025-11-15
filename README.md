=============================================
ClassikLust AI Tap Game Interactive 
-
Below is a full comprehensive directory structure layout with complete API routing, pathing and features
!

Last Updated: Steven 11-15-2025
=============================================
ClassikLustMain/
├── client/                    # Frontend React application
├── server/                    # Backend Express server
├── shared/                    # Shared types and schemas
├── LunaBug/                   # Debug/admin AI assistant system
├── main-gamedata/             # Game configuration and data (SSOT)
├── uploads/                   # User uploaded content
├── logs/                      # Application logs
├── migrations/                # Database migration scripts
└── docs/                      # Documentation
-
==============================
-
client/
├── src/
│   ├── components/            # React components
│   │   ├── adminmenu-core/    # Admin panel components
│   │   ├── menu-core/         # Game menu components
│   │   └── ui/                # Reusable UI components
│   ├── contexts/              # React contexts (game state, auth)
│   ├── hooks/                 # Custom React hooks
│   ├── pages/                 # Page components
│   ├── utils/                 # Utility functions
│   └── lib/                   # External library configurations
└── public/                    # Static assets
-
==============================
-
server/
├── routes/                    # API route handlers
│   ├── admin.ts               # Admin CRUD operations
│   ├── player-routes.mjs      # Player game actions (ESM)
│   ├── admin-routes.mjs       # Legacy admin routes (ESM)
│   ├── lunabug.mjs            # LunaBug API routes (ESM)
│   └── debug.ts               # Debug endpoints
├── middleware/                # Express middleware
├── utils/                     # Server utilities
├── index.ts                   # Main server entry point
├── storage.ts                 # File-based storage layer
├── routes.ts                  # Core game API routes
├── app.ts                     # Express app configuration
└── gameConfig.ts              # Game configuration loader
-
==============================
-
main-gamedata/
└── progressive-data/          # All game configuration
    ├── upgrades/              # Upgrade definitions
    │   └── [upgrade-id].json
    ├── characters/            # Character definitions
    │   └── [character-id].json
    ├── levelup/               # Level progression data
    │   └── level-[N].json
    ├── tasks/                 # Task definitions
    │   └── [task-id].json
    └── achievements/          # Achievement definitions
        └── [achievement-id].json
-
==============================
-
LunaBug/
├── core/                      # Core LunaBug system
│   ├── LunaBug.mjs            # Main LunaBug class
│   ├── PluginManager.mjs      # Plugin system
│   ├── CommandRegistry.mjs    # Command registration
│   └── EventBus.mjs           # Event system
├── plugins/                   # LunaBug plugins
│   ├── SchemaEditor/          # Schema editing plugin ✅
│   ├── DataValidator/         # Data validation plugin
│   ├── PerformanceMonitor/    # Performance tracking
│   └── BackupManager/         # Backup/restore plugin
├── config/                    # LunaBug configuration
│   ├── default.json           # Default config
│   └── plugins.json           # Plugin registry
├── interface/                 # UI interfaces
├── utils/                     # LunaBug utilities
└── init.js                    # Initialization script
-
==============================
-
uploads/
├── characters/                # Character images
│   └── [character-id]/        # Images for each character
│       ├── [image-name].png
│       └── [image-name].json  # Image metadata
└── icons/                     # Upgrade/item icons
    └── [icon-name].png
-
==============================
API Routing Diagram Overview
==============================

This document maps all API endpoints, their purposes, request/response formats, and data flow.
==============================
Admin API Routes
==============================

Base Path: /api/admin
==============================
Upgrades Management
==============================

GET    /api/admin/upgrades
       Purpose: Get all upgrades
       Auth: Admin only
       Response: { success: boolean, upgrades: Upgrade[] }

POST   /api/admin/upgrades
       Purpose: Create new upgrade
       Auth: Admin only
       Body: { id: string, name: string, type: string, cost: number,.. }
       Response: { success: boolean, upgrade: Upgrade }

PUT    /api/admin/upgrades/:id
       Purpose: Update existing upgrade
       Auth: Admin only
       Body: Partial<Upgrade>
       Response: { success: boolean }

DELETE /api/admin/upgrades/:id
       Purpose: Delete upgrade
       Auth: Admin only
       Response: { success: boolean }
       
==============================       
Characters Management
==============================

GET    /api/admin/characters
       Purpose: Get all characters
       Auth: Admin only
       Response: { success: boolean, characters: Character[] }

POST   /api/admin/characters
       Purpose: Create new character
       Auth: Admin only
       Body: { id: string, name: string, rarity: string, ... }
       Response: { success: boolean, character: Character }

PUT    /api/admin/characters/:id
       Purpose: Update existing character
       Auth: Admin only
       Body: Partial<Character>
       Response: { success: boolean }

DELETE /api/admin/characters/:id
       Purpose: Delete character
       Auth: Admin only
       Response: { success: boolean }
       
==============================
Levels Management
==============================

GET    /api/admin/levels
       Purpose: Get all level configurations
       Auth: Admin only
       Response: { success: boolean, levels: Level[] }

POST   /api/admin/levels
       Purpose: Create new level
       Auth: Admin only
       Body: { level: number, lpCost: number, requirements: [], unlocks:        [], rewards: {} }
       Response: { success: boolean, level: Level }

PUT    /api/admin/levels/:id
       Purpose: Update level configuration
       Auth: Admin only
       Body: Partial<Level>
       Response: { success: boolean }

DELETE /api/admin/levels/:id
       Purpose: Delete level
       Auth: Admin only
       Response: { success: boolean }

==============================
Tasks Management
==============================

GET    /api/admin/tasks
POST   /api/admin/tasks
PUT    /api/admin/tasks/:id
DELETE /api/admin/tasks/:id
       Purpose: CRUD operations for tasks
       Auth: Admin only

==============================
Achievements Management
==============================

GET    /api/admin/achievements
POST   /api/admin/achievements
PUT    /api/admin/achievements/:id
DELETE /api/admin/achievements/:id
       Purpose: CRUD operations for achievements
       Auth: Admin only

==============================
Images Management
==============================

GET    /api/admin/images
       Purpose: List all uploaded images
       Auth: Admin only
       Response: { success: boolean, images: ImageInfo[] }

DELETE /api/admin/images/:filename
       Purpose: Delete uploaded image
       Auth: Admin only
       Response: { success: boolean }

==============================
Player API Routes
==============================

Base Path: /api
==============================
Player State

GET    /api/player
       Purpose: Get current player state
       Auth: User token
       Response: { success: boolean, player: PlayerState }

POST   /api/player/update
       Purpose: Update player properties
       Auth: User token
       Body: Partial<PlayerState>
       Response: { success: boolean, player: PlayerState }

POST   /api/player/select-character
       Purpose: Set active character
       Auth: User token
       Body: { characterId: string }
       Response: { success: boolean, player: PlayerState }


==============================
Game Actions
==============================

POST   /api/tap
       Purpose: Handle tap/click action
       Auth: User token
       Body: { tapCount?: number }
       Response: { 
         success: boolean, 
         pointsGained: number,
         lustPoints: number,
         lustGems: number,
         energyUsed: number,
         currentEnergy: number
       }

POST   /api/purchase-upgrade
       Purpose: Buy an upgrade
       Auth: User token
       Body: { upgradeId: string }
       Response: { success: boolean, upgrade: PlayerUpgrade }

POST   /api/level-up
       Purpose: Advance to next level
       Auth: User token
       Response: { 
         success: boolean,
         level: number,
         rewards: LevelRewards
       }
       
==============================       
Configuration Loading
==============================

GET    /api/upgrades
       Purpose: Get all available upgrades
       Auth: Optional
       Response: { success: boolean, upgrades: Upgrade[] }

GET    /api/characters
       Purpose: Get all available characters
       Auth: Optional
       Response: { success: boolean, characters: Character[] }

GET    /api/levels
       Purpose: Get level progression data
       Auth: Optional
       Response: { success: boolean, levels: Level[] }

GET    /api/tasks
       Purpose: Get all tasks
       Auth: Optional
       Response: { success: boolean, tasks: Task[] }

GET    /api/achievements
       Purpose: Get all achievements
       Auth: Optional
       Response: { success: boolean, achievements: Achievement[] }

==============================
File Uploads
==============================

POST   /api/upload
       Purpose: Upload character image
       Auth: Admin only
       Body: FormData with image file
       Query: characterId, hidden, event, chatSendPercent
       Response: { success: boolean, path: string, metadata: ImageMetadata }

PUT    /api/upload/:filename
       Purpose: Update image metadata
       Auth: Admin only
       Body: { hidden?, event?, chatSendPercent? }
       Response: { success: boolean }

==============================
LunaBug API Routes
==============================

Base Path: /api/luna
==============================

POST   /api/luna/execute
       Purpose: Execute Luna command
       Auth: Admin only
       Body: { command: string, args?: any[] }
       Response: { success: boolean, result: any, logs: string[] }

GET    /api/luna/commands
       Purpose: Get list of available commands
       Auth: Admin only
       Response: { 
         success: boolean, 
         commands: CommandInfo[],
         plugins: PluginInfo[]
       }

GET    /api/luna/status
       Purpose: Get LunaBug system status
       Auth: Admin only
       Response: { 
         success: boolean,
         initialized: boolean,
         plugins: PluginStatus[],
         stats: SystemStats
       }

POST   /api/luna/plugin/:pluginName/:action
       Purpose: Control individual plugins
       Auth: Admin only
       Actions: enable, disable, reload, configure
       Response: { success: boolean, status: PluginStatus }

==============================
Debug API Routes (Development Only)
==============================

Base Path: /api/debug
==============================

GET    /api/debug/state
       Purpose: Get server state snapshot
       Response: { gameData, playerCount, systemInfo }

POST   /api/debug/reset-player
       Purpose: Reset player progress
       Body: { userId: string }
       Response: { success: boolean }

GET    /api/debug/logs
       Purpose: Get recent log entries
       Query: level, limit
       Response: { logs: LogEntry[] }

==============================
Data Flow Diagrams
==============================

Admin Update Flow
==============================

Admin UI (React)
    ↓ POST /api/admin/upgrades
Server (routes/admin.ts)
    ↓ Validate request
    ↓ Lock file
    ↓ Read current data
    ↓ Merge changes
    ↓ Write to file (main-gamedata/)
    ↓ Sync to DB (optional)
    ↓ Release lock
    ↓ Return success
Admin UI
    ↓ Update local state
    ↓ Show success message

==============================
Player Action Flow
==============================

Game UI (React)
    ↓ POST /api/tap
Server (routes.ts)
    ↓ Authenticate user
    ↓ Load player state
    ↓ Load game config
    ↓ Calculate results
    ↓ Update player state
    ↓ Save to file
    ↓ Return results
Game UI
    ↓ Update displayed stats
    ↓ Show animations

==============================
LunaBug Command Flow
==============================

Console UI
    ↓ POST /api/luna/execute
Server (routes/lunabug.mjs)
    ↓ Verify admin auth
    ↓ Parse command
LunaBug Core
    ↓ Find command handler
    ↓ Load required plugin
Plugin
    ↓ Execute command
    ↓ Perform operations
    ↓ Return results
Console UI
    ↓ Display output
    ↓ Update state if needed
    
==============================    
Authentication & Authorization
==============================

Auth Flow
==============================

1. User logs in → POST /api/login
2. Server validates credentials
3. Server generates JWT token
4. Token stored in localStorage
5. All requests include: Authorization: Bearer <token>
6. Server validates token on protected routes

==============================
Role-Based Access
==============================

    Guest: Can view public game data

    User: Can play game, access own data

    Admin: Full access to admin panel and LunaBug

==============================
Error Handling
==============================

Standard Error Response
==============================

{
  "success": false,
  "error": "Human readable error message",
  "details": "Technical details (dev mode only)",
  "code": "ERROR_CODE"
}

==============================
Common Error Codes
==============================


    AUTH_REQUIRED - Missing or invalid token

    PERMISSION_DENIED - Insufficient permissions

    NOT_FOUND - Resource not found

    VALIDATION_ERROR - Invalid request data

    SERVER_ERROR - Internal server error

    FILE_LOCKED - Resource temporarily unavailable

==============================
Rate Limiting (Planned)
==============================

/api/tap           - 60 requests/minute
/api/purchase-*    - 30 requests/minute
/api/admin/*       - 120 requests/minute
/api/luna/*        - 20 requests/minute

==============================
WebSocket Events (Future)
==============================

connection        - Client connects
disconnect        - Client disconnects
player-update     - Broadcast player state changes
game-event        - Broadcast game events
admin-action      - Notify admins of changes

==============================
API Versioning
==============================

Current: No versioning (v1 implied)
Future: /api/v2/... for breaking changes
Performance Considerations
==============================

    Caching: Config data cached in memory

    File Locking: Prevents race conditions on writes

    Lazy Loading: Large data loaded on demand

    Pagination: Coming soon for large lists

    Compression: gzip enabled for responses

==============================
Security Measures
==============================

    Input Validation: All inputs validated with Zod schemas

    SQL Injection: N/A (file-based storage)

    Path Traversal: File paths sanitized

    CSRF: Tokens required for state-changing operations

    Rate Limiting: Planned implementation

    Audit Logging: All admin actions logged
    
==============================
Testing Endpoints
Use these for testing:
==============================

    GET /api/health - Server health check

    GET /api/version - API version info

    GET /api/config - Public game config

Last Updated: November 13, 2025



==============================
Data Flow
==============================

Admin Panel → Game Data
==============================
    Admin edits config via Admin Panel UI

    Request sent to /api/admin/* endpoints

    Server validates and saves to main-gamedata/

    Optional: Syncs to database

    Players receive updates on next load

==============================
Player Actions → State Updates
==============================

    Player performs action (tap, buy upgrade)

    Request sent to /api/player/* or /api/* endpoints

    Server validates action

    Player state saved to players/[user-id].json

    Response sent back with updated state
    
==============================
LunaBug Operations
==============================

    Admin opens Luna console

    Commands sent to /api/luna/*

    LunaBug processes command via plugins

    Results returned to console viewer

    Changes saved if applicable

==============================
Key File Locations
==============================

Configuration
==============================

    package.json - Dependencies and scripts

    tsconfig.json - TypeScript configuration

    vite.config.ts - Vite build configuration

    drizzle.config.ts - Database configuration
    
==============================
Game Data Entry Points
==============================

    server/gameConfig.ts - Loads all game data

    server/storage.ts - Storage abstraction layer

    shared/schema.ts - Type definitions for all data
    
==============================
Important Utilities
==============================

    client/src/utils/iconPaths.ts - Icon path resolution

    server/utils/* - Server-side utilities

    LunaBug/utils/* - LunaBug utilities

==============================
Module System
==============================

TypeScript/ESM Files (.ts, .mts, .tsx)
==============================

    All client code

    Most server code

    Shared types

==============================
ESM JavaScript (.mjs)
==============================

    Server route files (converted from .js)

    LunaBug core and plugins

    Some utility files
    
==============================    
Legacy (.js) - Being Phased Out
==============================

    Old migration scripts

    Temporary files

    Will be converted or removed
    
==============================    
Notes
==============================

    Single Source of Truth: main-gamedata/progressive-data/ contains all game configuration

    Player Data: Stored separately in players/ directory

    Type Safety: All data structures defined in shared/schema.ts

    Hot Reload: Vite handles client hot reload, nodemon for server

    Build Output: Production builds go to dist/
    