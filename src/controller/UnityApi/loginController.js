import express, { json } from 'express';
import conn from '../../config/db_conn.js';
import md5 from 'md5';
import crypto from 'crypto'; // Corrected import syntax

// Function to generate token
function generateToken() {
    return crypto.randomBytes(15).toString('base64').slice(0, 15).toUpperCase();
}
global.My_Version = "a4";
const My_Version = "a4";


const login = async (req, res) => {
    console.log(req.body);
    const { mobile, password, version } = req.body;
    if (!mobile || !password) {
        return res.json({ status: 3, message: 'parameter miss' });
    }
    if (version !== My_Version) {
        return res.json({ status: 9, message: 'Update APK' });
    }

    try {
        // ✅ FIX YOUR WRONG QUERY
        const [_time] = await conn.query("SELECT open_time, close_time FROM admin_pool WHERE id=1");

        if (_time.length === 0) {
            return res.json({ status: 7, message: "time setting missing" });
        }

        const open_time = "00:01";     // "09:00:00"
        const close_time = "23:59";   // "21:00:00"

        // ✅ TIME CHECK
        const now = new Date();
        const currentTime = now.toTimeString().slice(0, 8); // "HH:mm:ss"

        // if (!(currentTime >= open_time && currentTime <= close_time)) {
        //     return res.json({
        //         status: 8,
        //         message: `Game Open Time: ${open_time}, Close Time: ${close_time}`,
        //         open_time,
        //         close_time,
        //         current_time: currentTime
        //     });
        // }





        const [claim] = await conn.query("SELECT claim_open, claim_close FROM admin_setting WHERE id=1");
        const claim_open = claim[0].claim_open;
        const claim_close = claim[0].claim_close;
        const [user] = await conn.query("SELECT * FROM user WHERE mobile = ? AND login_type = 1", [mobile]);
        // ✅ Check before using user[0]
        if (user.length !== 1) {
            return res.json({ status: 3, message: 'user not found' });
        }
        if(user[0].block == 1){
            return res.json({ status: 4, message: 'Your account is blocked, Please contact support!' });
        }

        console.log("✅ login_type:", user[0].login_type);

        if (user[0].password !== md5(password)) {
            return res.status(200).json({ message: 'Incorrect password!', status: 6 });
        }

        const token = generateToken();
        await conn.query("UPDATE user SET token = ? WHERE id = ?", [token, user[0].id]);

        const [admin] = await conn.query("SELECT * FROM admin WHERE id = 1");

        const wallet = user[0].winamount + user[0].wallet;

        const ReData = {
            message: 'Login Successful',
            userid: user[0].id,
            name: user[0].name,
            mobile: user[0].mobile,
            image: user[0].image,
            email: user[0].email,
            wallet: wallet,
            roiwallet: user[0].roiwallet,
            bonus: user[0].bonus,
            winamount: user[0].winamount,
            promocode: user[0].promocode,
            freespin: user[0].freespin,
            spinfreelimit: user[0].spinfreelimit,
            vertoken: token,
            adminmobile: admin[0].mobile,
            telegram: admin[0].telegram,
            whatsapp: admin[0].whatsapp,
            withlimit: admin[0].withlimit,
            withlimitMax: 25000,
            usdtLimitMax: 100000000,
            usdtRate: admin[0].usdtprice,
            usdtLimit: admin[0].withusdt,
            claim_close,
            claim_open
        };

        return res.json({ status: 1, ReData });

    } catch (error) {
        console.error("❌ Login Error:", error);
        return res.status(500).json({ status: 5, message: "server error" });
    }
};



const playasguest = async (req, res) => {
    const version = req.body.version;

    if (version != My_Version) {
        return res.json({ status: 9, message: 'Update APk' });
    }
    try {
        const [admin] = await conn.query("SELECT * FROM admin WHERE id = 1");
        const [admin_setting] = await conn.query("SELECT * FROM admin_setting WHERE id = 1");
        const token = generateToken();

        const query = "INSERT INTO `user`( `name`, `image`, `email`, `wallet`, `bonus`,`winamount`, `promocode`, `country`, `gender`, `currency`, `otp`, `status`, `token`) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)";
        const [Rquery] = await conn.query(query, ['Guest', 'Av-Image-3', 'abc@gmail.com', admin_setting[0].newuser_wallet, admin_setting[0].newuser_wallet, 0, generateProCode(), admin[0].country, 'male', admin[0].currency, 0, 1, token]);
        const [user] = await conn.query("SELECT * FROM user WHERE token = ? ", [token]);
        const bank = "INSERT INTO `bankkyc`(`userid`, `upiid`, `holderupi`, `account`, `holderbank`, `ifsccode`, `bankname`) VALUES ( ?, ?, ?, ?, ?, ?, ?)";
        const [bankQ] = await conn.query(bank, [user[0].id, 0, null, 0, null, null, null]);
        await conn.query("UPDATE user SET token = ? WHERE id = ?", [token, user[0].id]);

        // Fetch additional details (admin, commission, etc.)
        const [commission] = await conn.query("SELECT * FROM commission WHERE id = 1");
        const [sport_image] = await conn.query("SELECT * FROM sports_refer WHERE id = 1");

        // Query daily bonus record
        const [daily] = await conn.query("SELECT * FROM daily_bonus_record WHERE userid = ?", [user[0].id]);
        const dail_num = daily.length;
        let day, dail;

        if (dail_num === 0) {
            day = 1;
            dail = 0;
        } else {
            const [dailyy] = await conn.query("SELECT * FROM daily_bonus_record WHERE userid = ? AND DATE(time) = ? ORDER BY 1 DESC LIMIT 1", [user[0].id, todayDate]);
            const daily_da = daily[0];
            if (dailyy.length === 0) {
                dail = 0;
                day = daily_da.day + 1;
            } else {
                dail = 1;
                day = daily_da.day;
            }
        }
        const wallet = user[0].winamount + user[0].wallet;
        // Prepare response data
        const ReData = {
            message: 'Login Successful',
            userid: user[0].id,
            name: user[0].name,
            mobile: user[0].mobile,
            image: user[0].image,
            email: user[0].email,
            wallet: wallet,
            roiwallet: user[0].roiwallet,
            bonus: user[0].bonus,
            winamount: user[0].winamount,
            promocode: user[0].promocode,
            freespin: user[0].freespin,
            spinfreelimit: user[0].spinfreelimit,
            vertoken: token,
            adminmobile: admin[0].mobile,
            telegram: admin[0].telegram,
            whatsapp: admin[0].whatsapp,
            withlimit: admin[0].withlimit,
            withlimitMax: 25000,
            usdtLimitMax: 100000000,
            usdtRate: admin[0].usdtprice,
            usdtLimit: admin[0].withusdt,
            amount: commission[0].amount,
            level1: commission[0].level1,
            level2: commission[0].level2,
            level3: commission[0].level3,
            level4: commission[0].level4,
            upiid: null,
            holderupi: null,
            account: 0,
            holderbank: null,
            ifsccode: null,
            bankname: null,
            UsdtId: null,
            sport_image: sport_image[0].image,
            refer_image: sport_image[1].image,
            share_image: sport_image[2].image,
            day,
            daily: dail
        };

        return res.json({ status: 1, ReData });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: 5, message: error });
    }
};



const validateToken = async (req, res) => {
    const { token: reqToken, version, password } = req.body;

    console.log(reqToken);
    if (!reqToken) {
        return res.json({ status: 3, message: 'Parameter missing' });
    }

    if (version !== My_Version) {
        return res.json({ status: 9, message: 'Update APK' });
    }

    try {
        // Query to fetch user based on the provided token
        const query = "SELECT * FROM user WHERE token = ?";
        const [user] = await conn.query(query, [reqToken]);

        // Check if the user exists
        if (!user || user.length !== 1) {
            return res.json({ status: 3, message: 'User not found' });
        }

        const userData = user[0];

        // Check for password match (if password is included in the request)
        if (password && userData.password !== md5(password)) {
            return res.status(200).json({ message: 'Incorrect password!', status: 6 });
        }

        // Generate a new token
        const newToken = generateToken();

        // Update the token in the database
        await conn.query("UPDATE user SET token = ? WHERE id = ?", [newToken, userData.id]);

        // Fetch additional details (admin, commission, etc.)
        const [admin] = await conn.query("SELECT * FROM admin WHERE id = 1");
        const [commission] = await conn.query("SELECT * FROM commission WHERE id = 1");
        const [bankDa] = await conn.query("SELECT * FROM bankkyc WHERE userid = ?", [userData.id]);
        const [sportImage] = await conn.query("SELECT image FROM sports_refer WHERE id = 1");


        // Get today's date
        const todayDate = new Date().toISOString().split('T')[0];

        // Query daily bonus record
        const [daily] = await conn.query("SELECT * FROM daily_bonus_record WHERE userid = ?", [userData.id]);
        let day = 1, dailyBonus = 0;

        if (daily && daily.length > 0) {
            const [latestDaily] = await conn.query(
                "SELECT * FROM daily_bonus_record WHERE userid = ? AND DATE(time) = ? ORDER BY id DESC LIMIT 1",
                [userData.id, todayDate]
            );

            const lastRecord = daily[0];
            dailyBonus = latestDaily && latestDaily.length > 0 ? 1 : 0;
            day = dailyBonus ? lastRecord.day : lastRecord.day + 1;
        }

        // Prepare response data
        const ReData = {
            message: 'Login Successful',
            userid: userData.id,
            name: userData.name,
            mobile: userData.mobile,
            image: userData.image,
            email: userData.email,
            wallet: userData.wallet,
            roiwallet: userData.roiwallet,
            bonus: userData.bonus,
            winamount: userData.winamount,
            promocode: userData.promocode,
            freespin: userData.freespin,
            spinfreelimit: userData.spinfreelimit,
            vertoken: newToken,
            adminmobile: admin[0]?.mobile,
            telegram: admin[0]?.telegram,
            whatsapp: admin[0]?.whatsapp,
            withlimit: admin[0]?.withlimit,
            withlimitMax: 25000,
            usdtLimitMax: 100000000,
            usdtRate: admin[0]?.usdtprice,
            usdtLimit: admin[0]?.withusdt,
            amount: commission[0]?.amount,
            level1: commission[0]?.level1,
            level2: commission[0]?.level2,
            level3: commission[0]?.level3,
            level4: commission[0]?.level4,
            upiid: bankDa[0]?.upiid ?? null,
            holderupi: bankDa[0]?.holderupi ?? null,
            account: bankDa[0]?.account ?? null,
            holderbank: bankDa[0]?.holderbank ?? null,
            ifsccode: bankDa[0]?.ifsccode ?? null,
            bankname: bankDa[0]?.bankname ?? null,
            UsdtId: bankDa[0]?.usdtid ?? null,
            sport_image: sportImage[0].image ?? null,
            refer_image: sportImage[0].image ?? null,
            share_image: sportImage[2].image ?? null,
            day: day,
            daily: dailyBonus
        };

        return res.json({ status: 1, ReData });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: 5, message: 'Internal server error' });
    }
};


const registerOTP = async (req, res) => {
    const { mobile, promocode, version } = req.body;
    if (!mobile) {
        return res.json({ status: 3, message: 'parameter miss' });
    }
    if (version != My_Version) {
        return res.json({ status: 9, message: 'Please Update Apk' });
    }
    try {
        const token = generateToken();
        // const otp = generate4DigitOTP();
        const otp = 9876;
        const [allready] = await conn.query("SELECT mobile FROM user WHERE mobile= ? ", [mobile]);
        if (allready.length == 1) {
            return res.json({ status: 4, message: 'allready singup Mobile !' });
        }
        const query = "INSERT INTO `otp`( `token`, `mobile`, `promocode`, `password`, `otp`) VALUES (?, ?,?,?,?)";
        const [Rquery] = await conn.query(query, [token, mobile, promocode, "null", otp]);
        if (Rquery.affectedRows == 1) {
            return res.json({
                token,
                status: 1,
                message: 'Otp Send'
            });
        } else {
            return res.json({ status: 2, message: 'server error' });
        }
    } catch (error) {
        console.log(error);
        return res.status(500).json({ status: 5, message: 'internal error' });
    }
}

const forgetOTP = async (req, res) => {
    const { mobile, version } = req.body;
    if (!mobile) {
        return res.json({ status: 3, message: 'parameter miss' });
    }
    if (version != My_Version) {
        return res.json({ status: 9, message: 'Please Update Apk' });
    }
    try {
        // const otp = generate4DigitOTP();
        const otp = 9876;
        const [allready] = await conn.query("SELECT mobile,id FROM user WHERE mobile= ? ", [mobile]);
        if (allready.length != 1) {
            return res.json({ status: 4, message: 'allready singup Mobile !' });
        }
        const query = "UPDATE user SET otp = ? WHERE id = ?";
        const [Rquery] = await conn.query(query, [otp, allready[0].id]);
        if (Rquery.affectedRows == 1) {
            const ReData = {
                status: 1,
                message: 'Otp Send'
            }
            return res.json({ ReData });
        } else {
            return res.json({ status: 2, message: 'server error' });
        }
    } catch (error) {
        return res.status(500).json({ status: 5, message: 'internal error' });
    }
}


const registerfinal = async (req, res) => {
    const { otp, otpToken, password } = req.body;
    if (!otp || !otpToken || otp == 0 || !password) {
        return res.json({ status: 3, message: 'parameter miss' });
    }
    // if(version != "a3"){
    //     return res.json({status : 9, message : 'Update Apk'});
    // }
    try {
        const [OTPL] = await conn.query("SELECT * FROM otp WHERE token = ? ", [otpToken]);
        if (OTPL.length != 1) {
            return res.json({ status: 3, message: 'Data not found' });
        }
        if (OTPL[0].otp != otp) {
            return res.json({ status: 3, message: 'invalid OTP' });
        }
        const [admin] = await conn.query("SELECT * FROM admin WHERE id = 1");
        const [admin_setting] = await conn.query("SELECT * FROM admin_setting WHERE id = 1");
        const token = generateToken();
        console.log(token);
        const pass = md5(password);
        console.log(pass);
        const query = "INSERT INTO `user`( `name`,`mobile`, `image`, `email`, `wallet`, `bonus`,`winamount`, `promocode`, `country`, `gender`, `currency`, `otp`,`password`, `status`, `token`) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)";
        const [Rquery] = await conn.query(query, ['Player', OTPL[0].mobile, 'Av-Image-3', 'abc@gmail.com', admin_setting[0].newuser_wallet, admin_setting[0].newuser_wallet, 0, generateProCode(), admin[0].country, 'male', admin[0].currency, 0, pass, 1, token]);
        const [user] = await conn.query("SELECT * FROM user WHERE token = ? ", [token]);
        const bank = "INSERT INTO `bankkyc`(`userid`, `upiid`, `holderupi`, `account`, `holderbank`, `ifsccode`, `bankname`) VALUES ( ?, ?, ?, ?, ?, ?, ?)";
        const [bankQ] = await conn.query(bank, [user[0].id, 0, null, 0, null, null, null]);
        await conn.query("UPDATE user SET token = ? WHERE id = ?", [token, user[0].id]);

        // Fetch additional details (admin, commission, etc.)
        const [commission] = await conn.query("SELECT * FROM commission WHERE id = 1");
        const [sport_image] = await conn.query("SELECT * FROM sports_refer ");

        let day = 1;
        let dail = 0;
        const wallet = user[0].winamount + user[0].wallet;
        // Prepare response data
        const ReData = {
            message: 'Login Successful',
            userid: user[0].id,
            name: user[0].name,
            mobile: user[0].mobile,
            image: user[0].image,
            email: user[0].email,
            wallet: wallet,
            roiwallet: user[0].roiwallet,
            bonus: user[0].bonus,
            winamount: user[0].winamount,
            promocode: user[0].promocode,
            freespin: user[0].freespin,
            spinfreelimit: user[0].spinfreelimit,
            vertoken: token,
            adminmobile: admin[0].mobile,
            telegram: admin[0].telegram,
            whatsapp: admin[0].whatsapp,
            withlimit: admin[0].withlimit,
            withlimitMax: 25000,
            usdtLimitMax: 100000000,
            usdtRate: admin[0].usdtprice,
            usdtLimit: admin[0].withusdt,
            amount: commission[0].amount,
            level1: commission[0].level1,
            level2: commission[0].level2,
            level3: commission[0].level3,
            level4: commission[0].level4,
            upiid: null,
            holderupi: null,
            account: 0,
            holderbank: null,
            ifsccode: null,
            bankname: null,
            UsdtId: null,
            sport_image: sport_image[0].image,
            refer_image: sport_image[1].image,
            share_image: sport_image[2].image,
            day: day,
            daily: dail
        };

        return res.json({ status: 1, ReData });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ status: 5, message: error });
    }
}

const forgetFinal = async (req, res) => {
    const { mobile, otp, password } = req.body;
    if (!mobile || !otp || otp == 0) {
        return res.json({ status: 3, message: 'paramter miss' });
    }
    try {
        const query = "SELECT mobile,otp FROM user WHERE mobile = ? AND otp = ?";
        const [user] = await conn.query(query, [mobile, otp]);
        if (user.length != 1) {
            return res.json({ status: 3, message: 'user not found' });
        }
        const pass = md5(password);
        const [userUp] = await conn.query("UPDATE user SET password = ?, otp = ? WHERE mobile = ?", [pass, 0, mobile]);
        if (userUp.affectedRows == 1) {
            return res.json({ status: 1, message: 'Password Update successfull' });
        } else {
            return res.json({ status: 2, message: 'server error !' });
        }
    } catch (error) {
        return res.status(500).json({ status: 5, message: 'internale error' });
    }
}

function generate4DigitOTP() {
    const otp = Math.floor(1000 + Math.random() * 9000); // Generates a random number between 1000 and 9999
    return otp.toString(); // Convert to string if needed
}
function generateProCode() {
    const characters = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let proCode = '';
    for (let i = 0; i < 6; i++) {
        proCode += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return proCode;
}

// const downloadapk = async(req, res)=>{
//     res.redirect("./SabKheloSabJeeto.apk");
//     res.render("admin/landing");
// }

export default {
    login,
    validateToken,
    playasguest,
    registerOTP,
    registerfinal,
    forgetOTP,
    forgetFinal
};
