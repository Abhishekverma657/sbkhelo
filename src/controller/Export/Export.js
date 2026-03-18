import express, { json } from 'express';
import { Parser } from 'json2csv';
import conn from '../../config/db_conn.js';



const festival = async(req, res) => {
    const { query } = req.body;
    try{
        const [rows] = await conn.execute(query);
        if (!rows.length) {
            return res.status(404).json({ message: 'No data to export' });
        }
            // Convert data to CSV format
        const fields = Object.keys(rows[0]); // Columns
        const json2csv = new Parser({ fields });
        const csv = json2csv.parse(rows);

        // Set response headers for file download
        res.header('Content-Type', 'text/csv');
        res.header('Content-Disposition', 'attachment; filename=exported_data.csv');
        res.send(csv);
    }catch (error) {
        console.error('Error exporting data:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};


export default {
    festival,
};