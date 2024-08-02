module.exports = (sequelize, DataTypes) => {
    const TB_MENTION = sequelize.define('TB_MENTION', {
        MENTION_SN:{
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },
        ISSUE_SN: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        COMMENT_SN: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        TARGET_SN: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        CREATER_SN: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        CREATED_DT: {
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
        tableName: 'TB_MENTION',
        timestamps: false, // 타임스탬프 활성화
    });

    TB_MENTION.associate = models => {
        TB_MENTION.belongsTo(models.TB_ISSUE, { foreignKey: 'ISSUE_SN' });
        TB_MENTION.belongsTo(models.TB_COMMENT, { foreignKey: 'COMMENT_SN' });
        TB_MENTION.belongsTo(models.TB_USER, { foreignKey: 'TARGET_SN' });
        TB_MENTION.belongsTo(models.TB_USER, { foreignKey: 'CREATER_SN' });
    };

    return TB_MENTION;
}