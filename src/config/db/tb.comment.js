module.exports = (sequelize, DataTypes) => {
    const TB_COMMENT = sequelize.define('TB_COMMENT', {
        COMMENT_SN:{
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },
        PJT_SN: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        ISSUE_SN: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        TEXT: {
            type: DataTypes.STRING(2000),
            allowNull: false
        },
        CREATOR_SN: {
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
        tableName: 'TB_COMMENT',
        timestamps: true, // 타임스탬프 활성화
        createdAt: 'CREATED_DT', // createdAt을 CREATED_DT로 매핑
        updatedAt: 'MODIFIED_DT' // updatedAt을 MODIFIED_DT로 매핑
    });

    TB_COMMENT.associate = models => {
        TB_COMMENT.belongsTo(models.TB_PJT, { foreignKey: 'PJT_SN' });
        TB_COMMENT.belongsTo(models.TB_USER, { foreignKey: 'CREATER_SN' });
        TB_COMMENT.belongsTo(models.TB_ISSUE, { foreignKey: 'ISSUE_SN' });
        TB_COMMENT.hasMany(models.TB_MENTION, { foreignKey: 'COMMENT_SN' });
    };

    return TB_COMMENT;
}