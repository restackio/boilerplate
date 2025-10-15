import { Card, CardContent, CardHeader } from "@workspace/ui/components/ui/card";
import { Skeleton } from "@workspace/ui/components/ui/skeleton";

export function AnalyticsDashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Filters Skeleton */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="space-y-2 flex-1 min-w-[200px]">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2 flex-1 min-w-[200px]">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2 flex-1 min-w-[200px]">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tasks Overview Chart Skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-64" />
        <Card>
          <CardContent className="pt-6">
            <div className="h-[300px] flex items-end justify-between gap-2 px-4">
              {[65, 45, 80, 55, 70, 50, 85, 60, 75, 55, 65, 70].map((height, i) => (
                <Skeleton 
                  key={i} 
                  className="flex-1" 
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics Skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Skeleton className="h-8 w-24" />
                  <div className="h-[200px] flex items-end justify-between gap-1">
                    {[60, 50, 75, 55, 70, 45, 80, 65, 70, 60, 65, 55].map((height, j) => (
                      <Skeleton 
                        key={j} 
                        className="flex-1" 
                        style={{ height: `${height}%` }}
                      />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Quality Metrics Skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-8 w-20" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Skeleton className="h-8 w-24" />
                  <div className="h-[200px] flex items-end justify-between gap-1">
                    {[70, 55, 65, 50, 75, 60, 70, 55, 80, 65, 60, 70].map((height, j) => (
                      <Skeleton 
                        key={j} 
                        className="flex-1" 
                        style={{ height: `${height}%` }}
                      />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

