import mysql from 'mysql2/promise';

// Validate MYSQL_URL before using it
function isValidMySQLUrl(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'mysql:' && !!parsed.hostname && !!parsed.username;
  } catch {
    return false;
  }
}

// Use Railway's MYSQL_URL if valid, otherwise fallback to individual env vars
const connection = isValidMySQLUrl(process.env.MYSQL_URL)
  ? mysql.createConnection(process.env.MYSQL_URL!)
  : mysql.createConnection({
      host: process.env.MYSQLHOST || 'hopper.proxy.rlwy.net',
      port: parseInt(process.env.MYSQLPORT || '24330'),
      user: process.env.MYSQLUSER || 'root',
      password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD,
      database: process.env.MYSQLDATABASE || 'railway'
    });

export default connection;