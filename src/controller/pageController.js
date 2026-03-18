import express, { json } from 'express';
import conn from '../config/db_conn.js';

// deposti
    const landingPage = async(req, res) => {
        return res.render('admin/landing.ejs');
    }
    const pendingD = async(req, res) => {
        return res.render('admin/payment/pendingdeposite.ejs');
    }
    const SuccessD = async(req, res) => {
        return res.render('admin/payment/successdeposite.ejs');
    }
    const RejectD = async(req, res) => {
        return res.render('admin/payment/rejectdeposti.ejs');
    }
    const GetWayD = async(req, res) => {
        return res.render('admin/payment/getwaydeposit.ejs');
    }

// withdrawls
    const withdrawlP = async(req, res) =>{
        return res.render('admin/payment/withdrawl-pending.ejs');
    };
    const withdrawlS = async(req, res) =>{
        return res.render('admin/payment/withdrawl-success.ejs');
    };
    const withdrawlR = async(req, res) =>{
        return res.render('admin/payment/withdrawl-reject.ejs');
    };


    // setting 
    const FestivalBO = async(req, res) => {
        return res.render('admin/page/FestivalBO.ejs')
    };
    const mail = async(req, res) => {
        return res.render('admin/page/mail.ejs')
    };
    const slider = async(req, res) => {
        return res.render('admin/page/slider.ejs')
    };
    const notice = async(req, res) => {
        return res.render('admin/page/notice.ejs')
    };
    const addUpi = async(req, res) => {
        return res.render('admin/page/addUpi.ejs')
    };
    const OtherImge = async(req, res) => {
        return res.render('admin/page/OtherImge.ejs')
    };
    const betting = async(req, res) => {
        return res.render('admin/page/betting.ejs')
    };
    const profile = async(req, res) => {
        return res.render('admin/profile.ejs')
    };
    const usefastival = async(req, res) => {
        return res.render('admin/page/usefastival.ejs')
    };
    const addrech = async(req, res) => {
        return res.render('admin/page/addrech.ejs')
    };
    const addsalary = async(req, res) => {
        return res.render('admin/page/addsalary.ejs')
    };
    const gameStart = async(req, res) => {
        return res.render('admin/page/gameStart.ejs')
    };
    const result = async(req, res) => {
        return res.render('admin/page/result.ejs')
    };
    const records = async(req, res) => {
        return res.render('admin/page/records.ejs')
    };
    const userDataa = async (req, res) => {
        const userId = req.query.id; // Access `id` from query parameters        
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
                res.render('admin/userprofile.ejs', { user: adminDa[0] });
            } else {
                return res.json({ Qstatus: 3, message: 'User not found' });
            }
        } catch (error) {
            console.error(error); // Log the error for debugging
            return res.json({ Qstatus: 5, message: 'Internal error' });
        }
    };
    

export default {
    pendingD,
    SuccessD,
    RejectD,
    GetWayD,
    withdrawlP,
    withdrawlS,
    withdrawlR,
    FestivalBO,
    mail,
    slider,
    notice,
    addUpi,
    OtherImge,
    betting,
    profile,
    usefastival,
    addrech,
    addsalary,
    userDataa,
    landingPage,
    gameStart,
    result,
    records
};