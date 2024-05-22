module.exports = (sequelize, DataTypes) => {
    const TB_CMMN_CD = sequelize.define('TB_CMMN_CD', {
      CMMD_CD_SN: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      CMMD_CD: {
        type: DataTypes.STRING(45),
        allowNull: false
      },
      CMMD_CD_TYPE: {
        type: DataTypes.STRING(45),
      },
      CMMD_CD_VAL: {
        type: DataTypes.STRING(45),
        allowNull: false
      },
      USE_YN: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      }
    }, {
      timestamps: false,
      tableName: 'TB_CMMN_CD'
    });
  
    return TB_CMMN_CD;
  };
  