import express, { json } from 'express';
import conn from '../config/db_conn.js';


const activeBets = new Set();

const pending = async (req, res) => {
    const { page = 1, item = '', startdate, enddate, status, tableName } = req.body;
    const limit = 10;
    const offset = (page - 1) * limit;

    try {
        const conditions = [];
        const queryParams = [];

        if (item) {
            conditions.push('(name LIKE ? OR mobile LIKE ? OR time LIKE ? OR id LIKE ?)');
            queryParams.push(`%${item}%`, `%${item}%`, `%${item}%`, `%${item}%`);
        }
        if (startdate && enddate) {
            conditions.push('time BETWEEN ? AND ');
            queryParams.push(startdate, enddate);
        };
        if (status) {
            conditions.push(' status = ?');
            queryParams.push(status);
        }
        const whereClause = conditions.length ? ` AND ${conditions.join(' AND ')}` : '';
        const query = `SELECT * FROM ${tableName} WHERE 1=1 ${whereClause} ORDER BY time DESC LIMIT ? OFFSET ?;`;
        queryParams.push(limit, offset);
        const [records] = await conn.query(query, queryParams);

        const countQuery = `SELECT COUNT(*) AS Total FROM ${tableName} WHERE 1=1 ${whereClause};`;
        const [countResult] = await conn.query(countQuery, queryParams.slice(0, -2), status);
        const totalRows = countResult[0].Total;
        const totalPages = Math.ceil(totalRows / limit);

        const reData = records.map(record => {
            return {
                id: record.id,
                userid: record.userid,
                mobile: record.mobile,
                amount: record.amount,
                transtion: record.transtion,
                userwallet: record.old_wallet,
                time: record.time instanceof Date ? record.time.toLocaleString('en-IN', { hour12: false }) : record.time,
            }
        });
        const [pendingTotal] = await conn.query(`SELECT
            SUM(CASE WHEN status = 1 THEN amount ELSE 0 END) AS pending,
            SUM(CASE WHEN status = 2 THEN amount ELSE 0 END) AS success,
            SUM(CASE WHEN status = 3 THEN amount ELSE 0 END) AS reject FROM auto_rechage`);
        const [GetWay] = await conn.query(`SELECT SUM(amount) AS Total FROM recharge WHERE status=1`);
        const getAmount = GetWay[0].Total ?? 0;
        const DesPending = pendingTotal[0].pending ?? 0;
        const DesSuccess = pendingTotal[0].success ?? 0;
        const DesReject = pendingTotal[0].reject ?? 0;
        res.json({
            reData,
            DesPending,
            DesSuccess,
            DesReject,
            getAmount,
            pagination: {
                totalRows,
                totalPages,
                currentPage: page,
            },
        });

    } catch (error) {
        console.error('Error fetching users:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }

};


const makePayment1 = async (req, res) => {
    const { reschAdd, amountF, searchId, NotificationsOn, nottext } = req.body;
    if (!reschAdd || !amountF || !searchId) {
        return res.json({ Qstatus: 3, message: 'paramater Miss' });
    }
    // ✅ 🔒 DUPLICATE REQUEST BLOCK (ONLY ADDITION)
    const lockKey = reschAdd + "_" + amountF + "_"  + "makePayment1";
    if (activeBets.has(lockKey)) {
        return res.json({ status: 9, message: "Duplicate request blocked" });
    }
    activeBets.add(lockKey);
    try {
        const UQuery = "SELECT wallet,mobile FROM user WHERE id = ? ";
        const [user] = await conn.query(UQuery, [searchId]);
        if (user.length == 0) {
            return res.json({ Qstatus: 3, message: 'user not found' });
        }
        const amount = parseFloat(amountF);
        if (reschAdd == 2) {
            if (user[0].wallet < amount) {
                return res.json({ Qstatus: 4, message: 'user wallet not enough' });
            }
            user[0].wallet -= amount;
        } else {
            user[0].wallet += amount;
        }
        if (NotificationsOn == 2) {
            const NQuery = "INSERT INTO `mail`(`userid`, `message`) VALUES ( ? , ?)";
            const NUpdate = await conn.query(NQuery, [searchId, nottext]);
        }

        const query = "UPDATE user SET wallet = ? WHERE id = ?";
        const [Update] = await conn.query(query, [user[0].wallet, searchId]);
        const InQuery = "INSERT INTO `add_rech`( `userid`, `mobile`, `amount`, `addcut`) VALUES (?, ?, ?, ?)";
        const [InSert] = await conn.query(InQuery, [searchId, user[0].mobile, amountF, reschAdd]);
        if (Update.affectedRows == 1) {
            return res.json({ Qstatus: 1, message: 'Rechange Successfull Action ' });
        } else {
            return res.json({ Qstatus: 2, message: 'Server erro ' });
        }
    } catch (error) {
        return res.status(500).json({ Qstatus: 5, message: 'Internal Error' });
    } finally {
        // ✅ IMPORTANT — ALWAYS REMOVE LOCK
        setTimeout(() => {
            activeBets.delete(lockKey);
        }, 1000);
    }
};

const makePayment2 = async (req, res) => {
    const { reschAdd, amountF, searchId, NotificationsOn, nottext } = req.body;
    if (!reschAdd || !amountF || !searchId) {
        return res.json({ Qstatus: 3, message: 'paramater Miss' });
    }
        // ✅ 🔒 DUPLICATE REQUEST BLOCK (ONLY ADDITION)
    const lockKey = token + "_" + "makePayment2";
    if (activeBets.has(lockKey)) {
        return res.json({ status: 9, message: "Duplicate request blocked" });
    }
    activeBets.add(lockKey);
    try {
        const UQuery = "SELECT winamount,mobile FROM user WHERE id = ? ";
        const [user] = await conn.query(UQuery, [searchId]);
        if (user.length == 0) {
            return res.json({ Qstatus: 3, message: 'user not found' });
        }
        const amount = parseFloat(amountF);
        if (reschAdd == 2) {
            user[0].winamount -= amount;
            if (user[0].wallet <= amount) {
                return res.json({ Qstatus: 4, message: 'user wallet not enough' });
            }
        } else {
            user[0].winamount += amount;
        }
        if (NotificationsOn == 2) {
            const NQuery = "INSERT INTO `mail`(`userid`, `message`) VALUES ( ? , ?)";
            const NUpdate = await conn.query(NQuery, [searchId, nottext]);
        }

        const query = "UPDATE user SET winamount = ? WHERE id = ?";
        const [Update] = await conn.query(query, [user[0].winamount, searchId]);
        const InQuery = "INSERT INTO `add_salary`( `userid`, `mobile`, `amount`, `addcut`) VALUES (?, ?, ?, ?)";
        const [InSert] = await conn.query(InQuery, [searchId, user[0].mobile, amountF, reschAdd]);
        if (Update.affectedRows == 1) {
            return res.json({ Qstatus: 1, message: 'Rechange Successfull Action ' });
        } else {
            return res.json({ Qstatus: 2, message: 'Server erro ' });
        }
    } catch (error) {
        return res.status(500).json({ Qstatus: 5, message: 'Internal Error' });
    }finally{
         // ✅ IMPORTANT — ALWAYS REMOVE LOCK
        setTimeout(() => {
            activeBets.delete(lockKey);
        }, 1000);
    }
};



export default {
    pending,
    makePayment1,
    makePayment2,
};