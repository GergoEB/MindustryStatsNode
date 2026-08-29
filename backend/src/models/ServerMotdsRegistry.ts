import {DataTypes, Model} from 'sequelize';
import sequelize from '../config/database.js';

class ServerMotdsRegistry extends Model {
  declare id: number;
  declare server_name: string;
  declare description: string;
}

ServerMotdsRegistry.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  server_name: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  }
}, {
  sequelize,
  tableName: 'server_motds_registry',
  timestamps: false,
  indexes: [
    {
      unique: true,
      fields: ['server_name', 'description']
    }
  ]
});

export default ServerMotdsRegistry;
