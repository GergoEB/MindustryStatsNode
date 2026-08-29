import React from "react";

interface ServerStatsSummaryProps {
  onlineServers: number;
  totalServers: number;
  totalPlayers: number;
}

const ServerStatsSummary: React.FC<ServerStatsSummaryProps> = ({
  onlineServers,
  totalServers,
  totalPlayers,
}) => (
  <div className="flex items-center gap-2 text-sm text-secondary">
    <span className="font-semibold text-status-online">{onlineServers}</span>
    <span>/</span>
    <span className="font-semibold text-primary">{totalServers}</span>
    <span className="hidden sm:inline">online</span>
    <span className="text-tertiary">·</span>
    <span className="font-semibold text-accent">{totalPlayers}</span>
    <span className="hidden sm:inline">players</span>
  </div>
);

export default ServerStatsSummary;
