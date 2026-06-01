import { Suspense } from "react";
import { Dashboard } from "@/components/Dashboard";

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-sm text-zinc-500">
          Loading dashboard…
        </div>
      }
    >
      <Dashboard />
    </Suspense>
  );
}
