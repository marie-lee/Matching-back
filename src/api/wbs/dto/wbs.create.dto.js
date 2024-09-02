class ProjectDto {
    constructor({ startDt = null, endDt = null, members = null, wbsData = [] }) { // 기본값으로 빈 배열 설정
        this.startDt = startDt;
        this.endDt = endDt;
        this.members = members;
        this.wbsData = wbsData;
    }
}

class MemberDto {
    constructor({ userImg, userSn, userNm, part, role = null }) {
        this.userImg = userImg;
        this.userSn = userSn;
        this.userNm = userNm;
        this.part = part;
        this.role = role;
    }
}

class WbsDataDto {
    constructor({ name, child, data }) {
        this.name = name;
        this.child = child ? child.map(c => new WbsDataDto(c)) : null;
        this.data = data ? new WbsDataDetailsDto(data) : null;
    }
}

class WbsDataDetailsDto {
    constructor({ worker, startDt, endDt, status }) {
        this.WORKER = worker;
        this.START_DT = startDt;
        this.END_DT = endDt;
        this.STATUS = status;
    }
}

class WbsEditDto{
    constructor({ ticketSn = null, name, child, data }) {
        if(ticketSn !== null) this.ticketSn = ticketSn;
        this.name = name;
        this.child = child ? child.map(c => new WbsEditDto(c)) : null;
        this.data = data ? new WbsEditDataDetailsDto(data) : null;
    }
}

class WbsEditDataDetailsDto {
    constructor({ worker, startDt, endDt, status }) {
        this.WORKER = worker;
        this.START_DT = startDt;
        this.END_DT = endDt;
        this.STATUS = status;
    }
}
module.exports = { ProjectDto, MemberDto, WbsDataDto, WbsDataDetailsDto, WbsEditDto, WbsEditDataDetailsDto };