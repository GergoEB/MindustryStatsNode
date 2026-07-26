import { createFileRoute } from '@tanstack/react-router';
import DetailPanel from '../components/detail/DetailPanel';
import { useSidebar } from '../context/SidebarContext.tsx';

export const Route = createFileRoute('/')({
    component: IndexComponent,
});

function IndexComponent() {
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
            showingPanel={null}
            isMobile={isMobile}
            showMasterPanel={showMasterPanel}
            onBackToMaster={handleBackToMaster}
        />
    );
}
