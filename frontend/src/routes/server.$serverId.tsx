import { createFileRoute } from '@tanstack/react-router';
import DetailPanel from '../components/detail/DetailPanel';
import { useSidebar } from '../context/SidebarContext.tsx';

export const Route = createFileRoute('/server/$serverId')({
    component: ServerComponent,
});

function ServerComponent() {
    const {
        selectedServer,
        selectedNetwork,
        isMobile,
        showMasterPanel,
        handleBackToMaster,
    } = useSidebar();

    return (
        <DetailPanel
            selectedServer={selectedServer}
            selectedNetwork={selectedNetwork}
            showingPanel="server"
            isMobile={isMobile}
            showMasterPanel={showMasterPanel}
            onBackToMaster={handleBackToMaster}
        />
    );
}
