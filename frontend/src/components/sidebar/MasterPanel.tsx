import React from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import ServerGroup from "./ServerGroup";
import FlatServerList from "./FlatServerList";
import SearchBar from "../SearchBar.tsx";
import ToggleButton from "../ToggleButton.tsx";
import SortDropdown from "../SortDropdown.tsx";
import Tooltip from "../Tooltip.tsx";
import { useServerList } from "../../hooks/useServerList.ts";
import { COMMIT, VERSION } from "../../../../common/version.ts";
import { getConnectionStatusClasses } from "../../theme.ts";
import { Route as InactiveRoute } from "../../routes/inactive.tsx";
import { Route as GlobalRoute } from "../../routes/global.tsx";
import { useSidebar } from "../../context/SidebarContext.tsx";

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

  // Convert grouped data to flat array for the hook
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

  // --- COLLAPSED VIEW PATH ---
  if (isCollapsed) {
    return (
      <div className="relative transition-all duration-300 w-16 bg-surface-primary backdrop-blur-md border-r border-default flex flex-col h-screen min-h-screen">
        <div className="bg-linear-to-r from-[color:var(--color-surface-1)]/60 to-[color:var(--color-surface-1)]/40 backdrop-blur-md border-b border-default p-3 sm:p-4 flex items-center justify-center shrink-0">
          {!isMobile && (
            <button
              onClick={onToggleCollapse}
              className="bg-accent-muted hover:bg-accent-hover text-accent p-2 rounded-lg transition-colors border border-accent"
            >
              <svg
                className="w-4 h-4 transform transition-transform rotate-180"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    );
  }

  // --- EXPANDED VIEW PATH ---
  return (
    <div
      className={`relative transition-all duration-300 ${
        isMobile ? "w-full" : "w-3/12"
      } bg-surface-primary backdrop-blur-md border-r border-default flex flex-col h-screen min-h-screen min-w-sm`}
    >
      {/* Header */}
      <div className="bg-linear-to-r from-[color:var(--color-surface-1)]/60 to-[color:var(--color-surface-1)]/40 backdrop-blur-md border-b border-default p-3 sm:p-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          {/* Logo/Icon */}
          <div className="w-10 h-10 bg-linear-to-br from-accent to-[#ff5a1f] rounded-lg flex items-center justify-center shadow-lg shadow-[color:var(--color-accent)]/20">
            <svg
              className="w-6 h-6 text-white"
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
          </div>
          {/* Title and status */}
          <div className="flex flex-col">
            <h1 className="text-lg sm:text-xl font-bold text-primary">
              Mindustry <span className="text-accent">Tracker</span>
            </h1>
            <div className="flex items-center gap-1.5">
              <Tooltip
                content={connectionStatusInfo.tooltip}
                position="bottom"
                delay={100}
              >
                <span
                  className={`inline-block w-2 h-2 rounded-full ${connectionStatusInfo.dotColor}`}
                ></span>
              </Tooltip>
              <span className="text-xs text-secondary">{VERSION}</span>
            </div>
          </div>
        </div>

        {/* Toggle Collapse Button */}
        {!isMobile && (
          <button
            onClick={onToggleCollapse}
            className="bg-accent-muted hover:bg-accent-hover text-accent p-2 rounded-lg transition-colors border border-accent"
          >
            <svg
              className="w-4 h-4 transform transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="p-4 border-default shrink-0">
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="bg-surface-secondary backdrop-blur-md border border-default p-2 rounded-lg">
            <div className="text-secondary text-xs">
              Online / Total Servers
            </div>
            <div className="flex items-center justify-center space-x-2">
              <span className="text-lg font-bold text-green-400">
                {onlineServers}
              </span>
              <span className="text-lg font-bold text-secondary"> / </span>
              <span className="text-lg font-bold text-primary">
                {totalServers}
              </span>
            </div>
          </div>
          <div
            className="bg-surface-secondary backdrop-blur-md border border-default p-2 rounded-lg cursor-pointer hover:bg-accent-hover hover:border-accent transition-all group"
            onClick={() => { console.log("click click");  navigate({ to: GlobalRoute.to })}}
          >
            <div className="text-secondary text-xs flex group-hover:text-accent items-center justify-center gap-1">
              Total Players
              <Tooltip
                content="View global player history"
                position="top"
                delay={200}
              >
                <svg
                  className="w-3.5 h-3.5 text-secondary group-hover:text-accent transition-colors"
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
              </Tooltip>
            </div>
            <div className="text-lg font-bold text-accent drop-shadow-[0_0_10px_rgba(255,107,53,0.3)]">
              {totalPlayers}
            </div>
          </div>
        </div>
      </div>

      {/* Inactive Servers Button */}
      <div className="px-4 pb-3 border-b border-default shrink-0">
        <button
          onClick={() => navigate({ to: InactiveRoute.to })}
          className="w-full button-secondary text-sm font-medium p-2"
        >
          Server List Statistics
        </button>
      </div>

      {/* Controls */}
      <div className="p-4 border-b border-subtle shrink-0">
        {/* Search Bar */}
        <div className="mb-3">
          <SearchBar
            onSearchValueChange={setSearchTerm}
            value={searchTerm}
          />
        </div>

        {/* Control Buttons */}
        <div className="flex flex-wrap gap-2 mb-3">
          <Tooltip
            content={
              isGrouped
                ? "Switch to flat list view showing all servers"
                : "Group servers by their cluster names"
            }
            position="top"
            delay={300}
            className="flex-1 min-w-0"
          >
            <ToggleButton
              isActive={isGrouped}
              onClick={toggleGrouping}
              activeText="Ungroup"
              inactiveText="Group"
              className="w-full"
            />
          </Tooltip>

          <Tooltip
            content={
              hideInactiveEnabled
                ? "Show all servers including inactive ones"
                : "Hide servers that have been offline for more than 7 days"
            }
            position="top"
            delay={300}
            className="flex-1 min-w-0"
          >
            <ToggleButton
              isActive={hideInactiveEnabled}
              onClick={toggleHideInactive}
              activeText="Show All"
              inactiveText="Hide Inactive"
              activeColor="bg-orange-500/20 hover:bg-orange-500/40 text-orange-400 border-orange-500/40"
              inactiveColor="bg-neutral-600/20 hover:bg-neutral-600/40 text-neutral-400 border-neutral-600/40"
              className="w-full"
            />
          </Tooltip>

          {/* Sort Dropdown */}
          <SortDropdown
            sortOptions={sortOptions}
            currentCriteria={sortCriteria}
            currentDirection={sortDirection}
            onSortChange={handleSortChange}
          />
        </div>
      </div>

      {/* Server List */}
      <div className="flex-1 overflow-y-auto p-4 min-h-0">
        {loading && (
          <div className="text-center p-8 bg-surface-secondary backdrop-blur-md border border-default rounded-xl mb-6">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-accent border-t-transparent"></div>
            <p className="mt-4 text-secondary">Loading server data...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-400 px-6 py-4 rounded-xl backdrop-blur-sm mb-6">
            <span className="block sm:inline">
              Failed to load server data. Please try again later.
            </span>
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-4">
            {isGrouped ? (
              Object.entries(processedServerGroups).map(
                ([groupName, servers]) => {
                  const groupId =
                    servers.length > 0 ? servers[0].groupId : 0;
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
                }
              )
            ) : (
              <FlatServerList
                servers={flatServers}
                selectedServerId={selectedServerId}
              />
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-default shrink-0">
        <p className="text-xs text-tertiary">
          Last updated: {lastUpdated} | Commit: {COMMIT}
        </p>
      </div>
    </div>
  );
};

export default MasterPanel;
