import { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Plus, Edit2, Check, X } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PRESET_COLORS = [
  '#a8b5a1', '#c8b8db', '#b8d4e8', '#e8c1d4', 
  '#ffd93d', '#95d5b2', '#74c69d', '#f4a261',
  '#e76f51', '#8ab4f8', '#c58af9'
];

export default function Habits({ token }) {
  const [habits, setHabits] = useState([]);
  const [habitLogs, setHabitLogs] = useState([]);
  const [newHabit, setNewHabit] = useState({ name: '', color: PRESET_COLORS[0] });
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({ name: '', color: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [habitsRes, logsRes] = await Promise.all([
        axios.get(`${API}/habits`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/habit-logs`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setHabits(habitsRes.data);
      setHabitLogs(logsRes.data);
    } catch (error) {
      toast.error('Failed to load habits');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newHabit.name.trim()) return;

    try {
      const response = await axios.post(
        `${API}/habits`,
        newHabit,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setHabits([...habits, response.data]);
      setNewHabit({ name: '', color: PRESET_COLORS[0] });
      toast.success('Habit created!');
    } catch (error) {
      toast.error('Failed to create habit');
    }
  };

  const handleUpdate = async (habitId) => {
    try {
      const response = await axios.put(
        `${API}/habits/${habitId}`,
        editData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setHabits(habits.map(h => h.id === habitId ? response.data : h));
      setEditingId(null);
      toast.success('Habit updated!');
    } catch (error) {
      toast.error('Failed to update habit');
    }
  };

  const handleDelete = async (habitId) => {
    if (!window.confirm('Delete this habit and all its logs?')) return;

    try {
      await axios.delete(
        `${API}/habits/${habitId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setHabits(habits.filter(h => h.id !== habitId));
      setHabitLogs(habitLogs.filter(l => l.habit_id !== habitId));
      toast.success('Habit deleted');
    } catch (error) {
      toast.error('Failed to delete habit');
    }
  };

  const handleToggleToday = async (habitId) => {
    const today = new Date().toISOString().split('T')[0];
    const existingLog = habitLogs.find(l => l.habit_id === habitId && l.date === today);

    try {
      const response = await axios.post(
        `${API}/habit-logs`,
        {
          habit_id: habitId,
          date: today,
          completed: !existingLog?.completed
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (existingLog) {
        setHabitLogs(habitLogs.map(l => 
          l.id === existingLog.id ? response.data : l
        ));
      } else {
        setHabitLogs([...habitLogs, response.data]);
      }
    } catch (error) {
      toast.error('Failed to update habit log');
    }
  };

  const getCompletionRate = (habitId) => {
    const logs = habitLogs.filter(l => l.habit_id === habitId);
    if (logs.length === 0) return 0;
    const completed = logs.filter(l => l.completed).length;
    return Math.round((completed / logs.length) * 100);
  };

  const isTodayCompleted = (habitId) => {
    const today = new Date().toISOString().split('T')[0];
    return habitLogs.some(l => l.habit_id === habitId && l.date === today && l.completed);
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen" style={{ color: '#636e72' }}>Loading habits...</div>;
  }

  return (
    <div data-testid="habits-page" className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl lg:text-5xl font-bold mb-2" style={{ color: '#2d3436' }}>Your Habits</h1>
        <p className="text-base" style={{ color: '#636e72' }}>Manage and track your daily habits</p>
      </div>

      <form onSubmit={handleCreate} className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/20 mb-6">
        <h2 className="text-2xl font-bold mb-4" style={{ color: '#2d3436' }}>Create New Habit</h2>
        <div className="space-y-4">
          <div>
            <Label htmlFor="habit-name">Habit Name</Label>
            <Input
              id="habit-name"
              data-testid="new-habit-name"
              placeholder="e.g., Morning Exercise"
              value={newHabit.name}
              onChange={(e) => setNewHabit({ ...newHabit, name: e.target.value })}
              className="rounded-xl"
            />
          </div>
          <div>
            <Label>Choose Color</Label>
            <div className="flex gap-2 mt-2 flex-wrap">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  data-testid={`color-${color}`}
                  onClick={() => setNewHabit({ ...newHabit, color })}
                  className="w-10 h-10 rounded-full border-4 transition-transform hover:scale-110"
                  style={{
                    backgroundColor: color,
                    borderColor: newHabit.color === color ? '#2d3436' : 'transparent'
                  }}
                />
              ))}
            </div>
          </div>
          <Button 
            type="submit" 
            data-testid="create-habit-button"
            className="w-full rounded-xl py-6"
            style={{ background: 'linear-gradient(135deg, #a8b5a1 0%, #b8d4e8 100%)', color: 'white' }}
          >
            <Plus className="mr-2" /> Create Habit
          </Button>
        </div>
      </form>

      <div className="space-y-4">
        {habits.map((habit) => (
          <div
            key={habit.id}
            data-testid={`habit-${habit.id}`}
            className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/20"
          >
            {editingId === habit.id ? (
              <div className="space-y-4">
                <Input
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  className="rounded-xl"
                />
                <div className="flex gap-2 flex-wrap">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setEditData({ ...editData, color })}
                      className="w-8 h-8 rounded-full border-2"
                      style={{
                        backgroundColor: color,
                        borderColor: editData.color === color ? '#2d3436' : 'transparent'
                      }}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button
                    data-testid={`save-edit-${habit.id}`}
                    onClick={() => handleUpdate(habit.id)}
                    className="rounded-xl"
                    style={{ backgroundColor: '#74c69d', color: 'white' }}
                  >
                    <Check className="mr-1" /> Save
                  </Button>
                  <Button
                    onClick={() => setEditingId(null)}
                    variant="outline"
                    className="rounded-xl"
                  >
                    <X className="mr-1" /> Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div
                    className="w-6 h-6 rounded-full"
                    style={{ backgroundColor: habit.color }}
                  />
                  <div className="flex-1">
                    <h3 className="text-xl font-bold" style={{ color: '#2d3436' }}>{habit.name}</h3>
                    <p className="text-sm" style={{ color: '#636e72' }}>
                      Completion rate: {getCompletionRate(habit.id)}%
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    data-testid={`toggle-today-${habit.id}`}
                    onClick={() => handleToggleToday(habit.id)}
                    className="rounded-xl"
                    style={{
                      backgroundColor: isTodayCompleted(habit.id) ? '#74c69d' : '#e0e0e0',
                      color: isTodayCompleted(habit.id) ? 'white' : '#636e72'
                    }}
                  >
                    {isTodayCompleted(habit.id) ? <Check /> : 'Mark Done'}
                  </Button>
                  <Button
                    data-testid={`edit-habit-${habit.id}`}
                    onClick={() => {
                      setEditingId(habit.id);
                      setEditData({ name: habit.name, color: habit.color });
                    }}
                    variant="outline"
                    className="rounded-xl"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    data-testid={`delete-habit-${habit.id}`}
                    onClick={() => handleDelete(habit.id)}
                    variant="outline"
                    className="rounded-xl text-red-500 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
