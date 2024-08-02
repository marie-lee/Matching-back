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
const addMentionFromIssue = async(mentionData,transaction) => {
    await db.TB_MENTION.create(mentionData,{transaction});
}
const findIssue = async(issueSn,pjtSn) =>{
    return await db.TB_ISSUE.findOne({where:{ISSUE_SN: issueSn, PJT_SN: pjtSn, DEL_YN: false}})
}
const updateIssue = async(issue, transaction) =>{
    return await issue.save({transaction})
}
const trackingIssue = async(pjtSn) => {
    const query = `SELECT 
        TB_WBS.ISSUE_TICKET_SN AS PARENT_TICKET_SN, 
        TB_WBS.TICKET_SN, 
        TB_WBS.CREATED_DT 
    FROM 
        TB_WBS 
    INNER JOIN 
        TB_ISSUE 
    ON 
        TB_ISSUE.PJT_SN = ${pjtSn}
    WHERE 
        TB_WBS.PJT_SN = ${pjtSn}
        AND TB_WBS.ISSUE_TICKET_SN IS NOT NULL 
    GROUP BY 
        TICKET_SN`;
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
                                    ti.PRIORITY,
                                    ti.CONTENT,
                                    ti.CREATED_DT,
                                    ROW_NUMBER() OVER (PARTITION BY th.ISSUE_SN, th.TICKET_SN ORDER BY ti.CREATED_DT DESC) AS rn
                                FROM TicketHierarchy th
                                INNER JOIN TB_ISSUE ti ON ti.TICKET_SN = th.TICKET_SN
                                INNER JOIN TB_USER tu ON tu.USER_SN = ti.PRESENT_SN
                                WHERE th.PARENT_SN IS NULL
                            ) sub
                            WHERE rn = 1
                            ORDER BY ISSUE_SN;`
    const result =  await db.query(query, {type: QueryTypes.SELECT});
    return result.length > 0 ? result[0] : {};
}
const mentionData = async(issueSn) => {
    const query = `SELECT
                              tm.ISSUE_SN,
                              tu.USER_SN,
                              tu.USER_NM,
                              tu.USER_IMG
                          FROM TB_MENTION tm
                          INNER JOIN TB_USER tu ON tu.USER_SN = tm.TARGET_SN
                          WHERE tm.ISSUE_SN = ${issueSn}
                          GROUP BY tm.ISSUE_SN;`
    return await db.query(query, {type: QueryTypes.SELECT});
}
const issueCommentData = async(issueSn) => {
    const query = `WITH MentionedUsers AS (
                                SELECT
                                    m.COMMENT_SN,
                                    JSON_ARRAYAGG(
                                        JSON_OBJECT(
                                            'USER_SN', tu.USER_SN,
                                            'USER_NM', tu.USER_NM,
                                            'USER_IMG', tu.USER_IMG
                                        )
                                    ) AS MentionedUsers
                                FROM TB_MENTION m
                                INNER JOIN TB_USER tu ON tu.USER_SN = m.TARGET_SN
                                WHERE m.COMMENT_SN IS NOT NULL
                                GROUP BY m.COMMENT_SN
                            )
                            SELECT
                                c.COMMENT_SN,
                                c.TEXT AS CommentText,
                                c.CREATER_SN,
                                tu.USER_NM AS CreatorName,
                                tu.USER_IMG AS CreatorImg,
                                COALESCE(mu.MentionedUsers, JSON_ARRAY()) AS MentionedUsers
                            FROM TB_COMMENT c
                            INNER JOIN TB_USER tu ON tu.USER_SN = c.CREATER_SN
                            LEFT JOIN MentionedUsers mu ON mu.COMMENT_SN = c.COMMENT_SN
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
    addMentionFromIssue,
    findIssue,
    updateIssue,
    trackingIssue,
    issueDetail,
    mentionData,
    issueCommentData
};