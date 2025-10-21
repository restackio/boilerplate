"use client";

/**
 * Base Line Chart Component
 * Reusable chart that handles all SVG rendering logic
 */

interface DataPoint {
  x: number;
  y: number;
  value: number;
  label: string;
}

interface BaseLineChartProps {
  data: DataPoint[];
  color: string;
  fillColor: string;
  height?: number;
  showGrid?: boolean;
  formatValue: (value: number) => string;
}

export default function BaseLineChart({ 
  data, 
  color, 
  fillColor, 
  height = 160,
  showGrid = false,
  formatValue 
}: BaseLineChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-[200px] flex items-center justify-center">
        <p className="text-sm text-muted-foreground">No data available</p>
      </div>
    );
  }

  // Handle single data point case
  const isSinglePoint = data.length === 1;
  
  return (
    <div className="relative bg-card rounded-lg border border-border" style={{ height }}>
      <svg className="absolute inset-0 w-full h-full p-4" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`gradient-${color.replace(/[^a-z]/gi, '')}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={fillColor} stopOpacity="0.5" />
            <stop offset="100%" stopColor={fillColor} stopOpacity="0" />
          </linearGradient>
        </defs>
        
        {/* Grid lines */}
        {showGrid && (
          <>
            <line x1="0" y1="25" x2="100" y2="25" stroke="currentColor" strokeOpacity="0.1" strokeDasharray="2,2" />
            <line x1="0" y1="50" x2="100" y2="50" stroke="currentColor" strokeOpacity="0.1" strokeDasharray="2,2" />
            <line x1="0" y1="75" x2="100" y2="75" stroke="currentColor" strokeOpacity="0.1" strokeDasharray="2,2" />
          </>
        )}
        
        {isSinglePoint ? (
          // Single point visualization - show as a horizontal line with point
          <>
            <line 
              x1="10" 
              y1={data[0].y} 
              x2="90" 
              y2={data[0].y} 
              stroke={color}
              strokeWidth="2"
              strokeDasharray="4,4"
            />
            <circle
              cx="50"
              cy={data[0].y}
              r="6"
              fill={color}
              stroke="white"
              strokeWidth="2"
            >
              <title>{`${data[0].label}: ${formatValue(data[0].value)}`}</title>
            </circle>
          </>
        ) : (
          <>
            {/* Area fill */}
            <polygon
              fill={`url(#gradient-${color.replace(/[^a-z]/gi, '')})`}
              points={`
                0,100
                ${data.map(p => `${p.x},${p.y}`).join(' ')}
                100,100
              `}
            />
            
            {/* Main line */}
            <polyline
              fill="none"
              stroke={color}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={data.map(p => `${p.x},${p.y}`).join(' ')}
            />
            
            {/* Points */}
            {data.map((point, idx) => (
              <circle
                key={idx}
                cx={point.x}
                cy={point.y}
                r="4"
                fill={color}
                stroke="white"
                strokeWidth="2"
                className="cursor-pointer"
              >
                <title>{`${point.label}: ${formatValue(point.value)}`}</title>
              </circle>
            ))}
          </>
        )}
      </svg>
    </div>
  );
}

