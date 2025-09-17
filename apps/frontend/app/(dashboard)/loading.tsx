import { CenteredLoading } from "@workspace/ui/components/loading-states";

export default function Loading() {
  return (
    <CenteredLoading 
      message="Loading dashboard..." 
      height="min-h-screen"
    />
  );
}
