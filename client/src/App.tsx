import { useState, useEffect, createContext, useContext } from 'react';
import { trpc } from '@/utils/trpc';
import { LoginForm } from '@/components/LoginForm';
import { SignupForm } from '@/components/SignupForm';
import { Dashboard } from '@/components/Dashboard';
import { Button } from '@/components/ui/button';
import { Moon, Sun } from 'lucide-react';
import type { User } from '../../server/src/schema';
import './App.css';

// Theme context
interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Auth context
interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'dark' : 'light');
    }
  }, []);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await trpc.login.mutate({ email, password });
      setUser(response);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (email: string, password: string, firstName: string, lastName: string) => {
    setIsLoading(true);
    try {
      const response = await trpc.signup.mutate({
        email,
        password,
        first_name: firstName,
        last_name: lastName
      });
      setUser(response);
    } catch (error) {
      console.error('Signup failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
  };

  const themeContextValue: ThemeContextType = {
    theme,
    toggleTheme
  };

  const authContextValue: AuthContextType = {
    user,
    login,
    signup,
    logout,
    isLoading
  };

  return (
    <ThemeContext.Provider value={themeContextValue}>
      <AuthContext.Provider value={authContextValue}>
        <div className={`min-h-screen bg-background text-foreground transition-colors duration-300 ${theme}`}>
          {/* Theme Toggle Button */}
          <div className="fixed top-4 right-4 z-50">
            <Button
              variant="outline"
              size="icon"
              onClick={toggleTheme}
              className="bg-background/80 backdrop-blur-sm"
            >
              {theme === 'light' ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
            </Button>
          </div>

          {!user ? (
            <div className="min-h-screen flex items-center justify-center p-4">
              <div className="w-full max-w-md space-y-6">
                <div className="text-center">
                  <h1 className="text-3xl font-bold tracking-tight">
                    Personal Finance Dashboard
                  </h1>
                  <p className="text-muted-foreground mt-2">
                    Track your income, expenses, and budgets
                  </p>
                </div>

                {authMode === 'login' ? (
                  <LoginForm onSwitchToSignup={() => setAuthMode('signup')} />
                ) : (
                  <SignupForm onSwitchToLogin={() => setAuthMode('login')} />
                )}
              </div>
            </div>
          ) : (
            <Dashboard />
          )}
        </div>
      </AuthContext.Provider>
    </ThemeContext.Provider>
  );
}

export default App;