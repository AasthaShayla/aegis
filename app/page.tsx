"use client";

import dynamic from "next/dynamic";
import { Splash } from "@/components/ui/Splash";

// MapLibre + deck.gl touch WebGL/`window` at import, so the whole dashboard is
// client-only. ssr:false keeps it out of the server bundle entirely.
const Dashboard = dynamic(() => import("@/components/Dashboard"), {
  ssr: false,
  loading: () => <Splash />,
});

export default function Page() {
  return <Dashboard />;
}
