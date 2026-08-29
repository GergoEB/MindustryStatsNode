import React from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import ServerGroup from "./ServerGroup";
import FlatServerList from "./FlatServerList";
import SearchBar from "../SearchBar.tsx";
import ToggleButton from "../ToggleButton.tsx";
import SortDropdown from "../SortDropdown.tsx";
import Tooltip from "../Tooltip.tsx";
import { useServerList } from "../../hooks/useServerList.ts";
import { COMMIT, SOURCE, VERSION } from "../../../../common/version.ts";
import { getConnectionStatusClasses } from "../../theme.ts";
import { Route as InactiveRoute } from "../../routes/inactive.tsx";
import { Route as GlobalRoute } from "../../routes/global.tsx";
import { useSidebar } from "../../context/SidebarContext.tsx";

// Turns a timestamp/date-ish string into "5m ago" style text.
// Falls back to the raw value if it can't be parsed.
function formatRelativeTime(value: string | number | Date | undefined): string {
  if (!value) return "";
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return String(value);

  const diffMs = Date.now() - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const MasterPanel: React.FC = () => {
  const {
    isMasterPanelCollapsed: isCollapsed,
    handleToggleCollapse: onToggleCollapse,
    connectionStatus,
    totalServers,
    onlineServers,
    totalPlayers,
    serverGroups: rawServerGroups,
    expandedGroups,
    toggleGroupExpanded: onToggleGroup,
    loading,
    error,
    lastUpdated,
    isMobile,
  } = useSidebar();

  const { networkId, serverId } = useParams({ strict: false });

  // Design decision: NaN is used to indicate no or invalid selection - literally means "not a number"
  const selectedNetworkId = Number(networkId);
  const selectedServerId = Number(serverId);

  const navigate = useNavigate();

  const rawServers = React.useMemo(() => {
    return Object.values(rawServerGroups).flat();
  }, [rawServerGroups]);

  const {
    serverGroups: processedServerGroups,
    flatServers,
    searchTerm,
    isGrouped,
    hideInactiveEnabled,
    sortCriteria,
    sortDirection,
    setSearchTerm,
    toggleGrouping,
    toggleHideInactive,
    handleSortChange,
    sortOptions,
  } = useServerList(rawServers);

  const connectionStatusInfo = getConnectionStatusClasses(connectionStatus);
  const relativeUpdated = formatRelativeTime(lastUpdated);

  // --- COLLAPSED VIEW PATH: slim navbar, same border, tiny footprint ---
  if (isCollapsed) {
    return (
        <div className="relative transition-all duration-300 w-14 bg-surface-primary backdrop-blur-md border-r border-default flex flex-col h-screen min-h-screen">
          <div className="border-b border-default h-13 flex items-center justify-center gap-2 shrink-0">
            <div className="w-7 h-7 bg-linear-to-br from-accent to-[#ff5a1f] rounded flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
          </div>

          {!isMobile && (
              <div className="p-2 flex justify-center">
                <button
                    onClick={onToggleCollapse}
                    className="bg-accent-muted hover:bg-accent-hover text-accent p-1.5 rounded transition-colors border border-accent"
                >
                  <svg className="w-3.5 h-3.5 transform transition-transform rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              </div>
          )}

          <div className="mt-auto p-2 flex justify-center">
            <Tooltip content={connectionStatusInfo.tooltip} position="right" delay={100}>
              <span className={`inline-block w-2 h-2 rounded ${connectionStatusInfo.dotColor}`}></span>
            </Tooltip>
          </div>
        </div>
    );
  }

  // --- EXPANDED VIEW PATH: compact ---
  return (
      <div
          className={`relative transition-all duration-300 ${
              isMobile ? "w-full" : "w-3/12"
          } bg-surface-primary backdrop-blur-md border-r border-default flex flex-col h-screen min-h-screen min-w-sm`}
      >
        {/* Header - compact */}
        <div className="bg-linear-to-r from-surface-primary/60 to-surface-primary/40 backdrop-blur-md border-b border-default h-13 px-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-linear-to-br from-accent to-[#ff5a1f] rounded flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-bold text-primary leading-none">
                Mindustry <span className="text-accent">Tracker</span>
              </h1>
              <Tooltip content={connectionStatusInfo.tooltip} position="bottom" delay={100}>
                <span className={`inline-block w-1.5 h-1.5 rounded ${connectionStatusInfo.dotColor}`}></span>
              </Tooltip>
              <span className="text-[10px] text-secondary">{VERSION}</span>
            </div>
          </div>

          {!isMobile && (
              <button
                  onClick={onToggleCollapse}
                  className="bg-accent-muted hover:bg-accent-hover text-accent p-1.5 rounded transition-colors border border-accent"
              >
                <svg className="w-3.5 h-3.5 transform transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
          )}
        </div>

        {/* Stats line - replaces the two big boxes */}
        <div className="px-3 py-1.5 border-b border-subtle shrink-0 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-secondary">
            <span className="font-semibold text-status-online">{onlineServers}</span>
            <span>/</span>
            <span className="font-semibold text-primary">{totalServers}</span>
            <span>online</span>
            <span className="text-tertiary">·</span>
            <span className="font-semibold text-accent">{totalPlayers}</span>
            <span>players</span>
          </div>

          <div className="flex items-center gap-3">
            <Tooltip content={String(lastUpdated ?? "")} position="bottom" delay={200}>
              <span className="text-tertiary">{relativeUpdated}</span>
            </Tooltip>
            <button
                onClick={() => navigate({ to: InactiveRoute.to })}
                className="text-secondary hover:text-accent transition-colors"
            >
              Stats
            </button>
            <Tooltip content="View global player history" position="bottom" delay={200}>
              <button
                  onClick={() => navigate({ to: GlobalRoute.to })}
                  className="text-secondary hover:text-accent transition-colors flex items-center"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </button>
            </Tooltip>
          </div>
        </div>

        {/* Controls - compact, one row */}
        <div className="px-3 py-2 border-b border-subtle shrink-0">
          <div className="mb-2">
            <SearchBar onSearchValueChange={setSearchTerm} value={searchTerm} />
          </div>

          <div className="flex items-center gap-1.5">
            <Tooltip
                content={isGrouped ? "Switch to flat list view showing all servers" : "Group servers by their cluster names"}
                position="top"
                delay={300}
                className="flex-1"
            >
              <ToggleButton
                  isActive={isGrouped}
                  onClick={toggleGrouping}
                  activeText="Ungroup"
                  inactiveText="Group"
                  className="w-full text-xs py-1"
              />
            </Tooltip>

            <Tooltip
                content={hideInactiveEnabled ? "Show all servers including inactive ones" : "Hide servers offline for more than 7 days"}
                position="top"
                delay={300}
                className="flex-1"
            >
              <ToggleButton
                  isActive={hideInactiveEnabled}
                  onClick={toggleHideInactive}
                  activeText="Show All"
                  inactiveText="Hide Inactive"
                  activeColor="bg-orange-500/20 hover:bg-orange-500/40 text-orange-400 border-orange-500/40"
                  inactiveColor="bg-neutral-600/20 hover:bg-neutral-600/40 text-neutral-400 border-neutral-600/40"
                  className="w-full text-xs py-1"
              />
            </Tooltip>

            <SortDropdown
                sortOptions={sortOptions}
                currentCriteria={sortCriteria}
                currentDirection={sortDirection}
                onSortChange={handleSortChange}
            />
          </div>
        </div>

        {/* Server List */}
        <div className="flex-1 overflow-y-auto px-2 py-2 min-h-0">
          {loading && (
              <div className="text-center p-4 bg-surface-secondary backdrop-blur-md border border-default rounded mb-2">
                <div className="inline-block animate-spin rounded h-5 w-5 border-2 border-accent border-t-transparent"></div>
                <p className="mt-2 text-xs text-secondary">Loading server data...</p>
              </div>
          )}

          {error && (
              <div className="bg-red-500/20 border border-red-500 text-red-400 px-3 py-2 text-xs rounded backdrop-blur-sm mb-2">
                Failed to load server data. Please try again later.
              </div>
          )}

          {!loading && !error && (
              <div className="space-y-1">
                {isGrouped ? (
                    Object.entries(processedServerGroups).map(([groupName, servers]) => {
                      const groupId = servers.length > 0 ? servers[0].groupId : 0;
                      const isNetworkSelected = selectedNetworkId === groupId;
                      return (
                          <ServerGroup
                              key={groupName}
                              name={groupName}
                              servers={servers}
                              expanded={expandedGroups.has(groupName)}
                              onToggleExpand={() => onToggleGroup(groupName)}
                              isSelected={isNetworkSelected}
                              networkId={groupId}
                              selectedServerId={selectedServerId}
                          />
                      );
                    })
                ) : (
                    <FlatServerList servers={flatServers} selectedServerId={selectedServerId} />
                )}
              </div>
          )}
        </div>

        {/* Footer - unchanged except last-updated removed */}
        <div className="px-3 py-2 border-t border-default shrink-0">
          <p className="text-xs text-tertiary flex items-center justify-between">
          <span>
            Commit:{" "}

            <a className="hover:underline hover:text-accent"
              target="_blank"
              rel="noopener noreferrer"
              href={`${SOURCE}/commit/${COMMIT}`}
            >
            {COMMIT}
            </a>
          </span>

          <a
          href={SOURCE}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 hover:text-accent transition-colors"
          title="View source on GitHub"
          >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" className="hover:scale-110 transition-transform">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8" />
          </svg>
          <span>Source</span>
        </a>
      </p>
</div>
</div>
);
};

export default MasterPanel;