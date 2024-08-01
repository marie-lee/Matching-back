module.exports = (sequelize, DataTypes) => {
    const TB_RATE = sequelize.define('TB_RATE', {
        RATE_SN:{
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },
        PJT_SN: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        TARGET_SN: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        RATER_SN: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        RATE_1: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        RATE_2: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        RATE_3: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        RATE_4: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        RATE_5: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        RATE_TEXT: {
            type: DataTypes.STRING(2000),
            allowNull: false
        },
        CREATED_DT: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },
        MODIFIED_DT: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },
        DELETED_DT: {
            type: DataTypes.DATE,
            allowNull: true
        },
        DEL_YN: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        }
    }, {
        tableName: 'TB_RATE',
        timestamps: true, // 타임스탬프 활성화
        createdAt: 'CREATED_DT', // createdAt을 CREATED_DT로 매핑
        updatedAt: 'MODIFIED_DT' // updatedAt을 MODIFIED_DT로 매핑
    });

    TB_RATE.associate = models => {
        TB_RATE.belongsTo(models.TB_PJT, { foreignKey: 'PJT_SN' });
        TB_RATE.belongsTo(models.TB_USER, { foreignKey: 'TARGET_SN' });
        TB_RATE.belongsTo(models.TB_USER, { foreignKey: 'RATER_SN' });
    };

    return TB_RATE;
}