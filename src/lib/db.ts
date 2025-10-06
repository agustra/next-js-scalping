import mysql from 'mysql2/promise';

const connection = mysql.createConnection({
  host: 'hopper.proxy.rlwy.net',
  port: 24330,
  user: 'root',
  password: process.env.DB_PASSWORD,
  database: 'railway'
});

export default connection;