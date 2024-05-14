const mariadb = require('mysql');

const conn = mariadb.createConnection(
    {
        host : process.env.DB_HOST,
        port:process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    }
);
conn.connect();

module.exports = conn;