import cron from "node-cron";
import conn from "../config/db_conn.js";
import { randomInt } from "crypto";

// ✅ Fetch betting data from database instead of betStore
async function getBettingDataFromDB(periodid) {
  const [rows] = await conn.query(
    "SELECT userid, mobile, bet_number, betamount FROM betting WHERE periodid = ?",
    [periodid]
  );

  const bettingData = [];

  rows.forEach(row => {
    let parsedBets;
    try {
      parsedBets = JSON.parse(row.bet_number); // [{"47":20},{"49":10}]
    } catch {
      parsedBets = [];
    }

    parsedBets.forEach(bet => {
      const [betNumber, betAmount] = Object.entries(bet)[0];
      bettingData.push({
        userid: row.userid,
        mobile: row.mobile,
        bet_number: betNumber,
        betamount: Number(betAmount),
        periodid,
      });
    });
  });

  return bettingData;
}

// ---------- Aggregate Betting Data ----------
function aggregateBettingData(bettingData) {
  const aggregated = {};

  bettingData.forEach(bet => {
    const bn = bet.bet_number;
    if (!aggregated[bn]) {
      aggregated[bn] = { bet_number: bn, total_bet: 0, total_payout: 0 };
    }
    aggregated[bn].total_bet += bet.betamount;

    // Payout multiplier
    let mul = 0;
    if (/^[0-9]{2}$/.test(bn)) mul = 90;
    else if (/^[0-9]{1}$/.test(bn)) mul = 90;
    else if (/^[AB][0-9]$/i.test(bn)) mul = 9;

    aggregated[bn].total_payout += bet.betamount * mul;
  });

  return Object.values(aggregated);
}

// ---------- Pick Winner Number ----------
async function pickWinnerNumber(periodid) {
  const [poolRows] = await conn.query(`SELECT pool FROM admin_pool WHERE id = 1`);
  if (!poolRows.length) return { winner: null, reason: "no-pool-found" };
  const pool = Number(poolRows[0].pool);

  const data = await getBettingDataFromDB(periodid);
  if (data.length === 0) {
    const rand = Math.floor(Math.random() * 100).toString().padStart(2, "0");
    console.log("No bets; random winner:", rand);
    return { winner: rand };
  }

  const agg = aggregateBettingData(data);
  const merged = Object.values(
    agg.reduce((acc, b) => {
      let num = b.bet_number;
      if (/^[AB]/i.test(num)) num = num.substring(1);
      if (!acc[num]) acc[num] = { ...b, bet_number: num };
      else {
        acc[num].total_bet += b.total_bet;
        acc[num].total_payout += b.total_payout;
      }
      return acc;
    }, {})
  );

  const valid = merged.filter(x => x.total_payout <= pool);
  let winner;
  if (valid.length) {
    winner = valid.reduce((m, b) => (b.total_payout > m.total_payout ? b : m)).bet_number;
console.log("Pool winner (max payout):", winner);

  } else {
    do {
      winner = Math.floor(Math.random() * 100).toString().padStart(2, "0");
    } while (merged.some(r => r.bet_number.padStart(2, "0") === winner));
    console.log("Pool exceeded; random:", winner);
  }

  return { winner };
}

// ---------- Core Cron Job (every minute) ----------
cron.schedule("*/5 * * * *", async () => {
  try {
    await runCycle();
  } catch (err) {
    console.error("Cron Error:", err);
  }
});

// ---------- Main Cycle: Pick & Settle Winner ----------
async function runCycle() {
  const [last] = await conn.query("SELECT gameid FROM bet_result ORDER BY id DESC LIMIT 1");
  let currentPeriod;

  if (!last.length) {
    currentPeriod = 202050827080855;
    const nextId = currentPeriod + 1;
    await conn.query(
      "INSERT INTO bet_result (gameid, bet_amount, win_amount, win_number, resulttype) VALUES (?,0,0,0,'auto')",
      [nextId]
    );
    return;
  } else {
    currentPeriod = Number(last[0].gameid);
  }

  const nextPeriod = currentPeriod + 1;
  const [[cfg]] = await conn.query("SELECT winner, status FROM bet_result_set WHERE id=1");
  const fixed = Number(cfg.winner || 0);
  let result;

  if (fixed !== 0) {
    result = { winner: fixed.toString().padStart(2, "0") };
    console.log("Fixed winner:", result.winner);
  } else if (cfg.status == 1) {
    result = await pickWinnerNumber(nextPeriod);
  } else {
    const rnd = Math.floor(Math.random() * 100).toString().padStart(2, "0");
    result = { winner: rnd };
    console.log("Random winner:", rnd);
  }

  console.log("Auto Winner:", result.winner);
  await settleNextGame(result.winner, nextPeriod);
}

// ---------- Settle Game ----------
async function settleNextGame(winNum, currentPeriod) {
  const nextPeriod = Number(currentPeriod) + 1;
  // const xval = randomInt(1, 6);
  const xval = 1;

  await conn.query("UPDATE bet_result_set SET winner='0' WHERE id=1");

  const twoDigit = winNum.padStart(2, "0");
  const digitA = "A" + twoDigit[1];
  const digitB = "B" + twoDigit[1];
  console.log(digitA , "digitA");
  
  let totalBet = 0, totalWin = 0;

  // ✅ Fetch all bets for this period directly from DB
  const [bets] = await conn.query(
    "SELECT id,userid, bet_number, betamount FROM betting WHERE periodid = ?",
    [currentPeriod]
  );

  // 🔹 Track winnings per user
  const userResults = {};

  for (const row of bets) {
    let parsedBets;
    try {
      parsedBets = JSON.parse(row.bet_number);
    } catch {
      parsedBets = [];
    }

    let userTotalWin = 0;

    parsedBets.forEach(bet => {
      const [betNumber, betAmount] = Object.entries(bet)[0];
      let winAmt = 0;

      if (betNumber === twoDigit) winAmt = betAmount * 90;
      else if (betNumber === digitA) winAmt = betAmount * 9;
      else if (betNumber === digitB) winAmt = betAmount * 9;

      userTotalWin += winAmt;
    });

    totalBet += row.betamount;
    totalWin += userTotalWin;

     // ✅ Update each betting record with winamount & win_number
    const [asdf] =  await conn.query(
      "UPDATE betting SET winamount = ?, win_number = ? WHERE id = ?",
      [userTotalWin, twoDigit, row.id]
    );
    console.log(asdf.affectedRows  , "how many updatw");
    
    if (!userResults[row.userid]) {
      userResults[row.userid] = { totalWin: 0 };
    }
    userResults[row.userid].totalWin += userTotalWin;
  }

  // 🔹 Update wallet & record result
  for (const [userid, r] of Object.entries(userResults)) {
    if (r.totalWin > 0) {
      await conn.query("UPDATE user SET winner = winner + ? WHERE id = ?", [r.totalWin, userid, ]);

    }
  }

  // 🔹 Record summary in bet_result
  await conn.query(
    "INSERT INTO bet_result (gameid, bet_amount, win_amount, win_number, xvalue, resulttype) VALUES (?,?,?,?,?,?)",
    [currentPeriod, totalBet, totalWin, twoDigit, xval, "auto"]
  );
  await conn.query("UPDATE admin_pool SET pool = pool-? WHERE id=1", [totalWin]);
  console.log(
    `Period ${currentPeriod} done – Winner: ${twoDigit}, TotalBet: ${totalBet}, TotalWin: ${totalWin}`
  );
}

export {}; // No betStore export anymore
