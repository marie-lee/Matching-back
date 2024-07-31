const db = require('../../config/db/db');
const {QueryTypes} = require("sequelize");

const findRequest = async(pjtSn, userSn)=> {
    return await db.TB_REQ.findOne({ where: { PJT_SN: pjtSn, USER_SN: userSn } });
}

const findProjectRole = async (pjtSn, pjtRoleSn) => {
    return await db.TB_PJT_ROLE.findOne({ where: { PJT_SN: pjtSn, PJT_ROLE_SN: pjtRoleSn } });
}

const createRequest = async (reqData, transaction) => {
    return await db.TB_REQ.create(reqData, { transaction });
}

const findReqMem = async(pjtSn, reqSn, userSn)=>{
    return await db.TB_REQ.findOne({where: {PJT_SN: pjtSn, REQ_SN: reqSn, USER_SN: userSn, DEL_YN: false}});
}

const updateRequest = async (reqMem, transaction) => {
    return await reqMem.save({ transaction });
};

const myRequestList = async(userSn) => {
    const query = `SELECT req.REQ_SN, pj.PJT_SN, pj.PJT_IMG, pj.PJT_NM,
                                SUM(pjr.TOTAL_CNT) AS TOTAL_CNT,
                                pjrr.PART, req.REQ_STTS, tcc.CMMN_CD_VAL AS REQ_STTS_VAL
                                FROM TB_USER usr
                                LEFT JOIN TB_REQ req ON usr.USER_SN = req.USER_SN AND req.DEL_YN = FALSE
                                LEFT JOIN TB_PJT pj ON req.PJT_SN = pj.PJT_SN AND pj.DEL_YN = FALSE
                                LEFT JOIN TB_PJT_ROLE pjr ON pj.PJT_SN = pjr.PJT_SN
                                LEFT JOIN TB_PJT_ROLE pjrr ON req.PJT_ROLE_SN = pjrr.PJT_ROLE_SN
                                INNER JOIN TB_CMMN_CD tcc ON tcc.CMMN_CD_TYPE = 'REQ_STTS' AND tcc.CMMN_CD = req.REQ_STTS
                                WHERE usr.USER_SN = ${userSn}
                                GROUP BY req.REQ_SN;`;
    return await db.query(query, {type: QueryTypes.SELECT});
}

const projectReqList = async(pjtSn) => {
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

module.exports = {
    myRequestList,
    findRequest,
    findProjectRole,
    createRequest,
    findReqMem,
    updateRequest,
    projectReqList,
};