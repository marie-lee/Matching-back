module.exports = (sequelize, DataTypes) => {
    const TB_ROLE = sequelize.define('TB_ROLE', {
      ROLE_SN: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      ROLE_NM: {
        type: DataTypes.STRING(45),
        allowNull: false,
        unique: true
      }
    }, {
      tableName: 'TB_ROLE',
      timestamps: false
    });
  
    TB_ROLE.associate = models => {
      TB_ROLE.hasMany(models.TB_PFOL_ROLE, { foreignKey: 'ROLE_SN' });
    };
  
    return TB_ROLE;
  };
  