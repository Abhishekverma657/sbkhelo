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


async function generatearray(data, pool) {
  const resultMap = {};
  for (let i = 0; i < 100; i++) {
    resultMap[i.toString().padStart(2, "0")] = 0;
  }

  for (const row of data) {
    const bet = row.bet_number;
    const amt = Number(row.betamount);

    // ---------- Direct number (00–99) ----------
    if (/^\d{1,2}$/.test(bet)) {
      const num = bet.padStart(2, "0");
      resultMap[num] += amt * 90;
    }

    // ---------- A0–A9 (30–39 style) ----------
    else if (/^A\d$/.test(bet)) {
      const d = Number(bet[1]); // A3 -> 3

      for (let i = 0; i < 10; i++) {
        const num = `${d}${i}`; // 30–39
        resultMap[num] += amt * 9;
      }
    }

    // ---------- B0–B9 (04,14,24...) ----------
    else if (/^B\d$/.test(bet)) {
      const d = Number(bet[1]); // B4 -> 4

      for (let i = 0; i < 10; i++) {
        const num = `${i}${d}`.padStart(2, "0"); // 04,14,24...
        resultMap[num] += amt * 9;
      }
    }
  }
  // console.log(resultMap);
  const winner = pickWinner(resultMap, pool);
  // console.log(winner, "winnr", resultMap, "pool", pool);

  return winner;
}
function pickWinner(resultMap, pool) {
  let list = Object.entries(resultMap).map(([num, amt]) => ({
    num,
    amt: Number(amt),
  }));

  if (!list.length) return null;

  // 🔴 POOL NEGATIVE OR TOO SMALL → DAMAGE CONTROL
  if (pool <= 0) {
    const minAmt = Math.min(...list.map(x => x.amt));
    const lowest = list.filter(x => x.amt === minAmt);
    return lowest[Math.floor(Math.random() * lowest.length)];
  }

  // 🟢 NORMAL MODE

  // 1️⃣ payouts strictly under pool
  const underPool = list.filter(x => x.amt < pool && x.amt > 0);

  // ❌ nothing fits pool → take LOWEST payout
  if (!underPool.length) {
    const minAmt = Math.min(...list.map(x => x.amt));
    const lowest = list.filter(x => x.amt === minAmt);
    return lowest[Math.floor(Math.random() * lowest.length)];
  }

  // 2️⃣ take MAX inside underPool
  const maxAmt = Math.max(...underPool.map(x => x.amt));
  const winners = underPool.filter(x => x.amt === maxAmt);

  // 3️⃣ random tie break
  return winners[Math.floor(Math.random() * winners.length)];
}



// ---------- Pick Winner Number ----------
async function pickWinnerNumber(periodid) {
  // --- Get Pool Amount ---
  const [poolRows] = await conn.query(`SELECT pool FROM admin_pool WHERE id = 1`);
  if (!poolRows.length) return { winner: null, reason: "no-pool-found" };
  const pool = Number(poolRows[0].pool);

  // --- Get Betting Data ---
  const data = await getBettingDataFromDB(periodid);
  if (data.length === 0) {
    const rand = Math.floor(Math.random() * 100).toString().padStart(2, "0");
    console.log("No bets; random winner:", rand);
    return { winner: rand };
  }
  // console.log("Auto Winner:", result.winner);

  const cxx = await generatearray(data, pool);   // <-- IMPORTANT
  // console.log(cxx, "data");

  const winner = cxx.num;
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



// setInterval(async () => {
//   try {
//     await runCycle();
//   } catch (err) {
//     console.error("Interval Error:", err);
//   }
// }, 20 * 1000); // 20 seconds

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
  const [[cfg]] = await conn.query("SELECT winner, status, xvalue FROM bet_result_set WHERE id=1");
  const fixed = (cfg.winner || 0);
  let xvalue = 1;
  let result;
  let resulttype;
  if (fixed !== "0") {
    xvalue = cfg.xvalue;
    resulttype = "admin";
    result = { winner: fixed.toString().padStart(2, "0") };
    console.log("Fixed winner:", result.winner);
  } else if (cfg.status == 1) {
    resulttype = "pool";
    result = await pickWinnerNumber(nextPeriod);
  } else {
    resulttype = "auto";
    const rnd = Math.floor(Math.random() * 100).toString().padStart(2, "0");
    result = { winner: rnd };
    console.log("Random winner:", rnd);
  }

  console.log("Auto Winner:", result.winner);
  await settleNextGame(result.winner, nextPeriod, resulttype, xvalue);
}

// ---------- Settle Game ----------
async function settleNextGame(winNum, currentPeriod, resulttype, xvalue) {
  const nextPeriod = Number(currentPeriod) + 1;
  // const xval = randomInt(1, 6);
  let xval = xvalue;

  await conn.query("UPDATE bet_result_set SET winner='0', xvalue = 1 WHERE id=1");

  const twoDigit = winNum.padStart(2, "0");
  const digitA = "A" + twoDigit[0];
  const digitB = "B" + twoDigit[1];
  console.log(digitA, "digitA");

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

      if (betNumber === twoDigit) winAmt = (betAmount * 90) * xvalue;
      else if (betNumber === digitA) winAmt = (betAmount * 9) * xvalue;
      else if (betNumber === digitB) winAmt = (betAmount * 9) * xvalue;

      userTotalWin += winAmt;
    });

    totalBet += row.betamount;
    totalWin += userTotalWin;

    // ✅ Update each betting record with winamount & win_number
    const [asdf] = await conn.query(
      "UPDATE betting SET winamount = ?, win_number = ? WHERE id = ?",
      [userTotalWin, twoDigit, row.id]
    );
    // console.log(asdf.affectedRows, "how many updatw");

    if (!userResults[row.userid]) {
      userResults[row.userid] = { totalWin: 0 };
    }
    userResults[row.userid].totalWin += userTotalWin;
  }

  // 🔹 Update wallet & record result
  for (const [userid, r] of Object.entries(userResults)) {
    if (r.totalWin > 0) {
      await conn.query("UPDATE user SET winner = winner + ? WHERE id = ?", [r.totalWin, userid]);

    }
  }

  // if(totalWin <= 0){
  //     xval = randomInt(1, 4);
  // }
  // 🔹 Record summary in bet_result
  await conn.query(
    "INSERT INTO bet_result (gameid, bet_amount, win_amount, win_number, xvalue, resulttype) VALUES (?,?,?,?,?,?)",
    [currentPeriod, totalBet, totalWin, twoDigit, xvalue, resulttype]
  );
  await conn.query("UPDATE admin_pool SET pool = pool-? WHERE id=1", [totalWin]);
  console.log(
    `Period ${currentPeriod} done – Winner: ${twoDigit}, TotalBet: ${totalBet}, TotalWin: ${totalWin}`
  );
}

export { }; // No betStore export anymore