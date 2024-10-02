const cron = require('node-cron');
const db = require('../config/db/db'); // 데이터베이스 모듈
const projectService = require('../api/project/project.service');
// 매일 오전 12시에 데이터베이스 백업
const midnightTask = cron.schedule('0 0 * * *', async () => {
  try {
    // 프로젝트 종료 확인
    await projectService.checkProjectEndDate();
    console.log('프로젝트 일정을 확인했습니다.');
  } catch (error) {
    console.error('프로젝트 일정 확인 중 오류 발생: ', error);
  }
});

// 스케줄 시작
midnightTask.start();
