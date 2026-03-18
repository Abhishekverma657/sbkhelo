import express, { json } from 'express';
import conn from '../../config/db_conn.js';
import moment from "moment"; // for timestamp (optional)
import md5 from "md5";

const activeBets = new Set();


// import { use } from 'react';
// import { restart } from 'nodemon';
// import { isErrored } from 'json2csv/JSON2CSVTransform.js';
// import { use } from 'react';
// import {}
// import { use } from 'react';
// import { use } from 'react';




const livewalletdata = async (req, res) => {
    const token = req.body.verToken;
    if (!token) {
        return res.json({ status: 3, message: 'user not found' });
    }
    try {
        const [user] = await conn.query("SELECT * FROM user WHERE token = ? ", [token]);
        if (user.length != 1) {
            return res.json({ status: 4, message: 'user not found' });
        }

        const [admin] = await conn.query("SELECT * FROM admin_pool WHERE id = 1 ");
        const pool = admin[0].Ofline;
        res.json({ status: 1, wallet: user[0].wallet, bonus: user[0].bonus, WinAmount: user[0].winamount, pool: pool });
    } catch (error) {
        return res.status(500).json({ status: 5, message: 'internal error', error });
    }
}

const proImageChange = async (req, res) => {
    const { image, UserToken } = req.body;
    if (!image || !UserToken) {
        return res.json({ status: 3, message: 'parameter miss !' });
    }
    try {
        const [user] = await conn.query("SELECT id,image FROM user WHERE token = ? ", [UserToken]);
        if (user.length != 1) {
            return res.json({ status: 7, message: 'user not found' });
        }
        const [updatee] = await conn.query("UPDATE user SET image = ? WHERE id = ? ", [image, user[0].id]);
        if (updatee.affectedRows == 1) {
            return res.json({ status: 1, message: 'update successfull ' });
        } else {
            return res.json({ status: 2, message: 'server error' });
        }
    } catch (error) {
        return res.status(500).json({ status: 5, message: 'internal error' });
    }
};
const nameeditapi = async (req, res) => {
    const { nameEdit, nameToken } = req.body;
    if (!nameEdit || !nameToken) {
        return res.json({ status: 3, message: 'parameter miss !' });
    }
    try {
        const [user] = await conn.query("SELECT id,name FROM user WHERE token = ? ", [nameToken]);
        if (user.length != 1) {
            return res.json({ status: 7, message: 'user not found' });
        }
        const [updatee] = await conn.query("UPDATE user SET name = ? WHERE id = ? ", [nameEdit, user[0].id]);
        if (updatee.affectedRows == 1) {
            return res.json({ status: 1, userName: nameEdit, message: 'update successfull ' });
        } else {
            return res.json({ status: 2, message: 'server error' });
        }
    } catch (error) {
        return res.status(500).json({ status: 5, message: 'internal error' });
    }
};

const mybonusAPi = async (req, res) => {
    const { usertoken, limit } = req.body;
    console.log(req.body);
    if (!usertoken || !limit) {
        return res.json({ status: 3, message: 'Parmater miss' });
    }
    try {
        const conditions = [];
        const [user] = await conn.query("SELECT * FROM user WHERE token = ?", [usertoken]);
        if (user.length != 1) {
            return res.json({ status: 4, message: 'user not found' });
        }
        if (limit == 1) {
            conditions.push(" AND DATE(`time`) = CURDATE()"); // Today
        } else if (limit == 2) {
            conditions.push(" AND DATE(`time`) = DATE(NOW() - INTERVAL 1 DAY)"); // Yesterday
        } else if (limit == 3) {
            conditions.push(" AND YEARWEEK(`time`, 1) = YEARWEEK(CURDATE(), 1)"); // Current week (ISO standard, week starts on Monday)
        } else if (limit == 4) {
            conditions.push(" AND MONTH(`time`) = MONTH(CURDATE()) AND YEAR(`time`) = YEAR(CURDATE())"); // Current month
        } else if (limit == 5) {
            conditions.push(" AND YEAR(`time`) = YEAR(CURDATE())"); // Current year
        } else {
            conditions.push("");
        }

        const query = `SELECT * FROM user_bonus WHERE userid = ? ${conditions}`;

        const [bonus] = await conn.query(query, [user[0].id]);

        if (bonus.length == 0) {
            return res.json({ status: 2, message: 'data not found' });
        }
        const reData = bonus.map(element => ({
            sendermobile: element.sendermobile,
            recharge: element.rechage,
            bonus: element.bonus,
            rank: element.rank,
            time: element.time instanceof Date ? element.time.toLocaleString('en-IN', { hour12: false }) : element.time,
        }));
        return res.json({ status: 1, MyBonus: reData });
    } catch (error) {
        return res.status(500).json({ status: 5, message: 'internal server ', error });
    }
}
const RankAPi = async (req, res) => {
    try {
        const reData = [];
        let amount = 150000;
        for (let i = 0; i < 10; i++) {
            const usernames = ["Player1", "Player2", "Player3", "Player4", "Player5"];
            const randomUsername = usernames[Math.floor(Math.random() * usernames.length)];

            // Generate random id between 10000 and 99999
            const randomId = Math.floor(Math.random() * (99999 - 10000 + 1)) + 10000;

            // Generate random amount starting at 10000 and increasing
            amount -= 5000 + Math.floor(Math.random() * 5000); // Ascending from 10,000

            reData.push({
                username: "Player" + randomId.toString().slice(0, 2),
                id: randomId,
                amount: amount
            });
        }

        return res.status(200).json({ status: 1, message: 'Success', data: reData });
    } catch (error) {
        return res.status(500).json({ status: 5, message: 'Internal Error' });
    }
}

const betting1 = async (req, res) => {
    console.log(req.body, "dfv");

    const { token, gamename, periodid, Total_betamount, bets } = req.body;

    if (!token || !gamename || !periodid || !Total_betamount || !bets || !Array.isArray(bets) || bets.length === 0) {
        return res.status(400).json({ status: 3, message: "parameter missing or invalid" });
    }

    try {
        // get user
        const [user] = await conn.query("SELECT wallet, winamount, mobile, id FROM user WHERE token=?", [token]);
        if (user.length !== 1) {
            return res.status(401).json({ status: 6, message: "user not found" });
        }

        const userData = user[0];
        const mobile = user[0].mobile;
        let userwallet = userData.wallet + userData.winamount;

        if (userwallet < Total_betamount) {
            return res.status(400).json({ status: 4, message: "insufficient balance" });
        }

        // Deduct wallet/winwallet
        let wallet = userData.wallet;
        let winwallet = userData.winamount;
        let deductFromWallet = Math.min(wallet, Total_betamount);
        let deductFromWin = Total_betamount - deductFromWallet;
        wallet -= deductFromWallet;
        winwallet -= deductFromWin;

        // Update user balances
        const [useup] = await conn.query(
            "UPDATE user SET wallet=?, winamount=? WHERE id=?",
            [wallet, winwallet, userData.id]
        );

        // get admin pool
        const [pool] = await conn.query("SELECT pool, admin_comm FROM admin_pool WHERE id=1");
        const pool_ = pool[0].pool;
        const game_tax = pool[0].admin_comm;


        // let periodidw = Number(periodid)+1;
        // Insert multiple bets
        for (const bet of bets) {
            for (const [betNumber, betAmount] of Object.entries(bet)) {
                await conn.query(
                    "INSERT INTO `betting` (`userid`, `mobile`, `periodid`, `gamename`, `bet_number`, `betamount`, `winamount`, `userwallet`, `pool`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    [userData.id, mobile, periodid, gamename, betNumber, betAmount, 0, userwallet, pool_]
                );
            }
        }

        // update pool and admin
        const admin = Total_betamount * 10 / 100;
        const game_tax1 = Total_betamount * game_tax / 100;
        const pooladd = Total_betamount - admin;
        await conn.query("UPDATE admin_pool SET pool = pool + ?, admin = admin +? WHERE id=1", [pooladd, admin]);


        await conn.query("INSERT INTO `commsion_data`( `userid`, `bet_amount`, `amount`) VALUES (?, ?, ?)", [userData.id, Total_betamount, game_tax1]);
        await conn.query("UPDATE user SET wallet = wallet + ? WHERE id=?", [game_tax1, userData.id]);
        return res.status(200).json({ status: 1, message: "bets successfully created" });

    } catch (er) {
        console.error(er);
        return res.status(500).json({ status: 5, message: "internal server error" });
    }

};



// const betting2 = async (req, res) => {
//     console.log(req.body, "dfv");

//     const { token, gamename, periodid, Total_betamount, bets } = req.body;

//     // ✅ Validate input
//     if (
//         !token ||
//         !gamename ||
//         !periodid ||
//         Total_betamount === undefined || Total_betamount === null ||
//         !Array.isArray(bets) ||
//         bets.length === 0
//     ) {
//         return res.status(200).json({ status: 3, message: "parameter missing or invalid" });
//     }


//     try {
//         // get user
//         const [user] = await conn.query(
//             "SELECT wallet, winamount, mobile, id FROM user WHERE token=?",
//             [token]
//         );
//         if (user.length !== 1) {
//             return res.status(200).json({ status: 6, message: "user not found" });
//         }

//         const userData = user[0];
//         const mobile = userData.mobile;
//         let userwallet = userData.wallet + userData.winamount;

//         if (userwallet < Total_betamount) {
//             return res.status(400).json({ status: 4, message: "insufficient balance" });
//         }

//         // Deduct wallet/winwallet
//         let wallet = userData.wallet;
//         let winwallet = userData.winamount;
//         let deductFromWallet = Math.min(wallet, Total_betamount);
//         let deductFromWin = Total_betamount - deductFromWallet;
//         wallet -= deductFromWallet;
//         winwallet -= deductFromWin;

//         // Update user balances
//         await conn.query(
//             "UPDATE user SET wallet=?, winamount=? WHERE id=?",
//             [wallet, winwallet, userData.id]
//         );

//         // get admin pool
//         const [pool] = await conn.query(
//             "SELECT pool, admin_comm FROM admin_pool WHERE id=1"
//         );
//         const pool_ = pool[0].pool;
//         const game_tax = pool[0].admin_comm;

//         // ✅ Insert multiple bets (new format)
//         for (const bet of bets) {
//             const { betNumber, betAmount } = bet;
//             if (!betNumber || !betAmount) continue; // skip invalid entries

//             await conn.query(
//                 "INSERT INTO `betting` (`userid`, `mobile`, `periodid`, `gamename`, `bet_number`, `betamount`, `winamount`, `userwallet`, `pool`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
//                 [
//                     userData.id,
//                     mobile,
//                     periodid,
//                     gamename,
//                     betNumber,
//                     betAmount,
//                     0,
//                     userwallet,
//                     pool_
//                 ]
//             );
//         }

//         // update pool and admin
//         const admin = (Total_betamount * 10) / 100;
//         const game_tax1 = (Total_betamount * game_tax) / 100;
//         const pooladd = Total_betamount - admin;

//         await conn.query(
//             "UPDATE admin_pool SET pool = pool + ?, admin = admin + ? WHERE id=1",
//             [pooladd, admin]
//         );

//         await conn.query(
//             "INSERT INTO `commsion_data`(`userid`, `bet_amount`, `amount`) VALUES (?, ?, ?)",
//             [userData.id, Total_betamount, game_tax1]
//         );

//         await conn.query(
//             "UPDATE user SET wallet = wallet + ? WHERE id=?",
//             [game_tax1, userData.id]
//         );
//         const [wall] = await conn.query("SELECT wallet, winamount FROM user WHERE id=?", [userData.id]);
//         const user_wallet = wall[0].wallet + wall[0].winamount;
//         return res
//             .status(200)
//             .json({ status: 1, user_wallet, message: "bets successfully created" });

//     } catch (er) {
//         console.error(er);
//         return res
//             .status(200)
//             .json({ status: 5, message: "internal server error" });
//     }
// };



const betting2 = async (req, res) => {
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

    // ✅ 🔒 DUPLICATE REQUEST BLOCK (ONLY ADDITION)
    const lockKey = token + "_" + periodid;

    if (activeBets.has(lockKey)) {
        return res.json({ status: 9, message: "Duplicate request blocked" });
    }

    activeBets.add(lockKey);

    try {
        // ✅ FIX YOUR WRONG QUERY
        const [_time] = await conn.query("SELECT open_time, close_time FROM admin_pool WHERE id=1");

        if (_time.length === 0) {
            return res.json({ status: 7, message: "time setting missing" });
        }

        const open_time = _time[0].open_time;     // "09:00:00"
        const close_time = _time[0].close_time;   // "21:00:00"

        // ✅ TIME CHECK
        const now = new Date();
        const currentTime = now.toTimeString().slice(0, 8); // "HH:mm:ss"

        if (!(currentTime >= open_time && currentTime <= close_time)) {
            return res.json({
                status: 8,
                message: `Game Open Time: ${open_time}, Close Time: ${close_time}`,
                open_time,
                close_time,
                current_time: currentTime
            });
        }



        // 🧠 Get user info
        const [user] = await conn.query(
            "SELECT wallet, winamount, mobile, use_promocode, commision, id, winner FROM user WHERE token=?",
            [token]
        );
        if (user.length != 1) {
            return res.status(401).json({ status: 6, message: "user not found" });
        }
        if (user[0].winner != 0) {
            return res.json({ status: 5, message: "first get winner amount" });
        }
        const [admin_pool] = await conn.query("SELECT admin_comm, pool FROM admin_pool WHERE id=1");

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

        // 🎯 Convert bets format [{"47":20},{"49":10}]
        const formattedBets = bets.map(b => ({ [b.betNumber]: b.betAmount }));
        const betNumbersJson = JSON.stringify(formattedBets);

        // ✅ Total bet amount
        const totalBetAmount = bets.reduce((sum, b) => sum + Number(b.betAmount), 0);

        console.log("Total Bet:", totalBetAmount);

        if (totalBalance < totalBetAmount) {
            return res.status(400).json({ status: 4, message: "insufficient balance" });
        }

        const deductFromWallet = Math.min(wallet, totalBetAmount);
        const deductFromWin = totalBetAmount - deductFromWallet;
        wallet -= deductFromWallet;
        winwallet -= deductFromWin;

        // Update user balances
        await conn.query(
            "UPDATE user SET wallet=?, winamount=? WHERE id=?",
            [wallet, winwallet, userData.id]
        );

        const usercomm_ = user[0].commision;
        const usercomm = (totalBetAmount * usercomm_) / 100;
        if (usercomm !== 0) {
            await conn.query("UPDATE user SET wallet=?, winamount=?, agnetcomm=? WHERE id=?", [
                wallet, winwallet, usercomm, userData.id,]);
            await conn.query(
                "INSERT INTO bet_c (gameid, userid, admin_id, bet_amount, amount) VALUES (?, ?, ?, ?, ?)",
                [currentGameId, userData.id, userData.id, totalBetAmount, usercomm]);
        }

        // 🧑‍🤝‍🧑 Referral commission
        // 🧑‍🤝‍🧑 Referral commission
        // console.log(userData.use_promocode, "promo");
        if (userData.use_promocode && userData.use_promocode.trim() !== "") {
            const [admin] = await conn.query("SELECT id, commision FROM user WHERE promocode=?", [userData.use_promocode]);
            // ✅ IMPORTANT check admin exists
            if (admin.length > 0) {
                const adminComm = Number(admin[0].commision || 0);
                const userComm = Number(usercomm_ || 0);
                const commision_ = adminComm - userComm;
                const regerwallet = (totalBetAmount * commision_) / 100;
                if (regerwallet > 0) {
                    await conn.query("UPDATE user SET winner = winner + ? WHERE promocode=?", [regerwallet, userData.use_promocode]);
                    await conn.query("INSERT INTO bet_c (gameid, userid, admin_id, bet_amount, amount) VALUES (?, ?, ?, ?, ?)", [currentGameId, userData.id, admin[0].id, totalBetAmount, regerwallet]);
                }
            }
        }
        const newUser_wallet = wallet + winwallet;

        // // 🎯 Convert bets format [{"47":20},{"49":10}]
        // const formattedBets = bets.map(b => ({ [b.betNumber]: b.betAmount }));
        // const betNumbersJson = JSON.stringify(formattedBets);

        // 💾 Save to database only (no in-memory)
        const admin_per = admin_pool[0].admin_comm ?? 0;
        const admin_comm = totalBetAmount * admin_per / 100;
        const newpool = totalBetAmount - admin_comm;
        const xx = admin_pool[0].pool + newpool;
        await conn.query(
            "INSERT INTO betting (periodid, userid, mobile, gamename, betamount, bet_number, userwallet, pool) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [periodid, userData.id, userData.mobile, gamename, totalBetAmount, betNumbersJson, newUser_wallet, xx]
        );
        await conn.query("UPDATE  admin_pool SET pool = pool + ? , admin = admin + ? WHERE id=1", [newpool, admin_comm]);
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
    } finally {

        // ✅ IMPORTANT — ALWAYS REMOVE LOCK
        activeBets.delete(lockKey);
    }

};




// const betting2 = async (req, res) => {

//     const { token, gamename, periodid, bets } = req.body;

//     if (!token || !gamename || !periodid || !bets || !Array.isArray(bets) || bets.length === 0) {
//         return res.status(400).json({ status: 3, message: "parameter missing" });
//     }

//     const connection = await conn.getConnection();

//     try {

//         await connection.beginTransaction();
//                         // ✅ FIX YOUR WRONG QUERY
//         const [_time] = await connection.query("SELECT open_time, close_time FROM admin_pool WHERE id=1");

//         if (_time.length === 0) {
//             return res.json({ status: 7, message: "time setting missing" });
//         }

//         const open_time = _time[0].open_time;     // "09:00:00"
//         const close_time = _time[0].close_time;   // "21:00:00"

//         // ✅ TIME CHECK
//         const now = new Date();
//         const currentTime = now.toTimeString().slice(0, 8); // "HH:mm:ss"

//         if (!(currentTime >= open_time && currentTime <= close_time)) {
//             return res.json({
//                 status: 8,
//                 message: `Game Open Time: ${open_time}, Close Time: ${close_time}`,
//                 open_time,
//                 close_time,
//                 current_time: currentTime
//             });
//         }


//         // =====================
//         // ⭐ LOCK USER
//         // =====================
//         const [user] = await connection.query(
//             `SELECT wallet, winamount, mobile, use_promocode, commision, id, winner
//              FROM user WHERE token=? FOR UPDATE`,
//             [token]
//         );

//         if (user.length !== 1) {
//             await connection.rollback();
//             return res.json({ status: 6, message: "user not found" });
//         }

//         const userData = user[0];

//         if (userData.winner !== 0) {
//             await connection.rollback();
//             return res.json({ status: 5, message: "first claim winner amount" });
//         }

//         // =====================
//         // ⭐ MAKE BET JSON
//         // =====================
//         const betJson = JSON.stringify(
//             bets.map(b => ({ [b.betNumber]: b.betAmount }))
//         );

//         // =====================
//         // ⭐ BLOCK DOUBLE CLICK (2 sec)
//         // =====================
//         const [dup] = await connection.query(
//             `SELECT id FROM betting
//              WHERE userid=? AND periodid=? AND bet_number=?
//              AND time > NOW() - INTERVAL 2 SECOND
//              LIMIT 1`,
//             [userData.id, periodid, betJson]
//         );

//         if (dup.length > 0) {
//             await connection.rollback();
//             return res.json({ status: 9, message: "duplicate bet ignored" });
//         }

//         // =====================
//         // ⭐ TOTAL BET
//         // =====================
//         const totalBetAmount = bets.reduce((s, b) => s + Number(b.betAmount), 0);

//         let wallet = Number(userData.wallet);
//         let winwallet = Number(userData.winamount);

//         if (wallet + winwallet < totalBetAmount) {
//             await connection.rollback();
//             return res.json({ status: 4, message: "insufficient balance" });
//         }

//         // =====================
//         // ⭐ DEDUCT WALLET
//         // =====================
//         const deductWallet = Math.min(wallet, totalBetAmount);
//         const deductWin = totalBetAmount - deductWallet;

//         wallet -= deductWallet;
//         winwallet -= deductWin;

//         const newUserWallet = wallet + winwallet;

//         await connection.query(
//             "UPDATE user SET wallet=?, winamount=? WHERE id=?",
//             [wallet, winwallet, userData.id]
//         );

//         // =====================
//         // ⭐ REFERRAL COMMISSION (YOUR LOGIC FIXED)
//         // =====================
//         const [admin] = await connection.query(
//             "SELECT id FROM user WHERE promocode=?",
//             [userData.use_promocode]
//         );

//         if (admin.length > 0) {

//             const usercomm = userData.commision || 0;
//             const userShare = totalBetAmount * usercomm / 100;

//             const regerwallet = userShare;   // rename safe

//             // add commission to upline wallet
//             await connection.query(
//                 "UPDATE user SET winner = winner + ? WHERE promocode=?",
//                 [regerwallet, userData.use_promocode]
//             );

//             // log user's own commission
//             await connection.query(
//                 `INSERT INTO bet_c (gameid, userid, admin_id, bet_amount, amount)
//                  VALUES (?, ?, ?, ?, ?)`,
//                 [periodid, userData.id, userData.id, totalBetAmount, userShare]
//             );

//             // log upline commission
//             await connection.query(
//                 `INSERT INTO bet_c (gameid, userid, admin_id, bet_amount, amount)
//                  VALUES (?, ?, ?, ?, ?)`,
//                 [periodid, userData.id, admin[0].id, totalBetAmount, regerwallet]
//             );
//         }

//         // =====================
//         // ⭐ LOCK POOL
//         // =====================
//         const [poolRow] = await connection.query(
//             "SELECT admin_comm, pool FROM admin_pool WHERE id=1 FOR UPDATE"
//         );

//         const admin_per = poolRow[0].admin_comm || 0;
//         const admin_comm = totalBetAmount * admin_per / 100;
//         const newpool = totalBetAmount - admin_comm;

//         await connection.query(
//             "UPDATE admin_pool SET pool=pool+?, admin=admin+? WHERE id=1",
//             [newpool, admin_comm]
//         );

//         // =====================
//         // ⭐ SAVE BET
//         // =====================
//         await connection.query(
//             `INSERT INTO betting 
//             (periodid, userid, mobile, gamename,
//              betamount, bet_number, userwallet, pool)
//             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
//             [
//                 periodid,
//                 userData.id,
//                 userData.mobile,
//                 gamename,
//                 totalBetAmount,
//                 betJson,
//                 newUserWallet,
//                 poolRow[0].pool + newpool
//             ]
//         );

//         await connection.commit();

//         return res.json({
//             status: 1,
//             user_wallet: newUserWallet,
//             gameid: periodid,
//             message: "bet saved successfully"
//         });

//     } catch (err) {

//         await connection.rollback();
//         console.error("BET ERROR:", err);

//         return res.status(500).json({ status: 5, message: "internal error" });

//     } finally {

//         connection.release();
//     }
// };


const betrecords = async (req, res) => {
    console.log(req.body, "assdf");

    const { Token, page = 1 } = req.body;
    if (!Token || !page) {
        return res.status(400).json({ status: 5, message: "parameter miss" });
    }
    try {
        const limit = 30;
        const offset = (parseInt(page) - 1) * limit;
        const [user] = await conn.query("SELECT id FROM user WHERE token =? ", [Token]);
        if (user.length != 1) {
            return res.status(404).json({ status: 4, message: "user not found" });
        }
        const [records] = await conn.query("SELECT * FROM betting WHERE userid=? ORDER BY id DESC LIMIT ? OFFSET ?", [user[0].id, limit, offset]);
        const data = records.map(item => ({
            id: item.id,
            gameid: item.periodid,
            bet_amount: item.betamount,
            bet_number: item.bet_number,
            win_number: item.win_number,
            gamename: item.gamename,
            betwamount: item.amount,
            winamount: item.winamount,
            time: item.time
        }));
        const [pagee] = await conn.query("SELECT COUNT(id) AS total FROM betting WHERE userid=?", [user[0].id]);
        const totalRecords = pagee[0].total;

        // Calculate total pages
        const totalPages = Math.ceil(totalRecords / limit);
        return res.json({
            status: 1,
            data,
            totalRecords,
            totalPages,
            currentPage: parseInt(page)
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ status: 6, message: "server error" });
    }
}

const deposit = async (req, res) => {
    const { Token, page } = req.body;
    if (!Token || !page) {
        return res.status(400).json({ status: 5, message: "parameter miss" });
    }
    try {
        const limit = 10;
        const offset = (parseInt(page) - 1) * limit;
        const [user] = await conn.query("SELECT id FROM user WHERE token =? ", [Token]);
        if (user.length != 1) {
            return res.status(404).json({ status: 4, message: "user not found" });
        }
        const [records] = await conn.query("SELECT * FROM recharge WHERE userid=? ORDER BY id DESC LIMIT ? OFFSET ?", [user[0].id, limit, offset]);
        const data = records.map(item => ({
            id: item.id,
            txn_id: item.txn_id,
            status: item.status,
            method: item.method,
            time: item.time
        }));
        const [pagee] = await conn.query("SELECT COUNT(id) AS total FROM recharge WHERE userid=?", [user[0].id]);
        const totalRecords = pagee[0].total;

        // Calculate total pages
        const totalPages = Math.ceil(totalRecords / limit);
        return res.json({
            status: 1,
            data,
            totalRecords,
            totalPages,
            currentPage: parseInt(page)
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ status: 6, message: "server error" });
    }
}

const withdrawls = async (req, res) => {
    const { Token, page } = req.body;
    if (!Token || !page) {
        return res.status(400).json({ status: 5, message: "parameter miss" });
    }
    try {
        const limit = 10;
        const offset = (parseInt(page) - 1) * limit;
        const [user] = await conn.query("SELECT id FROM user WHERE token =? ", [Token]);
        if (user.length != 1) {
            return res.status(404).json({ status: 4, message: "user not found" });
        }
        const [records] = await conn.query("SELECT * FROM withdraw WHERE userid=? ORDER BY id DESC LIMIT ? OFFSET ?", [user[0].id, limit, offset]);
        const data = records.map(item => ({
            id: item.id,
            amount: item.amount,
            textamount: item.textamount,
            commission: item.commission,
            account: item.upiid ?? item.bankaccount,
            txn_id: item.txn_id,
            method: item.upiid ? 1 : 2,  // ✅ if upiid exists → 1 else 2
            time: item.time
        }));

        const [pagee] = await conn.query("SELECT COUNT(id) AS total FROM withdraw WHERE userid=?", [user[0].id]);
        const totalRecords = pagee[0].total;

        // Calculate total pages
        const totalPages = Math.ceil(totalRecords / limit);
        return res.json({
            status: 1,
            data,
            totalRecords,
            totalPages,
            currentPage: parseInt(page)
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ status: 6, message: "server error" });
    }
}

const despsitR = async (req, res) => {
    const { amount, txn_id, Token } = req.body;
    if (!amount || !txn_id || !Token) {
        return res.status(400).json({ status: 5, message: "parameter miss" });
    }
    try {
        const [user] = await conn.query("SELECT id,wallet, winamount, mobile FROM user WHERE token = ?", [Token]);
        if (user.length !== 1) {
            return res.status(401).json({ status: 7, message: "Token Invailed" });
        }
        const old_wallet = user[0].wallet + user[0].winamount;
        const mobile = user[0].mobile;
        const insett = "INSERT INTO `recharge`( `userid`, `old_wallet`, `transtion`, `mobile`, `amount`, `txn_id`, `bonus`, `status`, `method`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
        const [inn] = await conn.query(insett, [user[0].id, old_wallet, null, mobile, amount, txn_id, 0, 0, 2]);
        if (inn.affectedRows === 1) {
            return res.status(200).json({ status: 1, message: "request successfully sent" });
        } else {
            return res.status(503).json({ status: 2, message: "failed to insert data" });
        }

    } catch (error) {
        console.log(error);
        return res.status(500).json({ status: 6, message: "server error" });
    }
}


const withdrawlsR = async (req, res) => {
    console.log(req.body);

    const { TokenWith, AmountWith, upibank } = req.body;
    if (!TokenWith || !AmountWith) {
        return res.json({ status: 3, message: 'Token and amount are required' });
    }
    // ✅ 🔒 DUPLICATE REQUEST BLOCK (ONLY ADDITION)
    const lockKey = TokenWith + "_" + AmountWith;
    if (activeBets.has(lockKey)) {
        return res.json({ status: 9, message: "Duplicate request blocked" });
    }
    activeBets.add(lockKey);
    try {
        // Get user by token
        const [userRow] = await conn.query("SELECT * FROM user WHERE token = ?", [TokenWith]);
        if (userRow.length !== 1) {
            return res.json({ status: 3, message: 'Invalid token' });
        }
        const user = userRow[0];

        // Fetch admin data
        const [adminRow] = await conn.query("SELECT * FROM admin_setting WHERE id = 1");
        const admin = adminRow[0];
        const requestcount = admin.request;
        const minmun = admin.withdrawal_min;
        // Check today's withdrawal count (max 5 per day)
        const [todayWithdrawals] = await conn.query(
            `SELECT COUNT(*) AS total 
                FROM withdraw 
                WHERE userid = ? 
                AND DATE(time) = CURDATE()`,
            [user.id]
        );

        if (todayWithdrawals[0].total >= requestcount) {
            return res.json({
                status: 2,
                message: `Daily withdrawal limit reached (Max ${requestcount} per day)`
            });
        }
        if (minmun >= AmountWith) {
            return res.json({
                status: 2,
                message: `minmun withdrawal limit reached (min ${AmountWith} )`
            });
        }

        const use_refer = user.use_promocode;
        const [refer] = await conn.query("SELECT id FROM user WHERE promocode =?", [use_refer]);
        const refer_id = refer[0].id;
        // Total available balance
        const totalBalance = user.winamount + user.wallet;

        // Check withdrawal conditions
        if (totalBalance < AmountWith) {
            return res.json({ status: 2, message: 'Insufficient balance' });
        }

        // Deduct from winamount first, then wallet if needed
        let deductWin = 0;
        let deductWallet = 0;

        if (user.winamount >= AmountWith) {
            deductWin = AmountWith;
            deductWallet = 0;
        } else {
            deductWin = user.winamount;
            deductWallet = AmountWith - user.winamount;
        }

        const newWinAmount = user.winamount - deductWin;
        const newWallet = user.wallet - deductWallet;

        // Commission calculation
        const commission = admin.withdrawl_tax;
        const textamount = (AmountWith * commission) / 100;

        // Update user's winamount & wallet
        const [updateResult] = await conn.query(
            "UPDATE user SET winamount = ?, wallet = ? WHERE id = ?",
            [newWinAmount, newWallet, user.id]
        );
        if (updateResult.affectedRows !== 1) {
            return res.json({ status: 2, message: 'Server error during update' });
        }

        // Insert withdrawal record
        const insertQuery = `
            INSERT INTO withdraw 
            (userid,referid, mobile, amount, textamount, commission, upiid) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        const params = [user.id, refer_id, user.mobile, AmountWith, textamount, commission, upibank];
        const [withdrawInsert] = await conn.query(insertQuery, params);

        if (withdrawInsert.affectedRows !== 1) {
            return res.json({ status: 2, message: 'Withdraw insert failed' });
        }

        // Add to passbook (show old wallet before withdrawal)
        const oldWallet = totalBalance + user.bonus;
        await conn.query(
            "INSERT INTO passbook (userid, mobile, betamount, amount, type, old_wallet) VALUES (?, ?, ?, ?, ?, ?)",
            [user.id, user.mobile, AmountWith, 0, 'withrequest', oldWallet]
        );

        return res.json({
            status: 1,
            winning: newWinAmount,
            wallet: newWallet,
            message: 'Withdrawal successful'
        });

    } catch (err) {
        console.error(err);
        return res.json({ status: 2, message: 'Server error during withdrawal' });
    } finally {
        // ✅ IMPORTANT — ALWAYS REMOVE LOCK
        setTimeout(() => {
            activeBets.delete(lockKey);
        }, 1000);
    }
};



const withdrawlsrequest = async (req, res) => {
    try {
        const { TokenWith, AmountWith, upibank } = req.body;

        // ✅ 1. Validate input
        if (!TokenWith || !AmountWith || !upibank) {
            return res.status(400).json({ status: 0, message: "Missing required fields" });
        }

        // ✅ 2. Check user token
        const [userRow] = await conn.query("SELECT * FROM user WHERE token = ? ", [TokenWith]);
        if (userRow.length !== 1) {
            return res.status(404).json({ status: 4, message: "User not found" });
        }
        const user = userRow[0];

        // ✅ 3. Get admin settings
        const [adminRow] = await conn.query("SELECT * FROM admin_setting WHERE id = 1");
        if (adminRow.length !== 1) {
            return res.status(500).json({ status: 3, message: "Admin settings not found" });
        }
        const admin = adminRow[0];

        // ✅ 4. Calculate new wallet balance & commission
        if (user.winamount < AmountWith) {
            return res.status(400).json({ status: 5, message: "Insufficient balance" });
        }

        const newWinAmount = user.winamount - AmountWith;
        const commission = admin.withdrawl_tax; // percentage
        const textamount = (AmountWith * commission) / 100;

        // ✅ 5. Update user balance
        const [updateResult] = await conn.query(
            "UPDATE user SET winamount = ? WHERE id = ?",
            [newWinAmount, user.id]
        );

        if (updateResult.affectedRows !== 1) {
            return res.status(500).json({ status: 2, message: "Server error during update" });
        }

        // ✅ 6. Insert withdrawal record
        const [insertResult] = await conn.query(
            `INSERT INTO withdraw 
      (userid, mobile, old_wallet, amount, textamount, commission, bankaccount, status, time) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                user.id,
                user.mobile,
                user.winamount, // old wallet before update
                AmountWith,
                textamount,
                commission,
                upibank,
                "pending", // or 0 / 1 based on your system
                new Date()
            ]
        );

        if (insertResult.affectedRows !== 1) {
            return res.status(500).json({ status: 2, message: "Server error during insert" });
        }

        // ✅ 7. Return success
        return res.json({ status: 1, message: "Withdrawal successful" });

    } catch (error) {
        console.error("Withdraw request error:", error);
        return res.status(500).json({ status: 2, message: "Internal server error" });
    }
};
const load_game = async (req, res) => {
    console.log(req.body, "sdcv");

    const { token } = req.body;
    if (!token) {
        return res.status(400).json({ status: 5, message: "parameter miss" });
    }

    try {
        // get user
        const [user] = await conn.query(
            "SELECT id, wallet, winamount, winner FROM user WHERE token = ?",
            [token]
        );

        // ✅ FIX YOUR WRONG QUERY
        const [_time] = await conn.query("SELECT open_time, close_time FROM admin_pool WHERE id=1");

        if (_time.length === 0) {
            return res.json({ status: 7, message: "time setting missing" });
        }

        const open_time = _time[0].open_time;     // "09:00:00"
        const close_time = _time[0].close_time;   // "21:00:00"

        if (user.length !== 1) {
            return res.status(404).json({ status: 4, message: "user not found" });
        }

        // ✅ TIME CHECK
        const now = new Date();
        const currentTime = now.toTimeString().slice(0, 8); // "HH:mm:ss"

        // if (!(currentTime >= open_time && currentTime <= close_time)) {
        //     return res.json({
        //         status: 8,
        //         message: "Bet not allowed at this time",
        //         open_time,
        //         close_time,
        //         current_time: currentTime
        //     });
        // }

        // ✅ Continue original code
        const winnerr = user[0].winner;
        const user_wallet = user[0].wallet + user[0].winamount;

        // get last 5 results
        const [bet] = await conn.query(
            "SELECT id, gameid , win_number, xvalue FROM bet_result ORDER BY id DESC LIMIT 5"
        );

        const gameid = Number(bet[0]?.gameid);
        let periodid = gameid ? gameid + 1 : 1;

        const data = bet.map(item => ({
            periodid: item.gameid,
            xvalue: item.xvalue,
            win_number: item.win_number
        }));

        const [Bet_re] = await conn.query(
            "SELECT SUM(winamount) as Total FROM betting WHERE periodid = ? AND userid =?",
            [gameid, user[0].id]
        );

        const winner = Bet_re[0].Total ?? 0;

        return res.status(200).json({
            user_wallet,
            periodid,
            data,
            winner: winnerr
        });

    } catch (er) {
        console.log(er);
        return res.status(500).json({ status: 6, message: "server error" });
    }
};

const change_password = async (req, res) => {
    const { token, old_password, new_password } = req.body;

    if (!token || !old_password || !new_password) {
        return res.status(400).json({ status: 5, message: "parameter miss" });
    }

    try {
        // find user
        const [user] = await conn.query(
            "SELECT id, password FROM user WHERE token = ?",
            [token]
        );

        if (user.length !== 1) {
            return res.status(404).json({ status: 4, message: "user not found" });
        }

        // compare old password
        if (user[0].password !== md5(old_password)) {
            return res.status(401).json({ status: 3, message: "old password incorrect" });
        }

        // update new password
        await conn.query(
            "UPDATE user SET password = ? WHERE id = ?",
            [md5(new_password), user[0].id]
        );

        return res.status(200).json({ status: 1, message: "password updated successfully" });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: 6, message: "server error" });
    }
};


const withdrawlsRQ = async (req, res) => {
    const { token, amount, banknumber, ifsc_code, bank_name, bank_holder } = req.body;

    if (!token || !amount || !banknumber || !ifsc_code || !bank_name || !bank_holder) {
        return res.status(400).json({ status: 5, message: "parameter miss" });
    }

    try {
        // 1. Get user
        const [user] = await conn.query(
            "SELECT id, mobile, wallet, winamount FROM user WHERE token=?",
            [token]
        );

        if (user.length !== 1) {
            return res.status(404).json({ status: 4, message: "user not found" });
        }

        const userid = user[0].id;
        const mobile = user[0].mobile;
        let wallet = parseFloat(user[0].wallet);
        let winamount = parseFloat(user[0].winamount);
        const total_balance = wallet + winamount;

        // 2. Check balance
        if (total_balance < amount) {
            return res.status(400).json({ status: 3, message: "insufficient balance" });
        }

        // 3. Get withdraw tax %
        const [settings] = await conn.query(
            "SELECT withdrawl_tax FROM admin_setting WHERE id=1"
        );
        const taxPercent = settings[0].withdrawl_tax || 0;

        const commission = (amount * taxPercent) / 100;
        const textamount = amount - commission;

        // 4. Deduct balance (wallet first then winamount)
        let deductWallet = Math.min(wallet, amount);
        wallet -= deductWallet;

        let remaining = amount - deductWallet;
        if (remaining > 0) {
            winamount -= remaining;
        }

        // 5. Insert withdrawal request
        const now = moment().format("YYYY-MM-DD HH:mm:ss");

        await conn.query(
            `INSERT INTO withdraw 
            (userid, mobile, old_wallet, amount, textamount, commission, bankaccount, bankname, bankholder, ifsccode, status, time)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                userid,
                mobile,
                total_balance, // old wallet balance
                amount,
                textamount,
                commission,
                banknumber,
                bank_name,
                bank_holder,
                ifsc_code,
                0, // status = 0 (pending)
                now
            ]
        );

        // 6. Update user balance
        await conn.query(
            "UPDATE user SET wallet=?, winamount=? WHERE id=?",
            [wallet, winamount, userid]
        );

        return res.status(200).json({
            status: 1,
            message: "withdrawal request submitted",
            data: {
                old_wallet: total_balance,
                requested: amount,
                commission,
                final_amount: textamount,
                wallet,
                winamount
            }
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: 6, message: "server error" });
    }
};

const result = async (req, res) => {
    const { limit = 10 } = req.body;
    try {
        const [data_] = await conn.query("SELECT * FROM bet_result WHERE DATE(time) = CURDATE() ORDER BY id DESC LIMIT ?", [limit]);
        const data = data_.map((item) => ({
            id: item.id,
            gameid: item.gameid,
            result: item.win_number,
            xvalue: item.xvalue,
            time: item.time
        }));
        return res.json({ status: 1, data });
    } catch (erorr) {
        console.log(erorr);
        return res.status(500).json({ status: 6, message: "server error" });
    }
}

const winnerout = async (req, res) => {
    const { token } = req.body;
    console.log(req.body);

    if (!token) {
        return res.json({ status: 5, message: "parameter miss" });
    }
    // ✅ 🔒 DUPLICATE REQUEST BLOCK (ONLY ADDITION)
    const lockKey = token + "_" + "winnerout";
    if (activeBets.has(lockKey)) {
        return res.json({ status: 9, message: "Duplicate request blocked" });
    }
    activeBets.add(lockKey);
    try {
        const [user] = await conn.query("SELECT id, winner, winamount, wallet FROM user WHERE token=?", [token]);
        if (user.length !== 1) {
            return res.json({ status: 4, message: "user not found" });
        }
        const point = user[0].winner;
        if (user[0].winner < 0) {
            return res.json({ status: 8, message: "user wallet not enough" });
        }
        const wallet = user[0].wallet;
        const winner = user[0].winner - point;
        const winamount = user[0].winamount + point;
        const [update_] = await conn.query("UPDATE user set winner = winner -? , winamount = winamount + ? where id = ?", [point, point, user[0].id]);
        if (update_.affectedRows == 1) {
            return res.json({ status: 1, wallet, winner, winamount, message: "take successfull" });
        } else {
            return res.json({ status: 2, message: "internal server error" });
        }
    } catch (error) {
        console.log(error);
        return res.status(500).json({ status: 6, message: "server error" });
    } finally {
        setTimeout(() => {
            activeBets.delete(lockKey);
        }, 1000);
    }
}


const deposithistroy = async (req, res) => {
    console.log(req.body, "asd");

    const { token } = req.body;

    // ✅ Validate input
    if (!token) {
        return res.json({ status: 5, message: "parameter miss" });
    }

    try {
        // ✅ Validate user
        const [user] = await conn.query("SELECT id FROM user WHERE token=?", [token]);
        if (user.length !== 1) {
            return res.json({ status: 4, message: "user not found" });
        }

        const userid = user[0].id;

        // ✅ Fetch deposit records from both tables
        const [rechargeData] = await conn.query(
            "SELECT id, amount, status, time AS date, 'recharge' AS type FROM recharge WHERE userid=? AND status=1",
            [userid]
        );
        const [addRechData] = await conn.query(
            "SELECT id, amount, addcut, time AS date, 'add_rech' AS type FROM add_rech WHERE userid=? AND addcut=1",
            [userid]
        );
        // ✅ Combine both sources
        const combined = [...rechargeData, ...addRechData];
        // ✅ Sort by date (if column exists)
        combined.sort((a, b) => new Date(b.date) - new Date(a.date));
        return res.json({
            status: 1,
            message: "deposit history fetched successfully",
            data: combined,
        });

    } catch (error) {
        console.error("❌ Deposit History Error:", error);
        return res.status(500).json({ status: 6, message: "server error" });
    }
};

const getwhithdrawlshostroy = async (req, res) => {
    console.log(req.body, "asd");

    const { token } = req.body;

    // ✅ Validate input
    if (!token) {
        return res.json({ status: 5, message: "parameter miss" });
    }

    try {
        // ✅ Validate user
        const [user] = await conn.query("SELECT id FROM user WHERE token=?", [token]);
        if (user.length !== 1) {
            return res.json({ status: 4, message: "user not found" });
        }

        const userid = user[0].id;

        // ✅ Fetch deposit records from both tables
        const [rechargeData] = await conn.query(
            "SELECT id, amount, status, time AS date, 'withdraw' AS type FROM withdraw WHERE userid=? AND status=1",
            [userid]
        );
        const [addRechData] = await conn.query(
            "SELECT id, amount, addcut, time AS date, 'add_rech' AS type FROM add_rech WHERE userid=? AND addcut=2",
            [userid]
        );
        // ✅ Combine both sources
        const combined = [...rechargeData, ...addRechData];
        // ✅ Sort by date (if column exists)
        combined.sort((a, b) => new Date(b.date) - new Date(a.date));
        return res.json({
            status: 1,
            message: "deposit history fetched successfully",
            data: combined,
        });

    } catch (error) {
        console.error("❌ Deposit History Error:", error);
        return res.status(500).json({ status: 6, message: "server error" });
    }
}

const Today = async (req, res) => {
    console.log(req.body, "sdf");

    const { token, Fillter } = req.body; // ✅ filter = 0..4

    if (!token) {
        return res.json({ status: 5, message: "user not found" });
    }

    try {
        // ✅ Check user
        const [user] = await conn.query("SELECT id FROM user WHERE token=?", [token]);
        if (user.length !== 1) {
            return res.json({ status: 4, message: "user not found" });
        }
        // const winner = user[0].winner;
        const userId = user[0].id;
        const now = new Date();
        const endDate = now.toISOString().slice(0, 10);

        let whereQuery = "";

        if (Fillter == 0) {
            // Today
            whereQuery = `DATE(time) = CURDATE()`;
        } else if (Fillter == 1) {
            // Yesterday
            whereQuery = `DATE(time) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)`;
        } else if (Fillter == 2) {
            // This Week
            whereQuery = `YEARWEEK(time, 1) = YEARWEEK(CURDATE(), 1)`;
        } else if (Fillter == 3) {
            // This Month
            whereQuery = `MONTH(time) = MONTH(CURDATE()) AND YEAR(time) = YEAR(CURDATE())`;
        } else if (Fillter == 4) {
            // This Year
            whereQuery = `YEAR(time) = YEAR(CURDATE())`;
        } else {
            // ❌ Invalid or missing filter — fallback to "today"
            whereQuery = `DATE(time) = CURDATE()`;
        }
        const [tel] = await conn.query("SELECT SUM(amount) as total FROM bet_c WHERE userid=? AND admin_id=? AND status=0", [userId, userId]);
        const winner = tel[0].total;
        // ✅ MySQL Query
        const [data_] = await conn.query(
            `SELECT COALESCE(SUM(amount), 0) AS total 
             FROM bet_c 
             WHERE userid=? AND admin_id=? AND ${whereQuery}`,
            [userId, userId]
        );

        return res.json({
            status: 1,
            Fillter,
            endDate,
            winner,
            commission: data_[0].total
        });

    } catch (error) {
        console.log("❌ Error in Today:", error);
        return res.json({ status: 6, message: "server error" });
    }
};

const takeclaim = async (req, res) => {
    const { token } = req.body;
    if (!token) {
        return res.json({ status: 5, message: "paramater miss" });
    }
    // ✅ 🔒 DUPLICATE REQUEST BLOCK (ONLY ADDITION)
    const lockKey = token;
    if (activeBets.has(lockKey)) {
        return res.json({ status: 9, message: "Duplicate request blocked" });
    }
    activeBets.add(lockKey);
    try {

        const [user] = await conn.query("SELECT id, wallet, winamount FROM user WHERE token=?", [token]);
        if (user.length !== 1) {
            return res.json({ status: 4, message: "user not found" });
        }
        const userId = user[0].id;
        const [tel] = await conn.query("SELECT SUM(amount) as total FROM bet_c WHERE userid=? AND admin_id=? AND  status = 0", [userId, userId]);
        let winner = tel[0].total;
        const wallet = user[0].wallet + winner;
        // const winner = 0;
        const winamount = user[0].winamount;
        const [upatee] = await conn.query("UPDATE user SET  wallet=?  WHERE id=?", [wallet, user[0].id]);
        const userwallet = wallet + winamount;
        const datetime = new Date().toLocaleString('en-GB', { hour12: false });
        await conn.query("UPDATE bet_c SET status = 1, userwallet = ? , claimtime = ? WHERE userid = ?", [userwallet, datetime, userId]);
        if (upatee.affectedRows == 1) {
            return res.json({ status: 1, winamount, wallet, winner: 0 });
        } else {
            return res.json({ status: 2, message: "internal server error" });
        }
    } catch (error) {
        console.log(error);
        return res.json({ status: 6, message: "server error" });
    } finally {
        // ✅ IMPORTANT — ALWAYS REMOVE LOCK
        setTimeout(() => {
            activeBets.delete(lockKey);
        }, 1000);
    }
}

export default {
    livewalletdata,
    proImageChange,
    nameeditapi,
    mybonusAPi,
    RankAPi,
    betting1,
    betting2,
    withdrawlsRQ,
    betrecords,
    deposit,
    withdrawls,
    despsitR,
    withdrawlsR,
    load_game,
    change_password,
    result,
    withdrawlsrequest,
    winnerout,
    deposithistroy,
    getwhithdrawlshostroy,
    Today,
    takeclaim
}