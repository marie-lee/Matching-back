module.exports = (sequelize, DataTypes) => {
    const TB_PFOL_ROLE = sequelize.define('TB_PFOL_ROLE', {
      PFOL_ROLE_SN: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      PFOL_SN: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      ROLE_SN: {
        type: DataTypes.INTEGER,
        allowNull: false
      }
    }, {
      tableName: 'TB_PFOL_ROLE',
      timestamps: false
    });
  
    TB_PFOL_ROLE.associate = models => {
      TB_PFOL_ROLE.belongsTo(models.TB_PFOL, { foreignKey: 'PFOL_SN' });
      TB_PFOL_ROLE.belongsTo(models.TB_ROLE, { foreignKey: 'ROLE_SN' });
    };
  
    return TB_PFOL_ROLE;
  };