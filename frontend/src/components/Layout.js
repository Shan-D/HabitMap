import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Calendar, Smile, Sparkles, Settings as SettingsIcon, LogOut, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Layout({ children, onLogout }) {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { path: '/', label: 'Dashboard', icon: Home },
    { path: '/habits', label: 'Habits', icon: Calendar },
    { path: '/mood', label: 'Mood', icon: Smile },
    { path: '/insights', label: 'Insights', icon: Sparkles },
    { path: '/settings', label: 'Settings', icon: SettingsIcon }
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--cream)' }}>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-1 min-h-0 bg-white/80 backdrop-blur-xl border-r border-white/20">
          <div className="flex flex-col flex-1 pt-5 pb-4 overflow-y-auto">
            <div className="flex items-center flex-shrink-0 px-6 mb-8">
              <h1 className="text-3xl font-bold" style={{ color: '#a8b5a1' }}>HabitMap</h1>
            </div>
            <nav className="flex-1 px-3 space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    data-testid={`nav-${item.label.toLowerCase()}`}
                    className="group flex items-center px-3 py-3 text-base font-medium rounded-xl transition-all"
                    style={{
                      backgroundColor: isActive ? '#a8b5a1' : 'transparent',
                      color: isActive ? 'white' : '#636e72'
                    }}
                  >
                    <Icon className="mr-3 w-5 h-5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex-shrink-0 flex border-t border-white/20 p-4">
            <Button
              data-testid="logout-button"
              onClick={onLogout}
              variant="ghost"
              className="w-full justify-start text-base rounded-xl"
              style={{ color: '#636e72' }}
            >
              <LogOut className="mr-3 w-5 h-5" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-white/20">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-2xl font-bold" style={{ color: '#a8b5a1' }}>HabitMap</h1>
          <button
            data-testid="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl"
            style={{ color: '#636e72' }}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="border-t border-white/20 p-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center px-3 py-3 text-base font-medium rounded-xl transition-all"
                  style={{
                    backgroundColor: isActive ? '#a8b5a1' : 'transparent',
                    color: isActive ? 'white' : '#636e72'
                  }}
                >
                  <Icon className="mr-3 w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
            <Button
              onClick={() => {
                onLogout();
                setMobileMenuOpen(false);
              }}
              variant="ghost"
              className="w-full justify-start text-base rounded-xl"
              style={{ color: '#636e72' }}
            >
              <LogOut className="mr-3 w-5 h-5" />
              Logout
            </Button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <main className="lg:pl-64 pt-16 lg:pt-0">
        {children}
      </main>
    </div>
  );
}
