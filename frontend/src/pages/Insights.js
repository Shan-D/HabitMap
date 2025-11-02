import { useState, useEffect } from 'react';
import axios from 'axios';
import { Sparkles, TrendingUp, Calendar, BarChart } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Insights({ token }) {
  const [summary, setSummary] = useState(null);
  const [aiInsights, setAiInsights] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingAI, setLoadingAI] = useState(false);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      const response = await axios.get(`${API}/analytics/summary`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSummary(response.data);
    } catch (error) {
      toast.error('Failed to load summary');
    } finally {
      setLoading(false);
    }
  };

  const fetchAIInsights = async () => {
    setLoadingAI(true);
    try {
      const response = await axios.get(`${API}/analytics/ai-insights`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAiInsights(response.data.insights);
    } catch (error) {
      toast.error('Failed to generate AI insights');
    } finally {
      setLoadingAI(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen" style={{ color: '#636e72' }}>Loading insights...</div>;
  }

  return (
    <div data-testid="insights-page" className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl lg:text-5xl font-bold mb-2" style={{ color: '#2d3436' }}>Your Insights</h1>
        <p className="text-base" style={{ color: '#636e72' }}>Understand your patterns and progress</p>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/20" data-testid="total-habits-stat">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl" style={{ backgroundColor: '#a8b5a1' }}>
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm" style={{ color: '#636e72' }}>Total Habits</p>
              <p className="text-3xl font-bold" style={{ color: '#2d3436' }}>{summary?.total_habits || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/20" data-testid="completions-stat">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl" style={{ backgroundColor: '#74c69d' }}>
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm" style={{ color: '#636e72' }}>Completions (30d)</p>
              <p className="text-3xl font-bold" style={{ color: '#2d3436' }}>{summary?.total_completions || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/20" data-testid="avg-mood-stat">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl" style={{ backgroundColor: '#ffd93d' }}>
              <BarChart className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm" style={{ color: '#636e72' }}>Avg Mood (30d)</p>
              <p className="text-3xl font-bold" style={{ color: '#2d3436' }}>{summary?.avg_mood?.toFixed(1) || 'N/A'}/5</p>
            </div>
          </div>
        </div>
      </div>

      {/* Habit Performance */}
      {summary?.habit_stats && Object.keys(summary.habit_stats).length > 0 && (
        <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/20 mb-8">
          <h2 className="text-2xl font-bold mb-6" style={{ color: '#2d3436' }}>Habit Performance (Last 30 Days)</h2>
          <div className="space-y-4">
            {Object.entries(summary.habit_stats).map(([habitId, stats]) => (
              <div key={habitId} data-testid={`habit-stat-${habitId}`}>
                <div className="flex justify-between mb-2">
                  <span className="font-medium" style={{ color: '#2d3436' }}>{stats.name}</span>
                  <span className="font-bold" style={{ color: '#74c69d' }}>{stats.completion_rate}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${stats.completion_rate}%`,
                      background: 'linear-gradient(135deg, #a8b5a1 0%, #74c69d 100%)'
                    }}
                  />
                </div>
                <p className="text-sm mt-1" style={{ color: '#636e72' }}>
                  {stats.total_completions} completions
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Insights */}
      <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/20">
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="w-6 h-6" style={{ color: '#c8b8db' }} />
          <h2 className="text-2xl font-bold" style={{ color: '#2d3436' }}>AI-Powered Insights</h2>
        </div>

        {!aiInsights && !loadingAI && (
          <div className="text-center py-8">
            <p className="text-base mb-4" style={{ color: '#636e72' }}>Get personalized insights powered by GPT-5</p>
            <button
              data-testid="generate-insights-button"
              onClick={fetchAIInsights}
              className="px-6 py-3 rounded-xl font-medium transition-transform hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #c8b8db 0%, #b8d4e8 100%)', color: 'white' }}
            >
              Generate Insights
            </button>
          </div>
        )}

        {loadingAI && (
          <div className="text-center py-8" data-testid="ai-loading">
            <div className="animate-pulse" style={{ color: '#636e72' }}>Analyzing your data with AI...</div>
          </div>
        )}

        {aiInsights && (
          <div data-testid="ai-insights-content" className="prose max-w-none">
            <div className="whitespace-pre-wrap text-base leading-relaxed" style={{ color: '#2d3436' }}>
              {aiInsights}
            </div>
            <button
              onClick={fetchAIInsights}
              className="mt-6 px-4 py-2 rounded-xl text-sm font-medium transition-transform hover:scale-105"
              style={{ backgroundColor: '#e8f4f8', color: '#2d3436' }}
            >
              Regenerate Insights
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
