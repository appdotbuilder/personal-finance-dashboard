import { useMemo } from 'react';

interface TrendChartProps {
  currentYearData: Array<{
    month: number;
    income: number;
    expenses: number;
  }>;
  previousYearData: Array<{
    month: number;
    income: number;
    expenses: number;
  }>;
  currentYear: number;
  previousYear: number;
}

export function TrendChart({ 
  currentYearData, 
  previousYearData, 
  currentYear, 
  previousYear 
}: TrendChartProps) {
  const chartData = useMemo(() => {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    const data = [];
    
    for (let i = 1; i <= 12; i++) {
      const currentMonth = currentYearData.find(d => d.month === i) || { month: i, income: 0, expenses: 0 };
      const previousMonth = previousYearData.find(d => d.month === i) || { month: i, income: 0, expenses: 0 };
      
      data.push({
        month: months[i - 1],
        currentNet: currentMonth.income - Math.abs(currentMonth.expenses),
        previousNet: previousMonth.income - Math.abs(previousMonth.expenses),
        currentIncome: currentMonth.income,
        previousIncome: previousMonth.income,
        currentExpenses: Math.abs(currentMonth.expenses),
        previousExpenses: Math.abs(previousMonth.expenses)
      });
    }
    
    return data;
  }, [currentYearData, previousYearData]);

  const { maxValue, minValue } = useMemo(() => {
    const allValues = chartData.flatMap(d => [d.currentNet, d.previousNet]);
    return {
      maxValue: Math.max(...allValues, 1000),
      minValue: Math.min(...allValues, -1000)
    };
  }, [chartData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate SVG path for line charts
  const createPath = (data: number[], isCurrentYear = true) => {
    const width = 300;
    const height = 200;
    const padding = 20;
    
    const points = data.map((value, index) => {
      const x = padding + (index / (data.length - 1)) * (width - 2 * padding);
      const normalizedValue = (value - minValue) / (maxValue - minValue);
      const y = height - padding - (normalizedValue * (height - 2 * padding));
      return `${x},${y}`;
    });

    return `M ${points.join(' L ')}`;
  };

  if (!currentYearData || currentYearData.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <div className="text-4xl mb-2">📈</div>
          <p>No trend data available</p>
          <p className="text-sm">Add transactions to see your financial trends</p>
        </div>
      </div>
    );
  }

  const currentNetData = chartData.map(d => d.currentNet);
  const previousNetData = chartData.map(d => d.previousNet);

  return (
    <div className="h-80 p-4">
      {/* Chart Header */}
      <div className="flex items-center justify-center space-x-4 mb-4">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-blue-500 rounded"></div>
          <span className="text-sm">{currentYear} Net Income</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 border-2 border-gray-400 rounded bg-transparent"></div>
          <span className="text-sm">{previousYear} Net Income</span>
        </div>
      </div>

      {/* Chart Area */}
      <div className="relative h-64 bg-muted/20 rounded-lg p-4 flex items-center justify-center">
        <svg width="340" height="240" className="overflow-visible">
          {/* Grid lines */}
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.1"/>
            </pattern>
          </defs>
          <rect width="340" height="240" fill="url(#grid)" />
          
          {/* Zero line */}
          <line
            x1="20"
            y1={240 - 20 - ((0 - minValue) / (maxValue - minValue)) * (240 - 40)}
            x2="320"
            y2={240 - 20 - ((0 - minValue) / (maxValue - minValue)) * (240 - 40)}
            stroke="currentColor"
            strokeWidth="1"
            opacity="0.3"
            strokeDasharray="5,5"
          />
          
          {/* Previous year line (dashed) */}
          <path
            d={createPath(previousNetData, false)}
            fill="none"
            stroke="#9ca3af"
            strokeWidth="2"
            strokeDasharray="5,5"
            className="opacity-70"
          />
          
          {/* Current year line */}
          <path
            d={createPath(currentNetData, true)}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="3"
          />
          
          {/* Data points */}
          {chartData.map((item, index) => {
            const x = 20 + (index / (chartData.length - 1)) * (340 - 40);
            const currentY = 240 - 20 - ((item.currentNet - minValue) / (maxValue - minValue)) * (240 - 40);
            const previousY = 240 - 20 - ((item.previousNet - minValue) / (maxValue - minValue)) * (240 - 40);
            
            return (
              <g key={index}>
                {/* Previous year point */}
                <circle
                  cx={x}
                  cy={previousY}
                  r="3"
                  fill="#9ca3af"
                  className="opacity-70"
                >
                  <title>
                    {item.month} {previousYear}: {formatCurrency(item.previousNet)}
                  </title>
                </circle>
                
                {/* Current year point */}
                <circle
                  cx={x}
                  cy={currentY}
                  r="4"
                  fill="#3b82f6"
                  className="hover:r-6 transition-all cursor-pointer"
                >
                  <title>
                    {item.month} {currentYear}: {formatCurrency(item.currentNet)}
                  </title>
                </circle>
                
                {/* Month labels */}
                <text
                  x={x}
                  y={260}
                  textAnchor="middle"
                  className="text-xs fill-current text-muted-foreground"
                >
                  {item.month}
                </text>
              </g>
            );
          })}

          {/* Y-axis labels */}
          {[maxValue, maxValue * 0.5, 0, minValue * 0.5, minValue].map((value, index) => {
            const y = 20 + (index / 4) * (240 - 40);
            return (
              <text
                key={index}
                x="15"
                y={y + 4}
                textAnchor="end"
                className="text-xs fill-current text-muted-foreground"
              >
                {formatCurrency(value)}
              </text>
            );
          })}
        </svg>
      </div>

      {/* Summary Stats */}
      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div className="text-center">
          <div className="font-medium text-blue-600">
            {formatCurrency(currentNetData.reduce((sum, val) => sum + val, 0))}
          </div>
          <div className="text-muted-foreground">{currentYear} Total Net</div>
        </div>
        <div className="text-center">
          <div className="font-medium text-gray-600">
            {formatCurrency(previousNetData.reduce((sum, val) => sum + val, 0))}
          </div>
          <div className="text-muted-foreground">{previousYear} Total Net</div>
        </div>
      </div>
    </div>
  );
}