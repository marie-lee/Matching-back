module.exports = (sequelize, DataTypes) => {
  const TB_PF_INTRST = sequelize.define('TB_PF_INTRST', {
    PF_INTS_SN: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    PF_SN: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    INTRST_SN: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    tableName: 'TB_PF_INTRST',
    timestamps: false
  });

  TB_PF_INTRST.associate = models => {
    TB_PF_INTRST.belongsTo(models.TB_PF, { foreignKey: 'PF_SN' });
    TB_PF_INTRST.belongsTo(models.TB_INTRST, { foreignKey: 'INTRST_SN' });
  };

  return TB_PF_INTRST;
};
