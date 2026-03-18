import express from "express";
import conn from "../../config/db_conn.js";

const betting = async (req, res) => {
  console.log(req.body);

  const { token, gamename, periodid, Total_betamount, bets, gameid = 0 } = req.body;

  // 🧩 Basic validation
  if (
    !token ||
    !gamename ||
    !periodid ||
    !Total_betamount ||
    !bets ||
    !Array.isArray(bets) ||
    bets.length === 0
  ) {
    return res.status(400).json({ status: 3, message: "parameter missing or invalid" });
  }

  try {
    // 🧠 Get user info
    const [user] = await conn.query(
      "SELECT wallet, winamount, mobile, use_promocode, commision, id FROM user WHERE token=?",
      [token]
    );

    if (user.length !== 1) {
      return res.status(401).json({ status: 6, message: "user not found" });
    }

    const userData = user[0];

    // 🎮 Get latest game ID
    const [bett] = await conn.query("SELECT gameid FROM bet_result ORDER BY id DESC");
    const currentGameId = Number(bett[0].gameid) + 1;

    if (currentGameId != periodid) {
      return res.json({ status: 2, message: "invalid periodid" });
    }

    // 💰 Wallet calculation
    let wallet = userData.wallet;
    let winwallet = userData.winamount;
    const totalBalance = wallet + winwallet;

    if (totalBalance < Total_betamount) {
      return res.status(400).json({ status: 4, message: "insufficient balance" });
    }

    const deductFromWallet = Math.min(wallet, Total_betamount);
    const deductFromWin = Total_betamount - deductFromWallet;
    wallet -= deductFromWallet;
    winwallet -= deductFromWin;

    const regerwallet = (Total_betamount * userData.commision) / 100;

    // 🔄 Update user wallet
    await conn.query("UPDATE user SET wallet=?, winamount=? WHERE id=?", [
      wallet,
      winwallet,
      userData.id,
    ]);

    // 🧑‍🤝‍🧑 Referral commission
    const [admin] = await conn.query("SELECT id FROM user WHERE promocode=?", [
      userData.use_promocode,
    ]);

    if (admin.length > 0) {
      await conn.query("UPDATE user SET wallet = wallet + ? WHERE promocode = ?", [
        regerwallet,
        userData.use_promocode,
      ]);

      await conn.query(
        "INSERT INTO bet_c (gameid, userid, admin_id, bet_amount, amount) VALUES (?, ?, ?, ?, ?)",
        [currentGameId, userData.id, admin[0].id, Total_betamount, regerwallet]
      );
    }

    const newUser_wallet = wallet + winwallet;

    // 🎯 Convert bets format [{"47":20},{"49":10}]
    const formattedBets = bets.map(b => ({ [b.betNumber]: b.betAmount }));
    const betNumbersJson = JSON.stringify(formattedBets);

    // 💾 Save to database only (no in-memory)
    await conn.query(
      "INSERT INTO betting (periodid, userid, mobile, gamename, betamount, bet_number) VALUES (?, ?, ?, ?, ?, ?)",
      [periodid, userData.id, userData.mobile, gamename, Total_betamount, betNumbersJson]
    );

    // ✅ Response
    return res.status(200).json({
      status: 1,
      user_wallet: newUser_wallet,
      gameid: periodid,
      message: "bet saved successfully",
    });
  } catch (err) {
    console.error("❌ Error in betting:", err);
    return res.status(500).json({ status: 5, message: "internal server error" });
  }
};

export default { betting };
