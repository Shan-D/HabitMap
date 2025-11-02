import { useState, useEffect } from 'react';
import '@/App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Auth from '@/pages/Auth';
import Dashboard from '@/pages/Dashboard';
import Habits from '@/pages/Habits';
import Mood from '@/pages/Mood';
import Insights from '@/pages/Insights';
import Settings from '@/pages/Settings';
import Layout from '@/components/Layout';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }, [token]);

  const handleLogin = (newToken) => {
    setToken(newToken);
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('token');
  };

  if (!token) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="*" element={<Auth onLogin={handleLogin} />} />
        </Routes>
      </BrowserRouter>
    );
  }

  return (
    <div className="App">
      <BrowserRouter>
        <Layout onLogout={handleLogout}>
          <Routes>
            <Route path="/" element={<Dashboard token={token} />} />
            <Route path="/habits" element={<Habits token={token} />} />
            <Route path="/mood" element={<Mood token={token} />} />
            <Route path="/insights" element={<Insights token={token} />} />
            <Route path="/settings" element={<Settings token={token} />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </div>
  );
}

export default App;
