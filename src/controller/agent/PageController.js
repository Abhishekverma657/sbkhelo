
import conn from '../../config/db_conn.js';


const login  = async(req, res)=>{
    return res.render('agent/login');
}
const dashboard  = async(req, res)=>{
    return res.render('agent/dashboard');
}
const user = async(req, res)=> {
    return res.render('agent/user');
}
const agent = async(req, res)=> {
    return res.render('agent/agent');
}
const deposit = async(req, res)=> {
    return res.render('agent/deposit');
}
const betting = async(req, res)=> {
    return res.render('agent/betting');
}
const profile = async(req, res)=> {
    return res.render('agent/profile');
}
const editprofile = async(req, res)=> {
    return res.render('agent/editprofile');
}
const withdawls = async(req, res)=> {
    return res.render('agent/withdawls');
}
const commission = async(req, res)=> {
    return res.render('agent/commission');
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
    withdawls,
    commission,
}