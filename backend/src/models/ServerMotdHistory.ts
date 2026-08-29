import {DataTypes, Model} from 'sequelize';
import sequelize from '../config/database.js';
import Server from './Server.js';

class ServerMotdHistory extends Model {
  declare id: number;
  declare server_id: number;
  declare motd_id: number;
  declare valid_from: Date;
  declare valid_to: Date | null;
}

ServerMotdHistory.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  server_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'servers',
      key: 'id'
    }
  },
  motd_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  // Sequelize strips undeclared columns from both bulkCreate() and update(),
  // silently and without error.  While these two were missing, the history
  // rotation in bulkSaveHistoryEntries() issued its "close the old row" update
  // with an empty SET clause, so every MOTD change left another row with
  // valid_to IS NULL instead of superseding the previous one.
  valid_from: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  valid_to: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  sequelize,
  tableName: 'server_motds_history',
  timestamps: false
});

// Define association
ServerMotdHistory.belongsTo(Server, { foreignKey: 'server_id' });

export default ServerMotdHistory;