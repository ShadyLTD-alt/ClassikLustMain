import React, { useState } from 'react';
import { X, Wrench, Star, Users, Image, TrendingUp, Trophy, Terminal, Moon, Gallery } from 'lucide-react';

// Import module managers
import UpgradesManager from './upgrades/UpgradesCore';
import LevelupManager from './levelup/LevelupCore';
import CharactersManager from './characters/CharactersCore';
import AchievementsManager from './achievements/AchievementsCore';
import TasksManager from './tasks/TasksCore';
import ImageManager from './imageuploader/ImageUploaderCore';
import CharacterGallery from './character-gallery/CharacterGalleryCore';
import DevToolsManager from './devtools/DevToolsCore';

interface AdminMenuCoreProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'upgrades' | 'characters' | 'levels' | 'images' | 'gallery' | 'tasks' | 'achievements' | 'devtools';

/**
 * AdminMenuCore - Central admin panel management system
 * Coordinates all admin modules + Character Gallery + Luna DevTools
 */
export default function AdminMenuCore({ isOpen, onClose }: AdminMenuCoreProps) {
  const [activeTab, setActiveTab] = useState<TabType>('upgrades');

  if (!isOpen) return null;

  const tabs = [
    { id: 'upgrades' as TabType, label: 'Upgrades', icon: Wrench, color: 'purple' },
    { id: 'characters' as TabType, label: 'Characters', icon: Users, color: 'blue' },
    { id: 'levels' as TabType, label: 'Levels', icon: Star, color: 'yellow' },
    { id: 'images' as TabType, label: 'Upload', icon: Image, color: 'green' },
    { id: 'gallery' as TabType, label: '🖼️ Gallery', icon: Gallery, color: 'pink' },
    { id: 'tasks' as TabType, label: 'Tasks', icon: TrendingUp, color: 'orange' },
    { id: 'achievements' as TabType, label: 'Achievements', icon: Trophy, color: 'pink' },
    { id: 'devtools' as TabType, label: '🌙 Luna', icon: Moon, color: 'indigo' },
  ];

  return (
    <div 
      className="fixed inset-0 bg-black/80 flex items-center justify-center p-4"
      style={{ zIndex: 40, pointerEvents: 'auto' }}
    >
      <div className="bg-gray-900 rounded-xl w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl border border-purple-500/20">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gradient-to-r from-purple-900/30 to-blue-900/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center shadow-lg">
              <Wrench className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Admin Panel</h2>
              <p className="text-xs text-gray-400">Manage game configuration, players, and content</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            style={{ pointerEvents: 'auto' }}
          >
            <X className="w-5 h-5 text-gray-400 hover:text-white" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div 
          className="flex gap-2 p-4 border-b border-gray-800 overflow-x-auto bg-gray-900/50"
          style={{ pointerEvents: 'auto', position: 'relative', zIndex: 1 }}
        >
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => {
                console.log(`[ADMIN] Switching to tab: ${id}`);
                setActiveTab(id);
              }}
              style={{ pointerEvents: 'auto', cursor: 'pointer' }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap relative ${
                activeTab === id
                  ? 'bg-purple-600 text-white shadow-lg scale-105'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white hover:scale-102'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'upgrades' && <UpgradesManager />}
          {activeTab === 'characters' && <CharactersManager />}
          {activeTab === 'levels' && <LevelupManager />}
          {activeTab === 'images' && <ImageManager />}
          {activeTab === 'gallery' && <CharacterGallery />}
          {activeTab === 'tasks' && <TasksManager />}
          {activeTab === 'achievements' && <AchievementsManager />}
          {activeTab === 'devtools' && <DevToolsManager />}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 flex justify-between items-center bg-gray-900/50">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-gray-400">System Active</span>
            </div>
            <span className="text-xs text-gray-500">
              Current: {tabs.find(t => t.id === activeTab)?.label}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{ pointerEvents: 'auto' }}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm"
          >
            Close Panel
          </button>
        </div>
      </div>
    </div>
  );
}