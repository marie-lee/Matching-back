module.exports = (sequelize, DataTypes) => {
    const TB_PJT = sequelize.define('TB_PJT', {
      PJT_SN: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      PJT_NM: {
        type: DataTypes.STRING(45),
        allowNull: false
      },
      PJT_IMG: {
        type: DataTypes.STRING(255),
      },
      PJT_INTRO: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      PJT_OPEN_YN: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      CREATED_USER_SN: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      CONSTRUCTOR_ROLE: {
        type: DataTypes.STRING(255),
      },
      SELECTED_DT_YN: {
        type: DataTypes.BOOLEAN,
        allowNull: false
      },
      START_DT: {
        type: DataTypes.DATE,
      },
      END_DT: {
        type: DataTypes.DATE,
      },
      PERIOD: {
        type: DataTypes.INTEGER,
      },
      DURATION_UNIT: {
        type: DataTypes.STRING(5),
      },
      WANTED: {
        type: DataTypes.STRING(255),
      },
      PJT_DETAIL: {
        type: DataTypes.TEXT,
      },
      PJT_STTS: {
        type: DataTypes.STRING(45),
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
      },
      DEL_YN: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      }
    }, {
      tableName: 'TB_PJT',
      timestamps: true, // 타임스탬프 활성화
      createdAt: 'CREATED_DT', // createdAt을 CREATED_DT로 매핑
      updatedAt: 'MODIFIED_DT' // updatedAt을 MODIFIED_DT로 매핑
      
    });
  
    TB_PJT.associate = models => {
      TB_PJT.belongsTo(models.TB_USER, { as: 'tu', foreignKey: 'CREATED_USER_SN' });
      TB_PJT.hasMany(models.TB_PJT_SKILL, { foreignKey: 'PJT_SN' });
      TB_PJT.hasMany(models.TB_PJT_ROLE, {as:'tpr', foreignKey: 'PJT_SN' });
      TB_PJT.hasMany(models.TB_REQ, { as: 'tr', foreignKey: 'PJT_SN' });
      TB_PJT.hasMany(models.TB_PJT_M, { foreignKey: 'PJT_SN' });
      TB_PJT.hasMany(models.TB_WBS, { foreignKey: 'PJT_SN' });
    };
  
    return TB_PJT;
  };
  