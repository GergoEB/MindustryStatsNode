import { createFileRoute } from "@tanstack/react-router";
import { DetailShell } from "../components/sidebar/DetailShell.tsx";
import { EmptyState } from "../components/detail/EmptyState.tsx";
import NetworkDetail from "../components/detail/NetworkDetail.tsx";

export const Route = createFileRoute("/network/$networkId")({
  component: NetworkComponent,
});

function NetworkComponent() {
  const { networkId } = Route.useParams();

  return (
    <DetailShell title="Network Details">
      {networkId != null ? (
        <NetworkDetail networkId={Number(networkId)} />
      ) : (
        <EmptyState
          title="Select a Server or Network"
          message="Network not found"
          isError
        />
      )}
    </DetailShell>
  );
}
