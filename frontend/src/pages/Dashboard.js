import { useState, useEffect } from 'react';
import axios from 'axios';
import HeatmapCalendar from '@/components/HeatmapCalendar';
import { Calendar as CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Dashboard({ token }) {
  const [habits, setHabits] = useState([]);
  const [habitLogs, setHabitLogs] = useState([]);
  const [moodLogs, setMoodLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [habitsRes, logsRes, moodRes] = await Promise.all([
        axios.get(`${API}/habits`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/habit-logs`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/mood-logs`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setHabits(habitsRes.data);
      setHabitLogs(logsRes.data);
      setMoodLogs(moodRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg" style={{ color: '#636e72' }}>Loading your dashboard...</div>
      </div>
    );
  }

  return (
    <div data-testid="dashboard" className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl lg:text-5xl font-bold mb-2" style={{ color: '#2d3436' }}>Your HabitMap</h1>
        <p className="text-base" style={{ color: '#636e72' }}>Track your journey to better habits</p>
      </div>

      {habits.length === 0 ? (
        <div className="text-center py-16">
          <CalendarIcon className="mx-auto mb-4 w-16 h-16" style={{ color: '#a8b5a1' }} />
          <h2 className="text-2xl font-bold mb-2" style={{ color: '#2d3436' }}>Start Your Journey</h2>
          <p className="text-base mb-6" style={{ color: '#636e72' }}>Create your first habit to see your progress map</p>
        </div>
      ) : (
        <div className="space-y-8">
          {habits.map((habit) => (
            <div key={habit.id} className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/20" data-testid={`habit-heatmap-${habit.id}`}>
              <div className="flex items-center gap-3 mb-4">
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: habit.color }}
                />
                <h3 className="text-2xl font-bold" style={{ color: '#2d3436' }}>{habit.name}</h3>
              </div>
              <HeatmapCalendar 
                habitId={habit.id}
                habitLogs={habitLogs.filter(log => log.habit_id === habit.id)}
                color={habit.color}
              />
            </div>
          ))}
        </div>
      )}

      {moodLogs.length > 0 && (
        <div className="mt-8 bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/20">
          <h3 className="text-2xl font-bold mb-4" style={{ color: '#2d3436' }}>Mood Timeline</h3>
          <div className="grid grid-cols-7 sm:grid-cols-10 md:grid-cols-14 gap-2">
            {moodLogs.slice(-30).map((log) => {
              const moodColors = ['#ff6b6b', '#ffa06b', '#ffd93d', '#95d5b2', '#74c69d'];
              return (
                <div
                  key={log.date}
                  data-testid={`mood-${log.date}`}
                  className="aspect-square rounded-lg flex items-center justify-center text-xl"
                  style={{ backgroundColor: moodColors[log.mood_level - 1] + '40' }}
                  title={`${log.date}: ${log.emoji}`}
                >
                  {log.emoji}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
