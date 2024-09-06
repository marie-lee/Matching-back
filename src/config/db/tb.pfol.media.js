module.exports = (sequelize, DataTypes) => {
    const TB_PFOL_MEDIA = sequelize.define('TB_PFOL_MEDIA', {
      MEDIA_SN: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      PFOL_SN: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      URL: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      MAIN_YN: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      TYPE: {
        type: DataTypes.STRING,
        allowNull: false
      },
      CREATED_DT: {
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
      tableName: 'TB_PFOL_MEDIA',
      timestamps: true, // 타임스탬프 활성화
      createdAt: 'CREATED_DT', // createdAt을 CREATED_DT로 매핑
      updatedAt: false
    });
  
    TB_PFOL_MEDIA.associate = models => {
      TB_PFOL_MEDIA.belongsTo(models.TB_PFOL, { foreignKey: 'PFOL_SN' });
    };
  
    return TB_PFOL_MEDIA;
  };
  