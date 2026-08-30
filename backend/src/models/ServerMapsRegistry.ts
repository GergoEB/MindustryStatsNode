import {DataTypes, Model} from 'sequelize';
import sequelize from '../config/database.js';
import GamemodeRegistry from './GamemodeRegistry.js';

class ServerMapsRegistry extends Model {
  declare id: number;
  declare map_name: string;
  declare game_mode: number | null;
  declare mode_name: string | null;
  declare gamemode_id: number;
}

ServerMapsRegistry.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  map_name: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  game_mode: {
    type: DataTypes.SMALLINT,
    allowNull: true
  },
  mode_name: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  gamemode_id: {
    type: DataTypes.SMALLINT,
    allowNull: false,
    references: {
      model: 'gamemode_registry',
      key: 'id'
    }
  }
}, {
  sequelize,
  tableName: 'server_maps_registry',
  timestamps: false,
  indexes: [
    {
      unique: true,
      fields: ['map_name', 'game_mode', 'mode_name']
    }
  ]
});

// Define association
ServerMapsRegistry.belongsTo(GamemodeRegistry, { foreignKey: 'gamemode_id' });

export default ServerMapsRegistry;
