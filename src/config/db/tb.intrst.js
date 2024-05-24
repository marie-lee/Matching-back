module.exports = (sequelize, DataTypes) => {
  const TB_INTRST = sequelize.define('TB_INTRST', {
    INTRST_SN: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    INTRST_NM: {
      type: DataTypes.STRING(45),
      allowNull: false,
      unique: true
    }
  }, {
    tableName: 'TB_INTRST',
    timestamps: false
  });

  TB_INTRST.associate = models => {
    TB_INTRST.hasMany(models.TB_PF_INTRST, { foreignKey: 'INTRST_SN' });
  };

  return TB_INTRST;
};
