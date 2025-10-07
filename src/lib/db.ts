import mysql from 'mysql2/promise';

// Railway MySQL connection
const connection = mysql.createConnection({
  host: process.env.DB_HOST || 'hopper.proxy.rlwy.net',
  port: parseInt(process.env.DB_PORT || '24330'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'railway'
});

export default connection;