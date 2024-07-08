module.exports = (sequelize, DataTypes) => {
    const TB_PJT_M = sequelize.define('TB_PJT_M', {
      PJT_MEM_SN: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      PJT_SN: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      USER_SN: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      PJT_ROLE_SN: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      ROLE: {
        type: DataTypes.STRING(45),
        allowNull: true
      },
      FIRST_DT: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      END_DT: {
        type: DataTypes.DATE,
      },
      DEL_YN: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      }
    }, {
      tableName: 'TB_PJT_M',
      timestamps: false
    });
  
    TB_PJT_M.associate = models => {
      TB_PJT_M.belongsTo(models.TB_PJT, { foreignKey: 'PJT_SN' });
      TB_PJT_M.belongsTo(models.TB_USER, { foreignKey: 'USER_SN' });
      TB_PJT_M.belongsTo(models.TB_PJT_ROLE, { foreignKey: 'PJT_ROLE_SN' });
    };
  
    return TB_PJT_M;
  };
  