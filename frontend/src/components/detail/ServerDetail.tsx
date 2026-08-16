import React from "react";
import ServerHistoryChart from "./ServerHistoryChart.tsx";
import MapHistoryTable from "./table/MapHistoryTable.tsx";
import MotdHistoryTable from "./table/MotdHistoryTable.tsx";
import { removeColors } from "../../util/mindustry.ts";
import { formatDate } from "../../util/general.ts";
import CopyButton from "../CopyButton.tsx";
import ShareButton from "../ShareButton.tsx";
import {
    ServerDetails,
  ServerElement,
} from "../../../../common/models/serverData.ts";
import { getModeName } from "../../../../common/Gamemode.ts";

const ServerDetail: React.FC<{ serverDataElement: ServerDetails & ServerElement }> = ({ serverDataElement }) => {
  const serverData = serverDataElement.currentData;
  const serverStatus = serverDataElement.online
    ? "Online"
    : serverDataElement.lastSeen
      ? `Offline - Last Seen ${formatDate(serverDataElement.lastSeen)}`
      : "Offline";
  const statusClass = serverDataElement.online
    ? "bg-green-500/20 text-green-400 border-green-500/30"
    : "bg-red-500/20 text-red-400 border-red-500/30";

  const formatUptime = (percentage: number) => {
    return `${percentage.toFixed(1)}%`;
  };

  return (
    <div className="h-full overflow-y-auto p-3 sm:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-neutral-800/30 backdrop-blur-md border border-neutral-700/50 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4 gap-4">
            <div className="flex-1 min-w-0">
              {serverData?.serverName && (
                <h1 className="text-xl sm:text-2xl font-bold text-white mb-2 wrap-break-word">
                  {String(removeColors(serverData.serverName))}
                </h1>
              )}
              {serverData?.description && (
                <p className="text-gray-300 mb-4 text-sm sm:text-base wrap-break-word">
                  {String(removeColors(serverData.description))}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                <span
                  className={`${statusClass} text-xs sm:text-sm px-2 sm:px-3 py-1 rounded-full border backdrop-blur-sm`}
                >
                  {serverStatus}
                </span>
                {serverDataElement.online && serverData && (
                  <>
                    <span className="text-xs sm:text-sm text-gray-400">
                      {serverData.players}/{serverData.playerLimit} players
                    </span>
                    <span className="text-xs sm:text-sm text-gray-400">
                      {serverData.ping}ms
                    </span>
                  </>
                )}
              </div>
              {/* Action buttons - stacked on mobile */}
              <div className="flex flex-wrap gap-2 mt-3">
                <CopyButton
                  text={`${serverDataElement.host}:${serverDataElement.port}`}
                  className="bg-neutral-700/50 hover:bg-neutral-600/50 text-gray-300 text-xs sm:text-sm px-2 sm:px-3 py-1 rounded transition-colors border border-neutral-600/50"
                />
                <ShareButton
                  serverId={serverDataElement.id}
                  className="bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 text-xs sm:text-sm px-2 sm:px-3 py-1 rounded transition-colors border border-orange-500/30"
                />
              </div>
            </div>

            {serverDataElement.online && serverData && (
              <div className="text-left sm:text-right shrink-0">
                <div className="text-3xl sm:text-4xl font-bold text-orange-400 drop-shadow-[0_0_10px_rgba(249,115,22,0.3)]">
                  {String(serverData.players)}
                </div>
                <div className="text-xs sm:text-sm text-gray-400">
                  players online
                </div>
              </div>
            )}
          </div>

          {serverData && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 text-xs sm:text-sm">
              <div className="bg-neutral-700/30 backdrop-blur-sm border border-neutral-600/30 p-2 sm:p-3 rounded-lg">
                <span className="text-gray-400">Map: </span>
                <span className="font-medium text-white wrap-break-word">
                  {String(removeColors(serverData.mapName)) || "Unknown"}
                </span>
              </div>
              <div className="bg-neutral-700/30 backdrop-blur-sm border border-neutral-600/30 p-2 sm:p-3 rounded-lg">
                <span className="text-gray-400">Wave: </span>
                <span className="font-medium text-white">
                  {serverData.wave || "0"}
                </span>
              </div>
              <div className="bg-neutral-700/30 backdrop-blur-sm border border-neutral-600/30 p-2 sm:p-3 rounded-lg">
                <span className="text-gray-400">Mode: </span>
                <span className="font-medium text-white wrap-break-word">
                  {String(removeColors(serverData.modeName)) ||
                    getModeName(serverData.modeName, serverData.mode)}
                </span>
              </div>
              <div className="bg-neutral-700/30 backdrop-blur-sm border border-neutral-600/30 p-2 sm:p-3 rounded-lg">
                <span className="text-gray-400">Version: </span>
                <span className="font-medium text-white">
                  {String(serverData.versionType) || ""}{" "}
                  {String(serverData.version) || ""}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Player Peaks and Uptime */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
          <div className="bg-neutral-800/30 backdrop-blur-sm border border-neutral-700/50 p-4 sm:p-6 rounded-xl">
            <h4 className="font-medium mb-3 sm:mb-4 text-orange-400 text-base sm:text-lg">
              Player Peaks
            </h4>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-orange-400 drop-shadow-[0_0_5px_rgba(249,115,22,0.3)]">
                  {serverDataElement?.playerPeaks?.daily ?? "-"}
                </div>
                <div className="text-xs sm:text-sm text-gray-400">Today</div>
              </div>
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-orange-400 drop-shadow-[0_0_5px_rgba(249,115,22,0.3)]">
                  {serverDataElement?.playerPeaks?.weekly ?? "-"}
                </div>
                <div className="text-xs sm:text-sm text-gray-400">
                  This Week
                </div>
              </div>
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-orange-400 drop-shadow-[0_0_5px_rgba(249,115,22,0.3)]">
                  {serverDataElement?.playerPeaks?.allTime ?? "-"}
                </div>
                <div className="text-xs sm:text-sm text-gray-400">All Time</div>
              </div>
            </div>
          </div>

          <div className="bg-neutral-800/30 backdrop-blur-sm border border-neutral-700/50 p-4 sm:p-6 rounded-xl">
            <h4 className="font-medium mb-3 sm:mb-4 text-green-400 text-base sm:text-lg">
              Server Uptime
            </h4>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-green-400">
                  {serverDataElement?.uptime?.last24h !== undefined ? formatUptime(serverDataElement.uptime.last24h) : "-"}
                </div>
                <div className="text-xs sm:text-sm text-gray-400">Last 24h</div>
              </div>
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-green-400">
                  {serverDataElement?.uptime?.last7d !== undefined ? formatUptime(serverDataElement.uptime.last7d) : "-"}
                </div>
                <div className="text-xs sm:text-sm text-gray-400">
                  Last 7 Days
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Player History Chart */}
        <div className="bg-neutral-800/30 backdrop-blur-md border border-neutral-700/50 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
          <h2 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">
            Player History
          </h2>
          <div className="h-64 sm:h-96">
            <ServerHistoryChart {...serverDataElement} />
          </div>
        </div>

        {/* Map History Table */}
        <div className="bg-neutral-800/30 backdrop-blur-md border border-neutral-700/50 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
          <h2 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">
            Map History
          </h2>
          <MapHistoryTable mapHistory={serverDataElement?.allMaps ?? []} />
        </div>

        {/* MOTD History Table */}
        <div className="bg-neutral-800/30 backdrop-blur-md border border-neutral-700/50 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
          <h2 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">
            MOTD History
          </h2>
          <MotdHistoryTable motdHistory={serverDataElement?.allMotds ?? []} />
        </div>
      </div>
    </div>
  );
};

export default ServerDetail;
