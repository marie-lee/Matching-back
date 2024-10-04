const db = require('../../config/db/db');
const {logger} = require('../../utils/logger');
const {QueryTypes} = require("sequelize");
const {throwError} = require("../../utils/errors");
const {getProjectIntro} = require("../project/project.service");
const {error} = require("winston");
const moment = require("moment")
const commonRepository = require('./common.repository');

const oneCmmnVal = async (cmmnCdType, cmmnCd) => {
  try {
    return await db.TB_CMMN_CD.findOne({
      where: {CMMN_CD_TYPE: cmmnCdType, CMMN_CD: cmmnCd},
      attributes: ['CMMN_CD_VAL'],
    })
  } catch (error) {
    throw error;
  }
}

const formatDt = (dt) => {
  return moment(dt).format('YYYY-MM-DD HH:mm:ss');
};

const sortTasks = (tasks) => {
  const priorityMap = {
    'L0': 0,
    'L1': 1,
    'L2': 2,
    'L3': 3,
    'null': 4
  };
  return tasks.sort((a, b) => {
    // 실제 null 값 처리
    const priorityA = a.priority !== null ? priorityMap[a.priority] !== undefined ? priorityMap[a.priority] : Infinity : Infinity;
    const priorityB = b.priority !== null ? priorityMap[b.priority] !== undefined ? priorityMap[b.priority] : Infinity : Infinity;

    // 1. 우선순위에 따라 정렬 (우선순위가 낮을수록 높은 중요도)
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    // 2. 중요도가 같을 경우 dueDate로 정렬
    const dateA = a.dueDate !== null ? new Date(a.dueDate) : Infinity; // null인 경우 Infinity로 처리
    const dateB = b.dueDate !== null ? new Date(b.dueDate) : Infinity; // null인 경우 Infinity로 처리
    if (dateA !== dateB) {
      return dateA - dateB; // 마감일이 더 이른 항목이 먼저
    }

    // 3. 우선순위와 dueDate가 같을 경우 ticketSn 또는 issueSn으로 정렬
    const aSn = a.ticketSn !== undefined ? a.ticketSn : a.issueSn;
    const bSn = b.ticketSn !== undefined ? b.ticketSn : b.issueSn;

    return aSn - bSn; // ticketSn 또는 issueSn으로 정렬
  });
};

const addDate = (type, date, period) => {
  const result = new Date(date);
  if(type === 'DAY'){
    result.setDate(result.getDate() + period);
  }else {
    result.setMonth(result.getMonth() + period);
  }
  result.setHours(23, 59, 59, 0);
  return result;
};

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

    await commonRepository.createAlarm(data, transaction);
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

    await commonRepository.createAlarm(data, transaction);
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

    await commonRepository.createAlarm(data, transaction);
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

      await commonRepository.createAlarm(data, transaction);
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

      await commonRepository.createAlarm(data, transaction);
    }
  }
}

module.exports = {oneCmmnVal, formatDt, sortTasks, addDate, createCommentAlarm, createMentionAlarm};