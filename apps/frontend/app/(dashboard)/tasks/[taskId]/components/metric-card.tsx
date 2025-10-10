interface MetricCardProps {
  label: string;
  value: string | number;
  className?: string;
}

export function MetricCard({ 
  label, 
  value, 
  className = "",
}: MetricCardProps) {
  return (
    <div className={`bg-background rounded-lg border p-3 ${className}`}>
      <div className="flex items-center gap-2 mb-1">
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
