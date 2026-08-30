import { createFileRoute } from "@tanstack/react-router";
import { DetailShell } from "../components/sidebar/DetailShell.tsx";
import { EmptyState } from "../components/detail/EmptyState.tsx";
import NetworkDetail from "../components/detail/NetworkDetail.tsx";
import { fetchNetworkDetails } from "../server/loaders.ts";
import { LoadingSpinner } from "../components/LoadingSpinner.tsx";

export const Route = createFileRoute("/network/$networkId")({
  component: NetworkComponent,
  pendingComponent: () => (
      <DetailShell title="Network Details">
        <LoadingSpinner showText={false} />
      </DetailShell>
  ),
  loader: async ({ params }) => {
    // Digits-only, matching what the API's t.Numeric() would have accepted.
    if (!/^\d+$/.test(params.networkId)) return { error: "Invalid network ID" };
    const networkId = parseInt(params.networkId, 10);

    try {
      const details = await fetchNetworkDetails({ data: networkId });
      if (!details) return { error: "Network not found" };
      return { details };
    } catch (err) {
      console.error("Error fetching network details in loader:", err);
      return { error: ((err as Error)?.message ?? "Unknown error") };
    }
  },
});

function NetworkComponent() {
  const { details, error } = Route.useLoaderData();
  return (
      <DetailShell title="Network Details">
        {details ? (
            <NetworkDetail details={details} />
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