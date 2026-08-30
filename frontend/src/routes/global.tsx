import { createFileRoute } from "@tanstack/react-router";
import GlobalStatsChart from "../components/global-stats/GlobalStatsChart.tsx";
import { DetailShell } from "../components/sidebar/DetailShell.tsx";
import { fetchGamemodes } from "../server/loaders.ts";
import { EmptyState } from "../components/detail/EmptyState.tsx";
import { LoadingSpinner } from "../components/LoadingSpinner.tsx";

export const Route = createFileRoute("/global")({
  component: GlobalComponent,
  pendingComponent: () => (
      <DetailShell title="Global Stats">
        <LoadingSpinner showText={false} />
      </DetailShell>
  ),
  loader: async () => {
    try {
      return { gamemodes: await fetchGamemodes() };
    } catch (err) {
      console.error("Error fetching gamemodes in loader:", err);
      return { error: (err as Error)?.message ?? "Unknown error" };
    }
  },
});

function GlobalComponent() {
  const { gamemodes, error } = Route.useLoaderData();
  return (
    <DetailShell title="Global Stats">
      {gamemodes ? (
        <GlobalStatsChart gamemodeList={gamemodes} />
      ) : (
        <EmptyState
          title="Unexpected Error"
          message="Something went wrong while fetching the data"
          error={error}
        />
      )}
    </DetailShell>
  );
}
