import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Home, 
  DollarSign, 
  PieChart, 
  Target, 
  Settings, 
  LogOut, 
  Menu,
  Bell
} from 'lucide-react';
import { useAuth } from '@/App';
import { Overview } from './Overview';
import { Transactions } from './Transactions';
import { Analytics } from './Analytics';
import { Budgets } from './Budgets';
import { Categories } from './Categories';

type DashboardPage = 'overview' | 'transactions' | 'analytics' | 'budgets' | 'categories';

interface SidebarItem {
  id: DashboardPage;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const sidebarItems: SidebarItem[] = [
  { id: 'overview', label: 'Overview', icon: Home },
  { id: 'transactions', label: 'Transactions', icon: DollarSign },
  { id: 'analytics', label: 'Analytics', icon: PieChart },
  { id: 'budgets', label: 'Budgets', icon: Target },
  { id: 'categories', label: 'Categories', icon: Settings },
];

export function Dashboard() {
  const { user, logout } = useAuth();
  const [currentPage, setCurrentPage] = useState<DashboardPage>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const userInitials = user ? `${user.first_name[0]}${user.last_name[0]}`.toUpperCase() : 'U';

  const renderPage = () => {
    switch (currentPage) {
      case 'overview':
        return <Overview />;
      case 'transactions':
        return <Transactions />;
      case 'analytics':
        return <Analytics />;
      case 'budgets':
        return <Budgets />;
      case 'categories':
        return <Categories />;
      default:
        return <Overview />;
    }
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-6">
        <h2 className="text-xl font-bold text-primary">Finance Dashboard</h2>
      </div>
      
      <nav className="flex-1 space-y-1 px-4">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          return (
            <Button
              key={item.id}
              variant={currentPage === item.id ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => {
                setCurrentPage(item.id);
                setSidebarOpen(false);
              }}
            >
              <Icon className="mr-3 h-4 w-4" />
              {item.label}
            </Button>
          );
        })}
      </nav>
      
      <div className="p-4 border-t">
        <div className="flex items-center space-x-3 mb-3">
          <Avatar>
            <AvatarFallback>{userInitials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {user?.first_name} {user?.last_name}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {user?.email}
            </p>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full" 
          onClick={logout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-shrink-0">
        <div className="flex flex-col w-64 bg-card border-r">
          <SidebarContent />
        </div>
      </aside>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="fixed left-0 top-0 h-full w-64 bg-card border-r animate-slideIn">
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top Navigation */}
        <header className="bg-card border-b px-4 lg:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            
            <h1 className="text-xl font-semibold ml-4 lg:ml-0 capitalize">
              {currentPage}
            </h1>
          </div>

          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {/* Notification badge - you can implement this based on budget alerts */}
            </Button>
            
            <div className="hidden lg:flex items-center space-x-3">
              <Avatar>
                <AvatarFallback>{userInitials}</AvatarFallback>
              </Avatar>
              <div className="text-sm">
                <p className="font-medium">{user?.first_name} {user?.last_name}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6 animate-fadeIn">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}