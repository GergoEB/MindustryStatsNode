import React, { useState } from "react";
import NetworkHistoryChart from "./NetworkHistoryChart.tsx";
import ShareButton from "../ShareButton.tsx";
import {NetworkDetails} from "../../../../common/models/serverData.ts";

const NetworkDetail: React.FC<{ details: NetworkDetails }> = ({ details }) => {
  const [showIp, setShowIp] = useState(true);

  return (
    <div className="h-full overflow-y-auto p-3 sm:p-6 bg-surface-primary">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-surface-secondary border border-subtle backdrop-blur-md rounded p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4 gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-primary mb-2 wrap-break-word">
                {String(details.name)}
              </h1>
              <p className="text-secondary mb-4 text-sm sm:text-base wrap-break-word">
                Network
              </p>
              <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                <span className="text-xs sm:text-sm text-tertiary">
                  {details.activeServers}/{details.totalServers} servers active
                </span>
              </div>
              {/* Action buttons */}
              <div className="flex flex-wrap gap-2 mt-3">
                <ShareButton
                  networkId={details.id}
                  className="button-accent text-xs sm:text-sm px-2 sm:px-3 py-1"
                />
              </div>
            </div>

            <div className="text-left sm:text-right shrink-0">
              <div className="text-3xl sm:text-4xl font-bold text-accent">
                {details.topServer ? String(details.topServer.players) : "0"}
              </div>
              <div className="text-xs sm:text-sm text-tertiary">
                top server players
              </div>
            </div>
          </div>

          {details.topServer && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 text-xs sm:text-sm">
              <div className="bg-surface-tertiary border border-subtle p-2 sm:p-3 rounded">
                <span className="text-tertiary">Top Server: </span>
                <span className="font-medium text-primary wrap-break-word">
                  {String(details.topServer.name)}
                </span>
              </div>
              <div className="bg-surface-tertiary border border-subtle p-2 sm:p-3 rounded">
                <span className="text-tertiary">Host: </span>
                <span className="font-medium text-primary wrap-break-word">
                  {showIp
                    ? `${details.topServer.host}:${details.topServer.port}`
                    : "Hidden"}
                </span>
                <button
                  onClick={() => setShowIp(!showIp)}
                  className="ml-2 text-xs text-tertiary hover:text-secondary"
                >
                  {showIp ? "Hide" : "Show"}
                </button>
              </div>
              <div className="bg-surface-tertiary border border-subtle p-2 sm:p-3 rounded">
                <span className="text-tertiary">Players: </span>
                <span className="font-medium text-primary">
                  {details.topServer.players}
                </span>
              </div>
              <div className="bg-surface-tertiary border border-subtle p-2 sm:p-3 rounded">
                <span className="text-tertiary">Servers: </span>
                <span className="font-medium text-primary">
                  {details.totalServers}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Player Peaks */}
        <div className="bg-surface-secondary border border-subtle p-4 sm:p-6 rounded mb-4 sm:mb-6">
          <h4 className="font-medium mb-3 sm:mb-4 text-accent text-base sm:text-lg">
            Player Peaks
          </h4>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-bold text-accent">
                {details.playerPeaks.daily}
              </div>
              <div className="text-xs sm:text-sm text-tertiary">Today</div>
            </div>
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-bold text-accent">
                {details.playerPeaks.weekly}
              </div>
              <div className="text-xs sm:text-sm text-tertiary">This Week</div>
            </div>
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-bold text-accent">
                {details.playerPeaks.allTime}
              </div>
              <div className="text-xs sm:text-sm text-tertiary">All Time</div>
            </div>
          </div>
        </div>

        {/* Player History Chart */}
        <div className="bg-surface-secondary border border-subtle rounded p-4 sm:p-6 mb-4 sm:mb-6">
          <h2 className="text-base sm:text-lg font-semibold text-primary mb-3 sm:mb-4">
            Player History
          </h2>
          <div className="h-64 sm:h-96">
            <NetworkHistoryChart network={details} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default NetworkDetail;