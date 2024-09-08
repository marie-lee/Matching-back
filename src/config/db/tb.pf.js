module.exports = (sequelize, DataTypes) => {
  const TB_PF = sequelize.define('TB_PF', {
    PF_SN: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    PF_INTRO: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null
    },
    CREATED_DT: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    MODIFIED_DT: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    DELETED_DT: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null
    },
    DEL_YN: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    USER_SN: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    tableName: 'TB_PF',
    timestamps: true, // 타임스탬프 활성화
    createdAt: 'CREATED_DT', // createdAt을 CREATED_DT로 매핑
    updatedAt: 'MODIFIED_DT' // updatedAt을 MODIFIED_DT로 매핑
  });

  TB_PF.associate = models => {
    TB_PF.belongsTo(models.TB_USER, { foreignKey: 'USER_SN' });
    TB_PF.hasMany(models.TB_PF_ST, { foreignKey: 'PF_SN' });
    TB_PF.hasMany(models.TB_PF_INTRST, { foreignKey: 'PF_SN' });
    TB_PF.hasMany(models.TB_CAREER, { foreignKey: 'PF_SN' });
    TB_PF.hasMany(models.TB_PF_PFOL, { foreignKey: 'PF_SN' });
    TB_PF.hasMany(models.TB_PF_URL, { foreignKey: 'PF_SN' });
  };

  return TB_PF;
};
