import { createFileRoute } from "@tanstack/react-router";
import { useSidebar } from "../context/SidebarContext.tsx";
import { EmptyState } from "../components/detail/EmptyState.tsx";
import ServerDetail from "../components/detail/ServerDetail.tsx";

export const Route = createFileRoute("/server/$serverId")({
  component: ServerComponent,
});

function ServerComponent() {
  const { serverId } = Route.useParams();
  const { serverGroups } = useSidebar();

  const parsedId = Number(serverId);
  const selectedServer =
    Object.values(serverGroups)
      .flat()
      .find((s) => s.id === parsedId) ?? null;

  return selectedServer ? (
    <ServerDetail server={selectedServer} />
  ) : (
    <EmptyState
      title="Select a Server or Network"
      message="Server not found"
      isError
    />
  );
}
