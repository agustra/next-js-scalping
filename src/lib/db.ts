import mysql from 'mysql2/promise';

// Railway connection with proper fallbacks
const connection = mysql.createConnection({
  host: process.env.MYSQLHOST || 'hopper.proxy.rlwy.net',
  port: parseInt(process.env.MYSQLPORT || '24330'),
  user: process.env.MYSQLUSER || 'root',
  password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || 'UrTicPtFLCevaIFRDPpUQSWYmcbsFzsb',
  database: process.env.MYSQLDATABASE === '${{MYSQL_DATABASE}}' ? 'railway' : (process.env.MYSQLDATABASE || 'railway')
});

export default connection;