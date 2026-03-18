import express, { json, query } from 'express';
import conn from '../config/db_conn.js';
import multer from 'multer';
import md5 from 'md5';
import path from 'path';
import fs from 'fs';


// Set up multer storage

const currentDirectory = process.cwd();
const uploadDir = path.join(currentDirectory, 'src', 'public', 'upload');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir); // Specify the destination folder for uploads
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname)); // Set the filename
    }
});

const upload = multer({ storage: storage }).single('image');


const ChangeLimit = async (req, res) =>{
    let withdrawlimit = req.body.withlimit;
    let Deslimt = req.body.Deslimt;
    if (!withdrawlimit || !Deslimt) {
        console.log(withdrawlimit);
        return res.json({ Qstatus: 10, message: 'Parameter missing' });
    }
    
    try{
        const query = "UPDATE admin SET withlimit = ? , depositlimit = ? WHERE id = ? ";
        const [result] = await conn.query(query, [withdrawlimit, Deslimt, 1]);
        if(result.affectedRows > 0){
            res.json({Qstatus : 1, message : 'Limits updated successfully'});
        }else{
            res.status(404).json({ Qstatus : 2, message : 'server error'});
        }
    } catch (error){
        res.status(500).json({Qstatus : 3, message: 'Database query failed', error });
    }
}

const festivalAdd = async(req, res) =>{
    const { nameF, amountF, startD, endD } = req.body;
    if(!nameF || !amountF || !startD || !endD){
        return res.json({Qstatus : 2, message : 'parameter missing !'});
    }
    try{
        const query = "INSERT INTO `festival_bonus`( festival_name, bonus, start_time, end_time) VALUES ( ?, ?, ?, ? )";
        const [result] = await conn.query(query, [nameF, amountF, startD, endD]);
       
        if(result.affectedRows == 1){
            res.json({Qstatus : 1, message : 'festival Add Successfull'});
        }else{
            res.json({Qstatus : 4, message : 'server error'});
        }
    } catch (error){
        res.status(400).json({Qstatus:3, message :'Database query failed', error});
    }
};

const sliderAdd = async (req, res) => {
    upload(req, res, async function (err) {
        if (err instanceof multer.MulterError) {
            console.error('Multer error:', err);
            return res.status(400).json({ message: 'File upload error' });
        } else if (err) {
            console.error('Error uploading files:', err);
            return res.status(500).json({ message: 'Internal server error' });
        }
        const { nameT } = req.body;
        const upFIle = req.file;
        if (!nameT || !upFIle) {
          return res.json({ Qstatus: 2, message: 'Name and image are required!' });
        }

        try {
        
          const query = "INSERT INTO `ab_image` (`name`, `image`, `status`) VALUES (?, ?, ?)";
          const [result] = await conn.query(query, [nameT, upFIle.filename, 0]);
        
          if (result.affectedRows === 1) {
            res.json({ Qstatus: 1, message: 'Slider added successfully!' });
          } else {
            res.json({ Qstatus: 4, message: 'Server error!' });
          }
        } catch (error) {
          res.status(400).json({ Qstatus: 3, message: 'Database query failed!', error });
        }
    })
};


const festivalGet = async(req, res) =>{
    const { page = 1, item = '', startdate, enddate } = req.body;
    const limit = 10;
    const offset = (page - 1) * limit;
    try{
        const conditions = [];
        const queryParams = [];
        if(item){
            conditions.push('(festival_name LIKE ? OR start_time LIKE ? OR end_time LIKE ? OR id LIKE ?)');
            queryParams.push(`%${item}%`, `%${item}%`, `%${item}%`, `%${item}%`);
        }
        if(startdate && enddate){
            conditions.push('time BETWEEN ? AND ');
            queryParams.push(startdate, enddate);
        };
        const whereClause = conditions.length ? ` AND ${conditions.join(' AND ')}` : '';
        const query = `SELECT * FROM festival_bonus WHERE 1=1 ${whereClause} ORDER BY time DESC LIMIT ? OFFSET ?;`;
        queryParams.push( limit, offset);
        const [records] = await conn.query(query, queryParams);
        const countQuery = `SELECT COUNT(*) AS Total FROM festival_bonus WHERE 1=1 ${whereClause};`;
        const [countResult] = await conn.query(countQuery, queryParams.slice(0, -2));
        const totalRows = countResult[0].Total;
        const totalPages = Math.ceil(totalRows / limit);
        const reData = records.map(record => {
            return {
                id : record.id,
                name : record.festival_name,
                amount : record.bonus,
                start : record.start_time,
                end : record.end_time,
                time :  record.time instanceof Date ? record.time.toLocaleString('en-IN',{hour12:false}): record.time,
            }
        });   
        res.json({
            reData,
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

const bettingR = async(req, res) =>{
    const { page = 1, item = '', startdate, enddate } = req.body;
    const limit = 10;
    const offset = (page - 1) * limit;
    try{
        const conditions = [];
        const queryParams = [];
        if(item){
            conditions.push('(userid LIKE ? OR gamename LIKE ? OR mobile LIKE ? OR id LIKE ? OR time LIKE ? OR periodid LIKE ?)');
            queryParams.push(`%${item}%`, `%${item}%`, `%${item}%`, `%${item}%`, `%${item}%`, `%${item}%`);
        }
        if(startdate && enddate){
            conditions.push('time BETWEEN ? AND ');
            queryParams.push(startdate, enddate);
        };
        const whereClause = conditions.length ? ` AND ${conditions.join(' AND ')}` : '';
        const query = `SELECT * FROM betting WHERE 1=1 ${whereClause} ORDER BY time DESC LIMIT ? OFFSET ?;`;
        queryParams.push( limit, offset);
        const [records] = await conn.query(query, queryParams);
        const countQuery = `SELECT COUNT(*) AS Total FROM betting WHERE 1=1 ${whereClause};`;
        const [countResult] = await conn.query(countQuery, queryParams.slice(0, -2));
        const totalRows = countResult[0].Total;
        const totalPages = Math.ceil(totalRows / limit);
        const reData = records.map(record => {
            return {
                id : record.id,
                userid : record.userid,
                gamename : record.gamename,
                mobile : record.mobile,
                betamount : record.betamount,
                winamount : record.winamount,
                bet_number : record.bet_number,
                oldwallet : record.userwallet,
                periodid : record.periodid,
                winnumber : record.win_number,
                pool : record.pool,
                time :  record.time instanceof Date ? record.time.toLocaleString('en-IN',{hour12:false}): record.time,
            }
        });   
        res.json({
            reData,
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

const addrechGetAPi = async(req, res) =>{
    const { page = 1, item = '', startdate, enddate ,tableName } = req.body;
    const limit = 10;
    const offset = (page - 1) * limit;
    try{
        const conditions = [`admin_id = ?`];
        const queryParams = [0];
        if(item){
            conditions.push('(userid LIKE ? OR mobile LIKE ?)');
            queryParams.push(`%${item}%`, `%${item}%`);
        }
        if(startdate && enddate){
            conditions.push('time BETWEEN ? AND ');
            queryParams.push(startdate, enddate);
        };
        const whereClause = conditions.length ? ` AND ${conditions.join(' AND ')}` : '';
        const query = `SELECT * FROM ${tableName} WHERE 1=1 ${whereClause} ORDER BY time DESC LIMIT ? OFFSET ?;`;
        queryParams.push( limit, offset);
        const [records] = await conn.query(query, queryParams);
        const countQuery = `SELECT COUNT(*) AS Total FROM ${tableName} WHERE 1=1 ${whereClause};`;
        const [countResult] = await conn.query(countQuery, queryParams.slice(0, -2));
        const totalRows = countResult[0].Total;
        const totalPages = Math.ceil(totalRows / limit);
        const reData = records.map(record => {
            return {
                id : record.id,
                userid : record.userid,
                mobile : record.mobile,
                amount : record.amount,
                addcut : record.addcut,
                time :  record.time instanceof Date ? record.time.toLocaleString('en-IN',{hour12:false}): record.time,
            }
        });   
        res.json({
            reData,
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

const mailGetAPi = async(req, res) =>{
    const { page = 1, item = '', startdate, enddate } = req.body;
    const limit = 10;
    const offset = (page - 1) * limit;
    try{
        const conditions = [];
        const queryParams = [];
        if(item){
            conditions.push('(userid LIKE ? OR time LIKE ? OR id LIKE ?)');
            queryParams.push(`%${item}%`,  `%${item}%`, `%${item}%`);
        }
        if(startdate && enddate){
            conditions.push('time BETWEEN ? AND ');
            queryParams.push(startdate, enddate);
        };
        const whereClause = conditions.length ? ` AND ${conditions.join(' AND ')}` : '';
        const query = `SELECT * FROM mail WHERE 1=1 ${whereClause} ORDER BY time DESC LIMIT ? OFFSET ?;`;
        queryParams.push( limit, offset);
        const [records] = await conn.query(query, queryParams);
        const countQuery = `SELECT COUNT(*) AS Total FROM mail WHERE 1=1 ${whereClause};`;
        const [countResult] = await conn.query(countQuery, queryParams.slice(0, -2));
        const totalRows = countResult[0].Total;
        const totalPages = Math.ceil(totalRows / limit);

        const reData = await Promise.all(
            records.map(async (record) => {
                try {
                    const [rows] = await conn.query("SELECT mobile FROM user WHERE `id` = ?", [record.userid]);
                    const mobile = rows.length > 0 ? rows[0].mobile : null;
        
                    return {
                        id: record.id,
                        userid: record.userid,
                        mobile, // Include mobile number in the result
                        mess: record.message,
                     time: record.time instanceof Date 
    ? record.time.toISOString().replace('T',' ').split('.')[0] 
    : record.time,

                    };
                } catch (error) {
                    console.error(`Error fetching data for userid ${record.userid}:`, error);
                    return {
                        id: record.id,
                        userid: record.userid,
                        mess: record.message,
                     time: record.time instanceof Date 
    ? record.time.toISOString().replace('T',' ').split('.')[0] 
    : record.time,

                        mobile: null, // Return null for mobile in case of error
                    };
                }
            })
        );
        
        res.json({
            reData,
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

const sliderAPi = async(req, res) =>{
    const { page = 1, item = '', startdate, enddate } = req.body;
    const limit = 10;
    const offset = (page - 1) * limit;
    try{
        const conditions = [];
        const queryParams = [];
        if(item){
            conditions.push('(userid LIKE ? OR time LIKE ? OR id LIKE ?)');
            queryParams.push(`%${item}%`,  `%${item}%`, `%${item}%`);
        }
        if(startdate && enddate){
            conditions.push('time BETWEEN ? AND ');
            queryParams.push(startdate, enddate);
        };
        const whereClause = conditions.length ? ` AND ${conditions.join(' AND ')}` : '';
        const query = `SELECT * FROM ab_image WHERE 1=1 ${whereClause} ORDER BY time DESC LIMIT ? OFFSET ?;`;
        queryParams.push( limit, offset);
        const [records] = await conn.query(query, queryParams);
        const countQuery = `SELECT COUNT(*) AS Total FROM ab_image WHERE 1=1 ${whereClause};`;
        const [countResult] = await conn.query(countQuery, queryParams.slice(0, -2));
        const totalRows = countResult[0].Total;
        const totalPages = Math.ceil(totalRows / limit);

        const reData = records.map(record => {
            return {
                id : record.id,
                name : record.name,
                image : record.image,
                time :  record.time instanceof Date ? record.time.toLocaleString('en-IN',{hour12:false}): record.time,
            }
        }); 
        
        res.json({
            reData,
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

const noticeApi = async(req, res) =>{
    const { page = 1, item = '', startdate, enddate } = req.body;
    const limit = 10;
    const offset = (page - 1) * limit;
    try{
        const conditions = [];
        const queryParams = [];
        if(item){
            conditions.push('(userid LIKE ? OR time LIKE ? OR id LIKE ?)');
            queryParams.push(`%${item}%`,  `%${item}%`, `%${item}%`);
        }
        if(startdate && enddate){
            conditions.push('time BETWEEN ? AND ');
            queryParams.push(startdate, enddate);
        };
        const whereClause = conditions.length ? ` AND ${conditions.join(' AND ')}` : '';
        const query = `SELECT * FROM ab_image WHERE 1=1 ${whereClause} ORDER BY time DESC LIMIT ? OFFSET ?;`;
        queryParams.push( limit, offset);
        const [records] = await conn.query(query, queryParams);
        const countQuery = `SELECT COUNT(*) AS Total FROM ab_image WHERE 1=1 ${whereClause};`;
        const [countResult] = await conn.query(countQuery, queryParams.slice(0, -2));
        const totalRows = countResult[0].Total;
        const totalPages = Math.ceil(totalRows / limit);

        const reData = records.map(record => {
            return {
                id : record.id,
                name : record.name,
                image : record.image,
                time :  record.time instanceof Date ? record.time.toLocaleString('en-IN',{hour12:false}): record.time,
            }
        }); 
        
        res.json({
            reData,
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

const AddUpiAPi = async(req, res) =>{
    const { page = 1, item = '', startdate, enddate } = req.body;
    const limit = 10;
    const offset = (page - 1) * limit;
    try{
        const conditions = [];
        const queryParams = [];
        if(item){
            conditions.push('(userid LIKE ? OR time LIKE ? OR id LIKE ?)');
            queryParams.push(`%${item}%`,  `%${item}%`, `%${item}%`);
        }
        if(startdate && enddate){
            conditions.push('time BETWEEN ? AND ');
            queryParams.push(startdate, enddate);
        };
        const whereClause = conditions.length ? ` AND ${conditions.join(' AND ')}` : '';
        const query = `SELECT * FROM add_upi WHERE 1=1 ${whereClause} ORDER BY time DESC LIMIT ? OFFSET ?;`;
        queryParams.push( limit, offset);
        const [records] = await conn.query(query, queryParams);
        const countQuery = `SELECT COUNT(*) AS Total FROM add_upi WHERE 1=1 ${whereClause};`;
        const [countResult] = await conn.query(countQuery, queryParams.slice(0, -2));
        const totalRows = countResult[0].Total;
        const totalPages = Math.ceil(totalRows / limit);

        const reData = records.map(record => {
            return {
                id : record.id,
                name : record.name,
                image : record.image,
                time :  record.time instanceof Date ? record.time.toLocaleString('en-IN',{hour12:false}): record.time,
            }
        }); 
        
        res.json({
            reData,
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

const OtherImageApi = async(req, res) =>{
    const { page = 1, item = '', startdate, enddate } = req.body;
    const limit = 10;
    const offset = (page - 1) * limit;
    try{
        const conditions = [];
        const queryParams = [];
        if(item){
            conditions.push('(userid LIKE ? OR time LIKE ? OR id LIKE ?)');
            queryParams.push(`%${item}%`,  `%${item}%`, `%${item}%`);
        }
        if(startdate && enddate){
            conditions.push('time BETWEEN ? AND ');
            queryParams.push(startdate, enddate);
        };
        const whereClause = conditions.length ? ` AND ${conditions.join(' AND ')}` : '';
        const query = `SELECT * FROM sports_refer WHERE 1=1 ${whereClause} ORDER BY time DESC LIMIT ? OFFSET ?;`;
        queryParams.push( limit, offset);
        const [records] = await conn.query(query, queryParams);
        const countQuery = `SELECT COUNT(*) AS Total FROM sports_refer WHERE 1=1 ${whereClause};`;
        const [countResult] = await conn.query(countQuery, queryParams.slice(0, -2));
        const totalRows = countResult[0].Total;
        const totalPages = Math.ceil(totalRows / limit);

        const reData = records.map(record => {
            return {
                id : record.id,
                name : record.name,
                image : record.image,
                time :  record.time instanceof Date ? record.time.toLocaleString('en-IN',{hour12:false}): record.time,
            }
        }); 
        
        res.json({
            reData,
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

const collectfesaval = async(req, res) =>{
    const { page = 1, item = '', startdate, enddate } = req.body;
    const limit = 10;
    const offset = (page - 1) * limit;
    try{
        const conditions = [];
        const queryParams = [];
        if(item){
            conditions.push('(userid LIKE ? OR name LIKE ? OR mobile ?  OR time LIKE ? OR id LIKE ? OR fst_id LIKE ?)');
            queryParams.push(`%${item}%`,  `%${item}%`, `%${item}%`);
        }
        if(startdate && enddate){
            conditions.push('time BETWEEN ? AND ');
            queryParams.push(startdate, enddate);
        };
        const whereClause = conditions.length ? ` AND ${conditions.join(' AND ')}` : '';
        const query = `SELECT * FROM bonus_festival WHERE 1=1 ${whereClause} ORDER BY time DESC LIMIT ? OFFSET ?;`;
        queryParams.push( limit, offset);
        const [records] = await conn.query(query, queryParams);
        const countQuery = `SELECT COUNT(*) AS Total FROM bonus_festival WHERE 1=1 ${whereClause};`;
        const [countResult] = await conn.query(countQuery, queryParams.slice(0, -2));
        const totalRows = countResult[0].Total;
        const totalPages = Math.ceil(totalRows / limit);

        const reData = records.map(record => {
            return {
                id : record.id,
                name : record.name,
                userid : record.userid,
                mobile : record.mobile,
                amount : record.amount,
                FstID : record.fst_id,
                time :  record.time instanceof Date ? record.time.toLocaleString('en-IN',{hour12:false}): record.time,
            }
        }); 
        
        res.json({
            reData,
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


const userPorfil =async(req, res) => {
    try{
        const query = "SELECT * FROM admin WHERE id= ?";
        const [admin] = await conn.execute(query, [1]);
        if(admin.length != 0){
            const adminDa = admin.map(datas => {
                return {
                    username : datas.name,
                    mobile : datas.mobile,
                    email : datas.email,
                    whatapp : datas.whatsapp,
                    upikey : datas.getwaykey
                };
            }); 
            res.json({
                adminDa
            });
        }else{
            res.json({Qstatus : 2, message : 'admin not found'});
        }
    }catch (error){
        res.status(500).json({error : 'Internal server error'});
    }
}
const userPorfilMore =async(req, res) => {
    let userId = req.body.userId;
    try{
        const query = "SELECT * FROM user WHERE id= ?";
        const [admin] = await conn.execute(query, [userId]);
        if(admin.length != 0){
            const Wquery = "SELECT SUM(betamount) AS TotalBet, SUM(winamount) AS WinAmount FROM betting WHERE userid= ? ";
            const [winlose] = await conn.query(Wquery, [userId]);
            const adminDa = admin.map(datas => {
                return {
                    username : datas.name,
                    mobile : datas.mobile,
                    email : datas.email,
                    wallet : datas.wallet,
                    winWallet : datas.winamount,
                    winAmount : winlose[0].WinAmount,
                    LoseAmount : winlose[0].TotalBet,
                    time :  datas.time instanceof Date ? datas.time.toLocaleString('en-IN',{hour12:false}): datas.time,
                }; 
            }); 
            res.json({
                adminDa
            });
        }else{
            res.json({Qstatus : 2, message : 'admin not found'});
        }
    }catch (error){
        res.status(500).json({error : 'Internal server error'});
    }
}



const profileCha = async(req, res) =>{
    const {name, mobile, email, whatapp, getway} = req.body;
    if(!name || !mobile || !email){
        res.json({Qstatus : 3 , message : 'paramter miss!'});
        return;
    }
    try{
        const query = "UPDATE admin SET name = ?, mobile = ?, email = ?,  whatsapp = ?, getwaykey = ? WHERE id = ?";
        const [quer] = await conn.query(query, [name, mobile, email, whatapp, getway, 1]);
        if(quer.affectedRows == 1){
            res.json({Qstatus : 1, message : 'Update SuccessFull'});
        }else{
            res.json({Qstatus : 2, message : 'server error'});
        }
    }catch (error){
        res.status(500).json({Qstatus : 3, message : 'Invernal Server error !'})
    }
};

const adminPassC = async(req, res) => {
    const {password1, password2, password3} = req.body;
    if(password2 != password3){
        res.json({Qstatus : 3 , message : 'password not match' });
        return;
    }
    try{
        const [admin] = await conn.execute("SELECT password FROM admin WHERE id= 1");
        if (admin[0].password !== md5(password1)) {
            return res.status(200).json({
                message: 'Incorrect password!',
                status : false
            });
        }
        const adminUp = "UPDATE admin SET password = ? WHERE id = ?";
        const hash = md5(password2);
        const [Adminn] = await conn.execute(adminUp, [hash, 1]);
        if(Adminn.affectedRows == 1){
            return res.json({Qstatus : 1, message : 'New Password Set'});
        }else{
            return res.json({Qstatus : 3, message : 'sever error'});
        }
    }catch (error){
        res.status(500).json({Qstatus : 5, message : 'interval error'});
    }
};

const Game_load = async(req, res)=>{
    try{
        const [data] = await conn.query("SELECT gameid FROM bet_result WHERE ORDER BY id DESC limit 1");
        if(data.length != 1){
            const gameid = data[0].gameid;
            return res.json({status : 1,gameid });
        }else{
            return res.json({status : 2,message : "internal error" });
        }
    }catch(error){
        console.log(error);
        return res.status(500).json({status : 6, message : "server error"});
    }
}

const lastrsult = async(req, res) =>{
    try{
        const [data] = await conn.query("SELECT * FROM bet_result ORDER BY id DESC limit 1");
        if(data.length != 0){
            const result = data.map(datas => {
                return {
                    gameid : datas.gameid,
                    win_number : datas.win_number,
                    time :  datas.time instanceof Date ? datas.time.toLocaleString('en-IN',{hour12:false}): datas.time,
                }; 
            }); 
            res.json({
                result
            });
        }else{
            res.json({Qstatus : 2, message : 'result not found'});
        }
    }catch (error){
        res.status(500).json({error : 'Internal server error'});
    }
};

export default {

    ChangeLimit,
    festivalAdd,
    festivalGet,
    mailGetAPi,
    sliderAPi,
    sliderAdd,
    noticeApi,
    AddUpiAPi,
    OtherImageApi,
    userPorfil,
    profileCha,
    adminPassC,
    collectfesaval,
    addrechGetAPi,
    userPorfilMore,
    bettingR,
    Game_load,
    lastrsult
};