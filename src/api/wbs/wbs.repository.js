const db = require('../../config/db/db');
const { logger } = require("../../utils/logger");
const { QueryTypes, Sequelize, Op} = require("sequelize");

const beginTransaction = async () => {
    return await db.transaction();
};

const commitTransaction = async (transaction) => {
    return await transaction.commit();
};

const rollbackTransaction = async (transaction) => {
    return await transaction.rollback();
};

const getWbsTemplate = async (pjtSn) => {
    return await db.TB_WBS.findOne({
        where: {PJT_SN: pjtSn, DEL_YN: false},
        attributes: ['TEMPLATE_DATA'],
    });
}
const findWbs = async (pjtSn) => {
    return await db.TB_WBS.findOne({
        where: { PJT_SN: pjtSn, PARENT_SN: null, ORDER_NUM: 1, DEL_YN: false }
    });
};

const updateProjectDates = async (pjtSn, pjtData, transaction) => {
    return await db.TB_PJT.update(
        { START_DT: pjtData.startDt, END_DT: pjtData.endDt },
        { where: { PJT_SN: pjtSn }, transaction }
    );
};

const updateProjectMembers = async (pjtSn, member, transaction) => {
    return await db.TB_PJT_M.update(
        { ROLE: member.role, PART: member.part },
        { where: { PJT_SN: pjtSn, USER_SN: member.userSn }, transaction }
    );
};

const createWbs = async (wbsData, transaction) => {
    return await db.TB_WBS.create(wbsData, { transaction });
};

const insertWbs = async (depth, pjtSn, parentSn, orderNum, transaction) => {
    const depthData = await createWbs(
        { PJT_SN: pjtSn, TICKET_NAME: depth.name, PARENT_SN: parentSn, ORDER_NUM: orderNum },
        transaction
    );

    let childOrderNum = 1;
    if (depth.child && Array.isArray(depth.child)) { // depth.child가 배열인지 확인
        for (const child of depth.child) {
            await insertWbs(child, pjtSn, depthData.TICKET_SN, childOrderNum, transaction);
            childOrderNum++;
        }
    }
};

const findProjectBySn = async (pjtSn) => {
    return await db.TB_PJT.findOne({ where: { PJT_SN: pjtSn } });
};

const findProjectMembers = async (pjtSn) => {
    return await db.TB_PJT_M.findAll({ where: { PJT_SN: pjtSn, DEL_YN: false } });
};

const findUserBySn = async (userSn) => {
    return await db.TB_USER.findOne({ where: { USER_SN: userSn, DEL_YN: false } });
};

const findPartByRoleSn = async (roleSn) => {
    return await db.TB_PJT_ROLE.findOne({ where: { PJT_ROLE_SN: roleSn, DEL_YN: false } });
};

const updateWbsTemplate = async (pjtSn, userSn, templateData, transaction) => {
    return await db.TB_WBS.update(
        { LAST_UPDATER: userSn, TEMPLATE_DATA: JSON.stringify(templateData) },
        {
            where: { PJT_SN: pjtSn },
            transaction
        }
    );
};

const findProjectMember = async (userSn, pjtSn) => {
    console.log(userSn);
    console.log(pjtSn);
    return await db.TB_PJT_M.findOne({
        where: { PJT_SN: pjtSn, USER_SN: userSn, DEL_YN: false }
    });
};

const findDepth1Data = async (pjtSn) => {
    return await db.TB_WBS.findAll({
        where: { PJT_SN: pjtSn, PARENT_SN: null },
        order: [['ORDER_NUM', 'ASC']]
    });
};

const findChildData = async (pjtSn, parentSn) => {
    return await db.TB_WBS.findAll({
        where: { PJT_SN: pjtSn, PARENT_SN: parentSn, DEL_YN: false },
        order: [['ORDER_NUM', 'ASC']]
    });
};
const findTicket = async (ticketSn, pjtSn) =>{
    return await db.TB_WBS.findOne({
        where : {PJT_SN: pjtSn, TICKET_SN: ticketSn, DEL_YN: false },
    })
}
const createIssue = async (issueDto, transaction)=>{
    return await db.TB_ISSUE.create(issueDto,{transaction})
}
const findMention = async(mentionSn, userSn) =>{
    return await db.TB_MENTION.findOne({where:{MENTION_SN: mentionSn, CREATER_SN: userSn}});
}
const addMentionFromIssue = async(mentionData,transaction) => {
    await db.TB_MENTION.create(mentionData,{transaction});
}
const deleteMentionFromIssue = async(mentionSn, transaction)=>{
    return await db.TB_MENTION.update(
        {DELETED_DT: db.Sequelize.fn('NOW'), DEL_YN: true},
        {where:{MENTION_SN: mentionSn}}, {transaction});
}

const findIssue = async(issueSn,pjtSn) =>{
    return await db.TB_ISSUE.findOne({where:{ISSUE_SN: issueSn, PJT_SN: pjtSn, DEL_YN: false}})
}
const updateIssue = async(issue, transaction) =>{
    return await issue.save({transaction})
}
const trackingIssue = async(pjtSn) => {
    const query = `SELECT 
                            tw.ISSUE_TICKET_SN AS PARENT_TICKET_SN, 
                            ti.ISSUE_SN AS ISSUE_SN,
                            ti.CREATED_DT AS ISSUE_CREATED_DT,
                            JSON_ARRAYAGG(
                                JSON_OBJECT(
                                    'TICKET_SN', tw.TICKET_SN,
                                    'CREATED_DT', tw.CREATED_DT
                                )
                            ) AS TICKETS
                        FROM TB_WBS tw
                        INNER JOIN TB_ISSUE ti ON tw.PJT_SN = ti.PJT_SN AND ti.TICKET_SN = tw.ISSUE_TICKET_SN
                        WHERE tw.PJT_SN = ${pjtSn} AND tw.ISSUE_TICKET_SN IS NOT NULL 
                        GROUP BY PARENT_TICKET_SN, ISSUE_SN, ISSUE_CREATED_DT
                        ORDER BY PARENT_TICKET_SN;`;
    return await db.query(query, {type: QueryTypes.SELECT});
}
const issueDetail = async(issueSn,pjtSn) =>{
    const query = `WITH RECURSIVE TicketHierarchy AS (
                                SELECT
                                    ti.ISSUE_SN,
                                    ti.TICKET_SN,
                                    tw.TICKET_NAME AS CurrentTicketName,
                                    tw2.TICKET_NAME AS ParentTicketName,
                                    tw.PARENT_SN,
                                    CONCAT(tw.TICKET_NAME) AS FullPath
                                FROM TB_ISSUE ti
                                INNER JOIN TB_WBS tw ON tw.TICKET_SN = ti.TICKET_SN
                                LEFT JOIN TB_WBS tw2 ON tw2.TICKET_SN = tw.PARENT_SN
                                WHERE ti.ISSUE_SN = ${issueSn} AND ti.PJT_SN = ${pjtSn}
                                UNION ALL
                                SELECT
                                    th.ISSUE_SN,
                                    th.TICKET_SN,
                                    th.ParentTicketName,
                                    tw.TICKET_NAME AS CurrentTicketName,
                                    tw.PARENT_SN,
                                    CONCAT(th.FullPath, '/', tw.TICKET_NAME) AS FullPath
                                FROM TicketHierarchy th
                                INNER JOIN TB_WBS tw ON tw.TICKET_SN = th.PARENT_SN
                            )
                            SELECT
                                ISSUE_SN,
                                TICKET_SN,
                                FullPath AS TICKET,
                                USER_SN AS PRESENT_SN,
                                USER_NM AS PRESENT_NM,
                                USER_IMG AS PRESENT_IMG,
                                ISSUE_NM,
                                PRIORITY,
                                STATUS,
                                CONTENT,
                                CREATED_DT
                            FROM (
                                SELECT
                                    th.ISSUE_SN,
                                    th.TICKET_SN,
                                    th.FullPath,
                                    tu.USER_SN,
                                    tu.USER_NM,
                                    tu.USER_IMG,
                                    ti.ISSUE_NM,
                                    tcc1.CMMN_CD_VAL AS PRIORITY,
                                    tcc2.CMMN_CD_VAL AS STATUS,
                                    ti.CONTENT,
                                    ti.CREATED_DT,
                                    ROW_NUMBER() OVER (PARTITION BY th.ISSUE_SN, th.TICKET_SN ORDER BY ti.CREATED_DT DESC) AS rn
                                FROM TicketHierarchy th
                                INNER JOIN TB_ISSUE ti ON ti.TICKET_SN = th.TICKET_SN
                                INNER JOIN TB_USER tu ON tu.USER_SN = ti.PRESENT_SN
                                INNER JOIN TB_CMMN_CD tcc1 ON tcc1.CMMN_CD = ti.PRIORITY AND tcc1.CMMN_CD_TYPE = 'ISSUE_PRRT'
                                INNER JOIN TB_CMMN_CD tcc2 ON tcc2.CMMN_CD = ti.STATUS AND tcc2.CMMN_CD_TYPE = 'ISSUE_STTS'
                                WHERE th.PARENT_SN IS NULL
                            ) sub
                            WHERE rn = 1
                            ORDER BY ISSUE_SN;`
    const result =  await db.query(query, {type: QueryTypes.SELECT});
    return result.length > 0 ? result[0] : {};
}
const mentionData = async(issueSn, pjtSn) => {
    const query = `SELECT
                              tm.MENTION_SN,
                              tu.USER_SN,
                              tu.USER_NM,
                              tu.USER_IMG,
                              tpr.PART
                          FROM TB_MENTION tm
                          INNER JOIN TB_USER tu ON tu.USER_SN = tm.TARGET_SN
                          INNER JOIN TB_PJT_M tpm ON tpm.PJT_SN = ${pjtSn}
                          INNER JOIN TB_PJT_ROLE tpr ON tpm.PJT_ROLE_SN = tpr.PJT_ROLE_SN 
                          WHERE tm.ISSUE_SN = ${issueSn} AND tm.COMMENT_SN IS NULL AND tm.DEL_YN = FALSE 
                          GROUP BY tm.MENTION_SN;`
    return await db.query(query, {type: QueryTypes.SELECT});
}
const issueCommentData = async(issueSn) => {
    const query = `WITH MENTIONED_USERS AS (
                                SELECT
                                    m.COMMENT_SN,
                                    JSON_ARRAYAGG(
                                        JSON_OBJECT(
                                            'MENTIONS_SN', m.MENTION_SN,
                                            'USER_SN', tu.USER_SN,
                                            'USER_NM', tu.USER_NM
                                        )
                                    ) AS MENTIONED_USERS
                                FROM TB_MENTION m
                                INNER JOIN TB_USER tu ON tu.USER_SN = m.TARGET_SN
                                WHERE m.COMMENT_SN IS NOT NULL AND m.DEL_YN = false
                                GROUP BY m.COMMENT_SN
                            )
                            SELECT
                                c.COMMENT_SN,
                                c.TEXT,
                                c.CREATOR_SN,
                                tu.USER_NM AS CREATOR_NM,
                                tu.USER_IMG AS CREATOR_IMG,
                                COALESCE(mu.MENTIONED_USERS, JSON_ARRAY()) AS MENTIONS,
                                c.CREATED_DT
                            FROM TB_COMMENT c
                            INNER JOIN TB_USER tu ON tu.USER_SN = c.CREATOR_SN
                            LEFT JOIN MENTIONED_USERS mu ON mu.COMMENT_SN = c.COMMENT_SN
                            WHERE c.ISSUE_SN = ${issueSn};`
    return await db.query(query, {type: QueryTypes.SELECT});
}

module.exports = {
    beginTransaction,
    commitTransaction,
    rollbackTransaction,
    getWbsTemplate,
    findWbs,
    updateProjectDates,
    updateProjectMembers,
    createWbs,
    insertWbs,
    findProjectBySn,
    findProjectMembers,
    findUserBySn,
    findPartByRoleSn,
    updateWbsTemplate,
    findProjectMember,
    findDepth1Data,
    findChildData,
    findTicket,
    createIssue,
    findMention,
    addMentionFromIssue,
    deleteMentionFromIssue,
    findIssue,
    updateIssue,
    trackingIssue,
    issueDetail,
    mentionData,
    issueCommentData
};