import express, { json } from 'express';
import conn from '../config/db_conn.js';

const DeleteUsers = async (req, res) => {
    let userId = req.body.iddd;
    if (!userId) {
        return res.status(200).json({
            message: 'Idd Empty!',
            status: false,
        });
    }
    try {
        const queries = [
            "DELETE FROM `user_bonus` WHERE `userid` = ?",
            "DELETE FROM `withdraw` WHERE `userid` = ?",
            "DELETE FROM `user` WHERE `id` = ?",

            "DELETE FROM `recharge` WHERE `userid` = ?",


            "DELETE FROM `betting` WHERE `userid` = ?",
            "DELETE FROM `bankkyc` WHERE `userid` = ?",
            "DELETE FROM `auto_rechage` WHERE `userId` = ?",
        ];
        for (let query of queries) {
            await conn.execute(query, [userId]);
        }
        return res.status(200).json({
            status: true,
            message: 'User and related records deleted successfully!',
        });
    } catch (error) {
        console.error("Database error:", error);
        return res.status(500).json({
            message: 'Internal Server Error!'
        });
    }
};
const deletedRecords = async (req, res) => {
    const { tableName, tableidd } = req.body;
    if (!tableName || !tableidd) {
        return res.status(400).json({ message: 'Table name and ID are required' });
    }
    try {
        // Validate table name (for safety)
        const allowedTables = ['add_rech', 'auto_rechage', 'recharge', 'withdraw', 'festival_bonus', 'mail','ab_image', 'add_upi', 'bonus_festival','betting']; // List allowed table names
        if (!allowedTables.includes(tableName)) {
            return res.status(400).json({ status : 5,  message: 'Invalid table name' });
        }
        const query = `DELETE FROM \`${tableName}\` WHERE id = ?`;
        const [result] = await conn.execute(query, [tableidd]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ status : 2,  message: 'No data found with the given ID' });
        }
        return res.status(200).json({ status : 1,  message: 'Data deleted successfully' });
    } catch (error) {
        console.error("Database error:", error);
        return res.status(500).json({
            message: 'Internal Server Error!',
        });
    }
};
const deletedUserRecords = async (req, res) => {
    const { tableName, tableidd } = req.body;
    if (!tableName || !tableidd) {
        return res.status(400).json({ message: 'Table name and ID are required' });
    }
    try {
        // Validate table name (for safety)
        const allowedTables = ['betting', 'passbook', 'self_bonus_list', 'betting', 'add_rech', 'festival_bonus', 'mail', 'ab_image', 'add_upi', 'sports_refer', 'add_salary', 'withdraw', 'transfer', 'bet_c']; // List allowed table names
        if (!allowedTables.includes(tableName)) {
            return res.status(400).json({ status : 5,  message: 'Invalid table name' });
        }
        const query = `DELETE FROM \`${tableName}\` WHERE id = ?`;
        const [result] = await conn.execute(query, [tableidd]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ status : 2,  message: 'No data found with the given ID' });
        }
        return res.status(200).json({ status : 1,  message: 'Data deleted successfully' });
    } catch (error) {
        console.error("Database error:", error);
        return res.status(500).json({
            message: 'Internal Server Error!',
        });
    }
};


export default { DeleteUsers, deletedRecords, deletedUserRecords };
