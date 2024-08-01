module.exports = (sequelize, DataTypes) => {
    const TB_ISSUE = sequelize.define('TB_ISSUE', {
        ISSUE_SN:{
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },
        PJT_SN: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        TICKET_SN: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        TICKET_NM: {
            type: DataTypes.STRING(2000),
            allowNull: false
        },
        PRIORITY: {
            type: DataTypes.STRING(45),
            allowNull: true
        },
        PRESENT_SN: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        CONTENT: {
            type: DataTypes.STRING(3000),
            allowNull: false
        },
        END_DT: {
            type: DataTypes.DATE,
            allowNull: true
        },
        STATUS: {
            type: DataTypes.STRING(45),
            allowNull: true
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
        tableName: 'TB_ISSUE',
        timestamps: true, // 타임스탬프 활성화
        createdAt: 'CREATED_DT', // createdAt을 CREATED_DT로 매핑
        updatedAt: 'MODIFIED_DT' // updatedAt을 MODIFIED_DT로 매핑
    });

    TB_ISSUE.associate = models => {
        TB_ISSUE.belongsTo(models.TB_PJT, { foreignKey: 'PJT_SN' });
        TB_ISSUE.belongsTo(models.TB_USER, { foreignKey: 'PRESENT_SN' });
        TB_ISSUE.belongsTo(models.TB_WBS, { foreignKey: 'TICKET_SN' });
        TB_ISSUE.hasMany(models.TB_MENTION, { foreignKey: 'ISSUE_SN' });
    };

    return TB_ISSUE;
}