import express, { json } from 'express';
import conn from '../config/db_conn.js';


const userSerch = async (req, res) => {
    let item = req.body.searchItem; // Assuming "searchItem" is a field in the request body.

    if (!item) {
        return res.status(400).json({ Qstatus: 4, message: 'Search item is required' });
    }

    try {
        const query = "SELECT mobile, id FROM user WHERE mobile LIKE ? OR id = ? LIMIT 10";
        const [filterdatas] = await conn.execute(query, [`%${item}%`, item]);

        if (filterdatas.length > 0) {
            const reData = filterdatas.map((dataa) => ({
                id: dataa.id,
                mobile: dataa.mobile
            }));

            res.json({reData });
        } else {
            res.json({ Qstatus: 2, message: 'User not found' });
        }
    } catch (error) {
        console.error("Error during user search:", error.message);
        res.status(500).json({ Qstatus: 3, message: 'Internal Error' });
    }
};



export default{
    userSerch,
};