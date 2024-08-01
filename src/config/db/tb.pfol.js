module.exports = (sequelize, DataTypes) => {
  const TB_PFOL = sequelize.define('TB_PFOL', {
    PFOL_SN: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    PFOL_NM: {
      type: DataTypes.STRING(45),
      allowNull: false
    },
    START_DT: {
      type: DataTypes.DATE
    },
    END_DT: {
      type: DataTypes.DATE
    },
    PERIOD: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    INTRO: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    MEM_CNT: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    CONTRIBUTION: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    SERVICE_STTS: {
      type: DataTypes.STRING(45),
      allowNull: false
    },
    RESULT: {
      type: DataTypes.TEXT
    },
    CREATED_DT: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    MODIFIED_DT: {
      type: DataTypes.DATE,
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
    tableName: 'TB_PFOL',
    timestamps: true, // 타임스탬프 활성화
    createdAt: 'CREATED_DT', // createdAt을 CREATED_DT로 매핑
    updatedAt: 'MODIFIED_DT' // updatedAt을 MODIFIED_DT로 매핑
  });
  
  TB_PFOL.associate = models => {
    TB_PFOL.hasMany(models.TB_PF_PFOL, { foreignKey: 'PFOL_SN' });
    TB_PFOL.hasMany(models.TB_PFOL_ST, { foreignKey: 'PFOL_SN' });
    TB_PFOL.hasMany(models.TB_PFOL_MEDIA, { foreignKey: 'PFOL_SN' });
    TB_PFOL.hasMany(models.TB_PFOL_ROLE, { foreignKey: 'PFOL_SN' });
    TB_PFOL.hasMany(models.TB_PFOL_URL, { foreignKey: 'PFOL_SN' });
  };
 
  return TB_PFOL;
};
  