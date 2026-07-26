import { createFileRoute } from '@tanstack/react-router';
import DetailPanel from '../components/detail/DetailPanel';
import { useSidebar } from '../context/SidebarContext.tsx';

export const Route = createFileRoute('/network/$networkId')({
    component: NetworkComponent,
});

function NetworkComponent() {
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
            showingPanel="network"
            isMobile={isMobile}
            showMasterPanel={showMasterPanel}
            onBackToMaster={handleBackToMaster}
        />
    );
}
