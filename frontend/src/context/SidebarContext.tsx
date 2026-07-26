import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { useNavigate, useRouterState, useParams } from "@tanstack/react-router";
import {
  ServerElement,
  NetworkDetails,
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
  handleServerSelect: (server: ServerElement) => void;
  handleNetworkSelect: (groupId: number, groupName: string) => void;
  handleBackToMaster: () => void;
  handleToggleCollapse: () => void;
  selectedServer: ServerElement | null;
  selectedNetwork: NetworkDetails | null;
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
  const [serverGroups, setServerGroups] = useState<
    Record<string, ServerElement[]>
  >({});
  const [lastUpdated, setLastUpdated] = useState<string>("Loading...");
  const [totalServers, setTotalServers] = useState<number>(0);
  const [onlineServers, setOnlineServers] = useState<number>(0);
  const [totalPlayers, setTotalPlayers] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);
  const [selectedServer, setSelectedServer] = useState<ServerElement | null>(
    null,
  );
  const [selectedNetwork, setSelectedNetwork] =
    useState<NetworkDetails | null>(null);
  const [isMasterPanelCollapsed, setIsMasterPanelCollapsed] =
    useState<boolean>(false);
  const [showMasterPanel, setShowMasterPanel] = useState<boolean>(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(),
  );

  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { serverId, networkId } = useParams({ strict: false }) as {
    serverId?: string;
    networkId?: string;
  };

  const { connectionStatus, data } = useApi(initialData);
  const { isMobile } = useResponsive();

  // On mobile, only the home route ('/') shows the master list.
  useEffect(() => {
    if (isMobile) {
      setShowMasterPanel(pathname === "/");
      setIsMasterPanelCollapsed(false);
    }
  }, [isMobile, pathname]);

  useEffect(() => {
    if (!data) return;
    processServerData(data);
    setLastUpdated(new Date().toLocaleString());
    setLoading(false);
  }, [data]);

  // Handle URL routing on mount and when data changes
  useEffect(() => {
    if (!data) return;

    if (serverId) {
      const parsedServerId = parseInt(serverId, 10);
      if (!isNaN(parsedServerId) && parsedServerId > 0) {
        const targetServer = data.find((s) => s.id === parsedServerId);
        if (targetServer) {
          setSelectedServer(targetServer);
          setSelectedNetwork(null);
        }
      }
    }

    if (networkId) {
      const parsedNetworkId = parseInt(networkId, 10);
      if (!isNaN(parsedNetworkId) && parsedNetworkId > 0) {
        const groupName = Object.keys(serverGroups).find(
          (name) =>
            serverGroups[name].length > 0 &&
            serverGroups[name][0].groupId === parsedNetworkId,
        );
        if (groupName) {
          const servers = serverGroups[groupName];
          const activeServers = servers.filter((s) => s.online).length;
          const topServer = servers
            .filter((s) => s.online && s.currentData)
            .sort(
              (a, b) =>
                (b.currentData?.players || 0) - (a.currentData?.players || 0),
            )[0];

          setSelectedNetwork({
            id: parsedNetworkId,
            name: groupName,
            playerPeaks: { allTime: 0, daily: 0, weekly: 0 },
            topServer: topServer
              ? {
                  id: topServer.id,
                  host: topServer.host,
                  port: topServer.port,
                  players: topServer.currentData?.players || 0,
                  name: topServer.name,
                }
              : null,
            activeServers,
            totalServers: servers.length,
          });
          setSelectedServer(null);
        }
      }
    }
  }, [data, serverId, networkId, serverGroups]);

  const processServerData = (servers: ServerElement[] | null) => {
    if (!servers || !Array.isArray(servers)) {
      setError(true);
      return;
    }

    const groups: Record<string, ServerElement[]> = {};
    servers.forEach((server) => {
      if (!groups[server.name]) groups[server.name] = [];
      groups[server.name].push(server);
    });

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
    setTotalPlayers(
      servers.reduce(
        (sum, server) =>
          sum + (isHub(server) ? 0 : server.currentData?.players || 0),
        0,
      ),
    );
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

  const handleServerSelect = (server: ServerElement) => {
    setSelectedServer(server);
    setSelectedNetwork(null);
    navigate({ to: `/server/${server.id}` });
  };

  const handleNetworkSelect = (groupId: number, groupName: string) => {
    setSelectedNetwork({
      id: groupId,
      name: groupName,
      playerPeaks: { allTime: 0, daily: 0, weekly: 0 },
      topServer: null,
      activeServers: 0,
      totalServers: 0,
    });
    setSelectedServer(null);
    navigate({ to: `/network/${groupId}` });
  };

  const handleBackToMaster = () => {
    setShowMasterPanel(true);
    if (isMobile) {
      setSelectedServer(null);
      setSelectedNetwork(null);
    }
  };

  const handleToggleCollapse = () => {
    if (isMobile) {
      setShowMasterPanel(!showMasterPanel);
    } else {
      setIsMasterPanelCollapsed(!isMasterPanelCollapsed);
    }
  };

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
    handleServerSelect,
    handleNetworkSelect,
    handleBackToMaster,
    handleToggleCollapse,
    selectedServer,
    selectedNetwork,
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
