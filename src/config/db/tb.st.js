module.exports = (sequelize, DataTypes) => {
  const TB_ST = sequelize.define('TB_ST', {
    ST_SN: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    ST_NM: {
      type: DataTypes.STRING(45),
      allowNull: false,
      unique: true
    }
  }, {
    tableName: 'TB_ST',
    timestamps: false
  });

  TB_ST.associate = models => {
    TB_ST.hasMany(models.TB_PF_ST, { foreignKey: 'ST_SN' });
    TB_ST.hasMany(models.TB_PFOL_ST, { foreignKey: 'ST_SN' });
    TB_ST.hasMany(models.TB_PJT_SKILL, { foreignKey: 'ST_SN' });
  };

  return TB_ST;
};
