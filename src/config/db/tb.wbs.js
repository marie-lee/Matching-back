module.exports = (sequelize, DataTypes) => {
    const TB_WBS = sequelize.define('TB_WBS', {
        WBS_SN: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },
        PJT_SN: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        TEMPLATE_DATA: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        LAST_UPDATER: {
            type: DataTypes.INTEGER,
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
        tableName: 'TB_WBS',
        timestamps: true, // 타임스탬프 활성화
        createdAt: 'CREATED_DT', // createdAt을 CREATED_DT로 매핑
        updatedAt: 'MODIFIED_DT' // updatedAt을 MODIFIED_DT로 매핑
    });

    TB_WBS.associate = models => {
        TB_WBS.belongsTo(models.TB_PJT, { foreignKey: 'PJT_SN' });
        TB_WBS.belongsTo(models.TB_USER, { foreignKey: 'LAST_UPDATER' });
    };

    return TB_WBS;
};
