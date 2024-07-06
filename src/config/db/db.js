const { Sequelize } = require('sequelize');
require('dotenv').config();

// Sequelize 인스턴스 생성
const db = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'mariadb'
});

// 모델 import
db.TB_USER = require('./tb.user')(db, Sequelize.DataTypes);
db.TB_USER_EMAIL = require('./tb.user.email')(db, Sequelize.DataTypes);
db.TB_PF = require('./tb.pf')(db, Sequelize.DataTypes);
db.TB_ST = require('./tb.st')(db, Sequelize.DataTypes);
db.TB_PF_ST = require('./tb.pf.st')(db, Sequelize.DataTypes);
db.TB_INTRST = require('./tb.intrst')(db, Sequelize.DataTypes);
db.TB_PF_INTRST = require('./tb.pf.intrst')(db, Sequelize.DataTypes);
db.TB_CAREER = require('./tb.career')(db, Sequelize.DataTypes);
db.TB_PFOL = require('./tb.pfol')(db, Sequelize.DataTypes);
db.TB_PF_PFOL = require('./tb.pf.pfol')(db, Sequelize.DataTypes);
db.TB_PFOL_ST = require('./tb.pfol.st')(db, Sequelize.DataTypes);
db.TB_PFOL_MEDIA = require('./tb.pfol.media')(db, Sequelize.DataTypes);
db.TB_ROLE = require('./tb.role')(db, Sequelize.DataTypes);
db.TB_PFOL_ROLE = require('./tb.pfol.role')(db, Sequelize.DataTypes);
db.TB_URL = require('./tb.url')(db, Sequelize.DataTypes);
db.TB_PF_URL = require('./tb.pf.url')(db, Sequelize.DataTypes);
db.TB_PFOL_URL = require('./tb.pfol.url')(db, Sequelize.DataTypes);
db.TB_PJT = require('./tb.pjt')(db, Sequelize.DataTypes);
db.TB_PJT_SKILL = require('./tb.pjt.skill')(db, Sequelize.DataTypes);
db.TB_PJT_ROLE = require('./tb.pjt.role')(db, Sequelize.DataTypes);
db.TB_REQ = require('./tb.req')(db, Sequelize.DataTypes);
db.TB_PJT_M = require('./tb.pjt.m')(db, Sequelize.DataTypes);
db.TB_CMMN_CD = require('./tb.cmmn.cd')(db, Sequelize.DataTypes);

// Sequelize 인스턴스의 models 객체를 사용하여 모든 모델 간의 관계 설정
Object.keys(db.models).forEach(modelName => {
    if (db.models[modelName].associate) {
      db.models[modelName].associate(db.models);
    }
  });

module.exports = db;
