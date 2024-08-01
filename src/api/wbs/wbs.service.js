const db = require('../../config/db/db');
const {logger} = require('../../utils/logger');
const {QueryTypes} = require("sequelize");
const {throwError} = require("../../utils/errors");
const {formatDt} = require("../common/common.service");
const oneCmmnVal = require("../common/common.repository");
const wbsRepository = require("./wbs.repository");
const { ProjectDto, MemberDto} = require("./dto/wbs.create.dto");
const {WbsDto, WbsTicketDto} = require("./dto/wbs.dto");

class WbsService {

    // wbs 생성
    async createWbs(userSn, pjtSn, pjtData){
        const t = await wbsRepository.beginTransaction();

        try {
            const existingWbs = await wbsRepository.findWbs(pjtSn);
            if (existingWbs) {
                throw new Error('WBS가 존재합니다.');
            }

            // 시작일 종료일 설정
            await wbsRepository.updateProjectDates(pjtSn, pjtData, t);

            // 멤버 권한, 담당 설정
            for (const member of pjtData.members) {
                await wbsRepository.updateProjectMembers(pjtSn, member, t);
            }

            // WBS 생성
            let depth1Count = 1;
            for (const depth1 of pjtData.wbsData) {
                const depth1Data = await wbsRepository.createWbs(
                    { PJT_SN: pjtSn, TICKET_NAME: depth1.name, ORDER_NUM: depth1Count },
                    t
                );

                let depth2Count = 1;
                if (depth1.child && Array.isArray(depth1.child)) {
                    for (const depth2 of depth1.child) {
                        await wbsRepository.insertWbs(depth2, pjtSn, depth1Data.TICKET_SN, depth2Count, t);
                        depth2Count++;
                    }
                }
                depth1Count++;
            }


            await wbsRepository.commitTransaction(t);
            return true;
        } catch (e) {
            await wbsRepository.rollbackTransaction(t);
            logger.error('WBS 생성 중 오류 발생:', e);
            throw e;
        }
    }

    // wbs 정보 추가
    async createWbsInfo(userSn, pjtSn){
        try {
            const pjt = await wbsRepository.findProjectBySn(pjtSn);
            if (userSn !== pjt.CREATED_USER_SN) {
                return {message : '프로젝트 생성자가 아닙니다.'}
            }

            const pjtData = {
                startDt: pjt.START_DT,
                endDt: pjt.END_DT
            };

            const members = await wbsRepository.findProjectMembers(pjtSn);
            let memberData = [];

            for (const member of members) {
                const user = await wbsRepository.findUserBySn(member.USER_SN);
                const part = await wbsRepository.findPartByRoleSn(member.PJT_ROLE_SN);
                const userData = {
                    USER_IMG: user.USER_IMG,
                    USER_SN: user.USER_SN,
                    USER_NM: user.USER_NM,
                    PART: part.PART
                };
                memberData.push(new MemberDto(userData));
            }

            return new ProjectDto({ startDt: pjtData.startDt, endDt: pjtData.endDt, members: memberData });
        } catch (error) {
            logger.error('WBS 정보 생성 중 오류 발생:', error);
            throw error;
        }
    }


// WBS 수정
    async editWbs(userSn, pjtSn, data){
        const t = await wbsRepository.beginTransaction();
        try {
            const existingWbs = await wbsRepository.findWbs(pjtSn);
            if (!existingWbs) {
                return { message: 'WBS가 존재하지 않습니다.'}
            }

            // 템플릿 데이터 입력
            await wbsRepository.updateWbsTemplate(pjtSn, userSn, data[0].templateData, t);

            await wbsRepository.commitTransaction(t);
            return true;
        } catch (e) {
            await wbsRepository.rollbackTransaction(t);
            logger.error('WBS 수정 중 오류 발생 error: ', e);
            throw e;
        }
    };

    // WBS 조회
    async getWbs(userSn, pjtSn){
        try {
            const member = await wbsRepository.findProjectMember(userSn, pjtSn);
            if (!member) {
                return {message : '프로젝트 참여 멤버가 아닙니다.'};
            }

            const depth1Data = await wbsRepository.findDepth1Data(pjtSn);
            const depth1Array = await this.buildWbsHierarchy(depth1Data, pjtSn);

            return new WbsDto(depth1Array);

        } catch (error) {
            logger.error('wbs 조회 중 오류 발생:', error.message);
            throw error;
        }
    };

    async buildWbsHierarchy(depthData, pjtSn){
        const depthArray = [];
        for (const depth of depthData) {
            const childData = await wbsRepository.findChildData(pjtSn, depth.TICKET_SN);
            const childArray = await this.buildWbsHierarchy(childData, pjtSn);
            const user = depth.WORKER ? await wbsRepository.findUserBySn(depth.WORKER) : null;
            const data = user ? {
                WORKER: depth.WORKER,
                WORKER_NM: user.USER_NM,
                START_DT: depth.START_DT,
                END_DT: depth.END_DT,
                STATUS: depth.STATUS
            } : null;

            const object = new WbsTicketDto(depth.TICKET_SN, depth.TICKET_NAME, depth.ORDER_NUM, depth.PARENT_SN, data, childArray);

            depthArray.push(object);
        }
        return depthArray;
    };

    // wbs템플릿 조회
    async getWbsTemplate(template) {
        try {
            // const template = await getWbsTemplate(pjtSn);
            const template = {
                "basic2depth": {
                    name: "기본 2 Depth"
                },
                "basic3depth": {
                    name: "기본 3 Depth"
                },
                "planning": {
                    name: "기획팀 템플릿"
                },
                "design": {
                    name: "디자인 템플릿"
                },
                "development": {
                    name: "개발팀 템플릿"
                },
                "backend": {
                    name: "개발팀 템플릿 (웹 백엔드)"
                },
                "frontend": {
                    name: "개발팀 템플릿 (웹 프론트엔드)"
                }
            }
            return template;
            //return template.TEMPLATE_DATA ? JSON.parse(template.TEMPLATE_DATA) : null;
        } catch (error) {
            logger.error('WBS 템플릿 조회 중 오류 발생: ', error.message);
            throw error;
        }
    }
}



module.exports = new WbsService();