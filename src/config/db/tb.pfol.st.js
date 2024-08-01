module.exports = (sequelize, DataTypes) => {
    const TB_PFOL_ST = sequelize.define('TB_PFOL_ST', {
      PFOL_ST_SN: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      PFOL_SN: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      ST_SN: {
        type: DataTypes.INTEGER,
        allowNull: false
      }
    }, {
      tableName: 'TB_PFOL_ST',
      timestamps: false
    });
  
    TB_PFOL_ST.associate = models => {
      TB_PFOL_ST.belongsTo(models.TB_PFOL, { foreignKey: 'PFOL_SN' });
      TB_PFOL_ST.belongsTo(models.TB_ST, { foreignKey: 'ST_SN' });
    };
  
    return TB_PFOL_ST;
  };
  