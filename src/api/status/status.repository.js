const db = require('../../config/db/db');
const {QueryTypes} = require("sequelize");

const findRequest = async(userSn, pjtSn)=> {
    return await db.TB_REQ.findOne({ where: {PJT_SN: pjtSn, USER_SN: userSn} });
}

const findProjectRole = async (pjtSn, pjtRoleSn) => {
    return await db.TB_PJT_ROLE.findOne({ where: { PJT_SN: pjtSn, PJT_ROLE_SN: pjtRoleSn } });
}

const findAllProjectRole = async (pjtSn) => {
    return await db.TB_PJT_ROLE.findAll({ where: { PJT_SN: pjtSn } });
}

const createRequest = async (reqData, transaction) => {
    return await db.TB_REQ.create(reqData, { transaction });
}

const findReqMem = async(pjtSn, reqSn, userSn)=>{
    return await db.TB_REQ.findOne({where: {PJT_SN: pjtSn, REQ_SN: reqSn, DEL_YN: false}});
}

const updateRequest = async (reqMem, transaction) => {
    return await reqMem.save({ transaction });
};

const myRequestList = async(userSn) => {
    const query = `SELECT req.REQ_SN, pj.PJT_SN, pj.PJT_IMG, pj.PJT_NM,
                                SUM(pjr.TOTAL_CNT) AS TOTAL_CNT,
                                pjrr.PART, req.REQ_STTS, tcc.CMMN_CD_VAL AS REQ_STTS_VAL
                                FROM TB_USER usr
                                INNER JOIN TB_REQ req ON usr.USER_SN = req.USER_SN
                                INNER JOIN TB_PJT pj ON req.PJT_SN = pj.PJT_SN AND pj.DEL_YN = FALSE AND pj.PJT_STTS = 'RECRUIT'
                                INNER JOIN TB_PJT_ROLE pjr ON pj.PJT_SN = pjr.PJT_SN
                                INNER JOIN TB_PJT_ROLE pjrr ON req.PJT_ROLE_SN = pjrr.PJT_ROLE_SN
                                INNER JOIN TB_CMMN_CD tcc ON tcc.CMMN_CD_TYPE = 'REQ_STTS' AND tcc.CMMN_CD = req.REQ_STTS
                                WHERE usr.USER_SN = ${userSn}
                                GROUP BY req.REQ_SN;`;
    return await db.query(query, {type: QueryTypes.SELECT});
}

const projectRequestList = async(pjtSn) => {
    const query = `SELECT req.REQ_SN, pf.PF_SN, usr.USER_SN, usr.USER_IMG, usr.USER_NM, pf.PF_INTRO,
                                pjrr.PART, req.REQ_STTS, tcc.CMMN_CD_VAL AS REQ_STTS_VAL
                                FROM TB_PJT pj
                                LEFT JOIN TB_REQ req ON pj.PJT_SN = req.PJT_SN
                                LEFT JOIN TB_USER usr ON req.USER_SN = usr.USER_SN
                                LEFT JOIN TB_PF pf ON req.USER_SN = pf.USER_SN
                                LEFT JOIN TB_PJT_ROLE pjr ON req.PJT_SN = pjr.PJT_SN
                                LEFT JOIN TB_PJT_ROLE pjrr ON req.PJT_ROLE_SN = pjrr.PJT_ROLE_SN
                                INNER JOIN TB_CMMN_CD tcc ON tcc.CMMN_CD_TYPE = 'REQ_STTS' AND tcc.CMMN_CD = req.REQ_STTS
                                WHERE pj.PJT_SN = ${pjtSn}
                                GROUP BY req.REQ_SN;`
    return await db.query(query, {type: QueryTypes.SELECT});
}

const myReqList = async(user) => {
    return await db.TB_REQ.findAll({
        where: {USER_SN: user},
        attributes: [
            ['REQ_SN', 'reqSn'],
            [db.Sequelize.col('tp.PJT_SN'), 'pjtSn'],
            [db.Sequelize.col('tp.PJT_IMG'), 'pjtImg'],
            [db.Sequelize.col('tp.PJT_NM'), 'pjtNm'],
            [db.Sequelize.col('tp.PJT_STTS'), 'PJT_STTS'],
            [db.Sequelize.fn('SUM', db.Sequelize.col('tp.tpr.TOTAL_CNT')), 'TO'],
            [db.Sequelize.col('tpr.PART'), 'part'],
            ['REQ_STTS', 'reqStts']
        ],
        include: [
            {
                model: db.TB_PJT,
                as: 'tp',
                attributes: [],
                where: {PJT_STTS: 'RECRUIT'},
                include: [
                    {
                        model: db.TB_PJT_ROLE,
                        as: 'tpr',
                        attributes: [],
                    }
                ]
            },{
                model: db.TB_PJT_ROLE,
                as: 'tpr',
                attributes: [],
                where: {}
            },
        ],
        group: ['REQ_SN'],
    });
}

const projectReqList = async(user) => {
    return await db.TB_PJT.findAll({
        where: { CREATED_USER_SN: user, PJT_STTS: 'RECRUIT' },
        attributes: [
            ['PJT_SN', 'pjtSn'],
            ['PJT_NM', 'pjtNm'],
            ['PJT_OPEN_YN', 'pjtOpenYn']
        ],
        include: [
            {
                model: db.TB_REQ,
                as: 'tr',
                attributes: [
                    ['REQ_SN', 'reqSn'],
                    ['REQ_STTS','reqStts'],
                ],
                include: [
                    {
                        model: db.TB_USER,
                        as: 'tu',
                        attributes: [
                            ['USER_SN', 'userSn'],
                            ['USER_NM', 'userNm'],
                            ['USER_IMG', 'userImg']
                        ],
                    },
                    {
                        model: db.TB_PJT_ROLE,
                        as: 'tpr',
                        attributes: [['PART','part']]
                    }
                ],
            }
        ],
    });
}

const updateProjectStatus = async (pjtSn, status, transaction) => {
    return await db.TB_PJT.update({PJT_STTS: status}, {where: {PJT_SN: pjtSn}, transaction});
}
module.exports = {
    myRequestList,
    findRequest,
    findProjectRole,
    findAllProjectRole,
    createRequest,
    findReqMem,
    updateRequest,
    projectRequestList,
    myReqList,
    projectReqList,
    updateProjectStatus
};
