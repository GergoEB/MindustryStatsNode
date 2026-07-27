import { createFileRoute } from "@tanstack/react-router";
import GlobalStatsChart from "../components/global-stats/GlobalStatsChart.tsx";
import { DetailShell } from "../components/sidebar/DetailShell.tsx";

export const Route = createFileRoute("/global")({
  component: GlobalComponent,
});

function GlobalComponent() {
  return (
    <DetailShell title="Global Stats">
      <GlobalStatsChart />
    </DetailShell>
  );
}
