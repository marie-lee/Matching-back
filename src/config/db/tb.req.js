module.exports = (sequelize, DataTypes) => {
    const TB_REQ = sequelize.define('TB_REQ', {
      REQ_SN: {
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
      REQ_STTS: {
        type: DataTypes.STRING(45),
      },
      CREATED_DT: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      UPDATED_DT: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      FINISHED_DT: {
        type: DataTypes.DATE,
      },
      DEL_YN: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      }
    }, {
      tableName: 'TB_REQ',
      timestamps: true, // 타임스탬프 활성화
      createdAt: 'CREATED_DT', // createdAt을 CREATED_DT로 매핑
      updatedAt: 'UPDATED_DT' // updatedAt을 UPDATED_DT로 매핑
    });
  
    TB_REQ.associate = models => {
      TB_REQ.belongsTo(models.TB_PJT, { as:'tp', foreignKey: 'PJT_SN' });
      TB_REQ.belongsTo(models.TB_USER, { as: 'tu', foreignKey: 'USER_SN' });
      TB_REQ.belongsTo(models.TB_PJT_ROLE, { as: 'tpr', foreignKey: 'PJT_ROLE_SN' });
    };
  
    return TB_REQ;
  };
  