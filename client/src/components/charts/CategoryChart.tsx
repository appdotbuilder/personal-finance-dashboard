import { useMemo } from 'react';

interface CategoryChartProps {
  data: Array<{
    category_id: number | null;
    category_name: string | null;
    total_amount: number;
    transaction_count: number;
  }>;
}

const COLORS = [
  '#4ecdc4', '#ff6b6b', '#45b7d1', '#96ceb4', '#feca57',
  '#ff9ff3', '#54a0ff', '#5f27cd', '#00d2d3', '#ff9f43',
  '#26de81', '#fd79a8', '#6c5ce7', '#fdcb6e', '#e17055',
  '#74b9ff', '#0984e3', '#00b894', '#00cec9', '#a29bfe'
];

export function CategoryChart({ data }: CategoryChartProps) {
  const chartData = useMemo(() => {
    // Filter out income (positive amounts) and focus on expenses
    const expenseData = data
      .filter(item => item.total_amount < 0)
      .map(item => ({
        name: item.category_name || 'Uncategorized',
        value: Math.abs(item.total_amount),
        count: item.transaction_count,
        percentage: 0 // Will be calculated below
      }))
      .sort((a, b) => b.value - a.value); // Sort by value descending

    // Calculate total for percentage calculation
    const total = expenseData.reduce((sum, item) => sum + item.value, 0);

    // Add percentage calculation
    return expenseData.map((item, index) => ({
      ...item,
      percentage: total > 0 ? ((item.value / total) * 100) : 0,
      color: COLORS[index % COLORS.length]
    }));
  }, [data]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (!data || data.length === 0 || chartData.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <div className="text-4xl mb-2">🥧</div>
          <p>No expense data available</p>
          <p className="text-sm">Add some expense transactions to see the breakdown</p>
        </div>
      </div>
    );
  }

  // Create a simple donut chart using CSS
  const createDonutSegments = () => {
    let cumulativePercentage = 0;
    
    return chartData.map((item, index) => {
      const startAngle = (cumulativePercentage / 100) * 360;
      const endAngle = ((cumulativePercentage + item.percentage) / 100) * 360;
      cumulativePercentage += item.percentage;
      
      // Create SVG path for the segment
      const centerX = 100;
      const centerY = 100;
      const outerRadius = 80;
      const innerRadius = 40;
      
      const startAngleRad = (startAngle - 90) * (Math.PI / 180);
      const endAngleRad = (endAngle - 90) * (Math.PI / 180);
      
      const x1 = centerX + outerRadius * Math.cos(startAngleRad);
      const y1 = centerY + outerRadius * Math.sin(startAngleRad);
      const x2 = centerX + outerRadius * Math.cos(endAngleRad);
      const y2 = centerY + outerRadius * Math.sin(endAngleRad);
      
      const x3 = centerX + innerRadius * Math.cos(endAngleRad);
      const y3 = centerY + innerRadius * Math.sin(endAngleRad);
      const x4 = centerX + innerRadius * Math.cos(startAngleRad);
      const y4 = centerY + innerRadius * Math.sin(startAngleRad);
      
      const largeArcFlag = item.percentage > 50 ? 1 : 0;
      
      const pathData = [
        `M ${x1} ${y1}`,
        `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
        `L ${x3} ${y3}`,
        `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x4} ${y4}`,
        'Z'
      ].join(' ');
      
      return {
        ...item,
        pathData,
        startAngle,
        endAngle
      };
    });
  };

  const segments = createDonutSegments();

  return (
    <div className="h-80 flex flex-col items-center">
      {/* SVG Donut Chart */}
      <div className="relative flex-1 flex items-center justify-center">
        <svg width="200" height="200" className="overflow-visible">
          {segments.map((segment, index) => (
            <g key={index}>
              <path
                d={segment.pathData}
                fill={segment.color}
                className="hover:opacity-80 transition-opacity cursor-pointer"
                stroke="white"
                strokeWidth="2"
              >
                <title>
                  {segment.name}: {formatCurrency(segment.value)} ({segment.percentage.toFixed(1)}%)
                </title>
              </path>
              
              {/* Percentage label for segments > 5% */}
              {segment.percentage > 5 && (
                <text
                  x={100 + 60 * Math.cos(((segment.startAngle + segment.endAngle) / 2 - 90) * (Math.PI / 180))}
                  y={100 + 60 * Math.sin(((segment.startAngle + segment.endAngle) / 2 - 90) * (Math.PI / 180))}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-xs font-medium fill-white"
                  style={{ fontSize: '10px' }}
                >
                  {segment.percentage.toFixed(0)}%
                </text>
              )}
            </g>
          ))}
        </svg>
        
        {/* Center text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-lg font-bold">
              {formatCurrency(chartData.reduce((sum, item) => sum + item.value, 0))}
            </div>
            <div className="text-xs text-muted-foreground">Total Expenses</div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="w-full mt-4 space-y-2 max-h-32 overflow-y-auto">
        {chartData.slice(0, 6).map((item, index) => (
          <div key={index} className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2 min-w-0 flex-1">
              <div 
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="truncate">{item.name}</span>
            </div>
            <div className="text-right flex-shrink-0 ml-2">
              <div className="font-medium">{formatCurrency(item.value)}</div>
              <div className="text-xs text-muted-foreground">
                {item.percentage.toFixed(1)}% • {item.count} transactions
              </div>
            </div>
          </div>
        ))}
        {chartData.length > 6 && (
          <div className="text-xs text-muted-foreground text-center pt-1">
            +{chartData.length - 6} more categories
          </div>
        )}
      </div>
    </div>
  );
}