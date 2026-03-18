import express, { json } from 'express';
import conn from '../config/db_conn.js';
import md5 from 'md5';

import dotenv from "dotenv";
dotenv.config();

const userPorfilUpdate = async (req, res) => {
    const { userid, name, mobile, block, commision, email, password, winner } = req.body;

    if (!userid || !name || !mobile || !block || !winner) {
        return res.json({ Qstatus: 3, message: "Parameter missing!" });
    }

    try {
        // ✅ Check if user exists
        const [userdata] = await conn.query(
            "SELECT mobile, id, block, email FROM user WHERE id = ?",
            [userid]
        );

        if (userdata.length !== 1) {
            return res.json({ Qstatus: 3, message: "User not found!" });
        }

        // ✅ Check if new mobile is already used by another user
        if (userdata[0].mobile !== mobile) {
            const [mobileNum] = await conn.query(
                "SELECT id FROM user WHERE mobile = ? AND id != ?",
                [mobile, userid]
            );
            if (mobileNum.length > 0) {
                return res.json({ Qstatus: 4, message: "This mobile is already in use!" });
            }
        }

        // ✅ Check if new email is already used by another user
        if (email) {
            const [emailData] = await conn.query(
                "SELECT id FROM user WHERE email = ? AND id != ?",
                [email, userid]
            );
            if (emailData.length > 0) {
                return res.json({ Qstatus: 5, message: "This email is already in use!" });
            }
        }
        if (password) {
            const newPassowrd = md5(password);
            await conn.query("UPDATE user SET password=? WHERE id=?", [newPassowrd, userid]);
        }

        // ✅ Update user profile
        const [Result] = await conn.query(
            "UPDATE user SET mobile = ?, name = ?, block = ?, commision = ?, email = ?, winner = ?  WHERE id = ?",
            [mobile, name, block, commision, email,winner,  userid]
        );

        if (Result.affectedRows === 1) {
            return res.json({ Qstatus: 1, message: "Updated successfully!" });
        } else {
            return res.json({ Qstatus: 2, message: "Server error!" });
        }
    } catch (error) {
        console.error("Profile Update Error:", error);
        res.status(500).json({ Qstatus: 5, message: "Internal error!" });
    }
};

const userBankUpdate = async (req, res) => {
    const userid = req.body.userid;
    const upi = req.body.upi;
    const bank = req.body.bank;
    if (!userid && !upi && !bank) {
        return res.json({ Qststus: 3, message: 'paramater miss !' });
    }
    try {
        const Squery = "SELECT account,upiid FROM bankkyc WHERE userid = ?";
        const [bankKyc] = await conn.query(Squery, [userid]);
        if (bankKyc.length != 1) {
            return res.json({ Qstatus: 3, message: 'user not found' });
        }

        const query = "UPDATE bankkyc SET upiid = ?, account = ? WHERE userid = ? ";
        const [Result] = await conn.query(query, [upi, bank, userid]);
        if (Result.affectedRows == 1) {
            return res.json({ Qstatus: 1, message: 'Updated Successfull !' });
        } else {
            return res.json({ Qstatus: 2, message: 'Server error !' });
        }
    } catch (error) {
        console.log(error);

        res.status(500).json({ Qstatus: 5, message: "internal error !" });
    }
};

const addSelfDeposit = async (req, res) => {
    const { amount, AddBonus } = req.body;
    if (!amount || !AddBonus) {
        return res.json({ Qstatus: 3, message: 'paramter missing' });
    }
    try {
        const query = "INSERT INTO self_bonus_list(amount, bonus) VALUES (?, ?)";
        const [result] = await conn.query(query, [amount, AddBonus]);
        if (result.affectedRows === 1) {
            return res.json({ Qstatus: 1, message: 'Update successful' });
        } else {
            return res.json({ Qstatus: 2, message: 'server error' });
        }
    } catch (error) {
        return res.status(500).json({ Qstatus: 5, message: 'internal error' });
    }
};

const UpdateSetitng = async (req, res) => {
    const amount = req.body.amount;
    const bonus = req.body.bonus;
    const addIdd = req.body.addIdd;

    // Validate request parameters
    if (!amount || !bonus || !addIdd) {
        return res.status(400).json({ Qstatus: 3, message: 'Parameter Missing' });
    }
    try {
        const query = "UPDATE self_bonus_list SET amount = ?, bonus = ? WHERE id = ?";
        const [Rquery] = await conn.query(query, [amount, bonus, addIdd]);
        if (Rquery.affectedRows == 1) {
            return res.json({ Qstatus: 1, message: 'Update Successfull ' });
        } else {
            return res.json({ Qstatus: 2, message: 'Server error' });
        }
    } catch (error) {
        res.status(500).json({ Qstatus: 5, message: 'Internal Error' });
    }
};

const referUpdate = async (req, res) => {
    const { amount, level1, level2, level3, level4 } = req.body;
    if (!amount || !level1 || !level2 || !level3 || !level4) {
        return res.json({ Qstatus: 3, message: 'paramter Miss' });
    }
    try {
        const query = "UPDATE commission SET amount = ? , level1 = ?, level2 = ?, level3 = ?, level4 = ? WHERE id = ? ";
        const [Rquery] = await conn.query(query, [amount, level1, level2, level3, level4, 1]);
        if (Rquery.affectedRows == 1) {
            return res.json({ Qstatus: 1, message: 'Update Successfull' });
        } else {
            return res.json({ Qstatus: 2, message: 'Server error' });
        }
    } catch (error) {
        return res.status(500).json({ Qstatus: 5, message: error });
    }
};

const updateGamepool = async (req, res) => {
    // console.log(req.body);
    
    const { gamepool, adminprofile, admincommsion, open_time, close_time, claim_open, claim_close, withdrawal_min, request1 } = req.body;
    if (!gamepool || !adminprofile || !admincommsion || !open_time || !close_time || !withdrawal_min || !request1) {
        return res.json({ Qstatus: 3, message: 'paramter missing !' });
    }
    try {
        const query = "UPDATE admin_pool SET pool= ?, admin= ?, admin_comm= ?, open_time = ? , close_time=?  WHERE id= 1";
        const query1 = conn.query("UPDATE admin_setting SET claim_open=?, claim_close=?, withdrawal_min =?, request=?  WHERE id= 1", [claim_open, claim_close, withdrawal_min, request1]);
        const [Rquery] = await conn.query(query, [gamepool, adminprofile, admincommsion, open_time, close_time]);
        if (Rquery.affectedRows == 1) {
            return res.json({ Qstatus: 1, message: 'Update Successfull' });
        } else {
            return res.json({ Qstatus: 2, message: 'Server error' });
        }
    } catch (error) {
        return res.status(500).json({ Qstatus: 5, message: error });
    }
};
const updatePayment = async (req, res) => {
    const { deposit_min, deposit_max, withdrawal_min, withdrawal_max, game_tax, newuser_wallet, newuser_bonus } = req.body;
    if (!deposit_min || !deposit_max || !withdrawal_min || !withdrawal_max || !game_tax || !newuser_wallet || !newuser_bonus) {
        return res.json({ Qstatus: 3, message: 'paramter missing !' });
    }
    try {
        const query = "UPDATE admin_setting SET deposit_min= ?, deposit_max= ?, withdrawal_min= ?, withdrawal_max= ?, game_tax= ?, newuser_wallet= ? , newuser_bonus= ? WHERE id= 1";
        const [Rquery] = await conn.query(query, [deposit_min, deposit_max, withdrawal_min, withdrawal_max, game_tax, newuser_wallet, newuser_bonus]);
        if (Rquery.affectedRows == 1) {
            return res.json({ Qstatus: 1, message: 'Update Successfull' });
        } else {
            return res.json({ Qstatus: 2, message: 'Server error' });
        }
    } catch (error) {
        return res.status(500).json({ Qstatus: 5, message: error });
    }
};

const gameactiveA = async (req, res) => {
    const idd = req.body.idd;
    const on = req.body.on;
    console.log(idd, on);

    if (typeof idd === 'undefined' || typeof on === 'undefined') {
        return res.json({ Qstatus: 3, message: 'Parameter miss!' });
    }

    try {
        const query = "UPDATE active_game SET active = ? WHERE id = ?";
        const [Qquery] = await conn.query(query, [on, idd]);
        if (Qquery.affectedRows == 1) {
            return res.json({ Qstatus: 1, message: 'Update successfull' });
        } else {
            return res.json({ Qstatus: 2, message: 'server error' });
        }
    } catch (error) {
        return res.status(500).json({ Qstatus: 5, message: 'internal Error' });
    }
};

function generatePromoCode() {
    return Math.floor(10000 + Math.random() * 90000).toString();
}
const adduser = async (req, res) => {
    const { name, mobile, password, type, commission, email } = req.body;

    // ✅ Validate required fields
    if (!name || !mobile || !password || !type || !commission || !email) {
        return res.status(400).json({ status: 5, message: "Parameter missing" });
    }

    try {
        // ✅ Check if mobile already exists
        const [userMobile] = await conn.query("SELECT id FROM user WHERE mobile = ?", [mobile]);
        if (userMobile.length > 0) {
            return res.status(409).json({ status: 9, message: "Mobile already exists" });
        }

        // ✅ Check if email already exists
        const [userEmail] = await conn.query("SELECT id FROM user WHERE email = ?", [email]);
        if (userEmail.length > 0) {
            return res.status(409).json({ status: 10, message: "Email already exists" });
        }

        // ✅ Generate promo code & hash password
        const code = generatePromoCode(); // Ensure this helper exists
        const passwordHash = md5(password);

        // ✅ Insert into user table
        const [insertResult] = await conn.query(
            "INSERT INTO `user`(`name`, `mobile`, `wallet`, `winamount`, `promocode`, `use_promocode`, `admin_promocode`, `password`, `commision`, `login_type`, `email`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [name, mobile, 0, 0, code, 'admin', 'admin', passwordHash, commission, type, email]
        );

        // ✅ Create KYC record
        const userId = insertResult.insertId;
        await conn.query("INSERT INTO `bankkyc`(`userid`) VALUES (?)", [userId]);

        return res.status(200).json({ status: 1, message: "User added successfully" });

    } catch (error) {
        console.error("Error in adduser:", error);
        return res.status(500).json({ status: 0, message: "Server error" });
    }
};




const getAdminFinanceData = async (req, res) => {
    try {
        // ✅ Pagination
        let page = parseInt(req.body.page) || 1;
        let limit = parseInt(req.body.limit) || 10;
        let offset = (page - 1) * limit;

        // ✅ Filters
        let { userid, mobile, admin_id, start, end } = req.body;

        // ✅ WHERE conditions builder
        let where = "WHERE 1";
        let params = [];

        if (userid) {
            where += " AND userid = ?";
            params.push(userid);
        }

        if (mobile) {
            where += " AND mobile LIKE ?";
            params.push(`%${mobile}%`);
        }

        if (admin_id) {
            where += " AND admin_id = ?";
            params.push(admin_id);
        }

        if (start && end) {
            where += " AND DATE(time) BETWEEN ? AND ?";
            params.push(start, end);
        }

        // ✅ 1. Fetch Add Recharges (With Pagination + Filter)
        const [addRecharges] = await conn.query(
            `SELECT id, userid, admin_id, mobile, amount, addcut, time 
             FROM add_rech 
             ${where}
             ORDER BY id DESC
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        // ✅ Get Total Count
        const [countRows] = await conn.query(
            `SELECT COUNT(*) AS total FROM add_rech ${where}`,
            params
        );
        let total = countRows[0].total;

        // ✅ 2. Transfers (no filters applied)
        const [transfers] = await conn.query(
            `SELECT id, sender, receiver, sender_mobile, receiver_mobile, 
             amount, type, time 
             FROM transfer ORDER BY id DESC`
        );

        // ✅ 3. Withdraws (no filters applied)
        const [withdraws] = await conn.query(
            `SELECT id, userid, referid, mobile, old_wallet, amount, textamount, 
            commission, upiid, bankaccount, bankname, bankholder, ifsccode, 
            status, time 
             FROM withdraw 
             ORDER BY id DESC`
        );

        // ✅ Response
        res.json({
            status: true,
            page,
            limit,
            total,
            total_pages: Math.ceil(total / limit),
            message: "Admin Finance Data Loaded",
            data: {
                add_rech: addRecharges,
                transfer: transfers,
                withdraw: withdraws
            }
        });

    } catch (error) {
        console.error("Admin Finance Error:", error);
        res.status(500).json({
            status: false,
            message: "Server Error",
            error: error.message
        });
    }
};

// ================== GET ADD RECHARGES ==================
const getAddRecharges = async (req, res) => {
    try {
        let page = parseInt(req.body.page) || 1;
        let limit = parseInt(req.body.limit) || 10;
        let offset = (page - 1) * limit;

        let { userid, mobile, admin_id, start, end } = req.body;

        let where = "WHERE admin_id != 0 ";
        let params = [];

        if (userid) {
            where += " AND userid = ? ";
            params.push(userid);
        }

        if (mobile) {
            where += " AND mobile LIKE ?";
            params.push(`%${mobile}%`);
        }

        if (admin_id) {
            where += " AND admin_id = ?";
            params.push(admin_id);
        }

        if (start && end) {
            where += " AND DATE(time) BETWEEN ? AND ?";
            params.push(start, end);
        }

        const [rows] = await conn.query(
            `SELECT id, userid, admin_id, mobile, amount, addcut, time 
             FROM add_rech 
             ${where}
             ORDER BY id DESC
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        // ✅ Using your date logic
        const data = rows.map(item => ({
            ...item,
            time: item.time instanceof Date
                ? item.time.toLocaleString('en-IN', { hour12: false })
                : item.time
        }));
        // Get total count
        const [countRows] = await conn.query(
            `SELECT COUNT(*) AS total FROM add_rech ${where}`,
            params
        );
        let total = countRows[0].total;
        res.json({
            page,
            limit,
            total,
            total_pages: Math.ceil(total / limit),
            status: true,
            message: "Add Recharges Data Loaded",
            data
        });

    } catch (error) {
        console.error("Get Add Recharges Error:", error);
        res.status(500).json({
            status: false,
            message: "Server Error",
            error: error.message
        });
    }
};

// ================== GET TRANSFERS ==================
const getTransfers = async (req, res) => {
    try {
        let page = parseInt(req.body.page) || 1;
        let limit = parseInt(req.body.limit) || 10;
        let offset = (page - 1) * limit;

        // Filters
        let { sender, receiver, mobile, start, end } = req.body;

        // WHERE conditions
        let where = "WHERE 1";
        let params = [];

        if (sender) {
            where += " AND sender = ?";
            params.push(sender);
        }

        if (receiver) {
            where += " AND receiver = ?";
            params.push(receiver);
        }

        if (mobile) {
            where += " AND (sender_mobile LIKE ? OR receiver_mobile LIKE ?)";
            params.push(`%${mobile}%`, `%${mobile}%`);
        }

        if (start && end) {
            where += " AND DATE(time) BETWEEN ? AND ?";
            params.push(start, end);
        }

        // Fetch data with pagination
        const [data] = await conn.query(
            `SELECT id, sender, receiver, sender_mobile, receiver_mobile, 
             amount, type, time 
             FROM transfer 
             ${where}
             ORDER BY id DESC
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        // Get total count
        const [countRows] = await conn.query(
            `SELECT COUNT(*) AS total FROM transfer ${where}`,
            params
        );
        let total = countRows[0].total;

        res.json({
            status: true,
            page,
            limit,
            total,
            total_pages: Math.ceil(total / limit),
            message: "Transfers Data Loaded",
            data: data
        });

    } catch (error) {
        console.error("Get Transfers Error:", error);
        res.status(500).json({
            status: false,
            message: "Server Error",
            error: error.message
        });
    }
};

// ================== GET WITHDRAWALS ==================
const getWithdraws = async (req, res) => {
    try {
        let page = parseInt(req.body.page) || 1;
        let limit = parseInt(req.body.limit) || 10;
        let offset = (page - 1) * limit;

        // Filters
        let { userid, mobile, status, start, end } = req.body;

        // WHERE conditions
        let where = "WHERE 1";
        let params = [];

        if (userid) {
            where += " AND userid = ?";
            params.push(userid);
        }

        if (mobile) {
            where += " AND mobile LIKE ?";
            params.push(`%${mobile}%`);
        }

        if (status !== undefined && status !== '') {
            where += " AND status = ?";
            params.push(status);
        }

        if (start && end) {
            where += " AND DATE(time) BETWEEN ? AND ?";
            params.push(start, end);
        }

        // Fetch data with pagination
        const [data] = await conn.query(
            `SELECT id, userid, referid, mobile, old_wallet, amount, textamount, 
             commission, upiid, bankaccount, bankname, bankholder, ifsccode, 
             status, time 
             FROM withdraw 
             ${where}
             ORDER BY id DESC
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        // Get total count
        const [countRows] = await conn.query(
            `SELECT COUNT(*) AS total FROM withdraw ${where}`,
            params
        );
        let total = countRows[0].total;

        res.json({
            status: true,
            page,
            limit,
            total,
            total_pages: Math.ceil(total / limit),
            message: "Withdrawals Data Loaded",
            data: data
        });

    } catch (error) {
        console.error("Get Withdrawals Error:", error);
        res.status(500).json({
            status: false,
            message: "Server Error",
            error: error.message
        });
    }
};

// ================== EXPORT ADD RECHARGES ==================
const exportAddRecharges = async (req, res) => {
    try {
        const [data] = await conn.query(
            `SELECT id, userid, admin_id, mobile, amount, addcut, time 
             FROM add_rech 
             ORDER BY id DESC`
        );

        // Create CSV
        let csv = 'ID,User ID,Admin ID,Mobile,Amount,Add/Cut,Time\n';
        data.forEach(row => {
            csv += `${row.id},${row.userid},${row.admin_id || 'N/A'},${row.mobile},${row.amount},${row.addcut},${row.time}\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=add_recharges.csv');
        res.send(csv);

    } catch (error) {
        console.error("Export Add Recharges Error:", error);
        res.status(500).json({
            status: false,
            message: "Export Failed",
            error: error.message
        });
    }
};
// ================== GET TRANSFERS ==================
const exportTransfers = async (req, res) => {
    try {
        let page = parseInt(req.body.page) || 1;
        let limit = parseInt(req.body.limit) || 10;
        let offset = (page - 1) * limit;

        let { sender, receiver, mobile, start, end } = req.body;

        let where = "WHERE 1";
        let params = [];

        if (sender) {
            where += " AND sender = ?";
            params.push(sender);
        }

        if (receiver) {
            where += " AND receiver = ?";
            params.push(receiver);
        }

        if (mobile) {
            where += " AND (sender_mobile LIKE ? OR receiver_mobile LIKE ?)";
            params.push(`%${mobile}%`, `%${mobile}%`);
        }

        if (start && end) {
            where += " AND DATE(time) BETWEEN ? AND ?";
            params.push(start, end);
        }

        const [rows] = await conn.query(
            `SELECT id, sender, receiver, sender_mobile, receiver_mobile, 
             amount, type, time 
             FROM transfer 
             ${where}
             ORDER BY id DESC
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        // ✅ Using your date logic
        const data = rows.map(datas => ({
            ...datas,
            time: datas.time instanceof Date
                ? datas.time.toLocaleString('en-IN', { hour12: false })
                : datas.time
        }));

        res.json({
            status: true,
            page,
            limit,
            message: "Transfers Data Loaded",
            data
        });

    } catch (error) {
        console.error("Get Transfers Error:", error);
        res.status(500).json({
            status: false,
            message: "Server Error",
            error: error.message
        });
    }
};

// ================== EXPORT WITHDRAWALS ==================
const exportWithdraws = async (req, res) => {
    try {
        const [data] = await conn.query(
            `SELECT id, userid, referid, mobile, old_wallet, amount, textamount, 
             commission, upiid, bankaccount, bankname, bankholder, ifsccode, status, time 
             FROM withdraw 
             ORDER BY id DESC`
        );

        // Create CSV Header
        let csv = 'ID,User ID,Refer ID,Mobile,Old Wallet,Amount,Text Amount,Commission,UPI ID,Bank Account,Bank Name,Bank Holder,IFSC Code,Status,Time\n';

        data.forEach(row => {

            const status = row.status == 1
                ? 'Approved'
                : row.status == 2
                    ? 'Rejected'
                    : 'Pending';

            // ✅ Date Only Format
            const formattedTime = row.time instanceof Date
                ? row.time.toLocaleString('en-IN', { hour12: false })
                : row.time;

            csv += `${row.id},${row.userid},${row.referid || 'N/A'},${row.mobile},${row.old_wallet},${row.amount},${row.textamount},${row.commission},${row.upiid || 'N/A'},${row.bankaccount || 'N/A'},${row.bankname || 'N/A'},${row.bankholder || 'N/A'},${row.ifsccode || 'N/A'},${status},${formattedTime}\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=withdrawals.csv');
        res.send(csv);

    } catch (error) {
        console.error("Export Withdrawals Error:", error);
        res.status(500).json({
            status: false,
            message: "Export Failed",
            error: error.message
        });
    }
};


const livepool = async (req, res) => {
    try {
        const [poo] = await conn.query("SELECT * FROM `admin_pool` WHERE id=1");
        const pool = poo[0].pool;
        return res.json({ status: 1, pool });
    } catch (error) {
        console.log(error);
        return res.json({ status: 6, message: "server error" });
    }
}

export default {
    userPorfilUpdate,
    userBankUpdate,
    addSelfDeposit,
    UpdateSetitng,
    referUpdate,
    updateGamepool,
    updatePayment,
    gameactiveA,
    adduser,
    getAdminFinanceData,

    getAddRecharges,
    getTransfers,
    getWithdraws,
    exportAddRecharges,
    exportTransfers,
    exportWithdraws,
    livepool
};