const db = require('../../config/db/db');
const {logger} = require('../../utils/logger');
const { QueryTypes } = require("sequelize");

class projectService{
    async myProjects(req, res){
        const userSn = req.userSn.USER_SN;
        const query = `SELECT pj.PJT_SN, pj.PJT_NM, pj.PJT_INTRO, pj.START_DT, pj.PERIOD, pj.CREATED_USER_SN, pj.PJT_STTS
                                FROM TB_USER usr 
                                LEFT JOIN TB_PJT_M pjm ON usr.USER_SN = pjm.USER_SN AND pjm.DEL_YN = FALSE
                                LEFT JOIN TB_PJT pj ON pjm.PJT_SN = pj.PJT_SN AND pj.DEL_YN = FALSE
                                WHERE usr.USER_SN = ${userSn}
                                GROUP BY pj.PJT_SN;`;
        try{
            const pjtLists = await db.query(query, {type: QueryTypes.SELECT});
            return res.status(200).send(pjtLists);
        }
        catch (error) {
            throw error;
        }
    }
}

module.exports = new projectService();