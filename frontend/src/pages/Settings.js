import { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Moon, Sun, Palette } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const COLOR_PALETTES = [
  { id: 'default', name: 'Sage & Lavender', colors: ['#a8b5a1', '#c8b8db', '#b8d4e8'] },
  { id: 'ocean', name: 'Ocean Breeze', colors: ['#4a90e2', '#7fb3d5', '#aed6f1'] },
  { id: 'sunset', name: 'Soft Sunset', colors: ['#ffb6b9', '#fae3d9', '#bbded6'] },
  { id: 'forest', name: 'Forest Green', colors: ['#6a994e', '#a7c957', '#f2e8cf'] },
  { id: 'lavender', name: 'Lavender Dreams', colors: ['#b8b8f3', '#d4c5f9', '#f3e8ff'] }
];

export default function Settings({ token }) {
  const [settings, setSettings] = useState(null);
  const [theme, setTheme] = useState('light');
  const [colorPalette, setColorPalette] = useState('default');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    // Apply theme to document
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API}/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSettings(response.data);
      setTheme(response.data.theme);
      setColorPalette(response.data.color_palette);
    } catch (error) {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await axios.put(
        `${API}/settings`,
        { theme, color_palette: colorPalette },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Settings saved!');
    } catch (error) {
      toast.error('Failed to save settings');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen" style={{ color: '#636e72' }}>Loading settings...</div>;
  }

  return (
    <div data-testid="settings-page" className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl lg:text-5xl font-bold mb-2" style={{ color: '#2d3436' }}>Settings</h1>
        <p className="text-base" style={{ color: '#636e72' }}>Customize your HabitMap experience</p>
      </div>

      <div className="space-y-6">
        {/* Theme Toggle */}
        <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {theme === 'light' ? (
                <Sun className="w-6 h-6" style={{ color: '#ffd93d' }} />
              ) : (
                <Moon className="w-6 h-6" style={{ color: '#c8b8db' }} />
              )}
              <div>
                <h2 className="text-xl font-bold" style={{ color: '#2d3436' }}>Theme</h2>
                <p className="text-sm" style={{ color: '#636e72' }}>Switch between light and dark mode</p>
              </div>
            </div>
            <Switch
              data-testid="theme-toggle"
              checked={theme === 'dark'}
              onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
            />
          </div>
        </div>

        {/* Color Palette */}
        <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/20">
          <div className="flex items-center gap-4 mb-4">
            <Palette className="w-6 h-6" style={{ color: '#a8b5a1' }} />
            <div>
              <h2 className="text-xl font-bold" style={{ color: '#2d3436' }}>Color Palette</h2>
              <p className="text-sm" style={{ color: '#636e72' }}>Choose your favorite color scheme</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 mt-4">
            {COLOR_PALETTES.map((palette) => (
              <button
                key={palette.id}
                data-testid={`palette-${palette.id}`}
                onClick={() => setColorPalette(palette.id)}
                className="p-4 rounded-xl border-2 transition-all hover:scale-105"
                style={{
                  borderColor: colorPalette === palette.id ? '#a8b5a1' : 'transparent',
                  backgroundColor: '#f5f5f5'
                }}
              >
                <div className="flex gap-2 mb-2">
                  {palette.colors.map((color, idx) => (
                    <div
                      key={idx}
                      className="w-10 h-10 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <p className="font-medium text-left" style={{ color: '#2d3436' }}>{palette.name}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <Button
          data-testid="save-settings-button"
          onClick={handleSave}
          className="w-full rounded-xl py-6 text-base"
          style={{ background: 'linear-gradient(135deg, #a8b5a1 0%, #b8d4e8 100%)', color: 'white' }}
        >
          Save Settings
        </Button>
      </div>
    </div>
  );
}
