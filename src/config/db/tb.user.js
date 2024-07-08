module.exports = (sequelize, DataTypes) => {
  const TB_USER = sequelize.define('TB_USER', {
    USER_SN: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    USER_NM: {
      type: DataTypes.STRING(45),
      allowNull: false
    },
    USER_EMAIL: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    USER_PW: {
      type: DataTypes.STRING(2000),
      allowNull: false
    },
    PHONE: {
      type: DataTypes.STRING(11),
      allowNull: true
    },
    USER_IMG: {
      type: DataTypes.STRING(2000),
      allowNull: true
    },
    LOGIN_TYPE: {
      type: DataTypes.STRING(2000),
      allowNull: false
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
    },
    UID: {
      type: DataTypes.STRING(2000),
      allowNull: false
    },
    REFRESH_TOKEN: {
      type: DataTypes.STRING(2000),
      allowNull: false
    },
    DEVICE_TOKEN: {
      type: DataTypes.STRING(2000),
      allowNull: false
    }
  }, {
    tableName: 'TB_USER',
    timestamps: true, // 타임스탬프 활성화
      createdAt: 'CREATED_DT', // createdAt을 CREATED_DT로 매핑
      updatedAt: 'MODIFIED_DT' // updatedAt을 MODIFIED_DT로 매핑
  });

  TB_USER.associate = models => {
    TB_USER.hasMany(models.TB_PF, { as: 'tpf', foreignKey: 'USER_SN' });
    TB_USER.hasMany(models.TB_PJT, { foreignKey: 'CREATED_USER_SN' });
    TB_USER.hasMany(models.TB_REQ, { foreignKey: 'USER_SN' });
    TB_USER.hasMany(models.TB_PJT_M, { foreignKey: 'USER_SN' });
    TB_USER.hasMany(models.TB_WBS, { foreignKey: 'LAST_UPDATER' });
  };

  return TB_USER;
};
