import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  PieChart as PieChartIcon,
  Download,
  Calendar
} from 'lucide-react';
import { trpc } from '@/utils/trpc';
import { useAuth } from '@/App';
import { OverviewChart } from './charts/OverviewChart';
import { CategoryChart } from './charts/CategoryChart';
import { TrendChart } from './charts/TrendChart';
import type { Summary } from '../../../server/src/schema';

export function Analytics() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [yearlyData, setYearlyData] = useState<Summary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [year, setYear] = useState(new Date().getFullYear());
  const [compareYear, setCompareYear] = useState(new Date().getFullYear() - 1);

  const loadAnalyticsData = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const [currentData, previousData] = await Promise.all([
        trpc.getSummary.query({
          user_id: user.id,
          period: 'yearly',
          year: year
        }),
        trpc.getSummary.query({
          user_id: user.id,
          period: 'yearly',
          year: compareYear
        })
      ]);

      setSummary(currentData);
      setYearlyData(previousData);
    } catch (error) {
      console.error('Failed to load analytics data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAnalyticsData();
  }, [user, year, compareYear]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const calculateGrowth = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const exportData = () => {
    if (!summary) return;
    
    const dataToExport = {
      year: year,
      summary: {
        total_income: summary.total_income,
        total_expenses: summary.total_expenses,
        net_income: summary.net_income
      },
      categories: summary.categories,
      monthly_data: summary.monthly_data
    };

    const dataStr = JSON.stringify(dataToExport, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `financial-analytics-${year}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Analytics</h1>
        </div>
        <div className="grid gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-80 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const incomeGrowth = calculateGrowth(
    summary?.total_income || 0, 
    yearlyData?.total_income || 0
  );

  const expenseGrowth = calculateGrowth(
    summary?.total_expenses || 0,
    yearlyData?.total_expenses || 0
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold">Analytics</h1>
        
        <div className="flex items-center space-x-2">
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

          <Select value={compareYear.toString()} onValueChange={(value) => setCompareYear(parseInt(value))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="" disabled>Compare to:</SelectItem>
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

          <Button variant="outline" size="sm" onClick={exportData}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Year-over-Year Comparison */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="animate-scaleIn">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Income ({year})</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {formatCurrency(summary?.total_income || 0)}
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              <span className={`flex items-center ${
                incomeGrowth >= 0 ? 'text-success' : 'text-destructive'
              }`}>
                {incomeGrowth >= 0 ? '↗️' : '↘️'} {Math.abs(incomeGrowth).toFixed(1)}%
              </span>
              <span className="ml-1">vs {compareYear}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-scaleIn" style={{ animationDelay: '0.1s' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expenses ({year})</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(Math.abs(summary?.total_expenses || 0))}
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              <span className={`flex items-center ${
                expenseGrowth <= 0 ? 'text-success' : 'text-destructive'
              }`}>
                {expenseGrowth >= 0 ? '↗️' : '↘️'} {Math.abs(expenseGrowth).toFixed(1)}%
              </span>
              <span className="ml-1">vs {compareYear}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-scaleIn" style={{ animationDelay: '0.2s' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Savings Rate</CardTitle>
            <BarChart3 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {summary?.total_income ? 
                Math.max(0, ((summary.net_income / summary.total_income) * 100)).toFixed(1) : '0.0'
              }%
            </div>
            <div className="text-xs text-muted-foreground">
              Percentage of income saved
            </div>
          </CardContent>
        </Card>

        <Card className="animate-scaleIn" style={{ animationDelay: '0.3s' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Category</CardTitle>
            <PieChartIcon className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary?.categories && summary.categories.length > 0
                ? summary.categories
                    .filter(c => c.total_amount < 0)
                    .sort((a, b) => a.total_amount - b.total_amount)[0]?.category_name || 'None'
                : 'None'
              }
            </div>
            <div className="text-xs text-muted-foreground">
              Highest expense category
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card className="animate-scaleIn">
            <CardHeader>
              <CardTitle>Monthly Income vs Expenses - {year}</CardTitle>
              <CardDescription>
                Track your financial performance throughout the year
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OverviewChart 
                data={summary?.monthly_data || []}
                period="monthly"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="animate-scaleIn">
              <CardHeader>
                <CardTitle>Expense Categories</CardTitle>
                <CardDescription>
                  Distribution of expenses by category
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CategoryChart data={summary?.categories || []} />
              </CardContent>
            </Card>

            <Card className="animate-scaleIn" style={{ animationDelay: '0.1s' }}>
              <CardHeader>
                <CardTitle>Category Details</CardTitle>
                <CardDescription>
                  Detailed breakdown of spending by category
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {summary?.categories
                    ?.filter(c => c.total_amount < 0)
                    ?.sort((a, b) => a.total_amount - b.total_amount)
                    ?.slice(0, 5)
                    ?.map((category, index) => (
                    <div key={category.category_id || 'uncategorized'} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: `hsl(${index * 45}, 70%, 50%)` }} />
                        <div>
                          <p className="font-medium">{category.category_name || 'Uncategorized'}</p>
                          <p className="text-sm text-muted-foreground">
                            {category.transaction_count} transactions
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(Math.abs(category.total_amount))}</p>
                        <p className="text-sm text-muted-foreground">
                          {summary?.total_expenses ? 
                            ((Math.abs(category.total_amount) / Math.abs(summary.total_expenses)) * 100).toFixed(1) : 0
                          }% of total
                        </p>
                      </div>
                    </div>
                  ))}
                  
                  {(!summary?.categories || summary.categories.filter(c => c.total_amount < 0).length === 0) && (
                    <div className="text-center text-muted-foreground py-8">
                      <div className="text-4xl mb-2">📊</div>
                      <p>No expense categories found</p>
                      <p className="text-sm">Add some expense transactions to see the breakdown</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card className="animate-scaleIn">
            <CardHeader>
              <CardTitle>Financial Trends</CardTitle>
              <CardDescription>
                Analyze your financial patterns over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TrendChart 
                currentYearData={summary?.monthly_data || []}
                previousYearData={yearlyData?.monthly_data || []}
                currentYear={year}
                previousYear={compareYear}
              />
            </CardContent>
          </Card>

          {/* Additional trend insights */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="animate-scaleIn" style={{ animationDelay: '0.1s' }}>
              <CardHeader>
                <CardTitle>Monthly Averages</CardTitle>
                <CardDescription>Average monthly financial metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span>Average Income</span>
                  <span className="font-semibold text-success">
                    {formatCurrency((summary?.total_income || 0) / 12)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Average Expenses</span>
                  <span className="font-semibold text-destructive">
                    {formatCurrency(Math.abs(summary?.total_expenses || 0) / 12)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Average Savings</span>
                  <span className={`font-semibold ${
                    (summary?.net_income || 0) >= 0 ? 'text-success' : 'text-destructive'
                  }`}>
                    {formatCurrency((summary?.net_income || 0) / 12)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="animate-scaleIn" style={{ animationDelay: '0.2s' }}>
              <CardHeader>
                <CardTitle>Best vs Worst Month</CardTitle>
                <CardDescription>Financial performance comparison</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {summary?.monthly_data && summary.monthly_data.length > 0 ? (
                  <>
                    {(() => {
                      const monthlyNet = summary.monthly_data.map(m => ({
                        month: m.month,
                        net: m.income - Math.abs(m.expenses)
                      }));
                      const bestMonth = monthlyNet.reduce((best, current) => 
                        current.net > best.net ? current : best
                      );
                      const worstMonth = monthlyNet.reduce((worst, current) => 
                        current.net < worst.net ? current : worst
                      );
                      
                      const monthNames = [
                        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
                      ];

                      return (
                        <>
                          <div className="flex justify-between items-center">
                            <span>Best Month</span>
                            <div className="text-right">
                              <p className="font-semibold text-success">
                                {monthNames[bestMonth.month - 1]}
                              </p>
                              <p className="text-sm text-success">
                                {formatCurrency(bestMonth.net)}
                              </p>
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Worst Month</span>
                            <div className="text-right">
                              <p className="font-semibold text-destructive">
                                {monthNames[worstMonth.month - 1]}
                              </p>
                              <p className="text-sm text-destructive">
                                {formatCurrency(worstMonth.net)}
                              </p>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </>
                ) : (
                  <p className="text-muted-foreground">No data available</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}