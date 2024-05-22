module.exports = (sequelize, DataTypes) => {
  const TB_PF_ST = sequelize.define('TB_PF_ST', {
    PF_ST_SN: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    PF_SN: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    ST_SN: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    ST_LEVEL: {
      type: DataTypes.STRING(45),
      allowNull: false
    }
  }, {
    tableName: 'TB_PF_ST',
    timestamps: false
  });

  TB_PF_ST.associate = models => {
    TB_PF_ST.belongsTo(models.TB_PF, { foreignKey: 'PF_SN' });
    TB_PF_ST.belongsTo(models.TB_ST, { foreignKey: 'ST_SN' });
  };

  return TB_PF_ST;
};
