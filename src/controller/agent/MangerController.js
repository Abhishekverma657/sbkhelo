import express, { json } from 'express';
import conn from '../../config/db_conn.js';
import md5 from 'md5';
import jwt from 'jsonwebtoken';
import { Template } from 'ejs';



const SECRET_KEY = "Pawan_Saini";


function generate18DigitNumber() {
    const timestamp = Date.now(); // Current timestamp in milliseconds
    const randomPart = Math.floor(100000 + Math.random() * 900000); // 6 random digits
    return `${timestamp}${randomPart}`.slice(0, 15); // Ensure it's exactly 18 digits
}



const login = async (req, res) => {
    const { mobile, password } = req.body;

    if (!mobile || !password) {
        return res.status(400).json({ status: 5, message: "Param" });
    }

    try {
        const [user] = await conn.query(
            "SELECT id, password, mobile, name, block, token FROM user WHERE mobile = ? AND login_type != 3",
            [mobile]);

        // console.log(md5(password));

        // ✅ Check if no user found
        if (user.length !== 1) {
            return res.status(404).json({ status: 4, message: "User not found" });
        }

        // ✅ Compare MD5 password
        if (md5(password) !== user[0].password) {
            return res.status(401).json({ status: 3, message: "Invalid password" });
        }
        console.log(user.block , "user block");
        
        if(user[0].block == 1){
              return res.status(401).json({ status: 8, message: "user block " });
        }

        // ✅ Create JWT Token
        const payload = { id: user[0].id, role: 'subadmin' }; // or map from login_type
        const token1 = jwt.sign(payload, SECRET_KEY, { expiresIn: '7d' });

        // ✅ Generate token
        let token = user[0].token;
        if(token == null){
            token = generate18DigitNumber();
        }
        await conn.query("UPDATE user SET token = ? WHERE id=?", [token, user[0].id]);
        const name = user[0].name;
        const mobile1 = user[0].mobile;
        return res.status(200).json({ status: 1, token, token1, message: "Login successful", name , mobile : mobile1});

    } catch (error) {
        console.log(error);
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
        whereClauses.push("(login_type != 3 AND login_type != 2)");
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
            join_time: item.time instanceof Date ? item.time.toLocaleString('en-IN',{hour12:false}): item.time,
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
    const { name, mobile, password, token } = req.body;
    if (!name || !mobile || !password  || !token) {
        return res.status(400).json({ status: 5, message: "parameter miss" });
    }
    try {
        const [user] = await conn.query("SELECT id, promocode FROM user WHERE mobile = ?", [mobile]);
        const [use_user] = await conn.query("SELECT id, promocode FROM user WHERE token = ?", [token]);
        if (user.length != 0) {
            return res.status(409).json({ status: 9, message: "Already exists" });
        }
        const code = generatePromoCode(); // Make sure this function is defined
        const password1 = md5(password);
        const usr_promocode = use_user[0].promocode;
        const [setdata] = await conn.query(
            "INSERT INTO `user`(`name`, `mobile`, `wallet`, `winamount`, `promocode`, `use_promocode`, `admin_promocode`, `password`, `commision`, `login_type`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [name, mobile, 0, 0, code, usr_promocode, 'admin', password1, 0, 1]
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
        let whereClauses = ["userid=?"];
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
            `SELECT COUNT(*) AS total FROM add_salary WHERE ${whereSQL}`,
            params
        );
        const total = totalRes[0].total;

        // ✅ Get paginated data
        const paginatedParams = [...params, limit, offset];
        const [data1] = await conn.query(
            `SELECT * FROM add_salary WHERE ${whereSQL} ORDER BY id DESC LIMIT ? OFFSET ?`,
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
                join_time: item.time instanceof Date ? item.time.toLocaleString('en-IN',{hour12:false}): item.time,
                user_id: isDebit ? item.receiver : item.sender,
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
                gameid: item.periodid,
                bet_amount: item.betamount,
                winamount: item.winamount,
                bet_number : item.bet_number,
                win_number : item.win_number,
                join_time: item.time instanceof Date ? item.time.toLocaleString('en-IN',{hour12:false}): item.time,
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

const dashboard = async(req, res)=>{
    const token  = req.body.token;
    if(!token){
        return res.status(400).json({status: 5, message  : "parameter miss"});
    }
    try{
        const [user] = await conn.query("SELECT id, promocode, wallet, winamount FROM user WHERE token=?", [token]);
        if(user.length !==1){
            return res.status(404).json({status : 4, message : "user not found"});
        }
        const userid = user[0].id;
        const [commision] = await conn.query("SELECT SUM(amount) as total FROM commsion_data WHERE userid=?", [userid]);
        const userwallet = user[0].wallet + user[0].winamount;
        const [bet] = await conn.query("SELECT SUM(betamount) as betamount, SUM(winamount) as win_amount FROM betting WHERE userid=?", [userid]);
        const bet_amount = bet[0].betamount ?? 0;
        const win_amount = bet[0].win_amount ?? 0;
        const getteamwalle = await getteamwallet(user[0].promocode);
        const comm = commision[0].total;
        return res.status(200).json({status : 1, userwallet, bet_amount, win_amount,  getteamwalle, commision : comm });
    }catch(error){
        console.log(error);
        return res.status(500).json({status : 6, message : "server error"});
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


const Udashboard = async(req, res)=>{
    const {token, userid} = req.body;
    if(!token || !userid){
        return res.status(400).json({status :5, message : "parameter miss"});
    }
    try{
        const [admin] = await conn.query("SELECT id FROM user WHERE token=?", [token]);
        if(admin.length !== 1){
            return res.status(404).json({status : 4, message : "user not found"});
        }
        const [user] = await conn.query("SELECT id, name, mobile FROM user WHERE id=?", [userid]);
        if(user.length !== 1){
            return res.status(404).json({status : 4, message : "user not found"});
        }
        const totoaldepost = await getDeposit(user[0].id);
        const { bet_amount = 0, winamount = 0 } = await getProfit(user[0].id);
        const name = user[0].name;
        const mobile = user[0].mobile;
        return res.status(200).json({status : 1,totoaldepost,  bet_amount, winamount, name, mobile});
    }catch(error){
        console.log(error);
        return res.status(500).json({status: 6, message : "server error"});        
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
  const { token, userid, name, mobile, new_password } = req.body;

  if (!token || !userid || !name || !mobile ) {
    return res.status(400).json({ status: 5, message: "parameter miss" });
  }

  try {
    // Check admin token
    const [admin] = await conn.query("SELECT id FROM user WHERE token = ?", [token]);
    if (admin.length !== 1) {
      return res.status(404).json({ status: 4, message: "user not found" });
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
    if(new_password){
        if (user.password === new_password) {
            return res.status(409).json({ status: 2, message: "New password cannot be same as old password" });
        }
    }

    // Update profile
    await conn.query(
      "UPDATE user SET name = ?, mobile = ?, password = ? WHERE id = ?",
      [name, mobile, new_password, userid]
    );

    return res.status(200).json({ status: 1, message: "Profile updated successfully" });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 6, message: "server error" });
  }
};


const betting_1 = async (req, res) => {
  try {
    const [periodi] = await conn.query("SELECT gameid FROM bet_result  ORDER BY id DESC limit 1");
    const periodid = Number(periodi[0].gameid) + 1;
    console.log(periodid , "sddv");
    
    // Query DB
    const [rows] = await conn.query(
      "SELECT bet_number, betamount, userid, mobile FROM betting WHERE periodid = ?",
      [periodid]
    );

    // if (rows.length === 0) {
    //   return res.status(200).json({ status: 4, message: "No bets found" });
    // }

    const send = rows.map((itmes) =>({
        id : itmes.is,
        userid : itmes.userid, 
        mobile : itmes.mobile, 
        betamount : itmes.betamount,
        bet_number : itmes.bet_number,
    }))
    // Format result into { number: total_amount }
    // const result = {};
    // rows.forEach(row => {
    //   result[row.bet_number] = (result[row.bet_number] || 0) + row.betamount;
    // });

    return res.json({ periodid, send});

  } catch (er) {
    console.error("DB error:", er);
    return res.status(500).json({ status: 6, message: "server error" });
  }
};

const result_type = async(req , res)=>{
    try{
        const [data] = await conn.query("SELECT * FROM bet_result_set WHERE id=1");
        const winner = data[0].winner;
        const status = data[0].status;
        return res.json({winner, status});
    }catch(er){
        console.log(er);
        return res.status(500).json({status : 6, message : "server error"});
    }
}

const set_result_mode = async(req, res)=>{
    const type = req.body.status;
    try{
        const [dat] = await conn.query("UPDATE bet_result_set SET status =? WHERE id=1", [type]);
        if(dat.affectedRows == 1){
            return res.json({status : 1, message : "result updated"});
        }else{
            return res.json({status : 2, message : "internale error"});
        }
    }catch(er){
        console.log(er);
        return res.status(500).json({status : 6, message : "server error"});
    }
}

const winner_set = async (req, res) => {
  try {
    let value = req.body.number;
    let xvalue = req.body.xvalue;
    console.log(value , "value");
    
    // ✅ Ensure it's always 2 digits
    if (typeof value === "number") value = value.toString(); // in case it comes as number
    if (value.length === 1) value = "00" + value;
    // Validate range
    if (!/^\d{2}$/.test(value)) {
      return res.status(400).json({ status: 0, message: "Invalid number format" });
    }
    const [dat] = await conn.query(
      "UPDATE bet_result_set SET status = 1, winner = ?, xvalue = ? WHERE id = 1",
      [value, xvalue]
    );
    if (dat.affectedRows === 1) {
      return res.json({ status: 1, message: "Result updated", winner: value });
    } else {
      return res.json({ status: 2, message: "Internal error" });
    }
  } catch (er) {
    console.log(er);
    return res.status(500).json({ status: 6, message: "Server error" });
  }
};

const commission = async (req, res) => {
    const { page, token, search = "", startdate = "", enddate = "" } = req.body;
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
 

        // ✅ Add date filter
        if (startdate && enddate) {
            whereClauses.push("DATE(time) BETWEEN ? AND ?");
            params.push(startdate, enddate);
        }

        const whereSQL = whereClauses.join(" AND ");

        // ✅ Get total count
        const [totalRes] = await conn.query(
            `SELECT COUNT(*) AS total FROM commsion_data WHERE ${whereSQL}`,
            params
        );
        const total = totalRes[0].total;

        // ✅ Get paginated data
        const paginatedParams = [...params, limit, offset];
        const [data1] = await conn.query(
            `SELECT * FROM commsion_data WHERE ${whereSQL} ORDER BY id DESC LIMIT ? OFFSET ?`,
            paginatedParams
        );
        const data = data1.map(item => {
            return {
                id: item.id,
                gameid : item.Gameid,
                bet_amount: item.bet_amount,
                amount: item.amount,
                join_time: item.time instanceof Date ? item.time.toLocaleString('en-IN',{hour12:false}): item.time,
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


export default {
    login,
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
    betting_1,
    result_type,
    set_result_mode,
    winner_set,
    commission,

}