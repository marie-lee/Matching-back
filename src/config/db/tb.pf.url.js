module.exports = (sequelize, DataTypes) => {
    const TB_PF_URL = sequelize.define('TB_PF_URL', {
      PF_URL_SN: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      PF_SN: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      URL_SN: {
        type: DataTypes.INTEGER,
        allowNull: false
      }
    }, {
      tableName: 'TB_PF_URL',
      timestamps: false
    });
  
    TB_PF_URL.associate = models => {
      TB_PF_URL.belongsTo(models.TB_PF, { foreignKey: 'PF_SN' });
      TB_PF_URL.belongsTo(models.TB_URL, { foreignKey: 'URL_SN' });
    };
  
    return TB_PF_URL;
  };
  