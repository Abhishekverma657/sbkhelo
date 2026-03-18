import { Parser } from 'json2csv'; // For CSV generation
import conn from '../config/db_conn.js'; // Your database connection

const exportData = async (req, res) => {
  try {
    // Fetch data from the database
    const [rows] = await conn.execute('SELECT id,name,mobile,wallet,winamount,bonus,promocode,use_promocode,block,time FROM user');

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
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

const activeplayerData = async (req, res) => {
  try {
    // Fetch data from the database
    const [rows] = await conn.execute('SELECT id,name,mobile,wallet,winamount,bonus,promocode,use_promocode,block,time FROM user WHERE Ractive = 1');

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
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

const exportDatarecords = async (req, res) => {
  const { tables } = req.body;
  console.log(req.body , "sdf");
  
  try {
    // Fetch data from the database
    const [rows] = await conn.execute(`SELECT * FROM ${tables}`);

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
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export default { exportData, activeplayerData, exportDatarecords};
