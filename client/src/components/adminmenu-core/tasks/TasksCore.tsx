import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, CheckCircle } from 'lucide-react';
import TasksEdit from './TasksEdit';
import TasksCreate from './TasksCreate';

interface Task {
  id: string;
  name: string;
  description: string;
  requirement: any;
  reward: any;
  repeatable: boolean;
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
      const response = await fetch('/api/admin/tasks');
      const data = await response.json();
      setTasks(data.tasks || []);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm(`Delete task "${taskId}"? This cannot be undone.`)) return;
    
    try {
      const response = await fetch(`/api/admin/tasks/${taskId}`, { method: 'DELETE' });
      if (response.ok) await loadTasks();
    } catch (error) {
      console.error('Failed to delete task:', error);
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
        <h3 className="text-lg font-semibold text-white">Task Management</h3>
        <button onClick={() => setIsCreating(true)} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
          <Plus className="w-4 h-4" />
          Create Task
        </button>
      </div>

      <div className="space-y-3">
        {loading ? (
          <p className="text-gray-400">Loading tasks...</p>
        ) : tasks.length === 0 ? (
          <p className="text-gray-400">No tasks found. Create your first task!</p>
        ) : (
          tasks.map((task) => (
            <div key={task.id} className="bg-gray-800 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-start gap-3 flex-1">
                <CheckCircle className="w-6 h-6 text-green-500 mt-1" />
                <div className="flex-1">
                  <h4 className="font-semibold text-white">{task.name}</h4>
                  <p className="text-sm text-gray-400">{task.description}</p>
                  {task.repeatable && (
                    <span className="text-xs text-purple-400 mt-1 inline-block">Repeatable</span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditingTask(task)} className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors">
                  <Edit className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(task.id)} className="p-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}