import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, TrendingUp } from 'lucide-react';
import TasksEdit from './TasksEdit';
import TasksCreate from './TasksCreate';
import { apiRequest } from '@/lib/queryClient';

interface Task {
  id: string;
  name: string;
  description: string;
  requirementType?: string;
  target?: number;
  rewardType?: string;
  rewardAmount?: number;
  resetInterval?: string;
  requirement?: any;
  reward?: any;
}

export default function TasksCore() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const response = await apiRequest('GET', '/api/admin/tasks');
      const data = await response.json();
      setTasks(data.tasks || []);
    } catch (error) {
      console.error('Failed to load tasks:', error);
      alert('Failed to load tasks. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm(`Delete task "${taskId}"? This cannot be undone.`)) return;
    
    try {
      const response = await apiRequest('DELETE', `/api/admin/tasks/${taskId}`);
      if (response.ok) {
        await loadTasks();
        alert('Task deleted successfully!');
      }
    } catch (error) {
      console.error('Failed to delete task:', error);
      alert('Failed to delete task.');
    }
  };

  if (isCreating) {
    return <TasksCreate onSave={() => { loadTasks(); setIsCreating(false); }} onCancel={() => setIsCreating(false)} />;
  }

  if (editingTask) {
    return <TasksEdit task={editingTask} onSave={() => { loadTasks(); setEditingTask(null); }} onCancel={() => setEditingTask(null)} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Task Management
          </h3>
          <p className="text-sm text-gray-400">Create daily/weekly tasks for players</p>
        </div>
        <button onClick={() => setIsCreating(true)} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
          <Plus className="w-4 h-4" />
          Create Task
        </button>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-2"></div>
            <p className="text-gray-400">Loading tasks...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-8 bg-gray-800/30 rounded-lg border border-gray-700/50">
            <p className="text-gray-400 mb-2">No tasks found.</p>
            <p className="text-sm text-gray-500">Create your first task to get started!</p>
          </div>
        ) : (
          tasks.map((task) => (
            <div key={task.id} className="bg-gray-800 rounded-lg p-4 flex items-center justify-between hover:bg-gray-750 transition-colors">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <div>
                    <h4 className="font-semibold text-white">{task.name}</h4>
                    <p className="text-sm text-gray-400">{task.description}</p>
                  </div>
                  {task.resetInterval && (
                    <span className="px-2 py-0.5 bg-blue-900/30 text-blue-300 rounded text-xs font-semibold">
                      {task.resetInterval}
                    </span>
                  )}
                </div>
                <div className="flex gap-3 mt-2 text-xs">
                  <span className="bg-gray-700 px-2 py-0.5 rounded">
                    {task.requirementType || 'Custom'}: {task.target || 'N/A'}
                  </span>
                  <span className="bg-green-900/30 text-green-300 px-2 py-0.5 rounded">
                    Reward: {task.rewardAmount || 0} {(task.rewardType?.toUpperCase() || 'LP')}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditingTask(task)} className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors" title="Edit Task">
                  <Edit className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(task.id)} className="p-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors" title="Delete Task">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      
      {!loading && tasks.length > 0 && (
        <div className="text-sm text-gray-400 text-center pt-2 border-t border-gray-800">
          Total Tasks: {tasks.length}
        </div>
      )}
    </div>
  );
}
