# AI Character Interactive Tap Game

## Overview

This is an idle clicker/tap game built with a character-collection gacha-style interface. Players tap to earn points, purchase upgrades to increase their income, unlock new characters as they level up, and manage energy resources. The game features a progression system based on upgrade levels, character unlocking at specific milestones, and an image gallery system for character customization.

The application is designed as a single-page web game with local storage persistence, featuring an admin panel for configuration management and a mobile-first responsive design inspired by games like Genshin Impact and AFK Arena.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript using Vite as the build tool and development server.

**UI Component System**: Shadcn/ui component library built on Radix UI primitives with Tailwind CSS for styling. The design system emphasizes:
- Character-first display with the main tap area dominating the viewport
- Layered information architecture with sticky stats header
- Progressive disclosure using tabs, modals, and sheets
- Consistent spacing primitives using Tailwind's utility classes

**State Management**: Context API via `GameContext` that provides centralized game state including:
- Player progression (points, energy, level, experience)
- Upgrade levels and character unlocks
- Selected character and image customization
- Admin mode toggle for configuration editing

**Game Loop**: Client-side energy regeneration and passive income calculated via `useEffect` intervals in the GameContext. Energy regenerates at a configurable rate, and passive income is capped and applied periodically.

**Routing**: Wouter for lightweight client-side routing (currently single-page with Game component as primary route).

**Component Structure**:
- `StatsHeader`: Displays energy, points, level with progress bars
- `CharacterDisplay`: Main tap interaction area with tap effect animations
- `BottomNav`: Tab-based navigation for upgrades, characters, and level-up
- `UpgradePanel`: Filterable upgrade cards with purchase functionality
- `CharacterGallery`: Grid display of unlockable characters with rarity indicators
- `ImageUploader`: Character image management with category filtering
- `AdminPanel`: Configuration editor for upgrades, characters, levels, and themes

### Backend Architecture

**Server Framework**: Express.js running on Node.js with TypeScript.

**API Design**: RESTful endpoints for file uploads. Currently minimal backend with primary route:
- `POST /api/upload`: Handles character image uploads using Multer middleware with file validation (images only, 10MB limit)

**Session Management**: Placeholder session infrastructure using `connect-pg-simple` for PostgreSQL session storage (session routes not yet implemented in provided code).

**Static File Serving**: Development mode uses Vite middleware for HMR; production serves built static assets from `dist/public`.

**File Storage**: Uploaded images stored in local `uploads/` directory with unique timestamped filenames.

### Data Storage Solutions

**Database ORM**: Drizzle ORM configured for PostgreSQL with the Neon serverless driver.

**Schema**: Full PostgreSQL schema using Supabase including:
- `players`: Player progression data (points, energy, level, upgrades, unlocked characters)
- `upgrades`: Game upgrade definitions synced from JSON files
- `characters`: Character definitions synced from JSON files
- `levels`: Level progression requirements synced from JSON files
- `mediaUploads`: Uploaded character images with metadata (characterId, url, type, unlockLevel, categories, poses)
- `sessions`: Player authentication sessions
- `playerUpgrades`, `playerCharacters`: Junction tables for player progression

**Game Configuration**: Dual-persistence strategy using both JSON files and database:
- `main-gamedata/progressive-data/upgrades/*.json`: Upgrade configurations with cost curves and value increments
- `main-gamedata/progressive-data/levelup/*.json`: Level requirements and unlock conditions
- `main-gamedata/character-data/*.json`: Character definitions with unlock levels and rarity
- JSON files are synced to database on server startup via `syncAllGameData()`

**Configuration Management**: Admin panel now uses backend API endpoints to:
- Create/update/delete upgrades, characters, and levels
- Save changes to both database AND JSON files via `saveUpgradeToJSON()`, `saveCharacterToJSON()`, `saveLevelToJSON()`
- Ensure data persistence across server restarts

**Data Persistence Strategy**: 
- Player progression synced to Supabase database in real-time
- Game configurations stored in database and synced to JSON files for version control
- Image uploads saved to disk with metadata in `mediaUploads` table
- All data persists across server restarts
- Admin edits persist to both database and JSON files

### Authentication and Authorization

**Current State**: User schema exists but no authentication routes are implemented. The `storage.ts` file provides in-memory user storage interface but is not actively used.

**Admin Access**: Admin mode is toggled client-side via UI button with no server-side validation. Admin state persisted in localStorage.

**Planned Pattern**: Session-based authentication using express-session with PostgreSQL session store (infrastructure present but not connected).

## External Dependencies

### Third-Party UI Libraries
- **Radix UI**: Headless component primitives for accessible UI patterns (dialogs, dropdowns, tabs, etc.)
- **Shadcn/ui**: Pre-styled component library built on Radix UI with Tailwind CSS
- **Framer Motion**: Animation library for tap effects and transitions
- **Lucide React**: Icon library for UI icons

### Database and ORM
- **Neon Serverless**: PostgreSQL database provider optimized for serverless environments
- **Drizzle ORM**: TypeScript-first ORM for database access with Zod integration for schema validation
- **Drizzle Kit**: Migration and schema management CLI tool

### Development Tools
- **Vite**: Frontend build tool and dev server with HMR support
- **TailwindCSS**: Utility-first CSS framework with custom design system configuration
- **TypeScript**: Type-safe development across client and server
- **Replit Plugins**: Development environment plugins for runtime error overlay, cartographer, and dev banner

### Data Management
- **TanStack Query**: Server state management and caching (configured but minimal usage in current implementation)
- **React Hook Form**: Form state management with Zod resolver integration
- **Zod**: Schema validation for forms and API data

### File Handling
- **Multer**: Express middleware for multipart/form-data file uploads with disk storage

### Utilities
- **date-fns**: Date manipulation and formatting
- **clsx + tailwind-merge**: Conditional className management
- **cmdk**: Command palette component (imported but not actively used)
- **nanoid**: Unique ID generation

### Fonts
- **Google Fonts**: Outfit and Montserrat font families for game-like typography matching design guidelines