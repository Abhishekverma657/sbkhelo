import express from 'express';
import multer from 'multer';

import adminController from '../controller/adminController.js';
import middlewareController from '../controller/middlewareController.js';
import adminUserController from '../controller/adminUserController.js';
import deletedRecords from '../controller/deletedRecords.js';
import userexportData from '../controller/userexportData.js';
import pageController from "../controller/pageController.js";
import depositeController from "../controller/depositeController.js";
import depostieexport from "../controller/Export/depostieexport.js";
import withdrawlController from "../controller/withdrawlController.js";
import GamesettingController from "../controller/GamesettingController.js";
import EXPort from "../controller/Export/Export.js";
import searchController from "../controller/searchController.js";
import userData from "../controller/userdataController.js";
import userPage from "../controller/userpageController.js";
import UserUpdate from "../controller/userUpdate.js";
import Adminfetch from "../controller/adminFetch.js";
import adminFetch from '../controller/adminFetch.js';
import UnityAPiLogin from  '../controller/UnityApi/loginController.js';
import UnityAPiFetch from "../controller/UnityApi/UnityAPiFetch.js";

import adminPages from "../controller/subadmin/PageController.js";
import adminManger from "../controller/subadmin/MangerController.js";
import verifySubadmin from "../controller/subadmin/verifySubadmin.js";

import agentManger from "../controller/agent/MangerController.js";
import agnetPages from "../controller/agent/PageController.js";
import verifyagent from "../controller/agent/verifySubadmin.js";

import  bettingexport  from "../controller/Export/betting.js";

let router = express.Router();


const initWebRoute = (app) => {
    
    router.get('/' , pageController.landingPage);
    router.get('/superadmin' , adminController.loginPage);
    router.post('/AdminDashbord', middlewareController, Adminfetch.AdminDash);
    router.post('/newUserDashbord', middlewareController, Adminfetch.newUserD);
    router.post('/newDepostiDashbord', middlewareController, Adminfetch.newDepostiD);
    router.post('/newWithdrwalsDashbord', middlewareController, Adminfetch.newDepostiW);

    router.post('/adminsendotp', adminController.loginapi);
    router.post('/adminotpverify', adminController.adminotpverify);
    
    router.post('/allusersAPi', adminUserController.adminUserData.getUsers);
    router.post('/activeusersAPi', adminUserController.adminUserData.ActiveUsers);
    router.post('/DeletedusersAPi', deletedRecords.DeleteUsers);

    router.get('/super/dashboard', middlewareController, adminController.dashboardPage);
    router.get('/super/player', middlewareController, adminController.playerPage);
    router.get('/super/active-player', middlewareController, adminController.activeplayer);
    router.post('/AllDespositB', middlewareController, adminFetch.activeplayer);
    router.post('/AllgameStart', middlewareController, adminFetch.AllgameStart);
    router.post('/bettingR', middlewareController, GamesettingController.bettingR);
    router.get('/super/result', middlewareController, pageController.result);


    // deleted 
    router.post("/recordsDeleted", middlewareController, deletedRecords.deletedUserRecords);
    router.post("/UserRecordsD", middlewareController, deletedRecords.deletedUserRecords);


    // export
    router.get('/exportDataApi', middlewareController, userexportData.exportData);
    router.get('/activeDataApi', middlewareController, userexportData.activeplayerData);
    router.post('/depostipendingEXP', middlewareController, depostieexport.pendingdeposit);
    router.post('/bettingEXP', middlewareController, bettingexport.pendingdeposit);
    router.post('/super/exportdata', middlewareController, userexportData.exportDatarecords);
    router.post('/festivalEXP', middlewareController, EXPort.festival);
    
    
    // data fetch
    router.post('/depositeP', middlewareController, depositeController.pending);
    router.post('/Withdrawls', middlewareController, withdrawlController.pending);
    router.post('/withPass', middlewareController, withdrawlController.withPass);
    router.post('/limitAction', middlewareController, GamesettingController.ChangeLimit);

    router.post('/festivalAdd',  GamesettingController.festivalAdd);
    router.post('/festvalGetAPi', middlewareController, GamesettingController.festivalGet);
    
    router.post('/mailGetAPi', middlewareController, GamesettingController.mailGetAPi);
    
    router.post('/sliderAdd', middlewareController, GamesettingController.sliderAdd);
    router.post('/sliderAPi', middlewareController, GamesettingController.sliderAPi);
    
    router.post('/noticeAPi', middlewareController, GamesettingController.noticeApi);
    router.post('/AddUpiAPi', middlewareController, GamesettingController.AddUpiAPi);
    router.post('/OtherImageApi', middlewareController, GamesettingController.OtherImageApi);
    router.post('/super/userPorfil', middlewareController, GamesettingController.userPorfil);
    router.post('/super/userPorfilMore', middlewareController, GamesettingController.userPorfilMore);
    router.post('/super/profileCha', middlewareController, GamesettingController.profileCha);
    router.post('/super/adminPassC', middlewareController, GamesettingController.adminPassC);
    router.post('/collectfesaval', middlewareController, GamesettingController.collectfesaval);
    router.post('/addrechGetAPi', middlewareController, GamesettingController.addrechGetAPi);
    router.post('/super/lastresult', middlewareController, GamesettingController.lastrsult);
    router.post('/game_load', middlewareController, GamesettingController.Game_load);
    
    router.post('/super/makePayment1', middlewareController, depositeController.makePayment1);
    router.post('/super/makePayment2', middlewareController, depositeController.makePayment2);

    router.post('/super/addDSearch', middlewareController, searchController.userSerch);
    
    router.post('/userPorfildashborad', middlewareController, userData.userDashboard);
    router.post('/Userdeposite', middlewareController, userData.userDeposit);
    router.post('/UserWIth', middlewareController, userData.userWithdrawl);
    router.post('/Userbetting', middlewareController, userData.usertrade);
    router.post('/UserPassbook', middlewareController, userData.UserPassbook);
    router.post('/usercommshow', middlewareController, userData.usercommshow);
    router.post('/Userlevel', middlewareController, userData.Userlevel);
    router.post('/userDataUpdate', middlewareController, UserUpdate.userPorfilUpdate);
    router.post('/userBankUpdate', middlewareController, UserUpdate.userBankUpdate);
    router.post('/addSelfDeposit', middlewareController, UserUpdate.addSelfDeposit);
    router.post('/UpdateSetitng', middlewareController, UserUpdate.UpdateSetitng);
    router.post('/super/referUpdate', middlewareController, UserUpdate.referUpdate);
    router.post('/super/updateGamepool', middlewareController, UserUpdate.updateGamepool);
    router.post('/super/livepool', middlewareController, UserUpdate.livepool);
    router.post('/super/updatePayment', middlewareController, UserUpdate.updatePayment);
    router.post('/super/gameactiveA', middlewareController, UserUpdate.gameactiveA);
    router.post('/add_user', middlewareController, UserUpdate.adduser);
    // router.post('/getAdminFinanceData',  UserUpdate.getAdminFinanceData );
    router.post('/getAddRecharges',  UserUpdate.getAddRecharges );
    router.post('/getTransfers',  UserUpdate.getTransfers );
    router.post('/getWithdraws',  UserUpdate.getWithdraws );
// page route 
    // deposit 
    router.get('/super/pendingdeposti', middlewareController, pageController.pendingD);
    router.get('/super/successdeposti', middlewareController, pageController.SuccessD);
    router.get('/super/rejectdeposti', middlewareController, pageController.RejectD);
    router.get('/super/getwaydepostie', middlewareController, pageController.GetWayD);

    // withdrawl
    router.get('/super/pendingwithdrawl', middlewareController, pageController.withdrawlP);
    router.get('/super/successwithdrawl', middlewareController, pageController.withdrawlS);
    router.get('/super/rejectwithdrawl', middlewareController, pageController.withdrawlR);
    router.get('/super/gamestart', middlewareController, pageController.gameStart);

    router.get("/super/records", middlewareController, pageController.records);
    
    // setting 
    router.get('/super/settingcommission', middlewareController, userPage.settingComm);
    router.get('/super/festival-bonus', middlewareController, pageController.FestivalBO);
    router.get('/super/mail', middlewareController, pageController.mail);
    router.get('/super/slider', middlewareController, pageController.slider);
    router.get('/super/notice', middlewareController, pageController.notice);
    router.get('/super/addUpi', middlewareController, pageController.addUpi);
    router.get('/super/other-imge', middlewareController, pageController.OtherImge);
    router.get('/super/betting', middlewareController, pageController.betting);
    router.get('/super/profile', middlewareController, pageController.profile);
    router.get('/super/usefastival', middlewareController, pageController.usefastival);
    router.get('/super/add-rech', middlewareController, pageController.addrech);
    router.get('/super/add-salary', middlewareController, pageController.addsalary);

    router.get('/super/user/:id', middlewareController, userPage.userDataa);
    router.get('/super/user-deposit/:id', middlewareController, userPage.userDeposit);
    router.get('/super/user-with/:id', middlewareController, userPage.userWith);
    router.get('/super/user-trade/:id', middlewareController, userPage.usertrade);
    router.get('/super/user-commit/:id', middlewareController, userPage.usercommit);
    router.get('/super/user-update/:id', middlewareController, userPage.userUpdate);
    router.get('/super/user-bank/:id', middlewareController, userPage.userBank);
    router.get('/super/user-passbook/:id', middlewareController, userPage.userpassbook);



// admin panel ui 
    router.get('/admin', adminPages.login);
    router.get('/admin/dashboard', adminPages.dashboard);
    router.get('/admin/user', adminPages.user);
    router.get('/admin/agent', adminPages.agent);
    router.get('/admin/deposit', adminPages.deposit);
    router.get('/admin/betting', adminPages.betting);
    router.get('/admin/addrech', adminPages.addrech);
    router.get('/admin/profile', adminPages.profile);
    router.get('/admin/editprofile', adminPages.editprofile);
    router.get('/admin/commission', adminPages.commission);
    router.get('/admin/withdrawls', adminPages.withdrawls);
    
    // admin panel for api
    router.post('/admin/loginsendotp',  adminManger.loginsendotp );
    router.post('/admin/loginverifyotp',  adminManger.loginverifyotp);
    router.post('/admin/loginapi',  adminManger.loginapi);
    router.post('/admin/alluser', verifySubadmin,  adminManger.alluser);
    router.post('/admin/dashboard', verifySubadmin,  adminManger.dashboard);
    router.post('/admin/take', verifySubadmin,  adminManger.take);
    router.post('/admin/Udashboard', verifySubadmin,  adminManger.Udashboard);
    router.post('/admin/getBetting', verifySubadmin,  adminManger.getDepositdata,);
    router.post('/admin/getdeposit', verifySubadmin,  adminManger.getdeposit);
    router.post('/admin/profile_update', verifySubadmin,  adminManger.profile_update);
    router.post('/admin/transaction',  verifySubadmin, adminManger.deposite_);
    router.post('/admin/betting',  verifySubadmin, adminManger.betting_);
    router.post('/admin/addrech',  verifySubadmin, adminManger.getRechargeList);
    router.post('/admin/applyFilter', verifySubadmin,  adminManger.applyFilter);
    router.post('/admin/transfer', verifySubadmin,  adminManger.transfer);
    router.post('/admin/add_user', verifySubadmin, adminManger.adduser);
    router.post('/admin/removeuser', verifySubadmin, adminManger.removeuser);
    router.post('/admin/removedata', verifySubadmin, adminManger.removedata);
    router.post('/admin/userblock', verifySubadmin, adminManger.userblock);
    router.post('/admin/name_edit', verifySubadmin, adminManger.name_edit);
    router.post('/admin/C_password', verifySubadmin, adminManger.C_password);
    router.post('/admin/addDSearch', verifySubadmin, adminManger.userSerch);
    router.post('/admin/makePayment1', verifySubadmin, adminManger.makePayment1);
   router.post('/admin/comission',  verifyagent, adminManger.commission);
   router.post('/admin/comissionU',  verifyagent, adminManger.commissionU);

   router.post('/admin/withdrawls',  verifyagent, adminManger.withdrawls);
   router.post('/admin/withaction', verifySubadmin, adminManger.withaction);

    


// admin panel ui 
    router.get('/user/', agnetPages.login);
    router.get('/user/dashboard', agnetPages.dashboard);
    router.get('/user/user', agnetPages.user);
    router.get('/user/agent', agnetPages.agent);
    router.get('/user/deposit', agnetPages.deposit);
    router.get('/user/betting', agnetPages.betting);
    router.get('/user/commission', agnetPages.commission);
    router.get('/user/withdawls', agnetPages.withdawls);
    router.get('/user/profile', agnetPages.profile);
    router.get('/user/editprofile', agnetPages.editprofile);
    
    // admin panel for api
    router.post('/user/login',  agentManger.login);
    router.post('/user/alluser', verifyagent,  agentManger.alluser);
    router.post('/user/dashboard', verifyagent,  agentManger.dashboard);
    router.post('/user/Udashboard', verifyagent,  agentManger.Udashboard);
    router.post('/user/getBetting', verifyagent,  agentManger.getDepositdata,);
    router.post('/user/getdeposit', verifyagent,  agentManger.getdeposit);
    router.post('/user/profile_update', verifyagent,  agentManger.profile_update);
    router.post('/user/deposite',  verifyagent, agentManger.deposite_);
    router.post('/user/betting',  verifyagent, agentManger.betting_);
    router.post('/user/comission',  verifyagent, agentManger.commission);
    router.post('/user/applyFilter', verifyagent,  agentManger.applyFilter);
    router.post('/user/transfer', verifyagent,  agentManger.transfer);
    router.post('/user/add_user', verifyagent, agentManger.adduser);
    router.post('/user/removeuser', verifyagent, agentManger.removeuser);
    router.post('/user/removedata', verifyagent, agentManger.removedata);
    router.post('/user/userblock', verifyagent, agentManger.userblock);
    router.post('/user/name_edit', verifyagent, agentManger.name_edit);
    router.post('/user/C_password', verifyagent, agentManger.C_password);
    
    
    
    router.post('/user/betting_data',   agentManger.betting_1);
    router.post('/user/get_result_type',   agentManger.result_type);
    router.post('/user/set_result_mode',   agentManger.set_result_mode);
    router.post('/user/winner_set',   agentManger.winner_set);
    
    // admin panel api 
    



    // router.get("/downloadapk", UnityAPiLogin.downloadapk);
    // unity api 
    router.post('/Ulogin', UnityAPiLogin.login);
    router.post('/validateToken', UnityAPiLogin.validateToken);
    router.post('/playasguest', UnityAPiLogin.playasguest);
    router.post('/getotpforsignup', UnityAPiLogin.registerOTP);
    router.post('/register', UnityAPiLogin.registerfinal);
    router.post('/forgetP', UnityAPiLogin.forgetOTP);
    router.post('/forgetotp', UnityAPiLogin.forgetFinal);    
    router.post('/livewalletdata', UnityAPiFetch.livewalletdata);
    router.post('/profileimageupdated', UnityAPiFetch.proImageChange);
    router.post('/nameeditapi', UnityAPiFetch.nameeditapi);
    router.post('/mybonus', UnityAPiFetch.mybonusAPi);  
    router.post('/RankAPi', UnityAPiFetch.RankAPi);

    router.post('/betrecords', UnityAPiFetch.betrecords);
    router.post('/depositrecords', UnityAPiFetch.deposit);
    router.post('/withdrawalrecords', UnityAPiFetch.withdrawls);

    router.post("/depositrequest", UnityAPiFetch.despsitR);
    router.post("/withdrawlsrequest", UnityAPiFetch.withdrawlsR);
    router.post("/withdrawlrequest", UnityAPiFetch.withdrawlsRQ);

    router.post('/bettingF', UnityAPiFetch.betting1);
    router.post('/bettingFF', UnityAPiFetch.betting2);
    // router.post('/bettingFF', betting);
    router.post('/load_game', UnityAPiFetch.load_game);
    router.post('/change_password', UnityAPiFetch.change_password);
    router.post('/winnerout', UnityAPiFetch.winnerout);
    router.post("/getdeposithostroy", UnityAPiFetch.deposithistroy);
    router.post("/getwhithdrawlshostroy", UnityAPiFetch.getwhithdrawlshostroy);
    router.post("/todaycomm", UnityAPiFetch.Today);
    router.post("/takeclaim", UnityAPiFetch.takeclaim);

    // landing page for api here
    router.post('/backresult', UnityAPiFetch.result);

    return app.use('/', router);
    
};

// const storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//       cb(null, './uploads/'); // Upload directory
//     },
//     filename: function (req, file, cb) {
//       const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
//       cb(null, uniqueSuffix + path.extname(file.originalname)); // Unique filename
//     },
//   });
// const upload = multer({ storage: storage });



export default{
    initWebRoute,
};