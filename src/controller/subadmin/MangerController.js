import express, { json } from 'express';
import conn from '../../config/db_conn.js';
import md5 from 'md5';
import jwt from 'jsonwebtoken';
const activeBets = new Set();
import { sendOTP } from "../utils/sendMail.js";
// import { use } from 'react';

const SECRET_KEY = "Pawan_Saini";

// ✅ Generate random 6-digit OTP
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000);
}
function generate18DigitNumber() {
    const timestamp = Date.now(); // Current timestamp in milliseconds
    const randomPart = Math.floor(100000 + Math.random() * 900000); // 6 random digits
    return `${timestamp}${randomPart}`.slice(0, 15); // Ensure it's exactly 18 digits
}


const loginsendotp = async (req, res) => {
    const { mobile, password } = req.body;
    if (!mobile || !password) {
        return res.status(400).json({ status: 5, message: "Missing parameters" });
    }

    try {
        const [user] = await conn.query(
            "SELECT id, password, mobile, name, block, email FROM user WHERE mobile=? AND login_type=3",
            [mobile]
        );

        if (user.length !== 1) {
            return res.status(404).json({ status: 4, message: "User not found" });
        }

        const u = user[0];

        if (u.block == 1) {
            return res.status(403).json({ status: 4, message: "User is blocked" });
        }

        if (md5(password) !== u.password) {
            return res.status(401).json({ status: 3, message: "Invalid password" });
        }

        // const otp = generateOTP();
        const otp = 9876;

        // ✅ Save OTP temporarily in DB
        await conn.query("UPDATE user SET otp=? WHERE id=?", [otp, u.id]);
        const email = user[0].email;
        // ✅ Send OTP to user email
        // sendOTP(email, otp);

        return res.json({
            status: 1,
            message: "OTP sent to registered email",
        });

    } catch (error) {
        console.error("Login OTP Error:", error);
        return res.status(500).json({ status: 6, message: "Server error" });
    }
};

const loginverifyotp = async (req, res) => {
    const { mobile, otp } = req.body;
    if (!mobile || !otp) {
        return res.status(400).json({ status: 5, message: "Missing parameters" });
    }

    try {
        const [user] = await conn.query(
            "SELECT id, name, mobile, otp FROM user WHERE mobile=? AND login_type=3",
            [mobile]
        );

        if (user.length !== 1) {
            return res.status(404).json({ status: 4, message: "User not found" });
        }

        const u = user[0];
        if (u.otp != otp) {
            return res.status(401).json({ status: 3, message: "Invalid OTP" });
        }

        // ✅ Clear OTP after success
        await conn.query("UPDATE user SET otp=0 WHERE id=?", [u.id]);

        // ✅ Generate token + JWT
        const token = generate18DigitNumber();
        const token1 = jwt.sign({ id: u.id, role: "subadmin" }, SECRET_KEY, { expiresIn: "7d" });
        await conn.query("UPDATE user SET token=? WHERE id=?", [token, u.id]);

        return res.json({
            status: 1,
            token,
            token1,
            name: u.name,
            userid: u.id,
            mobile: u.mobile,
            message: "Login successful",
        });
    } catch (error) {
        console.error("Verify OTP Error:", error);
        return res.status(500).json({ status: 6, message: "Server error" });
    }
};

const loginapi = async (req, res) => {
    const { mobile, password } = req.body;
    if (!mobile || !password) {
        return res.status(400).json({ status: 5, message: "Missing parameters" });
    }

    try {
        const [user] = await conn.query(
            "SELECT id, name, mobile, otp, password FROM user WHERE mobile=? AND login_type=3",
            [mobile]
        );

        if (user.length !== 1) {
            return res.status(404).json({ status: 4, message: "User not found" });
        }

        const u = user[0];
        if (md5(password) !== u.password) {
            return res.status(401).json({ status: 3, message: "Invalid password" });
        }

        // ✅ Clear OTP after success
        await conn.query("UPDATE user SET otp=0 WHERE id=?", [u.id]);

        // ✅ Generate token + JWT
        const token = generate18DigitNumber();
        const token1 = jwt.sign({ id: u.id, role: "subadmin" }, SECRET_KEY, { expiresIn: "7d" });
        await conn.query("UPDATE user SET token=? WHERE id=?", [token, u.id]);

        return res.json({
            status: 1,
            token,
            token1,
            name: u.name,
            userid: u.id,
            mobile: u.mobile,
            message: "Login successful",
        });
    } catch (error) {
        console.error("Verify OTP Error:", error);
        return res.status(500).json({ status: 6, message: "Server error" });
    }
};


const alluser = async (req, res) => {
    const { page, token, search = "", startdate = "", enddate = "", login_type } = req.body;
    const limit = 10;

    if (!page || !token) {
        return res.status(400).json({ status: 5, message: "parameter miss" });
    }

    try {
        // ✅ Validate token
        const [user] = await conn.query("SELECT id, promocode FROM user WHERE token=?", [token]);
        if (user.length !== 1) {
            return res.status(404).json({ status: 4, message: "user not found" });
        }

        const promocode = user[0].promocode;
        const offset = (page - 1) * limit;

        // ✅ Base WHERE clause and params
        let whereClauses = ["(use_promocode = ? OR admin_promocode = ?)"];
        let params = [promocode, promocode];
        whereClauses.push("login_type != 3");
        // ✅ Add search
        if (search && search.trim() !== "") {
            whereClauses.push("(name LIKE ? OR mobile LIKE ?)");
            params.push(`%${search}%`, `%${search}%`);
        }

        // ✅ Add date filter
        if (startdate && enddate) {
            whereClauses.push("DATE(time) BETWEEN ? AND ?");
            params.push(startdate, enddate);
        }
        if (login_type != 0) {
            whereClauses.push("login_type = ?");
            params.push(login_type);
        }
        const whereSQL = whereClauses.join(" AND ");

        // ✅ Get total count
        const [totalRes] = await conn.query(
            `SELECT COUNT(*) AS total FROM user WHERE ${whereSQL}`,
            params
        );
        const total = totalRes[0].total;

        // ✅ Get paginated data
        const paginatedParams = [...params, limit, offset];
        const [data1] = await conn.query(
            `SELECT * FROM user WHERE ${whereSQL} ORDER BY id DESC LIMIT ? OFFSET ?`,
            paginatedParams
        );

        const data = data1.map(item => ({
            id: item.id,
            name: item.name,
            mobile: item.mobile,
            wallet: item.wallet,
            winwallet: item.winamount,
            otp: item.otp,
            login_type: item.login_type,
            block: item.block,
            commision: item.commision,
            join_time: item.time instanceof Date ? item.time.toLocaleString('en-IN', { hour12: false }) : item.time,
        }));

        const totalPages = Math.ceil(total / limit);
        return res.status(200).json({
            status: 1,
            message: "Success",
            total,
            page,
            total_pages: totalPages,
            per_page: limit,
            data
        });

    } catch (error) {
        console.error("Error in alluser API:", error);
        return res.status(500).json({ status: 0, message: "Server error" });
    }
};



function generatePromoCode() {
    // return 44049;
    return Math.floor(1000000 + Math.random() * 9000000).toString();
}

const adduser = async (req, res) => {
    const { name, mobile, password, type, commission, token } = req.body;
    if (!name || !mobile || !password || !type || !commission || !token) {
        return res.status(400).json({ status: 5, message: "parameter miss" });
    }
    try {
        const [user] = await conn.query("SELECT id, promocode FROM user WHERE mobile = ?", [mobile]);
        const [use_user] = await conn.query("SELECT id, promocode, commision FROM user WHERE token = ?", [token]);
        if (user.length != 0) {
            return res.status(409).json({ status: 9, message: "Already exists" });
        }
        if (use_user[0].commision < commission) {
            return res.json({ status: 7, message: "you have not enought commission limit" })
        }
        const code = generatePromoCode(); // Make sure this function is defined
        const password1 = md5(password);
        const usr_promocode = use_user[0].promocode;
        const [setdata] = await conn.query(
            "INSERT INTO `user`(`name`, `mobile`, `wallet`, `winamount`, `promocode`, `use_promocode`, `admin_promocode`, `password`, `commision`, `login_type`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [name, mobile, 0, 0, code, usr_promocode, 'admin', password1, commission, type]
        );
        const [userrr] = await conn.query("SELECT id FROM user WHERE mobile=?", [mobile]);
        const userid = userrr[0].id;
        const [bank] = await conn.query("INSERT INTO `bankkyc`( `userid`) VALUES (?)", [userid]);
        if (setdata.affectedRows == 1) {
            return res.status(200).json({ status: 1, message: "user add successfull" });
        } else {
            return res.status(503).json({ status: 2, message: "internal error" });
        }

    } catch (er) {
        console.error("Error in adduser:", er);
        return res.status(500).json({ status: 0, message: "Server error" });
    }
};

const removeuser = async (req, res) => {
    const { token, id } = req.body;
    if (!token || !id) {
        return res.status(400).json({ status: 5, message: "parameter miss" });
    }
    try {
        const [admin] = await conn.query("SELECT id FROM user WHERE token = ?", [token]);
        if (admin.length != 1) {
            return res.status(404).json({ status: 4, message: "user not found" });
        }
        const [user] = await conn.query("SELECT id FROM user WHERE id = ?", [id]);
        if (user.length != 1) {
            return res.status(404).json({ status: 4, message: "user not found" });
        }

        const userid = user[0].id;
        await conn.query("DELETE FROM `user_bonus` WHERE `userid`=? ", [userid]);
        await conn.query("DELETE FROM `withdraw` WHERE `userid`=? ", [userid]);
        await conn.query("DELETE FROM `user` WHERE `id`=? ", [userid]);
        await conn.query("DELETE FROM `self_bonus` WHERE `userid`=? ", [userid]);
        await conn.query("DELETE FROM `recharge` WHERE `userid`=? ", [userid]);
        await conn.query("DELETE FROM `daily_bonus_record` WHERE `userid`=? ", [userid]);
        await conn.query("DELETE FROM `bonus_trade` WHERE `userid`=? ", [userid]);
        await conn.query("DELETE FROM `bonus_salary` WHERE `userid`=? ", [userid]);
        await conn.query("DELETE FROM `bonus_recharge` WHERE `userid`=? ", [userid]);
        await conn.query("DELETE FROM `bonus_festival` WHERE `userid`=? ", [userid]);
        await conn.query("DELETE FROM `betting` WHERE `userid`=? ", [userid]);
        await conn.query("DELETE FROM `bankkyc` WHERE `userid`=? ", [userid]);
        await conn.query("DELETE FROM `auto_rechage` WHERE `userId`=? ", [userid]);
        return res.json({ status: 1, message: "user deleted successfull" });
    } catch (er) {
        console.log(er);
        return res.status(500).json({ status: 6, message: "server error" });
    }
}

const userblock = async (req, res) => {
    const { token, id, blocktype } = req.body;
    if (!token || !id || !blocktype) {
        return res.status(400).json({ status: 5, message: "parameter miss" });
    }
    try {
        const [admin] = await conn.query("SELECT id FROM user WHERE token = ?", [token]);
        if (admin.length != 1) {
            return res.status(404).json({ status: 4, message: "user not found" });
        }
        const [user] = await conn.query("SELECT id FROM user WHERE id = ?", [id]);
        if (user.length != 1) {
            return res.status(404).json({ status: 4, message: "user not found" });
        }
        const [updatee] = await conn.query("UPDATE user SET block=? WHERE id=?", [blocktype, user[0].id]);
        if (updatee.affectedRows == 1) {
            return res.status(200).json({ status: 1, message: "user block successfull !" });
        } else {
            return res.status(503).json({ status: 2, message: "internal error !" });
        }
    } catch (error) {
        console.log(error);
        return res.status(500).json({ status: 6, message: "server error" });

    }
}

const deposite_ = async (req, res) => {
    const { page, token, search = "", startdate = "", enddate = "", login_type } = req.body;
    const limit = 10;

    if (!page || !token) {
        return res.status(400).json({ status: 5, message: "parameter miss" });
    }

    try {
        // ✅ Validate token
        const [user] = await conn.query("SELECT id FROM user WHERE token=?", [token]);
        if (user.length !== 1) {
            return res.status(404).json({ status: 4, message: "user not found" });
        }

        const offset = (page - 1) * limit;
        const user_id = user[0].id;
        // ✅ Base WHERE clause and params
        let whereClauses = ["(sender = ? OR receiver = ?)"];
        let params = [user_id, user_id];

        // ✅ Add search
        if (search && search.trim() !== "") {
            whereClauses.push("(sender LIKE ? OR receiver LIKE ? OR sender_mobile LIKE ? OR receiver_mobile LIKE ? OR amount LIKE ?)");
            params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
        }

        // ✅ Add date filter
        if (startdate && enddate) {
            whereClauses.push("DATE(time) BETWEEN ? AND ?");
            params.push(startdate, enddate);
        }

        const whereSQL = whereClauses.join(" AND ");

        // ✅ Get total count
        const [totalRes] = await conn.query(
            `SELECT COUNT(*) AS total FROM transfer WHERE ${whereSQL}`,
            params
        );
        const total = totalRes[0].total;

        // ✅ Get paginated data
        const paginatedParams = [...params, limit, offset];
        const [data1] = await conn.query(
            `SELECT * FROM transfer WHERE ${whereSQL} ORDER BY id DESC LIMIT ? OFFSET ?`,
            paginatedParams
        );
        const data = data1.map(item => {
            const isDebit = item.sender === user_id;
            let type = isDebit ? "Debit" : "Credit";

            // Override logic: if sender and type is 'cut', it's actually Credit for sender
            if (isDebit && item.type === "cut") {
                type = "Credit";
            }

            return {
                id: item.id,
                amount: item.amount,
                type: type,
                join_time: item.time instanceof Date ? item.time.toLocaleString('en-IN', { hour12: false }) : item.time,
                user_id: isDebit ? item.receiver : item.sender,
                user_mobile: isDebit ? item.receiver_mobile : item.sender_mobile
            };
        });



        const totalPages = Math.ceil(total / limit);
        return res.status(200).json({
            status: 1,
            message: "Success",
            total,
            page,
            total_pages: totalPages,
            per_page: limit,
            data
        });

    } catch (error) {
        console.error("Error in alluser API:", error);
        return res.status(500).json({ status: 0, message: "Server error" });
    }
}
const applyFilter = async (req, res) => {
    const { id, token } = req.body;
    if (!id || !token) {
        return res.status(400).json({ status: 5, message: "parameter miss" });
    }

    try {
        const [user] = await conn.query("SELECT id, promocode FROM user WHERE token = ?", [token]);
        if (user.length !== 1) {
            return res.status(404).json({ status: 4, message: "user not found" });
        }

        const promocode = user[0].promocode;

        // Check if input is numeric and has 10 digits => treat as mobile
        const isMobile = /^\d{10}$/.test(id);

        let query = `
      SELECT mobile, id 
      FROM user 
      WHERE (use_promocode = ? OR admin_promocode = ?) 
    `;
        let params = [promocode, promocode];

        if (isMobile) {
            query += " AND mobile LIKE ?";
            params.push(`%${id}%`);
        } else {
            query += " AND id LIKE ?";
            params.push(`%${id}%`);
        }


        const [data] = await conn.query(query, params);

        const send = data.map(item => ({
            id: item.id,
            mobile: item.mobile
        }));

        return res.status(200).json({ send });

    } catch (er) {
        console.log(er);
        return res.status(500).json({ status: 6, message: "server error" });
    }
};



const transfer = async (req, res) => {
    const { id, token, amount, Add_cut, Reason, checkout } = req.body;

    if (!id || !token || !amount || !Add_cut) {
        return res.status(400).json({ status: 5, message: "Parameter missing" });
    }

    try {
        const finalAmount = parseFloat(amount);

        // Fetch sender (admin) details
        const [senderRows] = await conn.query("SELECT id, wallet, winamount, mobile FROM user WHERE token = ?", [token]);
        if (senderRows.length !== 1) {
            return res.status(404).json({ status: 4, message: "Sender not found" });
        }
        const sender = senderRows[0];

        // Fetch receiver (target user) details
        const [receiverRows] = await conn.query("SELECT id, wallet, mobile FROM user WHERE id = ?", [id]);
        if (receiverRows.length !== 1) {
            return res.status(404).json({ status: 8, message: "Receiver not found" });
        }
        const receiver = receiverRows[0];

        // Perform Add or Cut operation
        if (Add_cut === "add") {
            // Check if sender has enough balance (wallet + winamount)
            const totalBalance = sender.wallet + sender.winamount;
            if (finalAmount > totalBalance) {
                return res.status(400).json({ status: 7, message: "Insufficient wallet balance" });
            }

            // Deduct from sender (wallet first, then winamount)
            let remaining = finalAmount;
            let newWallet = sender.wallet;
            let newWinamount = sender.winamount;

            if (remaining <= sender.wallet) {
                newWallet -= remaining;
            } else {
                remaining -= sender.wallet;
                newWallet = 0;
                newWinamount -= remaining;
            }

            await conn.query("UPDATE user SET wallet = ?, winamount = ? WHERE id = ?", [newWallet, newWinamount, sender.id]);

            // Add to receiver
            const newReceiverWallet = receiver.wallet + finalAmount;
            await conn.query("UPDATE user SET wallet = ? WHERE id = ?", [newReceiverWallet, receiver.id]);

        } else if (Add_cut === "cut") {
            // Check if receiver has enough wallet balance
            if (receiver.wallet < finalAmount) {
                return res.status(400).json({ status: 9, message: "Receiver has insufficient wallet balance" });
            }

            // Deduct from receiver
            const newReceiverWallet = receiver.wallet - finalAmount;
            await conn.query("UPDATE user SET wallet = ? WHERE id = ?", [newReceiverWallet, receiver.id]);

            // Add to sender
            const newSenderWallet = sender.wallet + finalAmount;
            await conn.query("UPDATE user SET wallet = ? WHERE id = ?", [newSenderWallet, sender.id]);

        } else {
            return res.status(400).json({ status: 10, message: "Invalid Add_cut value" });
        }

        // Insert transfer log
        await conn.query(
            "INSERT INTO transfer (sender, receiver, sender_mobile, receiver_mobile, amount, type) VALUES (?, ?, ?, ?, ?, ?)",
            [sender.id, receiver.id, sender.mobile, receiver.mobile, finalAmount, Add_cut]
        );

        // Optional: Insert into mail if checkout is true
        if (checkout === true || checkout === "on" || checkout === 1) {
            const message = Reason || `${Add_cut === "add" ? "Credited" : "Debited"} ₹${finalAmount} by admin.`;
            await conn.query(
                "INSERT INTO mail (sender, userid, message) VALUES (?, ?, ?)",
                [sender.id, receiver.id, message]
            );
        }

        return res.status(200).json({ status: 1, message: "Transfer successful" });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: 6, message: "Server error" });
    }
};


const removedata = async (req, res) => {
    const { tables, idd, token } = req.body;
    if (!tables || !idd || !token) {
        return res.status(400).json({ status: 5, message: "parameter miss" });
    }
    try {
        const [user] = await conn.query("SELECT id FROM user WHERE token =?", [token]);
        if (user.length !== 1) {
            return res.status(404).json({ status: 4, message: "user not found" });
        }
        const [deleted] = await conn.query(`DELETE FROM ${tables} WHERE id =?`, [idd]);
        if (deleted.affectedRows == 1) {
            return res.status(200).json({ status: 1, message: "action successfull !" });
        } else {
            return res.status(505).json({ status: 2, message: "internal error" });
        }
    } catch (error) {
        console.log(error);
        return res.status(500).json({ status: 6, message: "server error" });
    }
}

const betting_ = async (req, res) => {
    const { page, token, search = "", startdate = "", enddate = "", login_type } = req.body;
    const limit = 10;

    if (!page || !token) {
        return res.status(400).json({ status: 5, message: "parameter miss" });
    }

    try {
        // ✅ Validate token
        const [user] = await conn.query("SELECT id FROM user WHERE token=?", [token]);
        if (user.length !== 1) {
            return res.status(404).json({ status: 4, message: "user not found" });
        }

        const offset = (page - 1) * limit;
        const user_id = user[0].id;
        // ✅ Base WHERE clause and params
        let whereClauses = ["userid =?"];
        let params = [user_id];

        // ✅ Add search
        if (search && search.trim() !== "") {
            whereClauses.push("(sender LIKE ? OR receiver LIKE ? OR sender_mobile LIKE ? OR receiver_mobile LIKE ? OR amount LIKE ?)");
            params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
        }

        // ✅ Add date filter
        if (startdate && enddate) {
            whereClauses.push("DATE(time) BETWEEN ? AND ?");
            params.push(startdate, enddate);
        }

        const whereSQL = whereClauses.join(" AND ");

        // ✅ Get total count
        const [totalRes] = await conn.query(
            `SELECT COUNT(*) AS total FROM betting WHERE ${whereSQL}`,
            params
        );
        const total = totalRes[0].total;

        // ✅ Get paginated data
        const paginatedParams = [...params, limit, offset];
        const [data1] = await conn.query(
            `SELECT * FROM betting WHERE ${whereSQL} ORDER BY id DESC LIMIT ? OFFSET ?`,
            paginatedParams
        );
        const data = data1.map(item => {
            const isDebit = item.sender === user_id;
            let type = isDebit ? "Debit" : "Credit";

            // Override logic: if sender and type is 'cut', it's actually Credit for sender
            if (isDebit && item.type === "cut") {
                type = "Credit";
            }

            return {
                id: item.id,
                gamename: item.gamename,
                bet_amount: item.betamount,
                winamount: item.winamount,
                join_time: item.time instanceof Date ? item.time.toLocaleString('en-IN', { hour12: false }) : item.time,
            };
        });



        const totalPages = Math.ceil(total / limit);
        return res.status(200).json({
            status: 1,
            message: "Success",
            total,
            page,
            total_pages: totalPages,
            per_page: limit,
            data
        });

    } catch (error) {
        console.error("Error in alluser API:", error);
        return res.status(500).json({ status: 0, message: "Server error" });
    }
}
const name_edit = async (req, res) => {
    const { name, mobile, token } = req.body;

    if (!name || !mobile || !token) {
        return res.status(400).json({ status: 5, message: "parameter miss" });
    }

    try {
        // Get the current user by token
        const [userRows] = await conn.query("SELECT id FROM user WHERE token = ?", [token]);
        if (userRows.length !== 1) {
            return res.status(404).json({ status: 4, message: "user not found" });
        }

        const userId = userRows[0].id;

        // Check if the mobile number is already used by another user
        const [mobileCheck] = await conn.query("SELECT id FROM user WHERE mobile = ? AND id != ?", [mobile, userId]);
        if (mobileCheck.length > 0) {
            return res.status(409).json({ status: 3, message: "mobile number already in use" });
        }

        // Update name and mobile for this user
        const [updateResult] = await conn.query("UPDATE user SET name = ?, mobile = ? WHERE id = ?", [name, mobile, userId]);
        if (updateResult.affectedRows === 1) {
            return res.status(200).json({ status: 1, message: "name update sucessfull" });
        } else {
            return res.status(500).json({ status: 2, message: "internal error" });
        }

    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: 6, message: "server error" });
    }
};



const C_password = async (req, res) => {
    const { oldpassword, newpassword, token } = req.body;

    if (!oldpassword || !newpassword || !token) {
        return res.status(400).json({ status: 5, message: "parameter miss" });
    }

    try {
        // Get user by token
        const [user] = await conn.query("SELECT id, password FROM user WHERE token = ?", [token]);
        if (user.length !== 1) {
            return res.status(404).json({ status: 4, message: "user not found" });
        }

        // Compare old password
        if (md5(oldpassword) !== user[0].password) {
            return res.status(403).json({ status: 6, message: "old password not correct" });
        }

        // Update new password
        const newHashedPassword = md5(newpassword);
        const [updateResult] = await conn.query("UPDATE user SET password = ? WHERE id = ?", [newHashedPassword, user[0].id]);

        if (updateResult.affectedRows === 1) {
            return res.status(200).json({ status: 1, message: "password update successful" });
        } else {
            return res.status(500).json({ status: 2, message: "internal error" });
        }

    } catch (error) {
        console.log(error);
        return res.status(500).json({ status: 6, message: "server error" });
    }
};

const dashboard = async (req, res) => {
    const { token, start_date, end_date } = req.body;
    if (!token) {
        return res.status(400).json({ status: 5, message: "parameter miss" });
    }
    try {
        const [user] = await conn.query("SELECT id, promocode, commision, wallet, winamount, winner FROM user WHERE token=?", [token]);
        if (user.length !== 1) {
            return res.status(404).json({ status: 4, message: "user not found" });
        }
        const userwallet = user[0].wallet + user[0].winamount;
        const team = await getteam(user[0].promocode);
        const commision = user[0].commision;
        const winner = user[0].winner;
        const getteamwalle = await getteamwallet(user[0].promocode);
        // Prepare date filters
        let startDate = start_date ? start_date : new Date().toISOString().split('T')[0];
        let endDate = end_date ? end_date : startDate; // same as startDate if not provided

        const [commisionget] = await conn.query(
            "SELECT SUM(amount) AS total FROM bet_c WHERE admin_id = ? AND DATE(time) BETWEEN ? AND ?",
            [user[0].id, startDate, endDate]
        );

        const total_com = parseFloat(commisionget[0].total || 0).toFixed(2);
        const [xxx] = await conn.query("SELECT SUM(amount) as total FROM withdraw WHERE referid=? AND status = 0", [user[0].id]);
        const withdrawls = xxx[0].total ?? 0;
        // const total_com = parseFloat(commisionget[0].total || 0).toFixed(2);

        return res.status(200).json({ status: 1, userwallet, commision, total_com, team, getteamwalle, withdrawls, winner });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ status: 6, message: "server error" });
    }
}

async function getteam(promocode) {
    const [count] = await conn.query("SELECT id FROM user WHERE (use_promocode = ? OR admin_promocode = ?)", [promocode, promocode]);
    return count.length;
}
async function getteamwallet(promocode) {
    const [result] = await conn.query(
        "SELECT SUM(wallet) as wallet, SUM(winamount) as winamount FROM user WHERE (use_promocode = ? OR admin_promocode = ?)",
        [promocode, promocode]
    );
    const wallet = result[0].wallet || 0;
    const winamount = result[0].winamount || 0;
    return wallet + winamount;
}


const Udashboard = async (req, res) => {
    const { token, userid } = req.body;
    if (!token || !userid) {
        return res.status(400).json({ status: 5, message: "parameter miss" });
    }
    try {
        const [admin] = await conn.query("SELECT id FROM user WHERE token=?", [token]);
        if (admin.length !== 1) {
            return res.status(404).json({ status: 4, message: "user not found" });
        }
        const [user] = await conn.query("SELECT id, name, mobile, commision FROM user WHERE id=?", [userid]);
        if (user.length !== 1) {
            return res.status(404).json({ status: 4, message: "user not found" });
        }
        const totoaldepost = await getDeposit(user[0].id);
        const { bet_amount = 0, winamount = 0 } = await getProfit(user[0].id);
        const name = user[0].name;
        const mobile = user[0].mobile;
        const commision = user[0].commision;
        return res.status(200).json({ status: 1, totoaldepost, bet_amount, winamount, name, mobile, commision });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ status: 6, message: "server error" });
    }
}
async function getDeposit(userid) {
    const [total] = await conn.query("SELECT SUM(amount) as total FROM recharge WHERE userid=? AND status = 1", [userid]);
    return total[0].total || 0;
}
async function getProfit(userid) {
    const [total] = await conn.query("SELECT SUM(betamount) as bet_amount, SUM(winamount) as winamount FROM betting WHERE userid=? AND status = 1", [userid]);
    return total;
}


const getDepositdata = async (req, res) => {
    const { token, userid, page = 1, start_date, end_date, search } = req.body;

    if (!token || !userid) {
        return res.status(400).json({ status: 5, message: "parameter miss" });
    }

    const limit = 10;
    const offset = (page - 1) * limit;

    try {
        const [admin] = await conn.query("SELECT id FROM user WHERE token=?", [token]);
        if (admin.length !== 1) {
            return res.status(404).json({ status: 4, message: "user not found" });
        }

        // Build dynamic WHERE conditions
        let where = "WHERE userid=?";
        let values = [userid];

        if (start_date && end_date) {
            where += " AND DATE(time) BETWEEN ? AND ?";
            values.push(start_date, end_date);
        }

        if (search) {
            where += " AND gamename LIKE ?";
            values.push(`%${search}%`);
        }

        // Total count for pagination
        const [countResult] = await conn.query(`SELECT COUNT(*) AS total FROM betting ${where}`, values);

        const total = countResult[0].total || 0;
        const totalPages = Math.ceil(total / limit);

        // Add LIMIT and OFFSET to get actual data
        values.push(limit, offset);
        const [rows] = await conn.query(
            `SELECT id, gamename, betamount, winamount, time FROM betting ${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
            values
        );
        return res.status(200).json({
            status: 1,
            data: rows,
            pagination: {
                total,
                page: parseInt(page),
                totalPages
            }
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: 6, message: "server error" });
    }
};

const getdeposit = async (req, res) => {
    const { token, userid, page = 1, start_date, end_date, search } = req.body;

    if (!token || !userid) {
        return res.status(400).json({ status: 5, message: "parameter miss" });
    }

    const limit = 10;
    const offset = (page - 1) * limit;

    try {
        const [admin] = await conn.query("SELECT id FROM user WHERE token=?", [token]);
        if (admin.length !== 1) {
            return res.status(404).json({ status: 4, message: "user not found" });
        }

        // Build dynamic WHERE conditions
        let where = "WHERE userid=?";
        let values = [userid];

        if (start_date && end_date) {
            where += " AND DATE(time) BETWEEN ? AND ?";
            values.push(start_date, end_date);
        }

        if (search) {
            where += " AND gamename LIKE ?";
            values.push(`%${search}%`);
        }

        // Total count for pagination
        const [countResult] = await conn.query(`SELECT COUNT(*) AS total FROM recharge ${where}`, values);

        const total = countResult[0].total || 0;
        const totalPages = Math.ceil(total / limit);

        // Add LIMIT and OFFSET to get actual data
        values.push(limit, offset);
        const [rows] = await conn.query(
            `SELECT id, amount, txn_id, status, method, time FROM recharge ${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
            values
        );
        return res.status(200).json({
            status: 1,
            data: rows,
            pagination: {
                total,
                page: parseInt(page),
                totalPages
            }
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: 6, message: "server error" });
    }
};
const profile_update = async (req, res) => {
    const { token, userid, name, mobile, new_password, commision } = req.body;

    if (!token || !userid || !name || !mobile) {
        return res.status(400).json({ status: 5, message: "parameter miss" });
    }

    try {
        // Check admin token
        const [admin] = await conn.query("SELECT id, commision FROM user WHERE token = ?", [token]);
        if (admin.length !== 1) {
            return res.status(404).json({ status: 4, message: "user not found" });
        }
        if (admin[0].commision < commision) {
            return res.json({ status: 6, message: "you have not enough commission limit" })
        }
        // Check user existence
        const [userRows] = await conn.query("SELECT id, password FROM user WHERE id = ?", [userid]);
        if (userRows.length !== 1) {
            return res.status(404).json({ status: 4, message: "user not found" });
        }

        const user = userRows[0];

        // Check if new mobile number is already in use by another user
        const [mobileCheck] = await conn.query(
            "SELECT id FROM user WHERE mobile = ? AND id != ?",
            [mobile, userid]
        );
        if (mobileCheck.length > 0) {
            return res.status(409).json({ status: 3, message: "Mobile number already in use" });
        }

        // Check if new password is same as old password
        if (new_password) {
            if (user.password === new_password) {
                return res.status(409).json({ status: 2, message: "New password cannot be same as old password" });
            }
        }

        // Update profile
        await conn.query(
            "UPDATE user SET name = ?, mobile = ?, password = ?, commision =? WHERE id = ?",
            [name, mobile, new_password, commision, userid]
        );

        return res.status(200).json({ status: 1, message: "Profile updated successfully" });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: 6, message: "server error" });
    }
};

const getRechargeList = async (req, res) => {
    const { token, role, search, startdate, enddate } = req.body;
    const page = parseInt(req.body.page) || 1;
    const limit = parseInt(req.body.limit) || 10;
    const offset = (page - 1) * limit;

    if (!token) {
        return res.json({ status: 6, message: "parameter miss" });
    }

    try {
        // ✅ Validate user from token
        const [user] = await conn.query("SELECT id FROM user WHERE token=?", [token]);
        if (user.length !== 1) {
            return res.json({ status: 4, message: "user not found" });
        }

        // ✅ Build WHERE conditions dynamically
        let conditions = "WHERE admin_id=?";
        let params = [user[0].id];

        if (role != "subadmin") {
            return res.json({ status: 4, message: "role not get " })
        }

        if (search) {
            conditions += " AND (mobile LIKE ? OR userid LIKE ?)";
            params.push(`%${search}%`, `%${search}%`);
        }

        if (startdate && enddate) {
            conditions += " AND DATE(time) BETWEEN ? AND ?";
            params.push(startdate, enddate);
        }

        // ✅ Total count for pagination
        const [countResult] = await conn.query(
            `SELECT COUNT(*) as total FROM add_rech ${conditions}`,
            params
        );
        const total = countResult[0].total;

        // ✅ Fetch paginated data
        const [data_] = await conn.query(
            `SELECT * FROM add_rech ${conditions} ORDER BY id DESC LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        const data = data_.map((item) => ({
            id: item.id,
            mobile: item.mobile,
            userid: item.userid,
            amount: item.amount,
            join_time: item.time instanceof Date ? item.time.toLocaleString('en-IN', { hour12: false }) : item.time,
        }));

        return res.json({
            status: 1,
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ status: 6, message: "server error" });
    }
};

const userSerch = async (req, res) => {
    let item = req.body.searchItem;
    let token = req.body.token;

    if (!item || !token) {
        return res.status(400).json({ Qstatus: 4, message: 'Search item and token are required' });
    }

    try {
        // 🔹 Validate admin
        const [admin] = await conn.query("SELECT id, promocode FROM user WHERE token=?", [token]);
        if (admin.length !== 1) {
            return res.json({ Qstatus: 5, message: "admin not found" });
        }

        const admin_id = admin[0].promocode;

        // 🔹 Corrected query
        const query = `
            SELECT mobile, id 
            FROM user 
            WHERE (mobile LIKE ? OR id = ?) 
              AND use_promocode = ? 
            LIMIT 10
        `;

        const [filterdatas] = await conn.execute(query, [`%${item}%`, item, admin_id]);

        if (filterdatas.length > 0) {
            const reData = filterdatas.map((dataa) => ({
                id: dataa.id,
                mobile: dataa.mobile
            }));
            return res.json({ Qstatus: 1, reData });
        } else {
            return res.json({ Qstatus: 2, message: 'User not found' });
        }

    } catch (error) {
        console.error("Error during user search:", error.message);
        return res.status(500).json({ Qstatus: 3, message: 'Internal Error' });
    }
};





const makePayment1 = async (req, res) => {
    const { reschAdd, amountF, searchId, NotificationsOn, nottext, token } = req.body;
    if (!reschAdd || !amountF || !searchId || !token) {
        return res.json({ status: 3, message: 'paramater Miss' });
    }
      // ✅ 🔒 DUPLICATE REQUEST BLOCK (ONLY ADDITION)
        const lockKey = token + "_" + amountF;
        if (activeBets.has(lockKey)) {
            return res.json({ status: 9, message: "Duplicate request blocked" });
        }
        activeBets.add(lockKey);

    try {
        const [admin] = await conn.query("SELECT id, wallet, winamount FROM user WHERE token=?", [token]);
        if (admin.length !== 1) {
            return res.json({ status: 6, message: "admin token not found" });
        }
        if (reschAdd == 1) {
            if (admin[0].wallet < amountF) {
                return res.json({ status: 7, message: "admin wallet not enough" });
            }
            await conn.query("UPDATE user SET wallet = wallet - ? WHERE id = ?", [amountF, admin[0].id]);
        }
        const UQuery = "SELECT wallet,mobile FROM user WHERE id = ? ";
        const [user] = await conn.query(UQuery, [searchId]);
        if (user.length == 0) {
            return res.json({ status: 3, message: 'user not found' });
        }
        const amount = parseFloat(amountF);
        if (reschAdd == 2) {
            user[0].wallet -= amount;
            if (user[0].wallet <= amount) {
                return res.json({ status: 4, message: 'user wallet not enough' });
            }
            await conn.query("UPDATE user SET wallet = wallet + ? WHERE id=?", [amountF, admin[0].id]);
        } else {
            user[0].wallet += amount;
        }
        if (NotificationsOn == 2) {
            const NQuery = "INSERT INTO `mail`(`userid`, `message`) VALUES ( ? , ?)";
            const NUpdate = await conn.query(NQuery, [searchId, nottext]);
        }

        const query = "UPDATE user SET wallet = ? WHERE id = ?";
        const [Update] = await conn.query(query, [user[0].wallet, searchId]);
        const InQuery = "INSERT INTO `add_rech`( `userid`, `admin_id`, `mobile`, `amount`, `addcut`) VALUES (?, ?, ?, ?, ?)";
        const [InSert] = await conn.query(InQuery, [searchId, admin[0].id, user[0].mobile, amountF, reschAdd]);
        if (Update.affectedRows == 1) {
            return res.json({ status: 1, message: 'Rechange Successfull Action ' });
        } else {
            return res.json({ status: 2, message: 'Server erro ' });
        }
    } catch (error) {
        return res.status(500).json({ status: 5, message: 'Internal Error' });
    }finally{
         // ✅ IMPORTANT — ALWAYS REMOVE LOCK
         setTimeout(() => {
             activeBets.delete(lockKey);
         }, 1000);
    }
};


const commission = async (req, res) => {
    const { page, token, search = "", startdate = "", enddate = "", userSelect = "" } = req.body;
    const limit = 10;
    if (!page || !token) {
        return res.status(400).json({ status: 5, message: "parameter miss" });
    }
    try {
        // ✅ Validate token
        const [user] = await conn.query("SELECT id FROM user WHERE token=?", [token]);
        if (user.length !== 1) {
            return res.status(404).json({ status: 4, message: "user not found" });
        }
        const offset = (page - 1) * limit;
        const user_id = user[0].id;
        // ✅ Base WHERE clause and params
        let whereClauses = ["admin_id =?"];
        let params = [user_id];
        // ✅ Add search


        // ✅ Add date filter
        if (startdate && enddate) {
            whereClauses.push("DATE(time) BETWEEN ? AND ?");
            params.push(startdate, enddate);
        }
        if (userSelect) {
            whereClauses.push(" userid  =? ");
            params.push(userSelect);
        }
        const whereSQL = whereClauses.join(" AND ");

        // ✅ Get total count
        const [totalRes] = await conn.query(
            `SELECT COUNT(*) AS total, SUM(amount) as amount_ FROM bet_c WHERE ${whereSQL}`,
            params
        );
        const total = totalRes[0].total;
        const amount = totalRes[0].amount_;

        // ✅ Get paginated data
        const paginatedParams = [...params, limit, offset];
        const [data1] = await conn.query(
            `SELECT * FROM bet_c WHERE ${whereSQL} ORDER BY id DESC LIMIT ? OFFSET ?`,
            paginatedParams
        );

        const data = data1.map(item => {
            return {
                id: item.id,
                gameid: item.gameid,
                bet_amount: item.bet_amount,
                amount: item.amount,
                join_time: item.time instanceof Date ? item.time.toLocaleString('en-GB', { hour12: false }) : item.time,

            };
        });



        const totalPages = Math.ceil(total / limit);
        return res.status(200).json({
            status: 1,
            message: "Success",
            total,
            page,
            amount,
            total_pages: totalPages,
            per_page: limit,
            data
        });

    } catch (error) {
        console.error("Error in alluser API:", error);
        return res.status(500).json({ status: 0, message: "Server error" });
    }
}

const withdrawls = async (req, res) => {
    const { token, page = 1, item = '', startdate, enddate } = req.body;

    try {
        const [admin] = await conn.query("SELECT id FROM user WHERE token=?", [token]);
        if (admin.length !== 1) {
            return res.json({ status: 4, message: "admin not found" });
        }
        const referid = admin[0].id;
        const limit = 20; // 🔧 you can change this per page
        const offset = (page - 1) * limit;
        const tableName = "withdraw"; // 🔧 set your table name

        const conditions = ["referid =?"];
        const queryParams = [referid];

        // 🔍 Search filter (name, mobile, time, id)
        if (item) {
            conditions.push("(name LIKE ? OR mobile LIKE ? OR time LIKE ? OR id LIKE ?)");
            queryParams.push(`%${item}%`, `%${item}%`, `%${item}%`, `%${item}%`);
        }

        // 📅 Date range filter
        if (startdate && enddate) {
            conditions.push("time BETWEEN ? AND ?");
            queryParams.push(startdate, enddate);
        }

        // Build WHERE clause dynamically
        const whereClause = conditions.length ? ` AND ${conditions.join(" AND ")}` : "";

        // Main data query
        const query = `
      SELECT * 
      FROM ${tableName} 
      WHERE 1=1 ${whereClause} 
      ORDER BY time DESC 
      LIMIT ? OFFSET ?;
    `;

        queryParams.push(limit, offset);

        const [records] = await conn.query(query, queryParams);

        // Total count for pagination
        const countQuery = `
      SELECT COUNT(*) AS Total 
      FROM ${tableName} 
      WHERE 1=1 ${whereClause};
    `;

        const [countResult] = await conn.query(countQuery, queryParams.slice(0, -2));
        const totalRows = countResult[0].Total;
        const totalPages = Math.ceil(totalRows / limit);

        // Format result data
        const reData = records.map(record => ({
            id: record.id,
            userid: record.userid,
            mobile: record.mobile,
            amount: record.amount,
            transtion: record.transtion,
            userwallet: record.old_wallet,
            upiid: record.upiid,
            status: record.status,
            type: record.upiid ? "UPI" : "BANK",
            time: record.time instanceof Date ? record.time.toLocaleString('en-IN', { hour12: false }) : record.time,
        }));

        // ✅ Send response
        return res.json({
            status: 1,
            message: "Withdrawals fetched successfully",
            totalRows,
            totalPages,
            page,
            data: reData,
        });

    } catch (error) {
        console.error("Withdrawals Fetch Error:", error);
        return res.status(500).json({ status: 6, message: "Server error" });
    }
};


const withaction = async (req, res) => {
    const { token, idd, type } = req.body;

    if (!token || !idd || type === undefined) {
        return res.json({ status: 5, message: "Parameter missing" });
    }
      // ✅ 🔒 DUPLICATE REQUEST BLOCK (ONLY ADDITION)
        const lockKey = token + "_" + idd + "_"+type;
        if (activeBets.has(lockKey)) {
            return res.json({ status: 9, message: "Duplicate request blocked" });
        }
        activeBets.add(lockKey);
    try {
        // ✅ Check admin
        const [admin] = await conn.query("SELECT id FROM user WHERE token=?", [token]);
        if (admin.length !== 1) {
            return res.json({ status: 4, message: "User not found" });
        }

        // ✅ Get withdraw details
        const [data] = await conn.query("SELECT userid, amount FROM withdraw WHERE  status = 0 AND id=?", [idd]);
        if (data.length !== 1) {
            return res.json({ status: 7, message: "withdraw request allready approved" });
        }

        const { userid, amount } = data[0];

        // ✅ Check user
        const [user] = await conn.query("SELECT id FROM user WHERE id=?", [userid]);
        if (user.length !== 1) {
            return res.json({ status: 4, message: "User not found" });
        }

        // ✅ Update withdraw status
        const [update1] = await conn.query("UPDATE withdraw SET status=? WHERE id=?", [type, idd]);

        let update2 = { affectedRows: 1 }; // Default to success (for non-success cases)

        // ✅ If approved (type == 1), credit amount back to user wallet
        if (parseInt(type) === 1) {
            console.log("dfvdflvnjklmfvmlkdmvdlkvml");
            [update2] = await conn.query("UPDATE user SET wallet = wallet + ? WHERE id=?", [amount, admin[0].id]);
        } else {
            [update2] = await conn.query("UPDATE user SET wallet = wallet + ? WHERE id=?", [amount, userid]);
        }

        // ✅ Check results
        if (update1.affectedRows === 1 && update2.affectedRows === 1) {
            return res.json({ status: 1, message: "Action successful" });
        } else {
            return res.json({ status: 2, message: "Internal error during update" });
        }
    } catch (error) {
        console.error("Withdraw action error:", error);
        return res.status(500).json({ status: 6, message: "Server error" });
    }finally{
        setTimeout(() => {
            activeBets.delete(lockKey);
        }, 2000);
    }
};

const commissionU = async (req, res) => {
    const { token } = req.body;

    if (!token) {
        return res.json({ status: 5, message: "parameter miss" });
    }

    try {
        // ✅ FIXED SQL — added table name "admin"
        const [admin] = await conn.query(
            "SELECT id, promocode FROM user WHERE token=?",
            [token]
        );

        if (admin.length !== 1) {
            return res.json({ status: 4, message: "admin not found" });
        }

        const promocode = admin[0].promocode;

        const [user] = await conn.query(
            "SELECT id, mobile FROM user WHERE use_promocode=?",
            [promocode]
        );

        const data = user.map(item => ({
            id: item.id,
            mobile: item.mobile
        }));

        return res.json({ status: 1, data });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ status: 6, message: "server error" });
    }
};

const take = async (req, res) => {
    const { token } = req.body;
    if (!token) {
        return res.json({ status: 5, message: "parameter miss" });
    }
      // ✅ 🔒 DUPLICATE REQUEST BLOCK (ONLY ADDITION)
        const lockKey = token + "_" + "takerbtn";
        if (activeBets.has(lockKey)) {
            return res.json({ status: 9, message: "Duplicate request blocked" });
        }
        activeBets.add(lockKey);
    try {
        const [claim] = await conn.query("SELECT claim_open, claim_close FROM admin_setting WHERE id=1");
        const claim_open = claim[0].claim_open;
        const claim_close = claim[0].claim_close;
        // current time HH:MM
        const now = new Date();
        const current = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');
        if (current >= claim_open && current <= claim_close) {
            console.log("✅ Claim time OPEN");
        } else {
            console.log("❌ Claim time CLOSED");
            return res.json({ status: 4, message: `❌ Claim time CLOSED Open Time is ${claim_open} AND CLOSE TIME ${claim_close} ` });
        }

        const [user] = await conn.query("SELECT id , winner FROM user WHERE token=?", [token]);
        if (user.length !== 1) {
            return res.json({ status: 4, message: "user not found" });
        }
        const winner = user[0].winner;
        const [inert] = await conn.query("UPDATE user SET wallet = wallet + ?, winner = winner - ? WHERE id=?", [winner, winner, user[0].id]);
        if (inert.affectedRows == 1) {
            return res.json({ status: 1, message: "take successfull " });
        } else {
            return res.json({ status: 2, message: "internal server error" });
        }
    } catch (error) {
        console.log(error);
        return res.json({ status: 6, message: "server error" });
    }finally{
         setTimeout(() => {
            activeBets.delete(lockKey);
        }, 1000);
    }
}


export default {
    loginsendotp,
    alluser,
    adduser,
    removeuser,
    userblock,
    deposite_,
    applyFilter,
    transfer,
    removedata,
    betting_,
    name_edit,
    C_password,
    dashboard,
    Udashboard,
    getDepositdata,
    getdeposit,
    profile_update,
    getRechargeList,
    userSerch,
    makePayment1,
    commission,
    withdrawls,
    withaction,
    loginverifyotp,
    commissionU,
    take,
    loginapi
}