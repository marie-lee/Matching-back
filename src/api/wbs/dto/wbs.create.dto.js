class ProjectDto {
    constructor({ startDt, endDt, members, wbsData = [] }) { // 기본값으로 빈 배열 설정
        this.startDt = startDt;
        this.endDt = endDt;
        this.members = members;
        this.wbsData = wbsData;
    }
}

class MemberDto {
    constructor({ USER_IMG, USER_SN, USER_NM, PART, ROLE = null }) {
        this.userImg = USER_IMG;
        this.userSn = USER_SN;
        this.userNm = USER_NM;
        this.part = PART;
        this.role = ROLE;
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

module.exports = { ProjectDto, MemberDto, WbsDataDto, WbsDataDetailsDto };