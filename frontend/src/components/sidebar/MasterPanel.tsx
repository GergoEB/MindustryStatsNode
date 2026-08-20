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
        <div className="bg-linear-to-r from-surface-primary-1/60 to-surface-primary/40 backdrop-blur-md border-b border-default p-3 sm:p-4 flex items-center justify-center shrink-0">
          {!isMobile && (
            <button
              onClick={onToggleCollapse}
              className="bg-accent-muted hover:bg-accent-hover text-accent p-2 rounded transition-colors border border-accent"
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
      <div className="bg-linear-to-r from-surface-primary/60 to-surface-primary/40 backdrop-blur-md border-b border-default p-3 sm:p-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          {/* Logo/Icon */}
          <div className="w-10 h-10 bg-linear-to-br from-accent to-[#ff5a1f] rounded flex items-center justify-center shadow-lg shadow-accent/20">
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
                  className={`inline-block w-2 h-2 rounded ${connectionStatusInfo.dotColor}`}
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
            className="bg-accent-muted hover:bg-accent-hover text-accent p-2 rounded transition-colors border border-accent"
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
          <div className="bg-surface-secondary backdrop-blur-md border border-default p-2 rounded">
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
            className="bg-surface-secondary backdrop-blur-md border border-default p-2 rounded cursor-pointer hover:bg-accent-hover hover:border-accent transition-all group"
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
          <div className="text-center p-8 bg-surface-secondary backdrop-blur-md border border-default rounded mb-6">
            <div className="inline-block animate-spin rounded h-8 w-8 border-4 border-accent border-t-transparent"></div>
            <p className="mt-4 text-secondary">Loading server data...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-400 px-6 py-4 rounded backdrop-blur-sm mb-6">
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
      <div className="px-4 py-2 border-t border-default shrink-0">
        <p className="text-xs text-tertiary flex items-center justify-between">
          <span>
            Last updated: {lastUpdated} | Commit:
            <a
              className="hover:underline hover:text-accent"
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
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="14" 
              height="14" 
              fill="currentColor" 
              viewBox="0 0 16 16"
              className="hover:scale-110 transition-transform"
            >
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8"/>
            </svg>
            <span>Source</span>
          </a>
        </p>
      </div>
    </div>
  );
};

export default MasterPanel;
