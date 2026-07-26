import { createFileRoute } from '@tanstack/react-router';
import DetailPanel from '../components/detail/DetailPanel';
import { useSidebar } from '../context/SidebarContext.tsx';

export const Route = createFileRoute('/inactive')({
    component: InactiveComponent,
});

function InactiveComponent() {
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
            selectedNetworkId={selectedNetwork?.id ?? null}
            showingPanel="inactive-servers"
            isMobile={isMobile}
            showMasterPanel={showMasterPanel}
            onBackToMaster={handleBackToMaster}
        />
    );
}
