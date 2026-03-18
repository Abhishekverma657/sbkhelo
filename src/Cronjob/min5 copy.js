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


function getWinningNumberForBet(bet) {
  const type = bet.bet_type;
  const digit = Number(bet.bet_digit);

  if (!type) {
    // normal 2-digit bet
    return bet.bet_digit.padStart(2, "0");
  }

  if (type === "A") {
    // A7 → any number 70–79 → pick the cheapest (70)
    return (digit * 10).toString().padStart(2, "0");
  }

  if (type === "B") {
    // B7 → numbers ending with 7 → pick lowest (07)
    return digit.toString().padStart(2, "0");
  }

  return "00"; // fallback
}
function isMatchingAnyBet(numStr, merged) {
  const num = Number(numStr);

  return merged.some(bet => {
    const type = bet.bet_type;
    const digit = Number(bet.bet_digit);

    if (!type) {
      // normal number
      return bet.bet_digit.padStart(2, "0") === numStr;
    }

    if (type === "A") {
      // A7 => 70–79
      return Math.floor(num / 10) === digit;
    }

    if (type === "B") {
      // B7 => ending digit
      return num % 10 === digit;
    }

    return false;
  });
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

  // --- Aggregate (your function) ---
  const agg = aggregateBettingData(data);

  // --- Merge same bets (handle A/B type) ---
  const merged = Object.values(
    agg.reduce((acc, bet) => {
      let raw = (bet.bet_number || "").trim();
      let type = null;
      let num = raw;

      // detect A/B bet
      if (/^[AB]/i.test(raw)) {
        type = raw[0].toUpperCase(); // A or B
        num = raw.substring(1);      // digit only
      }

      const key = type ? raw : num; // use full raw for A/B, number for normal

      if (!acc[key]) {
        acc[key] = {
          ...bet,
          bet_type: type,    // A, B or null
          bet_digit: num,    // "7" for A7/B7 ; "12" for normal
          total_bet: bet.total_bet,
          total_payout: bet.total_payout,
        };
      } else {
        acc[key].total_bet += bet.total_bet;
        acc[key].total_payout += bet.total_payout;
      }

      return acc;
    }, {})
  );

  // --- Choose valid bets (payout <= pool) ---
  const valid = merged.filter(x => x.total_payout <= pool);

  // --- Now select winner ---
  let winner;

  if (valid.length) {
    // pick the bet with highest payout (due to pool rule)
    const top = valid.reduce((m, b) =>
      b.total_payout > m.total_payout ? b : m
    );

    winner = getWinningNumberForBet(top);

    console.log("Pool winner (max payout):", top.bet_number, "=>", winner);

  } else {
    // If all break pool → generate a random that does NOT match any bet
    do {
      winner = Math.floor(Math.random() * 100).toString().padStart(2, "0");
    } while (isMatchingAnyBet(winner, merged));

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
  const digitA = "A" + twoDigit[0];
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