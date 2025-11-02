import { useState } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Auth({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const response = await axios.post(`${API}${endpoint}`, { email, password });
      
      toast.success(isLogin ? 'Welcome back!' : 'Account created successfully!');
      onLogin(response.data.token);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #f5f1e8 0%, #e8f4f8 100%)' }}>
      <div className="w-full max-w-md">
        <div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-lg border border-white/20">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold mb-2" style={{ color: '#a8b5a1' }}>HabitMap</h1>
            <p className="text-base" style={{ color: '#636e72' }}>Build habits, track moods, visualize growth</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div data-testid="auth-form">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                data-testid="email-input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 rounded-xl border-gray-200 focus:border-sage focus:ring-sage"
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <Input
                id="password"
                type="password"
                data-testid="password-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1 rounded-xl border-gray-200 focus:border-sage focus:ring-sage"
              />
            </div>

            <Button
              type="submit"
              data-testid="auth-submit-button"
              disabled={loading}
              className="w-full rounded-xl py-6 text-base font-medium"
              style={{ background: 'linear-gradient(135deg, #a8b5a1 0%, #b8d4e8 100%)', color: 'white' }}
            >
              {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              data-testid="toggle-auth-mode"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm hover:underline"
              style={{ color: '#636e72' }}
            >
              {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
