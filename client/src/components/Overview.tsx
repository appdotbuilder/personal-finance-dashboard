import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  CreditCard, 
  PiggyBank,
  AlertTriangle,
  ArrowUpIcon,
  ArrowDownIcon
} from 'lucide-react';
import { trpc } from '@/utils/trpc';
import { useAuth } from '@/App';
import { OverviewChart } from './charts/OverviewChart';
import { CategoryChart } from './charts/CategoryChart';
import type { Summary, BudgetAlert } from '../../../server/src/schema';

export function Overview() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [budgetAlerts, setBudgetAlerts] = useState<BudgetAlert[]>([]);
  const [period, setPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const [summaryResponse, alertsResponse] = await Promise.all([
        trpc.getSummary.query({
          user_id: user.id,
          period,
          year,
          month: period === 'monthly' ? month : undefined
        }),
        trpc.getBudgetAlerts.query({ userId: user.id })
      ]);

      setSummary(summaryResponse);
      setBudgetAlerts(alertsResponse);
    } catch (error) {
      console.error('Failed to load overview data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user, period, year, month]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getPercentageChange = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Overview</h1>
          <div className="flex items-center space-x-2">
            <div className="h-10 w-32 bg-muted animate-pulse rounded" />
            <div className="h-10 w-24 bg-muted animate-pulse rounded" />
            <div className="h-10 w-32 bg-muted animate-pulse rounded" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-20 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header with Period Selection */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold">Overview</h1>
        
        <div className="flex items-center space-x-2">
          <Select value={period} onValueChange={(value: 'monthly' | 'yearly') => setPeriod(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>

          <Select value={year.toString()} onValueChange={(value) => setYear(parseInt(value))}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 5 }, (_, i) => {
                const yearOption = new Date().getFullYear() - i;
                return (
                  <SelectItem key={yearOption} value={yearOption.toString()}>
                    {yearOption}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          {period === 'monthly' && (
            <Select value={month.toString()} onValueChange={(value) => setMonth(parseInt(value))}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((monthName, index) => (
                  <SelectItem key={index + 1} value={(index + 1).toString()}>
                    {monthName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Budget Alerts */}
      {budgetAlerts.length > 0 && (
        <Card className="border-warning bg-warning/5">
          <CardHeader>
            <CardTitle className="flex items-center text-warning">
              <AlertTriangle className="mr-2 h-5 w-5" />
              Budget Alerts
            </CardTitle>
            <CardDescription>
              You have {budgetAlerts.length} budget alert{budgetAlerts.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {budgetAlerts.slice(0, 3).map((alert) => (
                <div key={alert.budget_id} className="flex items-center justify-between p-3 bg-card rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">
                      {alert.category_name || 'General Budget'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(alert.spent_amount)} of {formatCurrency(alert.budget_amount)} spent
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant={alert.percentage_used >= 100 ? 'destructive' : 'secondary'} 
                           className={alert.percentage_used >= 100 ? '' : 'bg-yellow-500 text-yellow-50'}>
                      {alert.percentage_used.toFixed(0)}%
                    </Badge>
                    <Progress 
                      value={Math.min(alert.percentage_used, 100)} 
                      className="w-20 mt-1"
                    />
                  </div>
                </div>
              ))}
              {budgetAlerts.length > 3 && (
                <p className="text-sm text-muted-foreground text-center pt-2">
                  +{budgetAlerts.length - 3} more alerts
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="animate-scaleIn">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {formatCurrency(summary?.total_income || 0)}
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              <ArrowUpIcon className="mr-1 h-3 w-3" />
              <span>Income for {period === 'monthly' ? months[month - 1] : year}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-scaleIn" style={{ animationDelay: '0.1s' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(summary?.total_expenses || 0)}
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              <ArrowDownIcon className="mr-1 h-3 w-3" />
              <span>Expenses for {period === 'monthly' ? months[month - 1] : year}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-scaleIn" style={{ animationDelay: '0.2s' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Income</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              (summary?.net_income || 0) >= 0 ? 'text-success' : 'text-destructive'
            }`}>
              {formatCurrency(summary?.net_income || 0)}
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              <span>
                {(summary?.net_income || 0) >= 0 ? 'Profit' : 'Loss'} this {period.slice(0, -2)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-scaleIn" style={{ animationDelay: '0.3s' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Savings Rate</CardTitle>
            <PiggyBank className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {summary?.total_income ? 
                Math.max(0, ((summary.net_income / summary.total_income) * 100)).toFixed(1) : '0.0'
              }%
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              <span>Percentage of income saved</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="animate-scaleIn" style={{ animationDelay: '0.4s' }}>
          <CardHeader>
            <CardTitle>Income vs Expenses</CardTitle>
            <CardDescription>
              {period === 'monthly' 
                ? `Monthly trend for ${year}` 
                : `Yearly comparison`
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <OverviewChart 
              data={summary?.monthly_data || []}
              period={period}
            />
          </CardContent>
        </Card>

        <Card className="animate-scaleIn" style={{ animationDelay: '0.5s' }}>
          <CardHeader>
            <CardTitle>Expense Categories</CardTitle>
            <CardDescription>
              Breakdown by category for {period === 'monthly' ? months[month - 1] : year}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryChart 
              data={summary?.categories || []}
            />
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Preview */}
      {summary?.categories && summary.categories.length > 0 && (
        <Card className="animate-scaleIn" style={{ animationDelay: '0.6s' }}>
          <CardHeader>
            <CardTitle>Category Summary</CardTitle>
            <CardDescription>
              Transaction activity by category
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {summary.categories.slice(0, 5).map((category, index) => (
                <div key={category.category_id || 'uncategorized'} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <div>
                      <p className="font-medium">
                        {category.category_name || 'Uncategorized'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {category.transaction_count} transaction{category.transaction_count !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {formatCurrency(Math.abs(category.total_amount))}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}