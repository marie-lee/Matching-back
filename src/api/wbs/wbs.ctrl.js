const express = require('express');
const router = express.Router();
const wbsService = require('./wbs.service');
const jwt = require('../../utils/jwt/jwt');
const {logger} = require('../../utils/logger');
const {ProjectDto, MemberDto, WbsDataDto, WbsEditDto} = require("./dto/wbs.create.dto");
const CreateIssueDto = require("./dto/issue.create.dto");
const IssueDto = require('./dto/issue.dto')
const CreateCommentDto = require("./dto/comment.create.dto");
const {TaskCreateDto, IssuedTaskCreateDto, TaskEditDto} = require("./dto/task.dto");
// wbs 템플릿 조회
router.get('/project/wbs/template', jwt.authenticateToken, async (req, res) => {
    try {
        const template = await wbsService.getWbsTemplate();
        return res.status(200).json(template);
    } catch (error) {
        logger.error('WBS 템플릿 조회 중 오류 발생: ', error);
        return res.status(400).json('WBS 템플릿 조회 중 오류 발생: ' + error.message);
    }
});

// wbs 초기정보 조회
router.get('/project/wbs/create/:pjtSn', jwt.authenticateToken, async (req, res)=>{
    const userSn = req.userSn.USER_SN;
    const pjtSn = req.params.pjtSn;
    try{
        const data = await wbsService.createWbsInfo(userSn, pjtSn);
        if(data.message){ return res.status(400).json(data.message)}
        else if (data != null){ return res.status(200).json(data); }
        else{ return res.status(400).json('조회 실패'); }
    }
    catch (e){
        return res.status(403).json(e.message);
    }
});

// wbs 생성
router.post('/project/wbs/create/:pjtSn', jwt.authenticateToken, async (req, res)=>{
    const userSn = req.userSn.USER_SN;
    const pjtSn = req.params.pjtSn;
    const pjtData = new ProjectDto({
        startDt: req.body.pjtData.startDt,
        endDt: req.body.pjtData.endDt,
        members: req.body.memberData.map(member => new MemberDto(member)),
        wbsData: req.body.wbsData.map(wbs => new WbsDataDto(wbs))
    });
    try{
        await wbsService.createWbs(userSn, pjtSn, pjtData);
        return res.status(200).json('프로젝트 WBS 생성 성공');
    }
    catch (e){
        return res.status(400).json('프로젝트 WBS 생성 실패 : ' + e.message);
    }
});

// WBS 수정
router.post('/project/wbs/edit/:pjtSn', jwt.authenticateToken, async (req, res) => {
    const userSn = req.userSn.USER_SN;
    const pjtSn = req.params.pjtSn;
    const pjtData = new ProjectDto({
        startDt: req.body.pjtData && req.body.pjtData.startDt ? req.body.pjtData.startDt : null,
        endDt: req.body.pjtData && req.body.pjtData.endDt ? req.body.pjtData.endDt : null,
        members: req.body.memberData ? req.body.memberData.map(member => new MemberDto(member)) : null,
        wbsData: req.body.wbsData.map(wbs => new WbsEditDto(wbs))
    });

    try {
        const result = await wbsService.editWbs(userSn, pjtSn, pjtData);

        if(result.message){ res.status(result.status).json(result.message); }
        else{ res.status(200).json('WBS 수정 완료.'); }

    } catch (e) {
        logger.error('WBS 수정 중 오류 발생: ' + e.message);
        return res.status(400).json('WBS 수정 중 오류 발생 error: ' + e.message);
    }
});

router.get('/project/wbs/:pjtSn', jwt.authenticateToken, async (req, res)=> {
    try{
        const userSn = req.userSn.USER_SN;
        const pjtSn = req.params.pjtSn;
        const data = await wbsService.getWbs(userSn, pjtSn);
        if(data.message){ return res.status(400).json(data.message)}
        else if(data != null){ return res.status(200).json(data); }
        else { return res.status(400).json('조회되는 WBS가 없습니다.'); }
    } catch (error){
        return res.status(400).json(`WBS 조회 중 에러 발생 :  ${error.message}`);
    }
})

// 이슈생성
router.post('/project/wbs/issue/:pjtSn/:ticketSn', jwt.authenticateToken, async (req, res) => {
    try {
        const issueDto = new CreateIssueDto({
            pjtSn: req.params.pjtSn,
            userSn: req.userSn.USER_SN,
            ticketSn: req.params.ticketSn,
            issueNm: req.body.ISSUE_NM,
            priority: req.body.PRIORITY,
            content: req.body.CONTENT,
            mentions: req.body.MENTIONS,
            status: 'ISSUE_OPN'
        })
        issueDto.validate();
        const data = await wbsService.createIssue(issueDto);
        if(data.message){
            return res.status(404).json(data)
        }
        return res.status(200).json('wbs 티켓 이슈 생성 성공.');
    } catch (error){
        logger.error('wbs 티켓 이슈 생성 중 오류 발생 :' + error)
        return res.status(400).json(`wbs 티켓 이슈 생성 중 오류 발생 :  ${error.message}`);
    }
})

// 이슈수정
router.put('/project/wbs/issue/:pjtSn/:issueSn', jwt.authenticateToken, async (req, res) => {
    try {
        const issueDto = new IssueDto({
            pjtSn: req.params.pjtSn,
            userSn: req.userSn.USER_SN,
            issueSn: req.params.issueSn,
            priority: req.body.PRIORITY,
            status: req.body.STATUS,
            mentions: req.body.MENTIONS,
        });
        issueDto.validation();

        const data = await wbsService.updateIssue(issueDto);
        if(data.message){
            return res.status(404).json(data)
        }
        return res.status(200).json('wbs 티켓 이슈 수정 성공.');
    } catch (error){
        logger.error('wbs 티켓 이슈 수정 중 오류 발생 :' + error)
        return res.status(400).json(`wbs 티켓 이슈 수정 중 오류 발생 :  ${error.message}`);
    }
})
// 이슈 트레킹 조회
router.get('/project/wbs/tracking/:pjtSn', jwt.authenticateToken, async (req, res) => {
    const pjtSn = req.params.pjtSn;
    try {
        const tracking = await wbsService.trackingTicket(pjtSn);
        return res.status(200).json(tracking);
    } catch (error){
        logger.error('wbs 티켓 이슈트레킹 조회 중 오류 발생 : ' + error);
        return res.status(400).json(`wbs 티켓 이슈트레킹 조회 중 오류 발생 : ${error.message}`)
    }
});

// 이슈 상세 조회
router.get('/project/wbs/issue/:pjtSn/:issueSn', jwt.authenticateToken, async (req, res) => {
    const pjtSn = req.params.pjtSn;
    const userSn = req.userSn.USER_SN;
    const issueSn = req.params.issueSn;
    try {
        const issue = await wbsService.issueDetail(pjtSn, userSn, issueSn);
        if(issue.message) return res.status(404).json(issue);
        return res.status(200).json(issue);
    } catch (error){
        logger.error(`wbs 이슈 상세 조회 중 에러 발생 : ${error}`);
        return res.status(400).json(`wbs 이슈 상세 조회 중 에러 발생 : ${error.message}`)
    }
})

// 이슈댓글
router.post('/project/wbs/issue/comment/:pjtSn/:issueSn', jwt.authenticateToken, async (req, res) => {
    const pjtSn = req.params.pjtSn;
    const userSn = req.userSn.USER_SN;
    const issueSn = req.params.issueSn;

    const createCommentDto = new CreateCommentDto({
        pjtSn: req.params.pjtSn, userSn: req.userSn.USER_SN, issueSn: req.params.issueSn, commentData: req.body,
    });
    createCommentDto.validate()
    try {
        const comment = await wbsService.createComment(createCommentDto);
        if(comment.message) return res.status(404).json(comment);
        return res.status(200).json('댓글이 작성되었습니다.');
    } catch (error){
        logger.error(`wbs 이슈 댓글작성 중 에러 발생 : ${error}`);
        return res.status(400).json(`wbs 이슈 댓글작성 중 에러 발생 : ${error.message}`)
    }
})

// WBS 생성 시 프로젝트 정보 조회
router.get('/project/wbs/task/create/:pjtSn', jwt.authenticateToken, async (req, res) => {
    const pjtSn = req.params.pjtSn;
    const userSn = req.userSn.USER_SN;

    try {
        const result = await wbsService.getInfoProject(userSn, pjtSn);
        if(result.message) return res.status(result.status).json(result);
        return res.status(200).json(result);
    } catch (error){
        logger.error(`wbs 업무 추가 정보 조회 중 에러 발생 : ${error}`);
        return res.status(400).json(`wbs 업무 추가 정보 조회 중 에러 발생 : ${error.message}`)
    }
});

// 업무 생성
router.post('/project/wbs/task/create/:pjtSn', jwt.authenticateToken, async (req, res) => {
    const taskCreateDto = new TaskCreateDto({
        pjtSn: req.params.pjtSn, userSn: req.userSn.USER_SN, depth: req.body.depth, title: req.body.ticketName, priority: req.body.priority,
        level: req.body.level, status: "TICKET_WAIT", endDt: req.body.endDt, startDt: req.body.startDt, worker: req.userSn.USER_SN
    });
    taskCreateDto.validate();
    try {
        const task = await wbsService.createTask(taskCreateDto);
        if(task.message) return res.status(task.status).json(task);
        return res.status(200).json('업무가 등록되었습니다.')
    } catch (error) {
        logger.error(`업무 등록 중 에러 발생 : ${error}`);
        return res.status(400).json(`업무 등록 중 에러 발생 : ${error.message}`);
    }
});

// WBS 이슈 파생 업무 생성
router.post('/project/wbs/task/create/:pjtSn/:issueSn', jwt.authenticateToken, async (req, res) => {
    const issuedTaskCreateDto = new IssuedTaskCreateDto({
        pjtSn: req.params.pjtSn, userSn: req.userSn.userSn, issueSn: req.params.issueSn, depth: req.body.depth, title: req.body.ticketName,
        priority: req.body.priority, level: req.body.level, status: "TICKET_WAIT", endDt: req.body.endDt, startDt: req.body.startDt, worker: req.body.worker
    });
    issuedTaskCreateDto.validate();
    try {
        const task = await wbsService.issuedCreateTask(issuedTaskCreateDto);
        if(task.message) return res.status(404).json(task);
        return res.status(200).json('업무가 등록되었습니다.')
    } catch (error) {
        logger.error(`업무 등록 중 에러 발생 : ${error}`);
        return res.status(400).json(`업무 등록 중 에러 발생 : ${error.message}`);
    }
});

// 대시보드 조회
router.get('/project/wbs/dashboard/:pjtSn', jwt.authenticateToken, async (req, res) => {
    const userSn = req.userSn.USER_SN;
    const pjtSn = req.params.pjtSn;

    try{
        const result = await wbsService.getDashboard(userSn, pjtSn);
        if(result.message) return res.status(403).json(result);
        return res.status(200).json(result);
    }
    catch (error) {
        logger.error(`대시보드 조회 중 에러 발생 : ${error}`);
        return res.status(400).json(`대시보드 조회 중 에러 발생 : ${error.message}`);
    }
});

// 업무 상세 조회
router.get('/project/wbs/task/:pjtSn/:taskSn', jwt.authenticateToken, async (req, res) => {
    const userSn = req.userSn.USER_SN;
    const pjtSn = req.params.pjtSn;
    const taskSn = req.params.taskSn;

    try{
        const result = await wbsService.getTask(userSn, pjtSn, taskSn);
        if(result.message) return res.status(result.status).json(result.message);
        return res.status(200).json(result);
    }
    catch (error) {
        logger.error(`업무 상세 조회 중 에러 발생 : ${error}`);
        return res.status(400).json(`업무 상세 조회 중 에러 발생 : ${error.message}`);
    }
});

// 업무 수정
router.post('/project/wbs/task/:pjtSn/:taskSn', jwt.authenticateToken, async (req, res) => {
    const userSn = req.userSn.USER_SN;
    const pjtSn = req.params.pjtSn;
    const taskSn = req.params.taskSn;
    const data = new TaskEditDto({
        priority: req.body.priority, level: req.body.level, status: req.body.status, worker: req.body.present, startDt: req.body.startDt
        , endDt: req.body.endDt
    });


    try{
        data.validate();
        const result = await wbsService.editTaskDetail(userSn, pjtSn, taskSn, data);
        if(result.message) return res.status(result.status).json(result.message);
        return res.status(200).json('업무 상세가 수정되었습니다.');
    }
    catch (error) {
        logger.error(`업무 상세 수정 중 에러 발생 : ${error}`);
        return res.status(400).json(`업무 상세 수정 중 에러 발생 : ${error.message}`);
    }
});

// 이슈 생성 시 업무 목록 조회
router.get('/project/wbs/create/issue/:pjtSn', jwt.authenticateToken, async (req, res) => {
    const userSn = req.userSn.USER_SN;
    const pjtSn = req.params.pjtSn;
    try{
        const result = await wbsService.getWorkList(userSn, pjtSn);
        if(result.message) return res.status(result.status).json(result.message);
        return res.status(200).json(result);
    }
    catch (error) {
        logger.error(`업무 목록 조회 에러 발생 : ${error}`);
        return res.status(400).json(`업무 목록 조회 중 에러 발생 : ${error.message}`);
    }
});

module.exports = router;