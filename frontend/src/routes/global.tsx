import { createFileRoute } from "@tanstack/react-router";
import GlobalStatsChart from "../components/global-stats/GlobalStatsChart.tsx";
import { DetailShell } from "../components/sidebar/DetailShell.tsx";
import { getBaseUrl } from "../util/getApi.ts";
import { ApiPacker } from "../../../common/Packer.ts";
import { GamemodeInfo } from "../../../common/models/GlobalStatsTypes.ts";
import { EmptyState } from "../components/detail/EmptyState.tsx";
import { LoadingSpinner } from "../components/LoadingSpinner.tsx";

export const Route = createFileRoute("/global")({
  component: GlobalComponent,
  pendingComponent: () => (
    <div className="flex h-full items-center justify-center">
      <LoadingSpinner showText={false} />
    </div>
  ),
  loader: async () => {
    try {
      const baseUrl = getBaseUrl();
      const r = await fetch(`${baseUrl}/api/gamemodes`);

      if (r.ok) {
        return { gamemodes: ApiPacker.unpack<GamemodeInfo>(await r.json()) };
      }
      return { error: "Unable to fetch gamemodes" };
    } catch (err) {
      console.error("Error fetching server details in loader:", err);
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
