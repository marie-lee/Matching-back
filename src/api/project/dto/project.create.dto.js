class ProjectCreateDto {
    constructor(
        {
            PJT_NM,
            PJT_INTRO,
            PJT_OPEN_YN,
            CONSTRUCTOR_ROLE,
            SELECTED_DT_YN,
            START_DT,
            PERIOD,
            DURATION_UNIT,
            STACKS,
            WANTED,
            PJT_DETAIL,
            ROLES
        }) {
        this.PJT_NM = PJT_NM;
        this.PJT_INTRO = PJT_INTRO;
        this.PJT_OPEN_YN = PJT_OPEN_YN;
        this.CONSTRUCTOR_ROLE = CONSTRUCTOR_ROLE;
        this.SELECTED_DT_YN = SELECTED_DT_YN;
        this.START_DT = START_DT;
        this.PERIOD = PERIOD;
        this.DURATION_UNIT = DURATION_UNIT;
        this.STACKS = STACKS;
        this.WANTED = WANTED;
        this.PJT_DETAIL = PJT_DETAIL;
        this.ROLES = ROLES;
    }

    // 필수 필드 검증 메서드
    validate() {
        const requiredFields = {
            PJT_NM: '프로젝트명이 입력되지 않았습니다.',
            PJT_INTRO: '프로젝트 간단 설명이 입력되지 않았습니다.',
            PJT_OPEN_YN: '프로젝트 상세 공개 여부가 선택되지 않았습니다.',
            CONSTRUCTOR_ROLE: '프로젝트 등록자 역할이 입력되지 않았습니다.',
            ROLES: '프로젝트 참여 인원 및 분야가 입력되지 않았습니다.',
            SELECTED_DT_YN: '프로젝트 기간 선택 여부가 입력되지 않았습니다.',
        };

        for (const [field, message] of Object.entries(requiredFields)) {
            if (this[field] === '' || this[field] === null || this[field] === undefined) {
                throw new Error(message);
            }
        }

        if (this.SELECTED_DT_YN && !this.START_DT) {
            throw new Error('시작날짜가 입력되지 않았습니다.');
        }

        if (!this.DURATION_UNIT || !this.PERIOD) {
            throw new Error('프로젝트 예상 기간을 입력하세요.');
        }
    }
}

module.exports = ProjectCreateDto;