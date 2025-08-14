import { useMemo } from 'react';

interface OverviewChartProps {
  data: Array<{
    month: number;
    income: number;
    expenses: number;
  }>;
  period: 'monthly' | 'yearly';
}

export function OverviewChart({ data, period }: OverviewChartProps) {
  const chartData = useMemo(() => {
    if (period === 'monthly') {
      return data.map(item => ({
        month: new Date(2024, item.month - 1).toLocaleDateString('en-US', { month: 'short' }),
        income: item.income,
        expenses: Math.abs(item.expenses),
        net: item.income - Math.abs(item.expenses)
      }));
    }
    
    return data.map(item => ({
      month: `Month ${item.month}`,
      income: item.income,
      expenses: Math.abs(item.expenses),
      net: item.income - Math.abs(item.expenses)
    }));
  }, [data, period]);

  const maxValue = useMemo(() => {
    const values = chartData.flatMap(d => [d.income, d.expenses]);
    return Math.max(...values, 1000);
  }, [chartData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (!data || data.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <div className="text-4xl mb-2">📊</div>
          <p>No data available</p>
          <p className="text-sm">Add some transactions to see your chart</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-80 p-4">
      {/* Chart Header */}
      <div className="flex items-center justify-center space-x-4 mb-4">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span className="text-sm">Income</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-red-500 rounded"></div>
          <span className="text-sm">Expenses</span>
        </div>
      </div>

      {/* Chart Area */}
      <div className="relative h-64 bg-muted/20 rounded-lg p-4 overflow-x-auto">
        <div className="flex items-end justify-between h-full min-w-full space-x-2">
          {chartData.map((item, index) => {
            const incomeHeight = (item.income / maxValue) * 100;
            const expensesHeight = (item.expenses / maxValue) * 100;
            
            return (
              <div key={index} className="flex-1 flex flex-col items-center group">
                {/* Bars Container */}
                <div className="flex items-end justify-center space-x-1 h-48 mb-2">
                  {/* Income Bar */}
                  <div className="relative flex flex-col items-center">
                    <div 
                      className="w-6 bg-green-500 rounded-t transition-all duration-500 hover:bg-green-600 relative group/bar"
                      style={{ height: `${incomeHeight}%` }}
                    >
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap z-10">
                        Income: {formatCurrency(item.income)}
                      </div>
                    </div>
                  </div>
                  
                  {/* Expenses Bar */}
                  <div className="relative flex flex-col items-center">
                    <div 
                      className="w-6 bg-red-500 rounded-t transition-all duration-500 hover:bg-red-600 relative group/bar"
                      style={{ height: `${expensesHeight}%` }}
                    >
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap z-10">
                        Expenses: {formatCurrency(item.expenses)}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Month Label */}
                <div className="text-xs text-muted-foreground text-center font-medium">
                  {item.month}
                </div>
              </div>
            );
          })}
        </div>

        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 h-48 flex flex-col justify-between text-xs text-muted-foreground -ml-2">
          <span>{formatCurrency(maxValue)}</span>
          <span>{formatCurrency(maxValue * 0.75)}</span>
          <span>{formatCurrency(maxValue * 0.5)}</span>
          <span>{formatCurrency(maxValue * 0.25)}</span>
          <span>$0</span>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-4 text-center">
        <div className="inline-flex items-center space-x-4 text-sm">
          <span className="text-green-600">
            Total Income: {formatCurrency(chartData.reduce((sum, item) => sum + item.income, 0))}
          </span>
          <span className="text-red-600">
            Total Expenses: {formatCurrency(chartData.reduce((sum, item) => sum + item.expenses, 0))}
          </span>
          <span className="font-medium">
            Net: {formatCurrency(chartData.reduce((sum, item) => sum + item.net, 0))}
          </span>
        </div>
      </div>
    </div>
  );
}