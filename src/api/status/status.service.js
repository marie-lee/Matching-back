const db = require('../../config/db/db');
const {logger} = require('../../utils/logger');
const {QueryTypes} = require("sequelize");
const {throwError} = require("../../utils/errors");
const {getProjectIntro} = require("../projects/project.service");
const {oneCmmnVal} = require("../common/common.service");
const {error} = require("winston");
const profileService = require("../profile/profile.service");

class statusService {
  async status(req, res) {
    let jsonData = {
      myReqList: [],
      projectReqList: []
    };
    try {
      jsonData.myReqList = await this.myReqList(req.userSn.USER_SN);
      const myProjects = await db.TB_PJT.findAll({where: {CREATED_USER_SN: req.userSn.USER_SN}});
      for (const project of myProjects) {
        const projectReq = await this.projectReqList(project);
        jsonData.projectReqList.push(projectReq);
      }

      return res.status(200).send(jsonData);
    } catch (error) {
      throw error;
    }
  }


  async myStatus(req, res) {
    try {
      const statusList = await db.TB_REQ.findAll({
        where: {USER_SN: req.userSn.USER_SN, DEL_YN: false},
        attributes: [
          ['REQ_SN', 'reqSn'],
          [db.Sequelize.col('tp.PJT_SN'), 'pjtSn'],
          [db.Sequelize.col('tp.PJT_IMG'), 'pjtImg'],
          [db.Sequelize.col('tp.PJT_NM'), 'pjtNm'],
          [db.Sequelize.fn('SUM', db.Sequelize.col('tp.tpr.TOTAL_CNT')), 'TO'],
          [db.Sequelize.col('tpr.PART'), 'part'],
          ['REQ_STTS', 'reqStts']

        ],
        include: [
          {
            model: db.TB_PJT,
            as: 'tp',
            attributes: [],
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
      for (const status of statusList){
        const stts = await oneCmmnVal('REQ_STTS', status.dataValues.reqStts);
        const {reqStts, ...rest} = status.dataValues;
        status.dataValues = {
          ...rest,
          reqSttsCd: reqStts,
          reqStts: stts.dataValues.CMMN_CD_VAL
        }
      }
      return statusList;
    } catch (error) {
      throw error;
    }
  }
  async projectStatus(req, res) {
    try{
      const statusList = await db.TB_PJT.findAll({
        where: { CREATED_USER_SN: req.userSn.USER_SN },
        attributes: [
          ['PJT_SN', 'pjtSn'],
          ['PJT_NM', 'pjtNm'],
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

      const result = statusList.map(pjt => ({
        pjtSn: pjt.dataValues.pjtSn,
        pjtNm: pjt.dataValues.pjtNm,
        reqList: pjt.tr.map(req => ({
          reqSn: req.dataValues.reqSn,
          userSn: req.tu.dataValues.userSn,
          userNm: req.tu.dataValues.userNm,
          userImg: req.tu.dataValues.userImg,
          part: req.tpr.dataValues.part,
          reqStts: req.dataValues.reqStts,
        })),
      }));
      for (const pjt of result) {
        for (let status of pjt.reqList) {
          const stts = await oneCmmnVal('REQ_STTS', status.reqStts);
          status.reqSttsCd = status.reqStts;
          status.reqStts = stts.dataValues.CMMN_CD_VAL;
        }
      }
      return result;
    }catch (error){
      throw error;
    }
  }

  async reqProject(req, res) {
    const userSn = req.userSn.USER_SN;
    const pjtSn = req.params.pjtSn;
    try {
      const req = await db.TB_REQ.findOne({
        where: {PJT_SN: pjtSn, USER_SN: userSn, DEL_YN: false}
      });
      if(!req){throwError('해당 프로젝트 참여요청 내역이 없습니다.');}
      const pjt = await getProjectIntro(pjtSn);
      if(!pjt){throwError('프로젝트가 존재하지 않거나 권한이 없습니다.')}
      return pjt;
    } catch (error) {
      logger.error(error.message);
      throw error;
    }
  }
  async myData(req,res){
    const userSn = req.params.userSn;
    const pjtSn = req.params.pjtSn;
    try{
      const mem = await db.TB_REQ.findOne({
        where: {PJT_SN: pjtSn, USER_SN:userSn, DEL_YN:false}
      })
      if(!mem) {throwError('프로젝트 참여요청 내역이 없습니다.')}
      return await profileService.pfPfolSelect(userSn, res);
    } catch (error){
      throw error
    }

  }

  async reqUser(req, res) {
    const transaction = await db.transaction();
    try {
      const reqData = {
        PJT_SN: req.params.pjtSn,
        USER_SN: req.body.userSn,
        PJT_ROLE_SN: req.body.pjtRoleSn,
        REQ_STTS: 'REQ'
      };
      // 필수 필드 확인
      const requiredFields = {
        PJT_SN: '프로젝트가 선택되지 않았습니다.',
        USER_SN: '회원 정보가 없습니다.',
        PJT_ROLE_SN: '프로젝트 파트 일련번호가 없습니다.',
      }
      for (const [field, message] of Object.entries(requiredFields)) {
        if (!reqData[field]) {
          throwError(message);
        }
      }
      let reqMem = await db.TB_REQ.findOne({where: {PJT_SN: reqData.PJT_SN, USER_SN: reqData.USER_SN}});
      if (reqMem) {
        throwError('이미 요청된 회원입니다.');
      }
      let pr = await db.TB_PJT_ROLE.findOne({where: {PJT_SN: reqData.PJT_SN, PJT_ROLE_SN: reqData.PJT_ROLE_SN}});
      if (!pr) {
        throwError('없는 프로젝트 파트입니다.');
      }
      if (pr.TOTAL_CNT === pr.CNT) {
        throwError('파트 인원이 모두 찼습니다.')
      }

      await db.TB_REQ.create(reqData, {transaction});
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      logger.error('프로젝트 참여 요청 중 에러 발생: ', error.message);
      throw error;
    }
  }

  async updateReq(req, res) {
    const transaction = await db.transaction();
    const pjtSn = req.params.pjtSn;
    const reqSn = req.params.reqSn;
    const reqStts = req.body.reqStts;
    try {

      let pjt = await db.TB_PJT.findOne({where: {PJT_SN: pjtSn, CREATED_USER_SN: req.userSn.USER_SN}, transaction});
      if (!pjt) {
        throwError('프로젝트에 대한 권한이 없습니다.')
      }
      let reqMem = await db.TB_REQ.findOne({where: {PJT_SN: pjtSn, REQ_SN: reqSn, DEL_YN: false}, transaction});
      if (!reqMem) {
        throwError('수정할 회원이 없습니다.');
      }
      let pr = await db.TB_PJT_ROLE.findOne({where: {PJT_ROLE_SN: reqMem.PJT_ROLE_SN}, transaction});
      if (pr.TOTAL_CNT === pr.CNT) {
        throwError('파트 인원이 모두 찼습니다.')
      }
      let mem = await db.TB_PJT_M.findOne({
        where: {
          PJT_SN: pjtSn,
          USER_SN: reqMem.USER_SN,
          PJT_ROLE_SN: reqMem.PJT_ROLE_SN
        }, transaction
      });
      if (mem) {
        throwError('이미 프로젝트에 참가 중 입니다.')
      }

      if (reqStts === 'CONFIRM' || reqStts === 'CANCEL' || reqStts === 'REJECT') {
        reqMem.FINISHIED_DT = new Date();
        reqMem.DEL_YN = true;
      }
      reqMem.REQ_STTS = reqStts;
      await reqMem.save(transaction);

      if (reqMem.REQ_STTS === 'CONFIRM') {
        await pr.increment('CNT', {by: 1, transaction});
        const pm = {PJT_SN: reqMem.PJT_SN, USER_SN: reqMem.USER_SN, PJT_ROLE_SN: reqMem.PJT_ROLE_SN};
        await db.TB_PJT_M.create(pm, {transaction});
      }
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      logger.error(error.message);
      throw error;
    }
  }

  async projectReqList(pjt) {
    let REQ = {};
    const query = `SELECT req.REQ_SN, pf.PF_SN, usr.USER_SN, usr.USER_IMG, usr.USER_NM, pf.PF_INTRO,
                                pjrr.PART, req.REQ_STTS
                                FROM TB_PJT pj
                                LEFT JOIN TB_REQ req ON pj.PJT_SN = req.PJT_SN
                                LEFT JOIN TB_USER usr ON req.USER_SN = usr.USER_SN
                                LEFT JOIN TB_PF pf ON req.USER_SN = pf.USER_SN
                                LEFT JOIN TB_PJT_ROLE pjr ON req.PJT_SN = pjr.PJT_SN
                                LEFT JOIN TB_PJT_ROLE pjrr ON req.PJT_ROLE_SN = pjrr.PJT_ROLE_SN
                                WHERE pj.PJT_SN = ${pjt.PJT_SN}
                                GROUP BY req.REQ_SN;`
    try {
      REQ.PJT_SN = pjt.PJT_SN;
      REQ.PJT_NM = pjt.PJT_NM;
      REQ.REQ_LIST = await db.query(query, {type: QueryTypes.SELECT});
      return REQ;
    } catch (error) {
      throw error;
    }
  }

  async myReqList(userSn) {
    const query = `SELECT req.REQ_SN, pj.PJT_SN, pj.PJT_IMG, pj.PJT_NM,
                                SUM(pjr.TOTAL_CNT) AS TOTAL_CNT,
                                pjrr.PART, req.REQ_STTS
                                FROM TB_USER usr
                                LEFT JOIN TB_REQ req ON usr.USER_SN = req.USER_SN AND req.DEL_YN = FALSE
                                LEFT JOIN TB_PJT pj ON req.PJT_SN = pj.PJT_SN AND pj.DEL_YN = FALSE
                                LEFT JOIN TB_PJT_ROLE pjr ON pj.PJT_SN = pjr.PJT_SN
                                LEFT JOIN TB_PJT_ROLE pjrr ON req.PJT_ROLE_SN = pjrr.PJT_ROLE_SN
                                WHERE usr.USER_SN = ${userSn}
                                GROUP BY req.REQ_SN;`;
    try {
      return await db.query(query, {type: QueryTypes.SELECT});
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new statusService();