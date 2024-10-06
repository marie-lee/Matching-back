const alarmRepository = require('./alarm.repository');
const db = require('../../config/db/db');

const findAllAlarm = async (userSn) => {
    try {
        return await alarmRepository.findAllAlarm(userSn);
    }catch (e){
        throw e;
    }
};

const checkAlarm = async (userSn, alarmSn) => {
    const transaction = await db.transaction();
    try {
        const alarm = await alarmRepository.findAlarm(alarmSn);
        if(alarm.RECEIVER_SN !== userSn) return {
            status: 403,
            message: '본인 알림이 아닙니다.'
        }
        const result = await alarmRepository.checkAlarm(userSn, alarmSn, transaction);
        await transaction.commit();
        if(result) return {
            status: 200,
            message: '알림 확인 처리 성공'
        };

    }
    catch (e) {
        await transaction.rollback();
        throw e;
    }
}

const checkAllAlarm = async (userSn) => {
    const transaction = await db.transaction();
    try {
        const result = await alarmRepository.checkAllAlarm(userSn, transaction);
        await transaction.commit();

        if(result) return {
            status: 200,
            message: '전체 알림 확인 처리 성공'
        };

    }
    catch (e) {
        await transaction.rollback();
        throw e;
    }
}

const deleteAlarm = async (userSn, alarmSn) => {
    const transaction = await db.transaction();
    try {
        const alarm = await alarmRepository.findAlarm(alarmSn);
        if(alarm.RECEIVER_SN !== userSn) return {
            status: 403,
            message: '본인 알림이 아닙니다.'
        }
        const result = await alarmRepository.deleteAlarm(userSn, alarmSn, transaction);
        await transaction.commit();

        if(result) return {
            status: 200,
            message: '알림 삭제 성공'
        };

    }
    catch (e) {
        await transaction.rollback();
        throw e;
    }
}

const deleteAllCheckedAlarm = async (userSn) => {
    const transaction = await db.transaction();
    try {
        console.log('durl')
        const result = await alarmRepository.deleteAllCheckedAlarm(userSn, transaction);
        await transaction.commit();

        if(result) return {
            status: 200,
            message: '확인된 알림 전체 삭제 성공'
        };

    }
    catch (e) {
        await transaction.rollback();
        throw e;
    }
}

const createCommentAlarm = async (receiver, sender, pjt, post, postType, transaction) => {
    if(postType==='issue'){
        const data = {
            RECEIVER_SN: receiver,
            SENDER_SN: sender,
            DETAIL: `이슈 '${post.ISSUE_NM}'에 새 댓글이 있습니다.`,
            TYPE: 'ISSUE_COMMENT',
            PJT_SN: pjt.PJT_SN,
            POST_SN: post.ISSUE_SN,
            POST_TYPE: 'ISSUE'
        };

        await alarmRepository.createAlarm(data, transaction);
    }
    else if(postType==='ticket'){
        const data = {
            RECEIVER_SN: receiver,
            SENDER_SN: sender,
            DETAIL: `업무 '${post.TICKET_NAME}'에 새 댓글이 있습니다.`,
            TYPE: 'TASK_COMMENT',
            PJT_SN: pjt.PJT_SN,
            POST_SN: post.TICKET_SN,
            POST_TYPE: 'TASK'
        };

        await alarmRepository.createAlarm(data, transaction);
    }
}

const createMentionAlarm = async (receiver, sender, type, pjt, post, postType, transaction) =>{
    if(type==='issueMention'){
        const data = {
            RECEIVER_SN: receiver,
            SENDER_SN: sender,
            DETAIL: `이슈 '${post.ISSUE_NM}'에 멘션되었습니다.`,
            TYPE: 'ISSUE_MENTION',
            PJT_SN: pjt.PJT_SN,
            POST_SN: post.ISSUE_SN,
            POST_TYPE: 'ISSUE'
        };

        await alarmRepository.createAlarm(data, transaction);
    }
    else if(type==='commentMention'){
        if(postType==='issue'){
            const data = {
                RECEIVER_SN: receiver,
                SENDER_SN: sender,
                DETAIL: `이슈 '${post.ISSUE_NM}'의 댓글에 멘션되었습니다.`,
                TYPE: 'COMMENT_MENTION',
                PJT_SN: pjt.PJT_SN,
                POST_SN: post.ISSUE_SN,
                POST_TYPE: 'ISSUE'
            };

            await alarmRepository.createAlarm(data, transaction);
        }
        else if(postType==='ticket'){
            const data = {
                RECEIVER_SN: receiver,
                SENDER_SN: sender,
                DETAIL: `업무 '${post.TICKET_NAME}'의 댓글에 멘션되었습니다.`,
                TYPE: 'COMMENT_MENTION',
                PJT_SN: pjt.PJT_SN,
                POST_SN: post.TICKET_SN,
                POST_TYPE: 'TASK'
            };

            await alarmRepository.createAlarm(data, transaction);
        }
    }
}

const projectCloseAlarm = async (receiver, pjt, transaction) =>{
    const data = {
        RECEIVER_SN: receiver,
        DETAIL: `프로젝트 '${pjt.PJT_NM}' 종료 1주일 전입니다.`,
        TYPE: 'CLOSE',
        PJT_SN: pjt.PJT_SN,
    };

    await alarmRepository.createAlarm(data, transaction);
}

module.exports = {
    createCommentAlarm,
    createMentionAlarm,
    projectCloseAlarm,
    findAllAlarm,
    checkAlarm,
    checkAllAlarm,
    deleteAlarm,
    deleteAllCheckedAlarm
};
