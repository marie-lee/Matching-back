module.exports = (sequelize, DataTypes) => {
  const TB_PF_PFOL = sequelize.define('TB_PF_PFOL', {
    PF_PFOL_SN: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    PF_SN: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    PFOL_SN: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    tableName: 'TB_PF_PFOL',
    timestamps: false
  });

  TB_PF_PFOL.associate = models => {
    TB_PF_PFOL.belongsTo(models.TB_PF, { foreignKey: 'PF_SN' });
    TB_PF_PFOL.belongsTo(models.TB_PFOL, { foreignKey: 'PFOL_SN' });
  };

  return TB_PF_PFOL;
};
