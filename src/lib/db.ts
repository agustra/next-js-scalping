import mysql from 'mysql2/promise';

// Use Railway's MYSQL_URL if available, otherwise fallback to individual env vars
const connection = process.env.MYSQL_URL 
  ? mysql.createConnection(process.env.MYSQL_URL)
  : mysql.createConnection({
      host: process.env.MYSQLHOST || 'hopper.proxy.rlwy.net',
      port: parseInt(process.env.MYSQLPORT || '24330'),
      user: process.env.MYSQLUSER || 'root',
      password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD,
      database: process.env.MYSQLDATABASE || 'railway'
    });

export default connection;