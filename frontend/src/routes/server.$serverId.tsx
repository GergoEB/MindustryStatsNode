import { createFileRoute } from '@tanstack/react-router';
import DetailPanel from '../components/detail/DetailPanel';
import { useSidebar } from '../context/SidebarContext.tsx';

export const Route = createFileRoute('/server/$serverId')({
    component: ServerComponent,
});

function ServerComponent() {
    const { serverId } = Route.useParams();
    const { serverGroups, isMobile, showMasterPanel, handleBackToMaster } =
        useSidebar();

    const parsedId = Number(serverId);
    const selectedServer =
        Object.values(serverGroups)
            .flat()
            .find((s) => s.id === parsedId) ?? null;

    return (
        <DetailPanel
            selectedServer={selectedServer}
            selectedNetworkId={null}
            showingPanel="server"
            isMobile={isMobile}
            showMasterPanel={showMasterPanel}
            onBackToMaster={handleBackToMaster}
        />
    );
}
