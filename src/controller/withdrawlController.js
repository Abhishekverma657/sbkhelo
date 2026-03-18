import express, { json } from 'express';
import conn from '../config/db_conn.js';

const pending = async(req, res) =>{
    const { page = 1, item = '', startdate, enddate , status, tableName} = req.body;
    const limit = 10;
    const offset = (page - 1) * limit;

    try{
        const conditions = [];
        const queryParams = [];

        if(item){
            conditions.push('(name LIKE ? OR mobile LIKE ? OR time LIKE ? OR id LIKE ?)');
            queryParams.push(`%${item}%`, `%${item}%`, `%${item}%`, `%${item}%`);
        }
        if(startdate && enddate){
            conditions.push('time BETWEEN ? AND ');
            queryParams.push(startdate, enddate);
        };
        const whereClause = conditions.length ? ` AND ${conditions.join(' AND ')}` : '';
        const query = `SELECT * FROM ${tableName} WHERE 1=1 ${whereClause} AND status =?  ORDER BY time DESC LIMIT ? OFFSET ?;`;

        queryParams.push(status,  limit, offset);
        const [records] = await conn.query(query, queryParams);

        const countQuery = `SELECT COUNT(*) AS Total FROM ${tableName} WHERE 1=1 ${whereClause};`;
        const [countResult] = await conn.query(countQuery, queryParams.slice(0, -2), status);
        const totalRows = countResult[0].Total;
        const totalPages = Math.ceil(totalRows / limit);

        const reData = records.map(record => {
            return {
                id : record.id,
                userid : record.userid,
                mobile : record.mobile,
                amount : record.amount,
                transtion : record.transtion,
                userwallet : record.old_wallet,
                upiid : record.upiid,
                bankaccount : record.bankaccount,
                bankname : record.bankname,
                bankholder : record.bankholder,
                ifsccode : record.ifsccode,
                type : record.upiid ? "UPI" : "BANK", 
                time :  record.time instanceof Date ? record.time.toLocaleString('en-IN',{hour12:false}): record.time,
            }
        });
        const [pendingTotal] = await conn.query(`SELECT
            SUM(CASE WHEN status = 1 THEN amount ELSE 0 END) AS pending,
            SUM(CASE WHEN status = 2 THEN amount ELSE 0 END) AS success,
            SUM(CASE WHEN status = 3 THEN amount ELSE 0 END) AS reject FROM withdraw`);
 
        const DesPending = pendingTotal[0].pending ?? 0;    
        const DesSuccess = pendingTotal[0].success ?? 0;    
        const DesReject = pendingTotal[0].reject ?? 0;    
        res.json({
            reData,
            DesPending,
            DesSuccess,
            DesReject,
            pagination: {
                totalRows,
                totalPages,
                currentPage: page,
            },
        });

    }catch (error) {
      console.error('Error fetching users:', error.message);
      res.status(500).json({ error: 'Internal server error' });
    }

};


const withPass = async(req, res)=>{
    const {idd, action} = req.body;
    try{
        const [updat] = await conn.query("UPDATE withdraw SET status=? WHERE id=?", [action, idd]);
        if(updat.affectedRows == 1){
            return res.status(200).json({status : 1, message : "withdraw resques successfull update !"});
        }else{
            return res.status(200).json({status : 2, message : "internal error !"});
        }
    }catch(error){
        console.log(error);
        return res.status(500).json({status : 6, message : "server error"});
    }
}

export default{
    pending,
    withPass,
};