module.exports = (sequelize, DataTypes) => {
    const TB_PJT_ROLE = sequelize.define('TB_PJT_ROLE', {
      PJT_ROLE_SN: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      PJT_SN: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      PART: {
        type: DataTypes.STRING(45),
        allowNull: false
      },
      TOTAL_CNT: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      CNT: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      DEL_YN: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
    }, {
      tableName: 'TB_PJT_ROLE',
      timestamps: false
    });
  
    TB_PJT_ROLE.associate = models => {
      TB_PJT_ROLE.belongsTo(models.TB_PJT, { foreignKey: 'PJT_SN' });
      TB_PJT_ROLE.hasMany(models.TB_REQ, { foreignKey: 'PJT_ROLE_SN' });
      TB_PJT_ROLE.hasMany(models.TB_PJT_M, { foreignKey: 'PJT_ROLE_SN' });
    };
  
    return TB_PJT_ROLE;
  };
  