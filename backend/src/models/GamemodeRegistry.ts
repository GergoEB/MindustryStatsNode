import {DataTypes, Model} from 'sequelize';
import sequelize from '../config/database.js';

class GamemodeRegistry extends Model {
  declare id: number;
  declare game_mode: number;
  declare mode_name: string;
  declare clean_name: string;
}

GamemodeRegistry.init({
  id: {
    type: DataTypes.SMALLINT,
    autoIncrement: true,
    primaryKey: true
  },
  game_mode: {
    type: DataTypes.SMALLINT,
    allowNull: false
  },
  mode_name: {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: ''
  },
  clean_name: {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: ''
  }
}, {
  sequelize,
  tableName: 'gamemode_registry',
  timestamps: false,
  indexes: [
    {
      unique: true,
      fields: ['game_mode', 'mode_name']
    }
  ]
});

export default GamemodeRegistry;
