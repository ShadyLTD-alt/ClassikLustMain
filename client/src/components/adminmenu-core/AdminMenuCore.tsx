import React, { useState } from 'react';
import { X, Wrench, Star, Users, Image, TrendingUp, Trophy } from 'lucide-react';

// Import module managers
import UpgradesManager from './upgrades/UpgradesCore';
import LevelupManager from './levelup/LevelupCore';
import CharactersManager from './characters/CharactersCore';
import AchievementsManager from './achievements/AchievementsCore';
import TasksManager from './tasks/TasksCore';
import ImageManager from './imageuploader/ImageUploaderCore';

interface AdminMenuCoreProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'upgrades' | 'characters' | 'levels' | 'images' | 'tasks' | 'achievements';

/**
 * AdminMenuCore - Central admin panel management system
 * Coordinates all admin modules: upgrades, characters, levels, images, tasks, achievements
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
  ];

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-lg w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <Wrench className="w-6 h-6 text-purple-400" />
            <h2 className="text-xl font-bold text-white">Admin Panel</h2>
          </div>
          <p className="text-sm text-gray-400">Manage game configuration, players, and content</p>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 p-4 border-b border-gray-800 overflow-x-auto">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                activeTab === id
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
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
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 flex justify-between items-center">
          <p className="text-xs text-gray-500">
            Admin Panel • {tabs.find(t => t.id === activeTab)?.label}
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}