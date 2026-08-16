import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { useRouterState } from "@tanstack/react-router";
import {
  ServerElement
} from "../../../common/models/serverData";
import useApi, { FetchStatus } from "../hooks/useApi.ts";
import { useResponsive } from "../hooks/useResponsive";
import { isHub } from "../util/mindustry.ts";

interface SidebarContextValue {
  isMasterPanelCollapsed: boolean;
  showMasterPanel: boolean;
  connectionStatus: FetchStatus;
  totalServers: number;
  onlineServers: number;
  totalPlayers: number;
  serverGroups: Record<string, ServerElement[]>;
  expandedGroups: Set<string>;
  toggleGroupExpanded: (groupName: string) => void;
  handleToggleCollapse: () => void;
  loading: boolean;
  error: boolean;
  lastUpdated: string;
  isMobile: boolean;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

export const useSidebar = (): SidebarContextValue => {
  const ctx = useContext(SidebarContext);
  if (!ctx) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return ctx;
};

interface SidebarProviderProps {
  initialData: ServerElement[] | null;
  children: React.ReactNode;
}

export const SidebarProvider: React.FC<SidebarProviderProps> = ({
  initialData,
  children,
}) => {
  const [lastUpdated, setLastUpdated] = useState<string>("Loading...");
  const [error, setError] = useState<boolean>(false);
  const [isMasterPanelCollapsed, setIsMasterPanelCollapsed] =
    useState<boolean>(false);
  const [showMasterPanel, setShowMasterPanel] = useState<boolean>(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(),
  );
  const [isHydrated, setIsHydrated] = useState<boolean>(false);

  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const { connectionStatus, data } = useApi(initialData);
  const { isMobile } = useResponsive();

  // Mark as hydrated to ensure SSR/client match
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // On mobile, only the home route ('/') shows the master list.
  // Only update after hydration to avoid SSR mismatch
  useEffect(() => {
    if (!isHydrated) return;
    if (isMobile) {
      setShowMasterPanel(pathname === "/");
      setIsMasterPanelCollapsed(false);
    }
  }, [isMobile, pathname, isHydrated]);

  useEffect(() => {
    if (!data) return;
    processServerData(data);
    setLastUpdated(new Date().toLocaleString());
    setLoading(false);
  }, [data]);

  const buildServerGroups = (servers: ServerElement[]): Record<string, ServerElement[]> => {
    const groups: Record<string, ServerElement[]> = {};
    servers.forEach((server) => {
      if (!groups[server.name]) groups[server.name] = [];
      groups[server.name].push(server);
    });
    return groups;
  };

  const computeTotalPlayers = (servers: ServerElement[]): number => {
    return servers.reduce((sum, s) => sum + (isHub(s) ? 0 : s.currentData?.players || 0), 0);
  };

  const processServerData = (servers: ServerElement[] | null) => {
    if (!servers || !Array.isArray(servers)) {
      setError(true);
      return;
    }

    const groups = buildServerGroups(servers);

    Object.keys(groups).forEach((groupName) => {
      groups[groupName].sort((a, b) => {
        if (a.online !== b.online) return a.online ? -1 : 1;
        return (b.currentData?.players || 0) - (a.currentData?.players || 0);
      });
    });

    const sortedGroups = new Map(
      Object.entries(groups).sort((a, b) => {
        const aPlayers = a[1].reduce(
          (sum, s) => sum + (isHub(s) ? 0 : s.currentData?.players || 0),
          0,
        );
        const bPlayers = b[1].reduce(
          (sum, s) => sum + (isHub(s) ? 0 : s.currentData?.players || 0),
          0,
        );
        return bPlayers - aPlayers;
      }),
    );

    setServerGroups(Object.fromEntries(sortedGroups));
    setTotalServers(servers.length);
    setOnlineServers(servers.filter((s) => s.online).length);
    setTotalPlayers(computeTotalPlayers(servers));
  };

  const toggleGroupExpanded = (groupName: string) => {
    const newExpanded = new Set(expandedGroups);
    if (!newExpanded.has(groupName)) {
      newExpanded.add(groupName);
    } else {
      newExpanded.delete(groupName);
    }
    setExpandedGroups(newExpanded);
  };

  const handleToggleCollapse = () => {
    if (isMobile) {
      setShowMasterPanel(!showMasterPanel);
    } else {
      setIsMasterPanelCollapsed(!isMasterPanelCollapsed);
    }
  };

  const [serverGroups, setServerGroups] = useState<Record<string, ServerElement[]>>(
    () => buildServerGroups(initialData ?? [])
  );
  const [totalServers, setTotalServers] = useState(() => initialData?.length ?? 0);
  const [onlineServers, setOnlineServers] = useState(
    () => initialData?.filter((s) => s.online).length ?? 0
  );
  const [totalPlayers, setTotalPlayers] = useState(() => computeTotalPlayers(initialData ?? []));
  const [loading, setLoading] = useState(() => !initialData);

  const value: SidebarContextValue = {
    isMasterPanelCollapsed,
    showMasterPanel,
    connectionStatus,
    totalServers,
    onlineServers,
    totalPlayers,
    serverGroups,
    expandedGroups,
    toggleGroupExpanded,
    handleToggleCollapse,
    loading,
    error,
    lastUpdated,
    isMobile,
  };

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
};
