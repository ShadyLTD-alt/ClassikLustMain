# Design Guidelines: AI Character Interactive Tap Game

## Design Approach
**Reference-Based**: Drawing inspiration from successful gacha and idle games (Genshin Impact, Honkai: Star Rail, AFK Arena) with emphasis on character-centric design, clear progression systems, and premium mobile game aesthetics adapted for web.

## Core Design Principles
1. Character-First Display: Main tap area dominates viewport with character as focal point
2. Layered Information Architecture: Primary stats always visible, upgrades accessible via tabs/modals
3. Progressive Disclosure: Show essential info upfront, detailed mechanics on interaction
4. Visual Feedback: Every action (tap, upgrade, unlock) triggers satisfying visual response

## Typography System
- **Display/Headers**: Bold, rounded sans-serif with slight letter-spacing for game feel (e.g., Outfit, Montserrat)
- **UI Labels**: Medium weight sans-serif, all-caps for category headers
- **Numbers/Stats**: Tabular figures, slightly larger weight for emphasis
- **Body Text**: Clean sans-serif for descriptions and details

Hierarchy:
- Level indicators: text-4xl to text-5xl font-bold
- Stat values: text-2xl to text-3xl font-semibold
- Upgrade costs: text-xl font-medium
- Labels: text-sm to text-base font-medium uppercase tracking-wide
- Descriptions: text-sm to text-base

## Layout System
**Spacing Primitives**: Consistent use of 2, 4, 6, 8, 12, 16 unit increments (p-2, m-4, gap-6, space-y-8, etc.)

**Screen Structure**:
- **Main Game Area** (60-70% viewport): Character display + tap interaction zone
- **Stats Bar** (Top): Horizontal bar with energy, points, level - fixed positioning
- **Upgrade Panel** (Right sidebar OR bottom sheet on mobile): Scrollable upgrade list
- **Character Gallery**: Full-screen overlay modal with grid layout

## Component Library

### Primary Game Interface
**Character Display Card**:
- Large centered character image (500-700px width on desktop)
- Rounded corners with subtle elevation shadow
- Character name badge overlay (bottom or top corner)
- Tap ripple effect emanates from click position
- Smooth scale animation on tap (scale: 0.98)

**Stats Header Bar**:
- Full-width sticky positioning (top-0)
- Flex layout: Energy | Points | Level/XP
- Each stat in bordered card segment with icon + value + label
- Energy displays as fraction (current/max) with progress bar
- Height: 16-20 units, background with subtle transparency

**Tap Counter Display**:
- Floating position near character
- Large animated numbers with counting effect
- Fade out after 1.5s
- Stacked for multiple rapid taps

### Upgrade System

**Upgrade Cards** (Per Tap, Per Hour, Energy Max):
- Card-based layout with distinct sections
- Header: Upgrade name + current level badge (e.g., "15/30")
- Body: Current bonus value prominently displayed
- Next level preview: "Next: +X" with arrow indicator
- Cost display with currency icon
- Purchase button: Full-width, disabled state when can't afford
- Progress bar showing level completion
- Spacing: p-6 for card padding, gap-4 for internal elements

**Upgrade Panel Layout**:
- Tab navigation at top (All | Per Tap | Per Hour | Energy)
- Scrollable card grid: grid-cols-1 on mobile, grid-cols-2 on desktop for upgrade panel
- Sticky section headers for category separation

### Character & Image Management

**Character Unlock Grid**:
- Grid layout: grid-cols-3 md:grid-cols-4 lg:grid-cols-6
- Square aspect ratio cards (aspect-square)
- Locked state: Grayscale filter with lock icon overlay + level requirement
- Unlocked state: Full color with subtle hover lift
- Current active character: Border highlight with glow effect

**Image Gallery Modal**:
- Full-screen overlay (fixed inset-0)
- Header: Character name + close button
- Filter tabs: All | Available | Locked | NSFW | VIP | Event | Random
- Image grid: grid-cols-2 md:grid-cols-4 lg:grid-cols-5
- Image cards: Square thumbnails with select indicator for active image
- Locked images: Partial blur with "Unlock at Level X" overlay

**Image Upload Interface**:
- Drag-drop zone with dashed border
- Checkbox group for categories (NSFW, VIP, Event, Random) with clear labels
- Upload button with loading state
- Preview grid below showing recent uploads with category badges
- Each preview: Thumbnail + category tags + delete action

**Character Gallery Selector**:
- Horizontal scrollable row of unlocked images for quick selection
- Active selection highlighted with border + checkmark
- Clicking updates main character display immediately

### Navigation & Controls

**Action Buttons**:
- Primary actions (Upgrade, Select): Rounded-xl, px-8, py-3
- Secondary actions (Cancel, Filter): Rounded-lg, px-6, py-2
- Icon buttons (Close, Delete): Square with p-2 to p-3
- Button states: Hover lift (translate-y-1), active press (scale-95)

**Modal/Overlay Pattern**:
- Backdrop: Semi-transparent overlay with backdrop-blur
- Modal content: Centered, max-w-7xl, rounded-2xl
- Modal header: Sticky with title + action buttons
- Modal body: Scrollable with max-h-[80vh]
- Close button: Absolute top-right position

## Images & Visual Assets

**Character Images**:
- Main display: High-quality character art (minimum 800x1200px recommended)
- Gallery thumbnails: Square crops (300x300px displayed)
- Unlockable images per character showcasing different poses/outfits

**Icons**:
- Use Heroicons exclusively via CDN
- Consistent icon sizing: w-5 h-5 for inline, w-6 h-6 for prominent
- Energy: Bolt/Lightning icon
- Points: Star or Currency icon
- Level: Trophy or Badge icon
- Lock: LockClosed icon

**Hero Section**: None - this is a game UI where the character display serves as the primary visual focal point

## Responsive Strategy

**Desktop (lg+)**:
- Three-column layout: Stats top, Character center, Upgrades right sidebar
- Upgrade sidebar: w-96 to w-[400px]
- Modal galleries: 5-6 columns

**Tablet (md)**:
- Two-column: Character left (60%), Upgrades right (40%)
- Stats remain top bar
- Modal galleries: 3-4 columns

**Mobile (base)**:
- Single column stack
- Stats condensed but still sticky top
- Character display slightly smaller
- Upgrades as bottom sheet drawer (slide up)
- Modal galleries: 2-3 columns

## Animation Guidelines

Use sparingly for gameplay feedback only:
- Tap ripple effect (scale + opacity)
- Number counter increment
- Level up celebration (brief confetti or particle burst)
- Character image transition (fade crossfade)
- Unlock reveal (scale in with fade)
- Energy regeneration pulse (subtle glow)

Avoid: Continuous animations, parallax, unnecessary scroll effects

## State Management Display

**Energy Bar**:
- Progress bar showing current/max
- Visual indicator when full
- Depletes with taps, regenerates over time
- Display recharge rate near bar

**Level Progress**:
- XP bar with current/required points
- Level number prominently displayed
- "Level Up!" notification when threshold reached

**Upgrade Affordability**:
- Clear disabled state when insufficient points
- Green/enabled when purchasable
- Cost displayed with comparison to current points

This design creates a polished, character-focused idle game experience with clear progression systems and intuitive image management, optimized for extended play sessions.