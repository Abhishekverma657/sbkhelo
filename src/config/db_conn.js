import mysql from 'mysql2/promise';
import dotenv from "dotenv";
dotenv.config()

console.log(process.env.DB_HOST, " process.env.DB_HOST");



const conn = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NSME || 'funtarget',
  port: process.env.DB_PORT || 3306
});



// const conn = mysql.createPool({
//   host: '127.0.0.1',
//   user: 'funtarget_user',
//   password: 'FunTarget1#$123',
//   database: 'FunTarget1',
//   port: 3306
// });



// Test connection
(async () => {
  try {
    const connection = await conn.getConnection();
    console.log("✅ MySQL Connected Successfully!");
    connection.release();
  } catch (err) {
    console.error("❌ MySQL Connection Error:", err.message);
  }
})();



export default conn;
