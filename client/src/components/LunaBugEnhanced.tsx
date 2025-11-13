import React, { useState, useEffect } from 'react';
import { 
  Bug, 
  Database, 
  Users, 
  TrendingUp, 
  Award, 
  Target, 
  Upload,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Loader
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

const LunaBugEnhanced = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [syncMessage, setSyncMessage] = useState('');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  const handleMediaSync = async () => {
    try {
      setSyncStatus('syncing');
      setSyncMessage('Scanning uploads directory...');

      const response = await apiRequest('/api/admin/sync-media', {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        setSyncStatus('success');
        setSyncMessage(data.message || 'Media sync completed successfully!');
        setLastSyncTime(new Date().toLocaleString());
        
        setTimeout(() => {
          setSyncStatus('idle');
        }, 5000);
      } else {
        const errorData = await response.json();
        setSyncStatus('error');
        setSyncMessage(errorData.error || 'Sync failed');
      }
    } catch (err) {
      console.error('Media sync error:', err);
      setSyncStatus('error');
      setSyncMessage('Network error - please try again');
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Bug },
    { id: 'database', label: 'Database', icon: Database },
    { id: 'players', label: 'Players', icon: Users },
    { id: 'media', label: 'Media Sync', icon: Upload },
  ];

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-gradient-to-br from-gray-900 to-purple-900 rounded-2xl shadow-2xl border-2 border-purple-500/50 w-96 max-h-[600px] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4 flex items-center gap-3">
          <Bug className="w-6 h-6 text-white" />
          <div>
            <h3 className="text-white font-bold text-lg">LunaBug Admin</h3>
            <p className="text-purple-100 text-xs">System Management</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-purple-500/30 bg-gray-900/50">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-purple-600/30 text-purple-300 border-b-2 border-purple-500'
                    : 'text-gray-400 hover:text-purple-300 hover:bg-purple-600/10'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[400px]">
          {activeTab === 'media' && (
            <div className="space-y-4">
              <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
                <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Media Synchronization
                </h4>
                <p className="text-gray-300 text-sm mb-4">
                  Automatically scan the uploads directory and populate the mediaUploads database table with any new images.
                </p>

                {/* Sync Status */}
                {syncStatus !== 'idle' && (
                  <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
                    syncStatus === 'syncing' ? 'bg-blue-500/20 border border-blue-500/50' :
                    syncStatus === 'success' ? 'bg-green-500/20 border border-green-500/50' :
                    'bg-red-500/20 border border-red-500/50'
                  }`}>
                    {syncStatus === 'syncing' && <Loader className="w-4 h-4 text-blue-400 animate-spin" />}
                    {syncStatus === 'success' && <CheckCircle className="w-4 h-4 text-green-400" />}
                    {syncStatus === 'error' && <AlertCircle className="w-4 h-4 text-red-400" />}
                    <span className={`text-sm ${
                      syncStatus === 'syncing' ? 'text-blue-300' :
                      syncStatus === 'success' ? 'text-green-300' :
                      'text-red-300'
                    }`}>
                      {syncMessage}
                    </span>
                  </div>
                )}

                {/* Last Sync Time */}
                {lastSyncTime && (
                  <p className="text-gray-400 text-xs mb-4">
                    Last synced: {lastSyncTime}
                  </p>
                )}

                {/* Sync Button */}
                <button
                  onClick={handleMediaSync}
                  disabled={syncStatus === 'syncing'}
                  className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw className={`w-5 h-5 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                  {syncStatus === 'syncing' ? 'Syncing...' : 'Sync Media Now'}
                </button>

                <div className="mt-4 space-y-2">
                  <div className="text-xs text-gray-400">
                    <strong className="text-purple-400">What this does:</strong>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li>Scans /uploads/characters/ directory</li>
                      <li>Detects new image files automatically</li>
                      <li>Parses metadata from filenames</li>
                      <li>Adds entries to mediaUploads table</li>
                      <li>Skips files already in database</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'overview' && (
            <div className="text-gray-300">
              <h4 className="text-white font-semibold mb-4">System Overview</h4>
              <div className="space-y-3">
                <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Database className="w-4 h-4 text-purple-400" />
                    <span className="text-sm font-medium">Database</span>
                  </div>
                  <p className="text-xs text-gray-400">Connected to Supabase</p>
                </div>
                <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="w-4 h-4 text-purple-400" />
                    <span className="text-sm font-medium">Active Players</span>
                  </div>
                  <p className="text-xs text-gray-400">View player management</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'database' && (
            <div className="text-gray-300">
              <h4 className="text-white font-semibold mb-4">Database Tools</h4>
              <p className="text-sm text-gray-400">Database management features coming soon...</p>
            </div>
          )}

          {activeTab === 'players' && (
            <div className="text-gray-300">
              <h4 className="text-white font-semibold mb-4">Player Management</h4>
              <p className="text-sm text-gray-400">Player tools coming soon...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LunaBugEnhanced;
