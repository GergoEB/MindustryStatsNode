import { createFileRoute } from '@tanstack/react-router';
import InactiveServersDetail from '../components/detail/InactiveServersDetail.tsx';
import { DetailShell } from '../components/sidebar/DetailShell.tsx';

export const Route = createFileRoute('/inactive')({
  component: InactiveServers
});

function InactiveServers() {
  return (
    <DetailShell title="Inactive Servers">
      <InactiveServersDetail />
    </DetailShell>
  )
}