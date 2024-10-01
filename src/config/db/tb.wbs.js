module.exports = (sequelize, DataTypes) => {
    const TB_WBS = sequelize.define('TB_WBS', {
        TICKET_SN: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },
        PJT_SN: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        TICKET_NAME: {
            type: DataTypes.STRING(1500),
            allowNull: false
        },
        CREATER_SN:{
            type: DataTypes.INTEGER,
            allowNull: false
        },
        WORKER: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        START_DT: {
            type: DataTypes.DATE,
            allowNull: true
        },
        END_DT: {
            type: DataTypes.DATE,
            allowNull: true
        },
        STATUS: {
            type: DataTypes.STRING(45),
            allowNull: true
        },
        PRIORITY:{
            type: DataTypes.STRING(45),
            allowNull: true
        },
        LEVEL:{
            type: DataTypes.STRING(45),
            allowNull: true
        },
        PARENT_SN: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        ORDER_NUM: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        ISSUE_TICKET_SN: {
            type: DataTypes.INTEGER,
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
        },
        CPLT_DT: {
            type: DataTypes.DATE,
            allowNull: true
        },
    }, {
        tableName: 'TB_WBS',
        timestamps: true, // 타임스탬프 활성화
        createdAt: 'CREATED_DT', // createdAt을 CREATED_DT로 매핑
        updatedAt: 'MODIFIED_DT' // updatedAt을 MODIFIED_DT로 매핑
    });

    TB_WBS.associate = models => {
        TB_WBS.belongsTo(models.TB_PJT, { foreignKey: 'PJT_SN' });
        TB_WBS.belongsTo(models.TB_USER, { foreignKey: 'CREATER_SN' });
        TB_WBS.belongsTo(models.TB_USER, { foreignKey: 'WORKER' });
        TB_WBS.hasMany(models.TB_ISSUE, { foreignKey: 'TICKET_SN' });
        TB_WBS.hasMany(models.TB_COMMENT, { foreignKey: 'TICKET_SN' });
    };

    return TB_WBS;
};
