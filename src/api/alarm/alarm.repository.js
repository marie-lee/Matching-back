const db = require('../../config/db/db');

const createAlarm = async (data, transaction)=>{
    return await db.TB_ALARM.create(data,{transaction});
}

const findAlarm = async (alarmSn) => {
    return await db.TB_ALARM.findOne({where:{ALARM_SN: alarmSn}});
}

const findAllAlarm = async (userSn) => {
    const result = [];
    const alarmList = await db.TB_ALARM.findAll({where: {RECEIVER_SN: userSn, DEL_YN: false}});
    const uniqueUserSns = [...new Set(alarmList.map(alarm => alarm.SENDER_SN))];
    const users = await db.TB_USER.findAll({where: {USER_SN: uniqueUserSns, DEL_YN: false}});
    const userMap = {};
    users.forEach(user => {
        userMap[user.USER_SN] = user.USER_NM; // 또는 필요한 다른 정보
    });
    alarmList.forEach(alarm => {
        result.push({
            alarmSn: alarm.ALARM_SN,
            senderSn: alarm.SENDER_SN ? alarm.SENDER_SN : null,
            senderNm: alarm.SENDER_SN ? userMap[alarm.SENDER_SN] : null,
            detail: alarm.DETAIL,
            type: alarm.TYPE,
            pjtSn: alarm.PJT_SN ? alarm.PJT_SN : null,
            postSn: alarm.POST_SN ? alarm.POST_SN : null,
            postType: alarm.POST_TYPE ? alarm.POST_TYPE : null,
            checkYn: alarm.CHECK_YN
        });
    });
    return result[0] ? result : {message: '알림이 없습니다.'};
};

const checkAlarm = async (userSn, alarmSn, transaction) => {
    return await db.TB_ALARM.update({CHECK_YN: true}, {where:{RECEIVER_SN: userSn, ALARM_SN: alarmSn}, transaction});
}
const checkAllAlarm = async (userSn, transaction) => {
    return await db.TB_ALARM.update({CHECK_YN: true}, {where:{RECEIVER_SN: userSn, CHECK_YN:false}, transaction});
}
const deleteAlarm = async (userSn, alarmSn, transaction) => {
    const deletedDt = new Date();
    return await db.TB_ALARM.update({DEL_YN: true, DELETED_DT: deletedDt}, {where:{RECEIVER_SN: userSn, ALARM_SN: alarmSn}, transaction});
}
const deleteAllCheckedAlarm = async (userSn, transaction) => {
    const deletedDt = new Date();
    console.log(userSn)
    return await db.TB_ALARM.update({DEL_YN: true, DELETED_DT: deletedDt}, {where:{RECEIVER_SN: userSn, CHECK_YN:true}, transaction});
}

module.exports = {
    findAlarm,
    createAlarm,
    findAllAlarm,
    checkAlarm,
    checkAllAlarm,
    deleteAlarm,
    deleteAllCheckedAlarm
};