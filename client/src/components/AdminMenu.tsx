import React from "react";
import { Shield, Settings, Upload, Database, RefreshCw, Cog, X } from "lucide-react";

export interface AdminAction {
  id: string;
  icon: React.ReactNode;
  label: string;
  description?: string;
  onClick: () => void | Promise<void>;
  danger?: boolean;
}

interface AdminMenuProps {
  isOpen: boolean;
  onClose: () => void;
  actions?: AdminAction[];
}

/**
 * Minimal, modular Admin Menu
 * - Controlled via props so it can be dropped anywhere
 * - Pass actions to populate buttons
 */
const AdminMenu: React.FC<AdminMenuProps> = ({ isOpen, onClose, actions }) => {
  if (!isOpen) return null;

  const defaultActions: AdminAction[] = [
    {
      id: 'save',
      icon: <Database className="w-5 h-5" />,
      label: 'Force Save',
      description: 'Immediately persist player data',
      onClick: async () => {
        await fetch('/api/player/me', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ forceSave: true }) });
        alert('Saved');
      }
    },
    {
      id: 'reload',
      icon: <RefreshCw className="w-5 h-5" />,
      label: 'Reload Game Data',
      description: 'Reload JSON configs on server',
      onClick: async () => {
        await fetch('/api/admin/reload', { method: 'POST' });
        alert('Reload triggered');
      }
    },
    {
      id: 'uploader',
      icon: <Upload className="w-5 h-5" />,
      label: 'Open Uploader',
      description: 'Go to media manager',
      onClick: () => { window.location.href = '/admin/media'; }
    },
    {
      id: 'lunabug',
      icon: <Cog className="w-5 h-5" />,
      label: 'LunaBug Status',
      description: 'Check debugger status',
      onClick: () => {
        const status = (window as any).LunaBug?.status?.();
        alert('LunaBug: '+JSON.stringify(status || { error: 'not available'}));
      }
    }
  ];

  const items = actions?.length ? actions : defaultActions;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-yellow-400" />
            <div>
              <div className="text-white font-bold">Admin Menu</div>
              <div className="text-xs text-gray-400">Core maintenance tools</div>
            </div>
          </div>
          <button className="text-gray-400 hover:text-white" onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {items.map(action => (
            <button key={action.id} onClick={action.onClick} className={`bg-gray-800/60 hover:bg-gray-800 border border-gray-700 rounded-xl p-4 text-left transition-colors ${action.danger ? 'ring-1 ring-red-500/30' : ''}`}>
              <div className="flex items-center gap-3 mb-2 text-white font-semibold">{action.icon}<span>{action.label}</span></div>
              {action.description && <div className="text-xs text-gray-400">{action.description}</div>}
            </button>
          ))}
        </div>
        
        <div className="p-3 border-t border-gray-700 text-xs text-gray-500 text-center">Modular admin menu • Add actions via props</div>
      </div>
    </div>
  );
};

export default AdminMenu;
