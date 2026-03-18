import cron from "node-cron";
import conn from "../config/db_conn.js";


cron.schedule("0 0 * * *", async () => {

  try {
    const sql = `
  UPDATE user
  SET
    winamount = COALESCE(winamount,0) + COALESCE(winner,0),
    winner = 0
  WHERE winner > 0  
`;

    const [result] = await conn.query(sql);

    if (result.affectedRows > 0) {
      console.log("Cron updated users:", result.affectedRows);
    }

  } catch (err) {
    console.error("Cron error:", err);
  }
});

console.log("Winner cron running...");
