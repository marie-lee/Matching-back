const express = require('express');
const router = express.Router();
const wbsService = require('./wbs.service');
const jwt = require('../../utils/jwt/jwt');
const {logger} = require('../../utils/logger');
const {ProjectDto, MemberDto, WbsDataDto} = require("./dto/wbs.create.dto");
const CreateIssueDto = require("./dto/issue.create.dto");

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
        startDt: req.body.pjtData.START_DT,
        endDt: req.body.pjtData.END_DT,
        members: req.body.memberData.map(member => new MemberDto(member)),
        wbsData: req.body.wbsData.map(wbs => new WbsDataDto(wbs))
    });
    console.log(pjtData)
    try{
        await wbsService.createWbs(userSn, pjtSn, pjtData);
        return res.status(200).json('프로젝트 WBS 생성 성공');
    }
    catch (e){
        return res.status(400).json('프로젝트 WBS 생성 실패 error = ' + e.message);
    }
});

// WBS 수정
router.post('/project/wbs/edit/:pjtSn', jwt.authenticateToken, async (req, res) => {
    const userSn = req.userSn.USER_SN;
    const pjtSn = req.params.pjtSn;
    const data = req.body;

    try {
        const result = await wbsService.editWbs(userSn, pjtSn, data);
        if (result) {
            if(result.message){ res.status(400).json(result.message); }
            else{ res.status(200).json('WBS 수정 완료.'); }
        } else {
            res.status(400).json('WBS 수정 실패.');
        }
    } catch (e) {
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
router.post('/project/wbs/:pjtSn/:ticketSn', jwt.authenticateToken, async (req, res) => {
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

module.exports = router;