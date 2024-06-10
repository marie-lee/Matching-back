module.exports = (sequelize, DataTypes) => {
    const TB_PFOL_URL = sequelize.define('TB_PFOL_URL', {
      PFOL_URL_SN: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      PFOL_SN: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      URL_SN: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      RELEASE_YN: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      OS: {
        type: DataTypes.STRING(50),
        allowNull: true
      }
    }, {
      tableName: 'TB_PFOL_URL',
      timestamps: false
    });
  
    TB_PFOL_URL.associate = models => {
      TB_PFOL_URL.belongsTo(models.TB_PFOL, { foreignKey: 'PFOL_SN' });
      TB_PFOL_URL.belongsTo(models.TB_URL, { foreignKey: 'URL_SN' });
    };
  
    return TB_PFOL_URL;
  };
  