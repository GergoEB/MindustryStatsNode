import Server from './Server.js';
import ServerGroup from './ServerGroup.js';
import ServerList from './ServerList.js';
import ServerMapHistory from './ServerMapHistory.js';
import ServerMotdHistory from './ServerMotdHistory.js';
import ServerSourceList from './ServerSourceList.js';
import ServerStats from './ServerStats.js';
import ServerCurrent from './ServerCurrent.js';
import ServerMotdsRegistry from './ServerMotdsRegistry.js';
import ServerMapsRegistry from './ServerMapsRegistry.js';
import GamemodeRegistry from './GamemodeRegistry.js';

// Define associations
ServerGroup.hasMany(Server, { foreignKey: 'server_group_id' });
Server.belongsTo(ServerGroup, { foreignKey: 'server_group_id' });

Server.hasMany(ServerMapHistory, { foreignKey: 'server_id' });
Server.hasMany(ServerMotdHistory, { foreignKey: 'server_id' });
Server.hasMany(ServerStats, { foreignKey: 'server_id' });
Server.hasMany(ServerSourceList, { foreignKey: 'server_id' });
Server.hasOne(ServerCurrent, { foreignKey: 'server_id' });

ServerList.hasMany(ServerSourceList, { foreignKey: 'serverlist_id' });

GamemodeRegistry.hasMany(ServerMapsRegistry, { foreignKey: 'gamemode_id' });

ServerMotdsRegistry.hasMany(ServerMotdHistory, { foreignKey: 'motd_id' });
ServerMotdsRegistry.hasMany(ServerStats, { foreignKey: 'motd_registry_id' });
ServerMotdsRegistry.hasMany(ServerCurrent, { foreignKey: 'motd_registry_id' });

ServerMapsRegistry.hasMany(ServerMapHistory, { foreignKey: 'map_id' });
ServerMapsRegistry.hasMany(ServerStats, { foreignKey: 'map_registry_id' });
ServerMapsRegistry.hasMany(ServerCurrent, { foreignKey: 'map_registry_id' });

export {
    Server,
    ServerGroup,
    ServerList,
    ServerMapHistory,
    ServerMotdHistory,
    ServerSourceList,
    ServerStats,
    ServerCurrent,
    ServerMotdsRegistry,
    ServerMapsRegistry,
    GamemodeRegistry
};
