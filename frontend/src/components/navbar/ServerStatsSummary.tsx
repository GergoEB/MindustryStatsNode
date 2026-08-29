import React from "react";
import Tooltip from "../Tooltip.tsx";

interface ServerStatsSummaryProps {
  onlineServers: number;
  totalServers: number;
  totalPlayers: number;
  lastUpdated: string;
  relativeUpdated: string;
}

const ServerStatsSummary: React.FC<ServerStatsSummaryProps> = ({
  onlineServers,
  totalServers,
  totalPlayers,
  lastUpdated,
  relativeUpdated,
}) => (
  <div className="flex items-center gap-2 text-sm text-secondary">
    <span className="font-semibold text-status-online">{onlineServers}</span>
    <span>/</span>
    <span className="font-semibold text-primary">{totalServers}</span>
    <span className="hidden sm:inline">online</span>
    <span className="text-tertiary">·</span>
    <span className="font-semibold text-accent">{totalPlayers}</span>
    <span className="hidden sm:inline">players</span>

    <Tooltip content={String(lastUpdated ?? "")} position="bottom" delay={200}>
      <span className="text-xs text-tertiary ml-1">{relativeUpdated}</span>
    </Tooltip>
  </div>
);

export default ServerStatsSummary;
