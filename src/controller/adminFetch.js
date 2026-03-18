import express, { json } from 'express';
import conn from '../config/db_conn.js';
const AdminDash = async (req, res) => {

    const { startDate, endDate } = req.body;

    try {

        // ⭐ BETTING
        const [[betting]] = await conn.query(`
            SELECT 
                COUNT(*) AS count,
                COALESCE(SUM(betamount),0) AS totalbet,
                COALESCE(SUM(winamount),0) AS totalWin
            FROM betting
            WHERE time BETWEEN ? AND ?
        `, [startDate, endDate]);


        // ⭐ RECHARGE AUTO + MANUAL (MERGED)
        const [[rech]] = await conn.query(`
            SELECT 
                COALESCE(SUM(CASE WHEN status=2 THEN amount END),0) AS success,
                COALESCE(SUM(CASE WHEN status=1 THEN amount END),0) AS pending
            FROM (
                SELECT amount,status,time FROM auto_rechage
                UNION ALL
                SELECT amount,status,time FROM recharge
            ) x
            WHERE time BETWEEN ? AND ?
        `, [startDate, endDate]);


        // ⭐ WITHDRAW MERGED
        const [[wd]] = await conn.query(`
            SELECT
                COALESCE(SUM(CASE WHEN status=0 THEN amount END),0) AS pending,
                COALESCE(SUM(CASE WHEN status=1 THEN amount END),0) AS success
            FROM withdraw
            WHERE time BETWEEN ? AND ?
        `, [startDate, endDate]);


        // ⭐ COMMISSION
        const [[comm]] = await conn.query(`
            SELECT COALESCE(SUM(amount),0) AS total
            FROM bet_c
            WHERE time BETWEEN ? AND ?
        `, [startDate, endDate]);


        const [[users]] = await conn.query(`SELECT COUNT(*) AS total_count,
                COALESCE(SUM(login_type=1),0) AS total_users,
                COALESCE(SUM(login_type=3),0) AS total_agents
            FROM user`);
        // ⭐ ADD / CUT RECHARGE MERGED
        const [[addcut]] = await conn.query(`
            SELECT 
                COALESCE(SUM(CASE WHEN addcut=1 THEN amount END),0) AS add_total,
                COALESCE(SUM(CASE WHEN addcut=2 THEN amount END),0) AS cut_total,
                COALESCE(SUM(CASE WHEN admin_id=0 THEN amount END),0) AS admin_total,
                COALESCE(SUM(CASE WHEN admin_id!=0 THEN amount END),0) AS agenttotal

            FROM add_rech
            WHERE time BETWEEN ? AND ?
        `, [startDate, endDate]);



        // ⭐ GLOBAL USER WALLET
        const [[walletRow]] = await conn.query(`
            SELECT 
                COALESCE(SUM(CASE WHEN login_type = 3 THEN wallet + winamount ELSE 0 END),0) AS agent_total_amount,
                COALESCE(SUM(CASE WHEN login_type = 1 THEN wallet + winamount ELSE 0 END),0) AS user_total_amount
            FROM user
        `);

        const [[take]] = await conn.query("SELECT SUM(amount) as total FROM bet_c WHERE status=0");
        // ⭐ POOL
        const [[poolRow]] = await conn.query(
            `SELECT pool, admin_comm FROM admin_pool WHERE id=1`
        );

        const agent_total_amount = walletRow.agent_total_amount;
        const user_total_amount = walletRow.user_total_amount;

        return res.json({

            Qstatus: 1,

            pool: poolRow.pool || 0,
            admin_comm: poolRow.admin_comm || 0,

            commission: comm.total || 0,
            take: take.total || 0,

            betting: betting.count,
            agent_total_amount,
            user_total_amount,

            betamount: +betting.totalbet.toFixed(2),
            betwin: +betting.totalWin.toFixed(2),

            DepositS: +rech.success.toFixed(2),
            Depositp: +rech.pending.toFixed(2),

            withdrawl_S: +wd.success.toFixed(2),
            withdrawl_p: +wd.pending.toFixed(2),

            user: users.total_users,
            agnet: users.total_agents,

            admin_total: addcut.admin_total,
            agenttotal: addcut.agenttotal,
            add_recharge: addcut.add_total,
            cut_recharge: addcut.cut_total

        });

    } catch (error) {

        console.error(error);
        return res.status(500).json({ Qstatus: 5, message: "internal error" });

    }
};

const newUserD = async (req, res) => {
    try {
        const [query] = await conn.query("SELECT mobile,id,time,name FROM user ORDER BY id DESC limit 6");
        const reData = query.map(record => {
            return {
                id: record.id,
                mobile: record.mobile,
                name: record.name.charAt(0),
                // time :  record.time instanceof Date ? record.time.toLocaleString('en-IN',{hour12:false}): record.time,
                time: record.time,
            }
        });
        return res.json({ reData, Qstatus: 1 });
    } catch (error) {
        return res.status(500).json({ Qstatus: 5, message: 'Internal Error' });
    }
};

const newDepostiD = async (req, res) => {
    try {
        const [query] = await conn.query("SELECT userid,admin_id, mobile, amount, addcut,id, time FROM add_rech ORDER BY id DESC limit 10");
        const reData = query.map(record => {
            return {
                id: record.id,
                userid: record.userid,
                admin_id: record.admin_id,
                mobile: record.mobile,
                amount: record.amount,
                status: record.addcut,
                status: 2,
                time: record.time instanceof Date ? record.time.toLocaleString('en-IN', { hour12: false }) : record.time,
            }
        });
        return res.json({ reData, Qstatus: 1 });
    } catch (error) {
        return res.status(500).json({ Qstatus: 5, message: 'Internal Error' });
    }
};

const newDepostiW = async (req, res) => {
    try {
        const [query] = await conn.query("SELECT userid, referid,  mobile, amount, upiid,id, time FROM withdraw ORDER BY id DESC limit 10");
        const reData = query.map(record => {
            return {
                id: record.id,
                userid: record.userid,
                admin_id: record.referid,
                mobile: record.mobile,
                amount: record.amount,
                status: record.upiid,
                status: 2,
                time: record.time instanceof Date ? record.time.toLocaleString('en-IN', { hour12: false }) : record.time,
            }
        });
        return res.json({ reData, Qstatus: 1 });
    } catch (error) {
        return res.status(500).json({ Qstatus: 5, message: 'Internal Error' });
    }
};
const activeplayer = async (req, res) => {
    try {
        const [query] = await conn.query("SELECT id,amount,bonus FROM self_bonus_list ORDER BY id DESC limit 6");
        const reData = query.map(record => {
            return {
                id: record.id,
                amount: record.amount,
                bonus: record.bonus,
            }
        });
        return res.json({ reData, Qstatus: 1 });
    } catch (error) {
        return res.status(500).json({ Qstatus: 5, message: 'Internal Error' });
    }
};

const AllgameStart = async (req, res) => {
    try {
        const [query] = await conn.query("SELECT * from active_game");
        if (query.length != 0) {
            const Redata = query.map(element => {
                return {
                    id: element.id,
                    name: element.adminname,
                    active: element.active
                }
            })
            return res.json({ Qstatus: 1, Redata });
        } else {
            return res.json({ Qstatus: 3, message: 'data not found' });
        }
    } catch (error) {
        return res.status(500).json({ Qstatus: 5, message: 'internal error' });
    }
}

export default {
    AdminDash,
    newUserD,
    newDepostiD,
    newDepostiW,
    activeplayer,
    AllgameStart,
};