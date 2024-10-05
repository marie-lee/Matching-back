module.exports = (sequelize, DataTypes) => {
    const TB_ALARM = sequelize.define('TB_ALARM', {
        ALARM_SN:{
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },
        RECEIVER_SN:{
            type: DataTypes.INTEGER,
            allowNull: false
        },
        SENDER_SN:{
            type: DataTypes.INTEGER,
            allowNull:true
        },
        DETAIL:{
            type: DataTypes.STRING,
            allowNull:false
        },
        TYPE:{
            type: DataTypes.STRING,
            allowNull: false
        },
        PJT_SN:{
            type: DataTypes.INTEGER,
            allowNull: true
        },
        POST_SN:{
            type: DataTypes.INTEGER,
            allowNull: true
        },
        POST_TYPE:{
            type: DataTypes.STRING,
            allowNull: true
        },
        CHECK_YN:{
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
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
        tableName: 'TB_ALARM',
        timestamps: true, // 타임스탬프 활성화
        createdAt: 'CREATED_DT', // createdAt을 CREATED_DT로 매핑
        updatedAt: 'MODIFIED_DT' // updatedAt을 MODIFIED_DT로 매핑
    });

    TB_ALARM.associate = models => {
        TB_ALARM.belongsTo(models.TB_USER, {foreignKey:'RECEIVER_SN'});
        TB_ALARM.belongsTo(models.TB_USER, {foreignKey:'SENDER_SN'});
        TB_ALARM.belongsTo(models.TB_PJT, {foreignKey:'PJT_SN'});
    }
    return TB_ALARM;
}