import mysql from 'mysql2/promise';

const connection = mysql.createConnection({
  host: 'switchyard.proxy.rlwy.net',
  port: 24895,
  user: 'root',
  password: process.env.DB_PASSWORD,
  database: 'railway'
});

export default connection;