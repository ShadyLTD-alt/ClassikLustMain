# Character UI System

Modular, player-facing character management system for ClassikLust game.

## Directory Structure

```
client/src/components/menu-core/character-ui/
├── CharacterSelection.tsx    # Select active/default character
├── CharacterGallery.tsx       # Browse & select character images
└── README.md                 # This file
```

## Components

### CharacterSelection.tsx

**Purpose:** Allows players to select their active/default character from unlocked characters.

**Features:**
- Display all unlocked characters in responsive grid
- Show lock/unlock status based on player level
- Highlight currently active character
- Visual feedback for selection
- Proper error handling

**Props:**
```typescript
interface CharacterSelectionProps {
  isOpen: boolean;    // Controls modal visibility
  onClose: () => void; // Callback to close modal
}
```

**API Endpoints Used:**
- `PATCH /api/player/active-character` - Set active character
  - Body: `{ characterId: string }`
  - Response: `{ success: boolean, activeCharacter: string }`

**Usage:**
```tsx
import CharacterSelection from '@/components/menu-core/character-ui/CharacterSelection';

function MyMenu() {
  const [showSelection, setShowSelection] = useState(false);
  
  return (
    <>
      <button onClick={() => setShowSelection(true)}>
        Select Character
      </button>
      
      <CharacterSelection
        isOpen={showSelection}
        onClose={() => setShowSelection(false)}
      />
    </>
  );
}
```

---

### CharacterGallery.tsx

**Purpose:** Browse character images and set display picture for the player.

**Features:**
- Filter images by character
- Display unlocked/locked images separately
- Set any unlocked image as display picture
- Show metadata badges (NSFW, VIP, type)
- Responsive grid layout
- Level-gated content

**Props:**
```typescript
interface CharacterGalleryProps {
  isOpen: boolean;    // Controls modal visibility
  onClose: () => void; // Callback to close modal
}
```

**API Endpoints Used:**
- `GET /api/player/images?characterId={id}` - Get character images
  - Response: `{ images: GalleryImage[] }`
  
- `POST /api/player/set-display-image` - Set display image
  - Body: `{ imageId: string, characterId: string }`
  - Response: `{ success: boolean, displayImage: string }`

**Image Data Structure:**
```typescript
interface GalleryImage {
  id: string;
  filename: string;
  path: string;
  characterId: string;
  type: string;
  unlockLevel?: number;
  isUnlocked: boolean;
  metadata: {
    nsfw: boolean;
    vip: boolean;
    poses: string[];
  };
}
```

**Usage:**
```tsx
import CharacterGallery from '@/components/menu-core/character-ui/CharacterGallery';

function MyMenu() {
  const [showGallery, setShowGallery] = useState(false);
  
  return (
    <>
      <button onClick={() => setShowGallery(true)}>
        Open Gallery
      </button>
      
      <CharacterGallery
        isOpen={showGallery}
        onClose={() => setShowGallery(false)}
      />
    </>
  );
}
```

---

## Design Principles

### Separation of Concerns
- **CharacterSelection** = Choose which character is active
- **CharacterGallery** = Choose which image represents that character
- These are separate flows and should remain independent

### No Mock Data
- All components use real API calls
- No synthetic/test data
- Proper loading states and error handling

### Modular & Reusable
- Self-contained components
- Can be used anywhere in the app
- No tight coupling to specific menus

### Player-Focused
- Only shows content player has unlocked
- Clear visual indicators for locked content
- Respects level requirements

---

## API Requirements

These backend endpoints must be implemented:

### 1. Set Active Character
```
PATCH /api/player/active-character
Body: { characterId: string }
Response: { success: boolean, activeCharacter: string }
```

### 2. Get Player Images  
```
GET /api/player/images?characterId={characterId}
Response: {
  images: Array<{
    id: string
    filename: string
    path: string
    characterId: string
    type: string
    unlockLevel: number
    isUnlocked: boolean
    metadata: {
      nsfw: boolean
      vip: boolean
      poses: string[]
    }
  }>
}
```

### 3. Set Display Image
```
POST /api/player/set-display-image
Body: { imageId: string, characterId: string }
Response: { success: boolean, displayImage: string }
```

---

## Integration Notes

### GameContext Requirements

Both components use `useGame()` hook which should provide:
```typescript
const { state, characters } = useGame();

// state should include:
{
  username: string;
  level: number;
  activeCharacter: string;
  // ... other player state
}

// characters array:
Character[] where Character = {
  id: string;
  name: string;
  defaultImage: string;
  unlockLevel?: number;
  // ... other character data
}
```

### Styling

Components use Tailwind CSS classes:
- Responsive design (mobile-first)
- Dark theme with purple/pink gradients
- Glassmorphism effects
- Smooth transitions and hover states

### Icons

Using `lucide-react` for icons:
- `Lock` - Locked content
- `Check` - Active selection
- `ImageIcon` - Gallery/image indicators

---

## File Organization

### Why `menu-core/character-ui/`?

- **menu-core** = Main game UI components
- **character-ui** = All character-related player UI
- Keeps related components together
- Easy to find and maintain
- Clear separation from admin tools

### Future Additions

This directory can house:
- `CharacterProfile.tsx` - Detailed character stats/info
- `CharacterAchievements.tsx` - Per-character achievements  
- `CharacterStats.tsx` - Character-specific statistics
- Any other character-focused player UI

---

## Migration from Old Components

### Obsolete Components (Mark as OLD_)

1. `CharacterSelectionScrollable.tsx` → Use `CharacterSelection.tsx`
2. Old `CharacterGallery.tsx` (if exists) → Use new `CharacterGallery.tsx`

**How to migrate:**
1. Rename old files with `OLD__` prefix
2. Update all imports to new components
3. Test thoroughly
4. Delete old files after confirmation

---

## Troubleshooting

### Images not loading?
- Check `/api/player/images` endpoint is working
- Verify images have correct `characterId` field
- Ensure images have valid `path` values
- Check player has proper unlock status

### Active character not updating?
- Verify `/api/player/active-character` endpoint exists
- Check GameContext updates on API success
- Look for WebSocket/polling to sync state

### Styling issues?
- Ensure Tailwind CSS is properly configured
- Check `lucide-react` is installed
- Verify z-index hierarchy (modals use z-50)

---

## Best Practices

1. **Always use real data** - No mocks, no synthetic data
2. **Handle errors gracefully** - Show user-friendly messages
3. **Loading states** - Always show spinners during API calls
4. **Accessibility** - Proper ARIA labels and keyboard navigation
5. **Mobile-first** - Responsive design from the start
6. **Performance** - Lazy load images, optimize renders

---

## Questions?

For issues or feature requests related to character UI components, document them clearly with:
- Component name
- Expected behavior
- Actual behavior
- Steps to reproduce
- Screenshots if applicable
