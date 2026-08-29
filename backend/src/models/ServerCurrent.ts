import {DataTypes, Model} from 'sequelize';
import sequelize from '../config/database.js';
import Server from './Server.js';
import ServerMotdsRegistry from './ServerMotdsRegistry.js';
import ServerMapsRegistry from './ServerMapsRegistry.js';

class ServerCurrent extends Model {
  declare server_id: number;
  declare timestamp: Date;
  declare players: number | null;
  declare max_players: number | null;
  declare wave: number | null;
  declare version: number | null;
  declare version_type: string | null;
  declare ping: number | null;
  declare online: boolean;
  declare motd_registry_id: number | null;
  declare map_registry_id: number | null;
}

ServerCurrent.init({
  server_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true,
    references: {
      model: 'servers',
      key: 'id'
    }
  },
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false
  },
  players: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  max_players: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  wave: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  version: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  version_type: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  ping: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  online: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  motd_registry_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'server_motds_registry',
      key: 'id'
    }
  },
  map_registry_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'server_maps_registry',
      key: 'id'
    }
  }
}, {
  sequelize,
  tableName: 'server_current',
  timestamps: false
});

// Define associations
ServerCurrent.belongsTo(Server, { foreignKey: 'server_id' });
ServerCurrent.belongsTo(ServerMotdsRegistry, { foreignKey: 'motd_registry_id' });
ServerCurrent.belongsTo(ServerMapsRegistry, { foreignKey: 'map_registry_id' });

export default ServerCurrent;
