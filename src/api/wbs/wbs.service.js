const {logger} = require('../../utils/logger');
const db = require('../../config/db/db');
const {formatDt, sortTasks} = require("../common/common.service");
const cmmnRepository = require("../common/common.repository");
const alarmService = require("../alarm/alarm.service");
const wbsRepository = require("./wbs.repository");
const userRepository = require("../member/member.repository");
const { ProjectDto, MemberDto} = require("./dto/wbs.create.dto");
const {WbsDto, WbsTicketDto} = require("./dto/wbs.dto");
const projectRepository = require("../project/project.repository");
const alarm = require("../../utils/alarm");

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
                    { PJT_SN: pjtSn, TICKET_NAME: depth1.name, ORDER_NUM: depth1Count, CREATER_SN: userSn },
                    t
                );

                let depth2Count = 1;
                if (depth1.child && Array.isArray(depth1.child)) {
                    for (const depth2 of depth1.child) {
                        await wbsRepository.insertWbs(depth2, pjtSn, userSn, depth1Data.TICKET_SN, depth2Count, t);
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
            if(!pjt){
                return {message : '프로젝트가 존재하지 않습니다.'}
            }
            const memList = await projectRepository.findProjectMembers(userSn, pjtSn);
            // if (!memList || memList.length === 0) {
            //     return {message: '프로젝트 멤버가 존재하지 않습니다.'};
            // }
            const pjtData = {
                startDt: pjt.START_DT,
                endDt: pjt.END_DT
            };
            if (userSn !== pjt.CREATED_USER_SN) {
                pjtData.type = 'member'
            } else pjtData.type = 'leader'

            const members = await wbsRepository.findProjectMembers(pjtSn);
            let memberData = [];

            for (const member of members) {
                const user = await wbsRepository.findUserBySn(member.USER_SN);
                const part = await wbsRepository.findPartByRoleSn(member.PJT_ROLE_SN);
                const userData = {
                    userImg: user.USER_IMG,
                    userSn: user.USER_SN,
                    userNm: user.USER_NM,
                    part: part.PART,
                    role: member.ROLE
                };

                memberData.push(new MemberDto(userData));
            }

            return new ProjectDto({ type: pjtData.type, startDt: pjtData.startDt, endDt: pjtData.endDt, members: memberData });
        } catch (error) {
            logger.error('WBS 정보 생성 중 오류 발생:', error);
            throw error;
        }
    }


    // WBS 수정
    async editWbs(userSn, pjtSn, pjtData){
        const t = await wbsRepository.beginTransaction();
        try {
            const existingWbs = await wbsRepository.findWbs(pjtSn);
            if (!existingWbs) {
                return {
                    status: 404,
                    message: 'WBS가 존재하지 않습니다.'
                }
            }

            const userRole = await projectRepository.findProjectMember(pjtSn, userSn);
            /*if(userRole.ROLE !== 'owner'){
                return {
                    status: 403,
                    message: 'WBS 수정 권한이 없습니다.'
                }
            }*/

            // 시작일 종료일 설정
            if(pjtData.startDt || pjtData.endDt) {
                await wbsRepository.updateProjectDates(pjtSn, pjtData, t);
            }

            // 멤버 권한, 담당 설정
            if(pjtData.members){
                for (const member of pjtData.members) {
                    await wbsRepository.updateProjectMembers(pjtSn, member, t);
                }
            }

            // WBS 수정
            let depth1Count = 1;
            for (const depth1 of pjtData.wbsData) {
                if(depth1.ticketSn){
                    await wbsRepository.updateWbs(depth1, pjtSn, userSn, null, depth1Count, t);
                }
                else await wbsRepository.updateWbsNew(depth1, pjtSn, userSn, null, depth1Count, t);
                depth1Count++;
            }

            await wbsRepository.commitTransaction(t);
            return true;
        } catch (e) {
            await wbsRepository.rollbackTransaction(t);
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
            const status = depth.STATUS ? await cmmnRepository.oneCmmnVal('TICKET_STTS', depth.STATUS) : null;
            const data = status ? {
                worker: depth.WORKER,
                workerNm: user ? user.USER_NM : null,
                startDt: depth.START_DT,
                endDt: depth.END_DT,
                status: status.CMMN_CD_VAL
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

    async createIssue(issueDto){
        const transaction = await db.transaction()
        const { MENTIONS, ...createIssueData } = issueDto;
        try {
            const user = await projectRepository.findProjectMember(createIssueData.PJT_SN, createIssueData.PRESENT_SN);
            if (!user) return {message: '조회 권한이 없습니다.'}
            const pjt = await projectRepository.getProjectById(createIssueData.PJT_SN);
            if (!pjt) return {message: '프로젝트를 찾을 수 없습니다.'};
            const ticket = await wbsRepository.findTicket(createIssueData.TICKET_SN, createIssueData.PJT_SN);
            if(!ticket) return {message : '티켓에 대한 정보가 없습니다.'};

            if(createIssueData.PRIORITY){
                const priority = await cmmnRepository.oneCmmnCd('ISSUE_PRRT', createIssueData.PRIORITY);
                createIssueData.PRIORITY = priority.CMMN_CD;
            }

            const issueCnt = await wbsRepository.findIssueCnt(issueDto.PJT_SN);
            const issue = await wbsRepository.createIssue(createIssueData, issueCnt, transaction);

            if(MENTIONS){
                for (const mention of MENTIONS) {
                    const mem = await projectRepository.findProjectMember(createIssueData.PJT_SN, mention)
                    if(!mem) return {message: '멘션할 수 없는 회원입니다. ', targetSn: mention}
                    const mentionData = {
                        TARGET_SN: mention,
                        CREATER_SN: createIssueData.PRESENT_SN,
                        ISSUE_SN: issue.ISSUE_SN,
                    }
                    if(user.USER_SN !== mem.USER_SN){
                        await wbsRepository.addMentionFromIssue(mentionData, transaction);
                        await alarmService.createMentionAlarm(mem.USER_SN, user.USER_SN, 'issueMention', pjt, issue, 'issue', transaction);
                        alarm.notifyMention('issue', mem.USER_SN, {
                            senderSn: user.USER_SN,
                            senderNm: user.USER_NM,
                            title: issue.ISSUE_NM,
                            pjtSn: pjt.PJT_SN,
                            postSn: issue.ISSUE_SN,
                            postType: 'issue'
                        });
                    }
                }
            }

            await transaction.commit()
            return issue
        } catch (error){
            await transaction.rollback()
            throw error
        }
    }

    // 이슈 수정
    async updateIssue(issueDto){
        const transaction = await db.transaction()
        try {
            const {
                PJT_SN, USER_SN, ISSUE_SN, updateIssueData
            } = issueDto
            const user = await projectRepository.findProjectMember(PJT_SN, USER_SN);
            if (!user) return {message: '조회 권한이 없습니다.'}
            const pjt = await projectRepository.getProjectById(PJT_SN);
            if (!pjt) return {message: '프로젝트를 찾을 수 없습니다.'};
            const issue = await wbsRepository.findIssue(ISSUE_SN, PJT_SN);
            if(!issue) return {message : '이슈에 대한 정보가 없습니다.'};

            if(updateIssueData.PRIORITY){
                const priority = await cmmnRepository.oneCmmnCd('ISSUE_PRRT', updateIssueData.PRIORITY);
                issue.PRIORITY = priority.CMMN_CD;
            }
            if(updateIssueData.STATUS){
                const status = await cmmnRepository.oneCmmnCd('ISSUE_STTS', updateIssueData.STATUS);
                issue.STATUS = status.CMMN_CD;
            }
            const update = await wbsRepository.updateIssue(issue, transaction);

            if (updateIssueData.MENTIONS) {
                const {deleteMention, addMention} = updateIssueData.MENTIONS;
                if (deleteMention.length > 0) {
                    for (const target of deleteMention) {
                        const data = await wbsRepository.findMention(target, USER_SN, ISSUE_SN);
                        if(data) {
                            data.DEL_YN = true;
                            data.DELETED_DT = new Date();
                            await wbsRepository.deleteMentionFromIssue(data, transaction);
                        }
                    }
                }
                if (addMention.length > 0) {
                    for (const target of addMention) {
                        const mem = await projectRepository.findProjectMember(PJT_SN, target)
                        if(!mem) return {message: '멘션할 수 없는 회원입니다. ', targetSn: target}
                        const mentionData = {TARGET_SN: target, CREATER_SN: USER_SN, ISSUE_SN: ISSUE_SN}
                        await wbsRepository.addMentionFromIssue(mentionData, transaction);
                        if(user.USER_SN !== mem.USER_SN ){
                            await alarmService.createMentionAlarm(mem.USER_SN, user.USER_SN, 'issueMention', pjt, issue, 'issue', transaction);
                            alarm.notifyMention('issue', mem.USER_SN, {
                                senderSn: user.USER_SN,
                                senderNm: user.USER_NM,
                                title: issue.ISSUE_NM,
                                pjtSn: pjt.PJT_SN,
                                postSn: issue.ISSUE_SN,
                                postType: 'issue'
                            });
                        }
                    }
                }
            }
            await transaction.commit()
            return update
        } catch (error){
            await transaction.rollback()
            throw error
        }
    }

    async trackingTicket(pjtSn){
        try {
            const tracking =  await wbsRepository.trackingIssue(pjtSn);
            return tracking.map(ticket => ({
                ...ticket,
                ISSUE_CREATED_DT: formatDt(ticket.ISSUE_CREATED_DT),
                TICKETS: ticket.TICKETS.map(t => ({
                    ...t,
                    CREATED_DT: formatDt(t.CREATED_DT)
                }))
            }))
        } catch(error){
            throw  error;
        }
    }

    async issueDetail(pjtSn, userSn, issueSn){
        try {
            const mem = await projectRepository.findProjectMember(pjtSn, userSn);
            if (!mem) return {message: '조회 권한이 없습니다.'}
            const issue = await wbsRepository.findIssue(issueSn, pjtSn);
            if(!issue) return {message: '이슈를 찾을 수 없습니다.'}

            let issueDetail = await wbsRepository.issueDetail(issueSn, pjtSn);
            const mentionData = await wbsRepository.mentionData(issue.ISSUE_SN, pjtSn);
            const commentData = await wbsRepository.issueCommentData(issue.ISSUE_SN);
            const issuePart = await wbsRepository.findIssuePart(pjtSn, issue.TICKET_SN);

            const { CREATED_DT, ...restIssueDetail } = issueDetail = {...issueDetail ,CREATED_DT: formatDt(issueDetail.CREATED_DT)}
            commentData.map(c => ({
                ...c, CREATED_DT: formatDt(c.CREATED_DT),
            }))
            return {
                issueNum: issuePart ? issuePart.PART+'-i'+issue.ISSUE_CNT+'-'+issue.ISSUE_SN : 'ISSUE-i'+issue.ISSUE_CNT+'-'+issue.ISSUE_SN,
                ...issueDetail,
                MENTIONS:mentionData,
                COMMENTS: commentData.map(c => ({
                ...c, CREATED_DT: formatDt(c.CREATED_DT),
            }))
            }
        } catch (error) {
            throw error;
        }
    }

    async createComment(createCommentDto){
        const transaction =  await db.transaction();
        const { MENTIONS, ...COMMENT } = createCommentDto;
        try {
            const mem = await projectRepository.findProjectMember(COMMENT.PJT_SN, COMMENT.CREATER_SN);
            if (!mem) return {message: '조회 권한이 없습니다.'};
            const pjt = await projectRepository.getProjectById(COMMENT.PJT_SN);
            if (!pjt) return {message: '프로젝트를 찾을 수 없습니다.'};
            const issue = await wbsRepository.issueDetail(COMMENT.ISSUE_SN, COMMENT.PJT_SN);
            if (!issue) return {message: '이슈를 찾을 수 없습니다.'};
            const comment = await wbsRepository.createComment(COMMENT, transaction);

            for (const mention of MENTIONS) {
                const member = await projectRepository.findProjectMember(COMMENT.PJT_SN, mention)
                if(!member) return {message: '멘션할 수 없는 회원입니다. ', targetSn: mention}
                const mentionData = {
                    TARGET_SN: mention,
                    CREATER_SN: COMMENT.CREATER_SN,
                    ISSUE_SN: COMMENT.ISSUE_SN,
                    COMMENT_SN: comment.COMMENT_SN
                }
                const result = await wbsRepository.addMentionFromIssue(mentionData, transaction);
                // 멘션 알림
                if (mem.USER_SN !== member.USER_SN) {
                    await alarmService.createMentionAlarm(member.USER_SN, mem.USER_SN, 'commentMention', pjt, issue, 'issue', transaction);
                    alarm.notifyMention('issueComment', member.USER_SN, {
                        senderSn: mem.USER_SN,
                        senderNm: mem.USER_NM,
                        title: issue.ISSUE_NM,
                        pjtSn: pjt.PJT_SN,
                        postSn: issue.ISSUE_SN,
                        postType: 'issue'
                    });
                }
            }
            // 댓글 등록 알림
            if(mem.USER_SN !== issue.USER_SN){
                await alarmService.createCommentAlarm(issue.USER_SN, mem.USER_SN, pjt, issue, 'issue', transaction);
                alarm.notifyComment('issue', issue.USER_SN, {
                    senderSn: mem.USER_SN,
                    senderNm: mem.USER_NM,
                    title: issue.ISSUE_NM,
                    pjtSn: pjt.PJT_SN,
                    postSn: issue.ISSUE_SN,
                    postType: 'issue'
                });
            }
            await transaction.commit()
            return comment
        } catch (error) {
            await transaction.rollback()
            throw error;
        }
    }

    async createTaskComment(createTaskCommentDto){
    const transaction =  await db.transaction();
    const { MENTIONS, ...COMMENT } = createTaskCommentDto;
    try {
      const mem = await projectRepository.findProjectMember(COMMENT.PJT_SN, COMMENT.CREATER_SN);
      if (!mem) return {message: '조회 권한이 없습니다.'};
      const pjt = await projectRepository.getProjectById(COMMENT.PJT_SN);
      if (!pjt) return {message: '프로젝트를 찾을 수 없습니다.'};
      const task = await wbsRepository.findTicket(COMMENT.TICKET_SN, COMMENT.PJT_SN);
      if (!task) return {message: '업무를 찾을 수 없습니다.'};
      const comment = await wbsRepository.createTaskComment(COMMENT, transaction);

      for (const mention of MENTIONS) {
        const member = await projectRepository.findProjectMember(COMMENT.PJT_SN, mention)
        if(!member) return {message: '멘션할 수 없는 회원입니다. ', targetSn: mention}
        const mentionData = {
          TARGET_SN: mention,
          CREATER_SN: COMMENT.CREATER_SN,
          COMMENT_SN: comment.COMMENT_SN
        }
        const result = await wbsRepository.addMentionFromIssue(mentionData, transaction);
        // 멘션 알림
        if (mem.USER_SN !== member.USER_SN) {
          await alarmService.createMentionAlarm(member.USER_SN, mem.USER_SN, 'commentMention', pjt, task, 'ticket', transaction);
          alarm.notifyMention('ticketComment', member.USER_SN, {
            senderSn: mem.USER_SN,
            senderNm: mem.USER_NM,
            title: task.TICKET_NAME,
            pjtSn: pjt.PJT_SN,
            postSn: task.TICKET_SN,
            postType: 'task'
          });
        }
      }
        // 댓글 등록 알림
        if(mem.USER_SN !== task.WORKER){
            await alarmService.createCommentAlarm(task.WORKER, mem.USER_SN, pjt, task, 'ticket', transaction);
            alarm.notifyComment('ticket', task.WORKER, {
                senderSn: mem.USER_SN,
                senderNm: mem.USER_NM,
                title: task.TICKET_NAME,
                pjtSn: pjt.PJT_SN,
                postSn: task.TICKET_SN,
                postType: 'task'
            });
        }
      await transaction.commit()
      return comment
    } catch (error) {
      await transaction.rollback()
      throw error;
    }
  }

    async createTask(createTaskDto) {
        const transaction =  await db.transaction();
        try {
            const mem = await projectRepository.findProjectMember(createTaskDto.PJT_SN, createTaskDto.USER_SN);
            if (!mem) return {
                status: 404,
                message: '업무 등록 권한이 없습니다.'
            }
            let orderNum = await wbsRepository.findOrderNum(createTaskDto.taskData.PARENT_SN);
            if(orderNum.message) return orderNum;
            if(!orderNum) orderNum = 1;

            if(createTaskDto.taskData.PRIORITY){
                const priority = await cmmnRepository.oneCmmnCd('TICKET_PRRT', createTaskDto.taskData.PRIORITY);
                createTaskDto.taskData.PRIORITY = priority.CMMN_CD;
            }
            if(createTaskDto.taskData.LEVEL){
                const level = await cmmnRepository.oneCmmnCd('TICKET_LEVEL', createTaskDto.taskData.LEVEL);
                createTaskDto.taskData.LEVEL = level.CMMN_CD;
            }
            const task = await wbsRepository.createTask(createTaskDto.taskData, orderNum, transaction);
            await transaction.commit();
            return task;

        }catch (error){
            await transaction.rollback();
            throw error;
        }
    }

    async issuedCreateTask(issuedTaskCreateDto) {
        const transaction =  await db.transaction();
        try {
            const mem = await projectRepository.findProjectMember(issuedTaskCreateDto.PJT_SN, issuedTaskCreateDto.USER_SN);
            if (!mem) return {message: '업무 등록 권한이 없습니다.'}
            const issue = await wbsRepository.findIssue(issuedTaskCreateDto.ISSUE_SN, issuedTaskCreateDto.PJT_SN);
            if (!issue) return {message: '이슈가 존재하지 않습니다.'}
            issuedTaskCreateDto.taskData.ISSUE_TICKET_SN = issue.TICKET_SN;
            let orderNum = await wbsRepository.findOrderNum(issuedTaskCreateDto.taskData.PARENT_SN);
            if(!orderNum) orderNum = 1;
            if(issuedTaskCreateDto.taskData.PRIORITY){
                const priority = await cmmnRepository.oneCmmnCd('TICKET_PRRT', issuedTaskCreateDto.taskData.PRIORITY);
                issuedTaskCreateDto.taskData.PRIORITY = priority.CMMN_CD;
            }
            if(issuedTaskCreateDto.taskData.LEVEL){
                const level = await cmmnRepository.oneCmmnCd('TICKET_LEVEL', issuedTaskCreateDto.taskData.LEVEL);
                issuedTaskCreateDto.taskData.LEVEL = level.CMMN_CD;
            }
            const task = await wbsRepository.createTask(issuedTaskCreateDto.taskData, orderNum, transaction);
            await transaction.commit();
            return task;

        }catch (error){
            await transaction.rollback();
            throw error;
        }
    }

    async getDashboard(userSn, pjtSn){
        const today = new Date();
        const todayDate = today.setHours(0, 0, 0, 0);
        try{
            const mem = await projectRepository.findProjectMember(pjtSn, userSn);
            if (!mem) return {message: '프로젝트 멤버가 아닙니다.'}

            const result = {
                today: [],
                task: [],
                issue: []
            };
            const myTask = await wbsRepository.findMyTask(pjtSn, userSn);
            for(const task of myTask){
                const taskResult = {
                    ticketSn: task.TICKET_SN,
                    ticketNum: mem.PART+'-'+task.TICKET_SN,
                    priority: task.PRIORITY ? task.PRIORITY : null,
                    title: task.TICKET_NAME,
                    present: task.CREATER_NM,
                    dueDate: task.END_DT ? formatDt(task.END_DT) : null
                }
                if(taskResult.dueDate){
                    const endDt = new Date(task.END_DT);
                    if (endDt.setHours(0, 0, 0, 0) <= todayDate) {
                        result.today.push(taskResult);
                    }else {
                        result.task.push(taskResult);
                    }
                }
                else{
                    result.task.push(taskResult);
                }
            }

            const myIssue = await wbsRepository.findCreateIssue(pjtSn, userSn);
            for(const issue of myIssue){
                const [issuePriority, issuePresent, issuePart] = await Promise.all([
                    cmmnRepository.oneCmmnVal('ISSUE_PRRT', issue.PRIORITY),
                    projectRepository.findProjectMember(pjtSn, issue.PRESENT_SN),
                    wbsRepository.findIssuePart(pjtSn, issue.TICKET_SN)
                ]);
                const presentUser = await userRepository.findUser(issuePresent.USER_SN);

                const issueResult = {
                    issueSn: issue.ISSUE_SN,
                    issueNum: issuePart ? issuePart.PART + '-i' + issue.ISSUE_CNT + '-' + issue.ISSUE_SN : 'ISSUE-i' + issue.ISSUE_CNT + '-' + issue.ISSUE_SN,
                    priority: issuePriority ? issuePriority.CMMN_CD_VAL : null,
                    title: issue.ISSUE_NM,
                    present: presentUser.USER_NM,
                    dueDate: issue.END_DT ? formatDt(issue.END_DT) : null
                }
                result.issue.push(issueResult);
            }

            const myMention = await wbsRepository.findMentionByIssue(userSn);
            for(const mention of myMention){
                if(mention.ISSUE_SN){
                    const issue = await wbsRepository.findIssue(mention.ISSUE_SN, pjtSn);
                    if(issue){
                        const [issuePriority, issuePresent, issuePart] = await Promise.all([
                            cmmnRepository.oneCmmnVal('ISSUE_PRRT', issue.PRIORITY),
                            projectRepository.findProjectMember(pjtSn, issue.PRESENT_SN),
                            wbsRepository.findIssuePart(pjtSn, issue.TICKET_SN)
                        ]);
                        const presentUser = await userRepository.findUser(issuePresent.USER_SN);

                        const issueResult = {
                            issueSn: issue.ISSUE_SN,
                            issueNum: issuePart ? issuePart.PART + '-i' + issue.ISSUE_CNT + '-' + issue.ISSUE_SN : 'ISSUE-i' + issue.ISSUE_CNT + '-' + issue.ISSUE_SN,
                            priority: issuePriority ? issuePriority.CMMN_CD_VAL : null,
                            title: issue.ISSUE_NM,
                            present: presentUser.USER_NM,
                            dueDate: issue.END_DT ? formatDt(issue.END_DT) : null
                        }
                        // 중복 체크: result.issue 배열에 issueSn이 이미 존재하는지 확인
                        const exists = result.issue.find(existingIssue => existingIssue.issueSn === issueResult.issueSn);
                        if (!exists) {
                            result.issue.push(issueResult);
                        }
                    }
                }
            }
            if(result.today) sortTasks(result.today);
            if(result.task) sortTasks(result.task);
            if(result.issue) sortTasks(result.issue);

            return result;
        }
        catch (error) {
            throw error;
        }
    }

    async getTask(userSn, pjtSn, taskSn){
        try{
            const mem = await projectRepository.findProjectMember(pjtSn, userSn);
            if (!mem) return {
                status: 403,
                message: '프로젝트 멤버가 아닙니다.'
            };

            const task = await wbsRepository.findTicket(taskSn, pjtSn);
            if(!task) return {
                status: 404,
                message: '존재하지 않는 업무입니다.'
            };

            const [
                priority,
                level,
                presentUser,
                presentUserPart,
                status,
            ] = await Promise.all([
                cmmnRepository.oneCmmnVal('TICKET_PRRT', task.PRIORITY),
                cmmnRepository.oneCmmnVal('TICKET_LEVEL', task.LEVEL),
                userRepository.findUser(task.WORKER),
                projectRepository.findProjectMember(pjtSn, task.WORKER),
                cmmnRepository.oneCmmnVal('TICKET_STTS', task.STATUS)
            ]);
            const result = {
                taskNum: presentUserPart ? presentUserPart.PART+'-'+task.TICKET_SN : 'TASK-'+task.TICKET_SN,
                taskSn: task.TICKET_SN,
                workPackage: null,
                depth: null,
                title: task.TICKET_NAME,
                priority: priority ? priority.CMMN_CD_VAL : null,
                level: level ? level.CMMN_CD_VAL : null,
                userSn: presentUser.USER_SN,
                present: presentUser.USER_NM,
                startDt: task.START_DT ? formatDt(task.START_DT) : null,
                endDt: task.END_DT ? formatDt(task.END_DT) : null,
                status: status ? status.CMMN_CD_VAL : null,
                issues: [],
                COMMENTS: []
            }
            if(task.PARENT_SN){
                const depth2 = await wbsRepository.findTicket(task.PARENT_SN, pjtSn);
                result.depth = depth2.TICKET_NAME;
                if(depth2.PARENT_SN){
                    const depth1 = await wbsRepository.findTicket(depth2.PARENT_SN, pjtSn);
                    result.workPackage = depth1.TICKET_NAME;
                }
            }
            const issues = await wbsRepository.findIssuesByTicket(taskSn, pjtSn);
            const comments = await wbsRepository.taskCommentData(taskSn);
            if(issues){
                for(const issue of issues){
                    const issueCreater = await userRepository.findUser(issue.PRESENT_SN);
                    const issueResult = {
                        issueSn: issue.ISSUE_SN,
                        createDate: formatDt(issue.CREATED_DT),
                        issueTitle: issue.ISSUE_NM,
                        userSn: issueCreater.USER_SN,
                        creater: issueCreater.USER_NM
                    }
                    result.issues.push(issueResult);
                }
            }
            if(comments){
                    result.COMMENTS = comments.map(c => ({
                        ...c, CREATED_DT: formatDt(c.CREATED_DT),
                    }));
            }

            return result;
        }
        catch (error) {
            throw error;
        }
    }

    async editTaskDetail(userSn, pjtSn, taskSn, data){
        const transaction = await db.transaction();
        try {
            const mem = await projectRepository.findProjectMember(pjtSn, userSn);
            if (!mem) return {
                status: 403,
                message: '프로젝트 멤버가 아닙니다.'
            };

            const task = await wbsRepository.findTicket(taskSn, pjtSn);
            if(!task) return {
                status: 404,
                message: '존재하지 않는 업무입니다.'
            };

            const updateData = await Object.entries(data).reduce(async (accPromise, [key, value]) => {
                const acc = await accPromise; // 이전 결과를 기다림
                if (value !== null) {
                    if (key === 'PRIORITY') {
                        const priority = await cmmnRepository.oneCmmnCd('TICKET_PRRT', value);
                        acc[key] = priority.CMMN_CD;
                    } else if (key === 'LEVEL') {
                        const level = await cmmnRepository.oneCmmnCd('TICKET_LEVEL', value)
                        acc[key] = level.CMMN_CD;
                    } else if (key === 'STATUS') {
                        const status = await cmmnRepository.oneCmmnCd('TICKET_STTS', value);
                        if(value === 'COMPLETE' && task.CPLT_DT === null){
                            acc['CPLT_DT'] = new Date();
                        }
                        else if(value !== 'CLOSE' && value !== 'COMPLETE'){
                            acc['CPLT_DT'] = null;
                        }
                        acc[key] = status.CMMN_CD;
                    } else {
                        acc[key] = value; // null이 아닌 값만 추가
                    }
                }
                return acc;
            }, Promise.resolve({}));

            const result = await wbsRepository.updateTask(taskSn, pjtSn, updateData, transaction);
            await transaction.commit();
            return result;
        }
        catch (error){
            await transaction.rollback();
            throw error;
        }
    }

    async getInfoProject(userSn, pjtSn){
        try {
            const mem = await projectRepository.findProjectMember(pjtSn, userSn);
            if (!mem) return {
                status: 403,
                message: '프로젝트 멤버가 아닙니다.'
            };

            const depthList = await wbsRepository.findDepth1Data(pjtSn);
            if (!depthList) return {
                status: 404,
                message: 'WBS가 존재하지 않습니다.'
            }
            const projectMemList = await wbsRepository.findProjectMembers(pjtSn);

            const workPackage = [];
            const depth = [];
            const memberList = [];
            for(const depth1 of depthList){
                workPackage.push({
                    workPackageSn: depth1.TICKET_SN,
                    workPackageNm: depth1.TICKET_NAME
                });
                const child = await wbsRepository.findChildData(pjtSn, depth1.TICKET_SN);
                for(const depth2 of child){
                    depth.push({
                        depthSn: depth2.TICKET_SN,
                        depthNm: depth2.TICKET_NAME,
                        parentSn: depth2.PARENT_SN
                    });
                }
            }

            for(const member of projectMemList){
                const memberData = await userRepository.findUser(member.USER_SN);
                memberList.push({
                    userSn: memberData.USER_SN,
                    userNm: memberData.USER_NM,
                    part: member.PART
                });
            }
            return {
                workPackage,
                depth,
                memberList
            };
        }
        catch (error){
            throw error;
        }
    }

    async getWorkList(userSn, pjtSn){
        try {
            const mem = await projectRepository.findProjectMember(pjtSn, userSn);
            if (!mem) return {
                status: 403,
                message: '프로젝트 멤버가 아닙니다.'
            };

            const workData = await wbsRepository.findWorkList(pjtSn);
            if(!workData) return {
                status: 404,
                message: '등록된 업무가 없습니다.'
            };

            const workList = [];
            for (const work of workData){
                const presentUser = await projectRepository.findProjectMember(pjtSn, work.WORKER);
                const data = {
                    taskNum: presentUser ? presentUser.PART+'-'+work.TICKET_SN : 'TASK-'+work.TICKET_SN,
                    taskSn: work.TICKET_SN,
                    title: work.TICKET_NAME
                };
                workList.push(data);
            }
            return {workList:workList}
        }
        catch (error){
            throw error;
        }
    }

    async getWholeWbs(userSn, pjtSn){
        try {
            const member = await wbsRepository.findProjectMember(userSn, pjtSn);
            if (!member) {
                return {message : '프로젝트 참여 멤버가 아닙니다.'};
            }

            return await wbsRepository.findWholeWbs(pjtSn, userSn);

        } catch (error) {
            logger.error('wbs 조회 중 오류 발생:', error.message);
            throw error;
        }
    }

    async getPastTasksAndIssues(userSn, pjtSn){
    const today = new Date();
    const todayDate = today.setHours(0, 0, 0, 0);
    try {
      const mem = await projectRepository.findProjectMember(pjtSn, userSn);
      if (!mem) return {message: '프로젝트 멤버가 아닙니다.'}

      const ownerList = await projectRepository.findOwnerMember(pjtSn);
      const isOwner = ownerList.some(owner => owner.USER_SN === userSn);
      if (!isOwner) return { message: '프로젝트 소유자 권한이 없습니다.' };

      const result = {
        Tasks: [],
        Issues: []
      };

      // 지난 업무 조회
      const allTasks = await wbsRepository.findAllTasks(pjtSn);
      for(const task of allTasks){
        if(task.END_DT && new Date(task.END_DT) < today && task.STATUS !== 'TICKET_CPLT' && task.STATUS !== 'TICKET_CLS') {
          const [priority, status, worker, projectMember] = await Promise.all([
            cmmnRepository.oneCmmnVal('TICKET_PRRT', task.PRIORITY),
            cmmnRepository.oneCmmnVal('TICKET_STTS', task.STATUS),
            task.WORKER ? userRepository.findUser(task.WORKER) : null,
            task.WORKER ? projectRepository.findProjectMember(pjtSn, task.WORKER) : null
          ]);

          const taskResult = {
            ticketSn: task.TICKET_SN,
            ticketNum: projectMember ? `${projectMember.PART}-${task.TICKET_SN}` : `TASK-${task.TICKET_SN}`,
            priority: priority ? priority.CMMN_CD_VAL : null,
            title: task.TICKET_NAME,
            worker: worker ? worker.USER_NM : null,
            status: status ? status.CMMN_CD_VAL : null,
            startDt: task.START_DT ? formatDt(task.START_DT) : null,
            dueDate: task.END_DT ? formatDt(task.END_DT) : null
          };
          result.Tasks.push(taskResult);
        }
      }

      // 열린 이슈 조회
      const allIssues = await wbsRepository.findAllIssues(pjtSn);
      for(const issue of allIssues){
        if(issue.STATUS !== 'ISSUE_CPLT' && issue.STATUS !== 'ISSUE_CLS') {
          const [issuePriority, issueStatus, issuePresent, issuePart] = await Promise.all([
            cmmnRepository.oneCmmnVal('ISSUE_PRRT', issue.PRIORITY),
            cmmnRepository.oneCmmnVal('ISSUE_STTS', issue.STATUS),
            projectRepository.findProjectMember(pjtSn, issue.PRESENT_SN),
            wbsRepository.findIssuePart(pjtSn, issue.TICKET_SN)
          ]);
          const presentUser = await userRepository.findUser(issuePresent.USER_SN);

          const issueResult = {
            issueSn: issue.ISSUE_SN,
            issueNum: issuePart ? `${issuePart.PART}-i${issue.ISSUE_CNT}-${issue.ISSUE_SN}` : `ISSUE-i${issue.ISSUE_CNT}-${issue.ISSUE_SN}`,
            priority: issuePriority ? issuePriority.CMMN_CD_VAL : null,
            title: issue.ISSUE_NM,
            status: issueStatus ? issueStatus.CMMN_CD_VAL : null,
            present: presentUser.USER_NM,
            createdDt: formatDt(issue.CREATED_DT)
          };
          result.Issues.push(issueResult);
        }
      }

      if(result.Tasks) sortTasks(result.Tasks);
      if(result.Issues) sortTasks(result.Issues);

      return result;
    }
    catch (error) {
      throw error;
    }
  }
}

module.exports = new WbsService();
