import express, { json } from 'express';
import conn from '../config/db_conn.js';
import md5 from 'md5';
import { sendOTP } from "./utils/sendMail.js";



const loginPage = async (req, res) => {
    return res.render('admin/loginPage.ejs');
};
const dashboardPage = async (req, res) => {
    return res.render('admin/dashboard.ejs');
};
const playerPage = async (req, res) => {
    return res.render('admin/player.ejs');
};
const activeplayer = async (req, res) => {
    return res.render('admin/active-player.ejs');
};
const loginapi = async (req, res) => {
    let username = req.body.username;
    let password = req.body.password;
    if (!username || !password) {
        return res.status(200).json({
            message: 'Input Empty!',
            status: false

        });
    }
    try {
        let [admin] = await conn.execute("SELECT * FROM `admin` WHERE `name` = ?", [username]);
        if (admin.length === 0) {
            return res.status(200).json({
                message: 'User not found!',
                status: false
            });
        }
        if (admin[0].password !== md5(password)) {
            return res.status(200).json({
                message: 'Incorrect password!',
                status: false
            });
        }
        const otp = 15602;
        // const otp = Math.floor(1000 + Math.random() * 9000);
        const email = admin[0].email;
        console.log("✅ ENV loaded:");
        console.log("SMTP_USER =", process.env.SMTP_USER);
        console.log("SMTP_PASS exists =", !!process.env.SMTP_PASS);
        // sendOTP(email, otp);
        await conn.query("UPDATE admin set otp=? WHERE id=1", [otp]);
        return res.json({status : 1, message  : "otp send"});
    } catch (error) {
        console.error("Database error:", error);
        return res.status(500).json({
            message: 'Internal Server Error!'
        });
    }
};

const adminotpverify = async (req, res) => {
    const { username, otp } = req.body;
    if (!username || !otp) {
        return res.json({ status: 5, message: "parameter miss" });
    }
    try {
        const [admin] = await conn.query("SELECT * FROM admin WHERE name =? AND otp=?", [username, otp]);
        if (admin.length == 1) {
            await conn.query("UPDATE admin SET otp = 0 WHERE id=1");
            res.cookie("adminLogin", admin[0].id);
            return res.status(200).cookie('auth', "dfxwrecc45e56fcfg65", {
                httpOnly: true,
                secure: false,
                maxAge: 24 * 60 * 60 * 1000,
                sameSite: 'Strict'
            }).json({
                message: 'Login successful!',
                status: true,
            });
        }else{

        }
    } catch (error) {
        console.log(error);
        return res.status(500).json({ status: 6, message: "server error" });
    }
}

export default {
    loginPage,
    loginapi,
    dashboardPage,
    playerPage,
    activeplayer,
    adminotpverify
};