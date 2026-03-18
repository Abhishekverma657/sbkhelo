import express, { json } from 'express';
import conn from '../config/db_conn.js';


const userDataa = async (req, res) => {
    const userId = req.params.id; // Access `id` from query parameters        
    if (!userId) {
        return res.json({ Qstatus: 3, message: 'User ID is required' });
    }
    try {
        const query = "SELECT * FROM user WHERE id = ?";
        const [user] = await conn.query(query, [userId]);
        
        if (user.length === 1) {
            const Wquery = "SELECT SUM(betamount) AS TotalBet, SUM(winamount) AS WinAmount FROM betting WHERE userid= ? ";
            const [winlose] = await conn.query(Wquery, [userId]);
            const adminDa = user.map(datas => {
                return {
                    id : datas.id,
                    username : datas.name,
                    mobile : datas.mobile,
                    promocode : datas.promocode,
                    wallet : datas.wallet,
                    winWallet : datas.winamount,
                    winAmount : winlose[0].WinAmount,
                    LoseAmount : winlose[0].TotalBet,
                    time :  datas.time instanceof Date ? datas.time.toLocaleString('en-IN',{hour12:false}): datas.time,
                }; 
            });
            res.render('admin/user/userprofile.ejs', { user: adminDa[0] });
        } else {
            return res.json({ Qstatus: 3, message: 'User not found' });
        }
    } catch (error) {
        console.error(error); // Log the error for debugging
        return res.json({ Qstatus: 5, message: 'Internal error' });
    }
};
const userDeposit = async (req, res) => {
    const userId = req.params.id; // Access `id` from query parameters        
    if (!userId) {
        return res.json({ Qstatus: 3, message: 'User ID is required' });
    }
    try {
        const query = "SELECT * FROM user WHERE id = ?";
        const [user] = await conn.query(query, [userId]);
        
        if (user.length === 1) {
            const Wquery = "SELECT SUM(betamount) AS TotalBet, SUM(winamount) AS WinAmount FROM betting WHERE userid= ? ";
            const [winlose] = await conn.query(Wquery, [userId]);
            const adminDa = user.map(datas => {
                return {
                    id : datas.id,
                    username : datas.name,
                    mobile : datas.mobile,
                    promocode : datas.promocode,
                    wallet : datas.wallet,
                    winWallet : datas.winamount,
                    winAmount : winlose[0].WinAmount,
                    LoseAmount : winlose[0].TotalBet,
                    time :  datas.time instanceof Date ? datas.time.toLocaleString('en-IN',{hour12:false}): datas.time,
                }; 
            });
            res.render('admin/user/userdeposit.ejs', { user: adminDa[0] });
        } else {
            return res.json({ Qstatus: 3, message: 'User not found' });
        }
    } catch (error) {
        console.error(error); // Log the error for debugging
        return res.json({ Qstatus: 5, message: 'Internal error' });
    }
};
const userWith = async (req, res) => {
    const userId = req.params.id; // Access `id` from query parameters        
    if (!userId) {
        return res.json({ Qstatus: 3, message: 'User ID is required' });
    }
    try {
        const query = "SELECT * FROM user WHERE id = ?";
        const [user] = await conn.query(query, [userId]);
        
        if (user.length === 1) {
            const Wquery = "SELECT SUM(betamount) AS TotalBet, SUM(winamount) AS WinAmount FROM betting WHERE userid= ? ";
            const [winlose] = await conn.query(Wquery, [userId]);
            const adminDa = user.map(datas => {
                return {
                    id : datas.id,
                    username : datas.name,
                    mobile : datas.mobile,
                    promocode : datas.promocode,
                    wallet : datas.wallet,
                    winWallet : datas.winamount,
                    winAmount : winlose[0].WinAmount,
                    LoseAmount : winlose[0].TotalBet,
                    time :  datas.time instanceof Date ? datas.time.toLocaleString('en-IN',{hour12:false}): datas.time,
                }; 
            });
            res.render('admin/user/userwithdr.ejs', { user: adminDa[0] });
        } else {
            return res.json({ Qstatus: 3, message: 'User not found' });
        }
    } catch (error) {
        console.error(error); // Log the error for debugging
        return res.json({ Qstatus: 5, message: 'Internal error' });
    }
};
const usertrade = async (req, res) => {
    const userId = req.params.id; // Access `id` from query parameters        
    if (!userId) {
        return res.json({ Qstatus: 3, message: 'User ID is required' });
    }
    try {
        const query = "SELECT * FROM user WHERE id = ?";
        const [user] = await conn.query(query, [userId]);
        
        if (user.length === 1) {
            const Wquery = "SELECT SUM(betamount) AS TotalBet, SUM(winamount) AS WinAmount FROM betting WHERE userid= ? ";
            const [winlose] = await conn.query(Wquery, [userId]);
            const adminDa = user.map(datas => {
                return {
                    id : datas.id,
                    username : datas.name,
                    mobile : datas.mobile,
                    promocode : datas.promocode,
                    wallet : datas.wallet,
                    winWallet : datas.winamount,
                    winAmount : winlose[0].WinAmount,
                    LoseAmount : winlose[0].TotalBet,
                    time :  datas.time instanceof Date ? datas.time.toLocaleString('en-IN',{hour12:false}): datas.time,
                }; 
            });
            res.render('admin/user/usertrade.ejs', { user: adminDa[0] });
        } else {
            return res.json({ Qstatus: 3, message: 'User not found' });
        }
    } catch (error) {
        console.error(error); // Log the error for debugging
        return res.json({ Qstatus: 5, message: 'Internal error' });
    }
};
    
const usercommit = async (req, res) => {
    const userId = req.params.id; // Access `id` from query parameters        
    if (!userId) {
        return res.json({ Qstatus: 3, message: 'User ID is required' });
    }
    try {
        const query = "SELECT * FROM user WHERE id = ?";
        const [user] = await conn.query(query, [userId]);
        
        if (user.length === 1) {
            const Wquery = "SELECT SUM(betamount) AS TotalBet, SUM(winamount) AS WinAmount FROM betting WHERE userid= ? ";
            const [winlose] = await conn.query(Wquery, [userId]);
            const adminDa = user.map(datas => {
                return {
                    id : datas.id,
                    username : datas.name,
                    mobile : datas.mobile,
                    promocode : datas.promocode,
                    wallet : datas.wallet,
                    winWallet : datas.winamount,
                    winAmount : winlose[0].WinAmount,
                    LoseAmount : winlose[0].TotalBet,
                    time :  datas.time instanceof Date ? datas.time.toLocaleString('en-IN',{hour12:false}): datas.time,
                }; 
            });
            res.render('admin/user/user-commit.ejs', { user: adminDa[0] });
        } else {
            return res.json({ Qstatus: 3, message: 'User not found' });
        }
    } catch (error) {
        console.error(error); // Log the error for debugging
        return res.json({ Qstatus: 5, message: 'Internal error' });
    }
};
const userUpdate = async (req, res) => {
    const userId = req.params.id;       
    if (!userId) {
        return res.json({ Qstatus: 3, message: 'User ID is required' });
    }
    try {
        const query = "SELECT * FROM user WHERE id = ?";
        const [user] = await conn.query(query, [userId]);
        
        if (user.length === 1) {
            const Wquery = "SELECT SUM(betamount) AS TotalBet, SUM(winamount) AS WinAmount FROM betting WHERE userid= ? ";
            const [winlose] = await conn.query(Wquery, [userId]);
            const adminDa = user.map(datas => {
                return {
                    id : datas.id,
                    username : datas.name,
                    mobile : datas.mobile,
                    email : datas.email,
                    promocode : datas.promocode,
                    wallet : datas.wallet,
                    winWallet : datas.winamount,
                    block : datas.block,
                    winAmount : winlose[0].WinAmount,
                    winner : datas.winner,
                    commision : datas.commision,
                    LoseAmount : winlose[0].TotalBet,
                    time :  datas.time instanceof Date ? datas.time.toLocaleString('en-IN',{hour12:false}): datas.time,
                }; 
            });
            res.render('admin/user/user-update.ejs', { user: adminDa[0] });
        } else {
            return res.json({ Qstatus: 3, message: 'User not found' });
        }
    } catch (error) {
        console.error(error); // Log the error for debugging
        return res.json({ Qstatus: 5, message: 'Internal error' });
    }
};
const userBank = async (req, res) => {
    const userId = req.params.id; // Access `id` from query parameters        
    if (!userId) {
        return res.json({ Qstatus: 3, message: 'User ID is required' });
    }
    try {
        const query = "SELECT * FROM user WHERE id = ?";
        const [user] = await conn.query(query, [userId]);
        
        if (user.length === 1) {
            const Wquery = "SELECT SUM(betamount) AS TotalBet, SUM(winamount) AS WinAmount FROM betting WHERE userid= ? ";
            const [winlose] = await conn.query(Wquery, [userId]);
            const [bank]  = await conn.query("SELECT account,upiid FROM bankkyc WHERE userid = ?" , [userId]);
            const Upi = bank[0].upiid;
            const account = bank[0].account;
            const adminDa = user.map(datas => {
                return {
                    id : datas.id,
                    username : datas.name,
                    mobile : datas.mobile,
                    promocode : datas.promocode,
                    wallet : datas.wallet,
                    winWallet : datas.winamount,
                    block : datas.block,
                    upi : Upi,
                    bank : account,
                    winAmount : winlose[0].WinAmount,
                    LoseAmount : winlose[0].TotalBet,
                    time :  datas.time instanceof Date ? datas.time.toLocaleString('en-IN',{hour12:false}): datas.time,
                }; 
            });
            res.render('admin/user/userBank.ejs', { user: adminDa[0] });
        } else {
            return res.json({ Qstatus: 3, message: 'User not found' });
        }
    } catch (error) {
        console.error(error); // Log the error for debugging
        return res.json({ Qstatus: 5, message: 'Internal error' });
    }
};
    
const userpassbook = async (req, res) => {
    const userId = req.params.id; // Access `id` from query parameters        
    if (!userId) {
        return res.json({ Qstatus: 3, message: 'User ID is required' });
    }
    try {
        const query = "SELECT * FROM user WHERE id = ?";
        const [user] = await conn.query(query, [userId]);
        
        if (user.length === 1) {
            const Wquery = "SELECT SUM(betamount) AS TotalBet, SUM(winamount) AS WinAmount FROM betting WHERE userid= ? ";
            const [winlose] = await conn.query(Wquery, [userId]);
            const [bank]  = await conn.query("SELECT account,upiid FROM bankkyc WHERE userid = ?" , [userId]);
            const Upi = bank[0].upiid;
            const account = bank[0].account;
            const adminDa = user.map(datas => {
                return {
                    id : datas.id,
                    username : datas.name,
                    mobile : datas.mobile,
                    promocode : datas.promocode,
                    wallet : datas.wallet,
                    winWallet : datas.winamount,
                    block : datas.block,
                    upi : Upi,
                    bank : account,
                    winAmount : winlose[0].WinAmount,
                    LoseAmount : winlose[0].TotalBet,
                    time :  datas.time instanceof Date ? datas.time.toLocaleString('en-IN',{hour12:false}): datas.time,
                }; 
            });
            res.render('admin/user/userpassbook.ejs', { user: adminDa[0] });
        } else {
            return res.json({ Qstatus: 3, message: 'User not found' });
        }
    } catch (error) {
        console.error(error); // Log the error for debugging
        return res.json({ Qstatus: 5, message: 'Internal error' });
    }
};
    
const settingComm = async (req, res) => {
    try {
        const [admipool] = await conn.query("SELECT * FROM admin_pool where id=1");        
        const [claim] = await conn.query("SELECT * FROM admin_setting WHERE id=1");   
        const claim_open  = claim[0].claim_open;
        const claim_close  = claim[0].claim_close;
        // console.log(claim_open , "claim_open");
        const withdrawal_min = claim[0].withdrawal_min;
        const request1 = claim[0].request;
        
        const pool = admipool.map(datas =>{
            return{
                gamepool : datas.pool,
                admin : datas.admin,
                range : datas.admin_comm,
                botrange : datas.botrange,
                open_time : datas.open_time,
                close_time : datas.close_time,
                claim_open,
                claim_close,
                request1,
                withdrawal_min
            }
        });  
        res.render('admin/page/settingcomm.ejs', {Qstatus : 1, pool : pool[0] });
    } catch (error) {
        console.error(error); // Log the error to get more details
        return res.status(500).json({ Qstatus: 5, message: error.message || 'Internal server error' });
    }
};

export default {
    userDataa,
    userDeposit,
    userWith,
    usertrade,
    usercommit,
    userUpdate,
    userBank,
    userpassbook,
    settingComm,
};