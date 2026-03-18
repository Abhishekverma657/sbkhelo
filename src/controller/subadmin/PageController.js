
import conn from '../../config/db_conn.js';


const login  = async(req, res)=>{
    return res.render('subadmin/login');
}
const dashboard  = async(req, res)=>{
    return res.render('subadmin/dashboard');
}

const user = async(req, res)=> {
    return res.render('subadmin/user');
}

const agent = async(req, res)=> {
    return res.render('subadmin/agent');
}
const deposit = async(req, res)=> {
    return res.render('subadmin/deposit');
}
const betting = async(req, res)=> {
    return res.render('subadmin/betting');
}
const profile = async(req, res)=> {
    return res.render('subadmin/profile');
}
const editprofile = async(req, res)=> {
    return res.render('subadmin/editprofile');
}
const addrech = async(req, res)=> {
    return res.render('subadmin/addrech');
}
const commission = async(req, res)=> {
    return res.render('subadmin/commission');
}
const withdrawls = async(req, res)=> {
    return res.render('subadmin/withdrawls');
}

export default{
    login,
    dashboard,
    user,
    agent,
    deposit,
    betting,
    profile,
    editprofile,
    addrech,
    commission,
    withdrawls
}