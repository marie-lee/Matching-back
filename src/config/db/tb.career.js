module.exports = (sequelize, DataTypes) => {
  const TB_CAREER = sequelize.define('TB_CAREER', {
    CAREER_SN: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    PF_SN: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    CAREER_NM: {
      type: DataTypes.STRING(45),
      allowNull: false
    },
    ENTERING_DT: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    QUIT_DT: {
      type: DataTypes.DATEONLY,
      allowNull: true
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
      allowNull: true
    },
    DEL_YN: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  }, {
    tableName: 'TB_CAREER',
    timestamps: true, // 타임스탬프 활성화
    createdAt: 'CREATED_DT', // createdAt을 CREATED_DT로 매핑
    updatedAt: 'MODIFIED_DT' // updatedAt을 MODIFIED_DT로 매핑
  });

  TB_CAREER.associate = models => {
    TB_CAREER.belongsTo(models.TB_PF, { foreignKey: 'PF_SN' });
  };

  return TB_CAREER;
};
