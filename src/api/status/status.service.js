const db = require('../../config/db/db');
const {logger} = require('../../utils/logger');
const { QueryTypes } = require("sequelize");

class statusService{
    async status(req, res){
        let jsonData = {
            myReqList: [],
            projectReqList: []
        };
        try{
            jsonData.myReqList = await this.myReqList(req.userSn.USER_SN);
            const myProjects = await db.TB_PJT.findAll({where:{CREATED_USER_SN: req.userSn.USER_SN}});
            for(const project of myProjects){
                const projectReq = await this.projectReqList(project);
                jsonData.projectReqList.push(projectReq);
            }

            return res.status(200).send(jsonData);
        }
        catch (error) {
            throw error;
        }
    }

    async projectReqList(pjt){
        let REQ = {};
        const query = `SELECT req.REQ_SN, pf.PF_SN, usr.USER_IMG, usr.USER_NM, pf.PF_INTRO,
                                pjrr.PART, req.REQ_STTS
                                FROM TB_PJT pj
                                LEFT JOIN TB_REQ req ON pj.PJT_SN = req.PJT_SN
                                LEFT JOIN TB_USER usr ON req.USER_SN = usr.USER_SN
                                LEFT JOIN TB_PF pf ON req.USER_SN = pf.USER_SN
                                LEFT JOIN TB_PJT_ROLE pjr ON req.PJT_SN = pjr.PJT_SN
                                LEFT JOIN TB_PJT_ROLE pjrr ON req.PJT_ROLE_SN = pjrr.PJT_ROLE_SN
                                WHERE pj.PJT_SN = ${pjt.PJT_SN}
                                GROUP BY req.REQ_SN;`
        try{
            REQ.PJT_SN = pjt.PJT_SN;
            REQ.PJT_NM = pjt.PJT_NM;
            REQ.REQ_LIST = await db.query(query, {type: QueryTypes.SELECT});
            return REQ;
        }
        catch (error) {
            throw error;
        }
    }

    async myReqList(userSn){
        const query = `SELECT req.REQ_SN, pj.PJT_SN, pj.PJT_IMG, pj.PJT_NM,
                                SUM(pjr.TOTAL_CNT) AS TOTAL_CNT,
                                pjrr.PART, req.REQ_STTS
                                FROM TB_USER usr
                                LEFT JOIN TB_REQ req ON usr.USER_SN = req.USER_SN AND req.DEL_YN = FALSE
                                LEFT JOIN TB_PJT pj ON req.PJT_SN = pj.PJT_SN AND pj.DEL_YN = FALSE
                                LEFT JOIN TB_PJT_ROLE pjr ON pj.PJT_SN = pjr.PJT_SN
                                LEFT JOIN TB_PJT_ROLE pjrr ON req.PJT_ROLE_SN = pjrr.PJT_ROLE_SN
                                WHERE usr.USER_SN = 1
                                GROUP BY req.REQ_SN;`;
        try{
            return await db.query(query, {type: QueryTypes.SELECT});
        }catch (error) {
            throw error;
        }
    }
}
module.exports = new statusService();