const {throwError} = require("../../../utils/errors");

class TaskCreateDto {
    constructor({
        pjtSn, userSn, depth, title, priority = null,
                    level = null, worker = null, startDt = null, endDt = null, status = null
    }) {
        this.PJT_SN = pjtSn;
        this.USER_SN = userSn;
        this.taskData = {
            PJT_SN: pjtSn,
            PARENT_SN: depth,
            TICKET_NAME: title,
            PRIORITY: priority,
            STATUS: status,
            LEVEL: level,
            WORKER: worker,
            START_DT: startDt,
            END_DT: endDt
        };
    }

    validate() {
        if(!this.taskData.PARENT_SN){
            throwError("depth 정보가 없습니다.");
        }
        if(!this.PJT_SN){
            throwError("프로젝트가 없습니다.")
        }
        if(!this.USER_SN){
            throwError("회원 정보가 없습니다.")
        }
        if(!this.taskData.TICKET_NAME){
            throwError("업무 이름이 없습니다.")
        }
    }
}

class IssuedTaskCreateDto {
    constructor({
                    pjtSn, userSn, issueSn, depth, title, priority = null,
                    level = null, worker = null, startDt = null, endDt = null, status = null
                }) {
        this.PJT_SN = pjtSn;
        this.USER_SN = userSn;
        this.ISSUE_SN = issueSn;
        this.taskData = {
            PJT_SN: pjtSn,
            PARENT_SN: depth,
            CREATER_SN: userSn,
            TICKET_NAME: title,
            PRIORITY: priority,
            STATUS: status,
            LEVEL: level,
            WORKER: worker,
            START_DT: startDt,
            END_DT: endDt,
            ISSUE_TICKET_SN: null
        };
    }
    validate() {
        if(!this.taskData.PARENT_SN){
            throwError('depth 정보가 없습니다.');
        }
        if(!this.PJT_SN){
            throwError('프로젝트가 없습니다.')
        }
        if(!this.USER_SN){
            throwError('회원 정보가 없습니다.')
        }
        if(!this.ISSUE_SN){
            throwError('이슈 정보가 없습니다.')
        }
        if(!this.taskData.TICKET_NAME){
            throwError('업무 이름이 없습니다.')
        }
    }
}

module.exports = {
    TaskCreateDto,
    IssuedTaskCreateDto
};