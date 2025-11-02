import { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const MOOD_EMOJIS = [
  { level: 1, emoji: '😢', label: 'Very Bad' },
  { level: 2, emoji: '😕', label: 'Bad' },
  { level: 3, emoji: '😐', label: 'Okay' },
  { level: 4, emoji: '😊', label: 'Good' },
  { level: 5, emoji: '😄', label: 'Excellent' }
];

export default function Mood({ token }) {
  const [moodLogs, setMoodLogs] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [moodLevel, setMoodLevel] = useState(3);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMoodLogs();
  }, []);

  useEffect(() => {
    // Load mood for selected date
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const existingLog = moodLogs.find(log => log.date === dateStr);
    if (existingLog) {
      setMoodLevel(existingLog.mood_level);
      setNote(existingLog.note || '');
    } else {
      setMoodLevel(3);
      setNote('');
    }
  }, [selectedDate, moodLogs]);

  const fetchMoodLogs = async () => {
    try {
      const response = await axios.get(`${API}/mood-logs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMoodLogs(response.data);
    } catch (error) {
      toast.error('Failed to load mood logs');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const selectedMood = MOOD_EMOJIS.find(m => m.level === moodLevel);

    try {
      const response = await axios.post(
        `${API}/mood-logs`,
        {
          date: dateStr,
          mood_level: moodLevel,
          emoji: selectedMood.emoji,
          note: note
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const existingIndex = moodLogs.findIndex(log => log.date === dateStr);
      if (existingIndex >= 0) {
        const updated = [...moodLogs];
        updated[existingIndex] = response.data;
        setMoodLogs(updated);
      } else {
        setMoodLogs([...moodLogs, response.data]);
      }

      toast.success('Mood saved!');
    } catch (error) {
      toast.error('Failed to save mood');
    }
  };

  const handleDelete = async () => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    if (!window.confirm('Delete this mood entry?')) return;

    try {
      await axios.delete(`${API}/mood-logs/${dateStr}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMoodLogs(moodLogs.filter(log => log.date !== dateStr));
      setMoodLevel(3);
      setNote('');
      toast.success('Mood deleted');
    } catch (error) {
      toast.error('Failed to delete mood');
    }
  };

  const selectedMood = MOOD_EMOJIS.find(m => m.level === moodLevel);
  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const hasExistingLog = moodLogs.some(log => log.date === dateStr);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen" style={{ color: '#636e72' }}>Loading mood journal...</div>;
  }

  return (
    <div data-testid="mood-page" className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl lg:text-5xl font-bold mb-2" style={{ color: '#2d3436' }}>Mood Journal</h1>
        <p className="text-base" style={{ color: '#636e72' }}>Track how you feel each day</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Calendar */}
        <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/20">
          <h2 className="text-2xl font-bold mb-4" style={{ color: '#2d3436' }}>Select Date</h2>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            data-testid="mood-calendar"
            className="rounded-xl"
            modifiers={{
              logged: moodLogs.map(log => new Date(log.date))
            }}
            modifiersStyles={{
              logged: { 
                backgroundColor: '#a8b5a1', 
                color: 'white',
                fontWeight: 'bold'
              }
            }}
          />
        </div>

        {/* Mood Entry */}
        <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/20">
          <div className="mb-4">
            <h2 className="text-2xl font-bold" style={{ color: '#2d3436' }}>
              {format(selectedDate, 'MMMM d, yyyy')}
            </h2>
            {hasExistingLog && (
              <p className="text-sm" style={{ color: '#74c69d' }}>Already logged</p>
            )}
          </div>

          <div className="space-y-6">
            <div className="text-center">
              <div className="text-7xl mb-4" data-testid="selected-mood-emoji">{selectedMood.emoji}</div>
              <p className="text-xl font-semibold" style={{ color: '#2d3436' }}>{selectedMood.label}</p>
            </div>

            <div>
              <label className="text-sm font-medium" style={{ color: '#636e72' }}>How do you feel?</label>
              <div className="mt-2">
                <Slider
                  data-testid="mood-slider"
                  value={[moodLevel]}
                  onValueChange={(value) => setMoodLevel(value[0])}
                  min={1}
                  max={5}
                  step={1}
                  className="w-full"
                />
              </div>
              <div className="flex justify-between mt-2 text-2xl">
                {MOOD_EMOJIS.map((mood) => (
                  <button
                    key={mood.level}
                    data-testid={`mood-emoji-${mood.level}`}
                    onClick={() => setMoodLevel(mood.level)}
                    className="transition-transform hover:scale-125"
                  >
                    {mood.emoji}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium" style={{ color: '#636e72' }}>Note (optional)</label>
              <Textarea
                data-testid="mood-note"
                placeholder="What made you feel this way?"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="mt-2 rounded-xl min-h-24"
              />
            </div>

            <div className="flex gap-2">
              <Button
                data-testid="save-mood-button"
                onClick={handleSave}
                className="flex-1 rounded-xl py-6"
                style={{ background: 'linear-gradient(135deg, #a8b5a1 0%, #b8d4e8 100%)', color: 'white' }}
              >
                Save Mood
              </Button>
              {hasExistingLog && (
                <Button
                  data-testid="delete-mood-button"
                  onClick={handleDelete}
                  variant="outline"
                  className="rounded-xl text-red-500 hover:bg-red-50"
                >
                  <Trash2 />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Moods */}
      {moodLogs.length > 0 && (
        <div className="mt-8 bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/20">
          <h2 className="text-2xl font-bold mb-4" style={{ color: '#2d3436' }}>Recent Entries</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {moodLogs.slice(-12).reverse().map((log) => (
              <button
                key={log.date}
                data-testid={`mood-entry-${log.date}`}
                onClick={() => setSelectedDate(new Date(log.date))}
                className="p-4 rounded-xl border-2 transition-all hover:scale-105"
                style={{
                  borderColor: selectedDate && format(selectedDate, 'yyyy-MM-dd') === log.date ? '#a8b5a1' : 'transparent',
                  backgroundColor: '#f5f5f5'
                }}
              >
                <div className="text-4xl mb-2">{log.emoji}</div>
                <div className="text-sm font-medium" style={{ color: '#2d3436' }}>
                  {format(new Date(log.date), 'MMM d')}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
