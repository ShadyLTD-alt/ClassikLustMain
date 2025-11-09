import React, { useState } from 'react';
import { X, Wrench, Star, Users, Image, TrendingUp, Trophy, Terminal } from 'lucide-react';

// Import module managers
import UpgradesManager from './upgrades/UpgradesCore';
import LevelupManager from './levelup/LevelupCore';
import CharactersManager from './characters/CharactersCore';
import AchievementsManager from './achievements/AchievementsCore';
import TasksManager from './tasks/TasksCore';
import ImageManager from './imageuploader/ImageUploaderCore';
import DevToolsManager from './devtools/DevToolsCore';

interface AdminMenuCoreProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'upgrades' | 'characters' | 'levels' | 'images' | 'tasks' | 'achievements' | 'devtools';

/**
 * AdminMenuCore - Central admin panel management system
 * Coordinates all admin modules: upgrades, characters, levels, images, tasks, achievements, devtools
 * Each module is a self-contained plugin that manages its own data
 */
export default function AdminMenuCore({ isOpen, onClose }: AdminMenuCoreProps) {
  const [activeTab, setActiveTab] = useState<TabType>('upgrades');

  if (!isOpen) return null;

  const tabs = [
    { id: 'upgrades' as TabType, label: 'Upgrades', icon: Wrench },
    { id: 'characters' as TabType, label: 'Characters', icon: Users },
    { id: 'levels' as TabType, label: 'Levels', icon: Star },
    { id: 'images' as TabType, label: 'Images', icon: Image },
    { id: 'tasks' as TabType, label: 'Tasks', icon: TrendingUp },
    { id: 'achievements' as TabType, label: 'Achievements', icon: Trophy },
    { id: 'devtools' as TabType, label: 'DevTools', icon: Terminal },
  ];

  return (
    <div 
      className="fixed inset-0 bg-black/80 flex items-center justify-center p-4"
      style={{ zIndex: 40 }}
    >
      <div className="bg-gray-900 rounded-lg w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
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
          >
            <X className="w-5 h-5 text-gray-400 hover:text-white" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div 
          className="flex gap-2 p-4 border-b border-gray-800 overflow-x-auto"
          style={{ pointerEvents: 'auto' }}
        >
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              style={{ pointerEvents: 'auto' }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                activeTab === id
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
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
              {tabs.find(t => t.id === activeTab)?.label}
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm"
          >
            Close Panel
          </button>
        </div>
      </div>
    </div>
  );
}