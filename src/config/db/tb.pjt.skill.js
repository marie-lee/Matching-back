module.exports = (sequelize, DataTypes) => {
    const TB_PJT_SKILL = sequelize.define('TB_PJT_SKILL', {
      PJT_ST_SN: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      PJT_SN: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      ST_SN: {
        type: DataTypes.INTEGER,
        allowNull: false
      }
    }, {
      tableName: 'TB_PJT_SKILL',
      timestamps: false
    });
  
    TB_PJT_SKILL.associate = models => {
      TB_PJT_SKILL.belongsTo(models.TB_PJT, { foreignKey: 'PJT_SN' });
      TB_PJT_SKILL.belongsTo(models.TB_ST, { foreignKey: 'ST_SN' });
    };
  
    return TB_PJT_SKILL;
  };
  