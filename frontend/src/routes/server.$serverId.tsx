import { createFileRoute } from "@tanstack/react-router";
import { EmptyState } from "../components/detail/EmptyState.tsx";
import ServerDetail from "../components/detail/ServerDetail.tsx";
import { fetchServerDetails } from "../server/loaders.ts";
import { DetailShell } from "../components/sidebar/DetailShell.tsx";
import { LoadingSpinner } from "../components/LoadingSpinner.tsx";

export const Route = createFileRoute("/server/$serverId")({
  component: ServerComponent,
  pendingComponent: () => (
      <DetailShell title="Server Details">
        <LoadingSpinner showText={false} />
      </DetailShell>
  ),
  loader: async ({ params }) => {
    // Check if its an int before even asking the backend. Digits-only, to match
    // what the API's t.Numeric() would have accepted -- "7abc" is not server 7.
    if (!/^\d+$/.test(params.serverId)) {
      return { serverDataElement: null, error: "Invalid server ID" };
    }
    const serverId = parseInt(params.serverId, 10);

    try {
      const serverDataElement = await fetchServerDetails({ data: serverId });
      if (!serverDataElement) return { error: "Server not found" };
      return { serverDataElement };
    } catch (err) {
      console.error("Error fetching server details in loader:", err);
      return { error: ((err as Error)?.message ?? "Unknown error") };
    }
  },
});

function ServerComponent() {
  const { serverDataElement, error } = Route.useLoaderData();
  return (
    <DetailShell title="Server Details">
      {serverDataElement ? (
        <ServerDetail serverDataElement={serverDataElement} />
      ) : (
        <EmptyState
          title="Select a Server or Network"
          message="Server not found"
          error={error}
        />
      )}
    </DetailShell>
  );
}
