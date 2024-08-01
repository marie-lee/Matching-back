module.exports = (sequelize, DataTypes) => {
    const TB_CMMN_CD = sequelize.define('TB_CMMN_CD', {
      CMMN_CD_SN: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      CMMN_CD: {
        type: DataTypes.STRING(45),
        allowNull: false
      },
      CMMN_CD_TYPE: {
        type: DataTypes.STRING(45),
      },
      CMMN_CD_VAL: {
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
  