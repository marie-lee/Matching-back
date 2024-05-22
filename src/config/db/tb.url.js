module.exports = (sequelize, DataTypes) => {
    const TB_URL = sequelize.define('TB_URL', {
      URL_SN: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      URL: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      URL_INTRO: {
        type: DataTypes.STRING(1000),
        allowNull: true
      },
      CREATED_DT: {
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
      tableName: 'TB_URL',
      timestamps: true, // 타임스탬프 활성화
      createdAt: 'CREATED_DT' // createdAt을 CREATED_DT로 매핑
    });
  
    TB_URL.associate = models => {
      TB_URL.hasMany(models.TB_PF_URL, { foreignKey: 'URL_SN' });
      TB_URL.hasMany(models.TB_PFOL_URL, { foreignKey: 'URL_SN' });
    };

    return TB_URL;
  };
  