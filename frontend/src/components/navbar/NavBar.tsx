import React from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import Tooltip from "../Tooltip.tsx";
import ServerStatsSummary from "./ServerStatsSummary.tsx";
import { useSidebar } from "../../context/SidebarContext.tsx";
import { formatRelativeTime } from "../../util/general.ts";
import { VERSION } from "../../../../common/version.ts";
import { Route as InactiveRoute } from "../../routes/inactive.tsx";
import { Route as GlobalRoute } from "../../routes/global.tsx";

const BrandMark: React.FC = () => (
  <div className="w-8 h-8 bg-linear-to-br from-accent to-[#ff5a1f] rounded flex items-center justify-center shrink-0">
    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
  </div>
);

const CollapseToggle: React.FC<{ collapsed: boolean; onClick: () => void }> = ({ collapsed, onClick }) => (
  <button
    onClick={onClick}
    className="bg-accent-muted hover:bg-accent-hover text-accent p-2 rounded transition-colors border border-accent shrink-0"
    title={collapsed ? "Expand server list" : "Collapse server list"}
  >
    <svg
      className={`w-4 h-4 transform transition-transform ${collapsed ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
    </svg>
  </button>
);

const BackButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button onClick={onClick} className="button-secondary p-2 mr-3 shrink-0">
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  </button>
);

/**
 * App-wide top navigation bar. Hosts the brand, the server-list/global stats
 * summary, navigation to the stats pages, and the sidebar collapse toggle.
 * On mobile, while a detail page is open, it collapses down to a
 * back-button + page-title bar instead.
 */
const NavBar: React.FC = () => {
  const {
    isMasterPanelCollapsed,
    handleToggleCollapse,
    totalServers,
    onlineServers,
    totalPlayers,
    lastUpdated,
    isMobile,
    showMasterPanel,
    pageTitle,
  } = useSidebar();

  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const isMobileDetailView = isMobile && !showMasterPanel;

  if (isMobileDetailView) {
    return (
      <div className="bg-surface-primary backdrop-blur-md border-b border-default h-14 px-4 flex items-center shrink-0">
        <BackButton onClick={handleToggleCollapse} />
        <h2 className="text-lg font-semibold text-primary truncate">{pageTitle}</h2>
      </div>
    );
  }

  const navLinks = (
    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
      <button
        onClick={() => navigate({ to: InactiveRoute.to })}
        className={`text-sm font-medium py-2 px-2.5 sm:px-3 rounded transition-colors ${
          pathname === InactiveRoute.to
            ? "text-accent bg-accent-muted border border-accent"
            : "text-secondary hover:text-accent border border-default hover:border-accent"
        }`}
      >
        Statistics
      </button>

      <Tooltip content="Player count history across all servers" position="bottom" delay={200}>
        <button
          onClick={() => navigate({ to: GlobalRoute.to })}
          className={`flex items-center gap-1.5 text-sm font-medium py-2 px-2.5 sm:px-3 rounded transition-colors border ${
            pathname === GlobalRoute.to
              ? "text-accent bg-accent-muted border-accent"
              : "text-secondary hover:text-accent border-default hover:border-accent"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          Global
        </button>
      </Tooltip>

      {!isMobile && (
        <CollapseToggle collapsed={isMasterPanelCollapsed} onClick={handleToggleCollapse} />
      )}
    </div>
  );

  const statsSummary = (
    <ServerStatsSummary
      onlineServers={onlineServers}
      totalServers={totalServers}
      totalPlayers={totalPlayers}
      lastUpdated={lastUpdated}
      relativeUpdated={formatRelativeTime(lastUpdated)}
    />
  );

  return (
    <div className="bg-linear-to-r from-surface-primary/60 to-surface-primary/40 backdrop-blur-md border-b border-default shrink-0 flex flex-col">
      <div className="h-14 px-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <BrandMark />
          {!isMobile && (
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-base font-bold text-primary leading-none whitespace-nowrap">
                Mindustry <span className="text-accent">Tracker</span>
              </h1>
              <span className="text-xs text-secondary">{VERSION}</span>
            </div>
          )}
        </div>

        {!isMobile && statsSummary}

        {navLinks}
      </div>

      {isMobile && (
        <div className="px-4 pb-2 -mt-1 flex justify-center">{statsSummary}</div>
      )}
    </div>
  );
};

export default NavBar;
export { BrandMark };
