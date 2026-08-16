import React from "react";
import ServerItem from "./ServerItem";
import { isHub } from "../../util/mindustry.ts";
import { ServerElement } from "../../../../common/models/serverData.ts";
import { useNavigate } from "@tanstack/react-router";

const ServerGroup: React.FC<{
  name: string;
  servers: ServerElement[];
  expanded: boolean;
  onToggleExpand: () => void;
  selectedServerId: number;
  isSelected: boolean;
  networkId: number;
}> = ({
  name,
  servers,
  expanded,
  onToggleExpand,
  selectedServerId,
  isSelected,
  networkId
}) => {
  const navigate = useNavigate();

  const onlineServersCount = servers.filter((s) => s.online).length;
  const totalPlayers = servers.reduce(
    (sum, server) =>
      sum + (isHub(server) ? 0 : server.currentData?.players || 0),
    0,
  );

  return (
    <div
      className={`bg-neutral-800/50 backdrop-blur-md border rounded-xl overflow-hidden ${
        isSelected
          ? "border-orange-500/50"
          : "border-neutral-700/50"
      } ${expanded ? "border-orange-400/20 border-2" : "hover:border-orange-500/30"}`}
    >
      <div
        className="bg-neutral-900/50 backdrop-blur-sm border-neutral-700/50 px-4 py-3 flex justify-between items-center cursor-pointer hover:bg-neutral-800/50 transition-colors ${(expanded ? 'border-b' : '')}"
        onClick={onToggleExpand}
      >
        <div>
          <h3 className="font-semibold text-white text-sm">{name}</h3>
          <p className="text-xs text-gray-400">
            {onlineServersCount}/{servers.length} online, {totalPlayers} players
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => navigate({ to: `/network/${networkId}` })}
            className={`p-1.5 rounded-lg transition-colors ${
              isSelected
                ? "bg-orange-500/30 text-orange-400/50"
                : "bg-neutral-700/30 text-gray-400 hover:bg-orange-700/10 hover:border-orange-500/30 hover:text-gray-300"
            }`}
            title="View network graph"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </button>
          <span className="text-lg font-bold text-orange-400 drop-shadow-[0_0_10px_rgba(249,115,22,0.3)]">
            {totalPlayers}
          </span>
          <svg
            className={`h-4 w-4 text-orange-400 transform transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>
      {expanded && (
        <div className="divide-y divide-neutral-700/50">
          {servers.map((server) => (
            <ServerItem
              key={`${server.host}-${server.port}`}
              server={server}
              isSelected={server.id == selectedServerId}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ServerGroup;
