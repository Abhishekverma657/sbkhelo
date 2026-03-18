
import conn from '../../config/db_conn.js';





const sendMessageAdmin = (io) => {
    // let pool = 1000;
const admin = 30;
// Initialize the Socket.IO server with CORS enabled

const userSockets = {};
let isBettime = true;
let crashpoint = 0;
let flyIntervaltimer = null;
let multiplierT = 0;

console.log("Server Started on port 3000");
let betArray = [];
// On client connection
io.on("connection", (socket) => {
  console.log("Connection established!");
  socket.on('register', async (data) => {
    try {
      console.log(data, "userid logs");
      const { userId } = data;
      if (!userId) {
        throw new Error("userId is missing or invalid");
      }
      const [user] = await conn.query("SELECT wallet, winamount FROM user WHERE id = ?", [userId]);
      if (user.length !== 1) {
        throw new Error(`User with id ${userId} not found or invalid`);
      }
      const userWallet = parseFloat(user[0].wallet) + parseFloat(user[0].winamount);
      userSockets[userId] = socket;
      const userSocket = userSockets[userId];
      if (userSocket) {
        userSocket.emit("userwallet", { winAmount: userWallet }); // Assuming winAmount here is the total wallet amount
        console.log(`Total wallet ${userWallet} sent to user ${userId}`);
      } else {
        console.error(`Socket not found for userId ${userId}`);
      }
      console.log(`User ${userId} connected.`);
    } catch (error) {
      console.error("Error registering user:", error.message); // This will log the specific error
      socket.emit('error', { message: error.message }); // Optionally send error to the client
    }
  });
  function generateGameId() {
    const now = new Date();
    const year = now.getFullYear(); // Get the full year
    const month = String(now.getMonth() + 1).padStart(2, '0'); // Month is zero-based, so add 1
    const day = String(now.getDate()).padStart(2, '0'); // Get the day and pad with zero if needed
    const hours = String(now.getHours()).padStart(2, '0'); // Get hours
    const minutes = String(now.getMinutes()).padStart(2, '0'); // Get minutes
    const seconds = String(now.getSeconds()).padStart(2, '0'); // Get seconds

    // Combine all components into the desired format
    return `${month}${day}${hours}${minutes}${seconds}`;
}
let gameid = 0;
  // Handle bet messages
  socket.on('bet', async (message) => {
    try {
      const parsedMessage = typeof message === 'string' ? JSON.parse(message) : message;
      betArray.push({ user: parsedMessage.userid, amount: parsedMessage.amount });
      const [user] = await conn.query("SELECT wallet, winamount FROM user WHERE id = ?", [parsedMessage.userid] );
      let wallet = user[0].wallet-parsedMessage.amount;
      let winamount = user[0].winamount;
      if(wallet < 0){
        winamount = winamount +wallet;
        wallet = 0;
      }
      gameid = generateGameId();
      const [usercat] = await conn.query("UPDATE user SET wallet = ?, winamount = ? WHERE id = ?", [wallet, winamount ,parsedMessage.userid]);
      const [betting] = await conn.query("INSERT INTO betting(periodid, userid, gamename, betamount, winamount) VALUES (?, ? , ?, ?, ?)", [gameid, parsedMessage.userid, 'Aviator', parsedMessage.amount, 0]);
      console.log('Received bet message:', parsedMessage);
    } catch (error) {
      console.error('Error processing bet message:', error);
    }
  });

  // Handle cashout requests
  socket.on('cashout', async (message) => {
    try {
      const parsedMessage = typeof message === 'string' ? JSON.parse(message) : message;
      console.log("Cash out request received:", parsedMessage);

      const userId = Number(parsedMessage.userid);
      const userTotal = betArray
        .filter(bet => Number(bet.user) === userId)
        .reduce((total, bet) => total + parseFloat(bet.amount), 0);

      console.log(`User ${userId} total amount bet: ${userTotal}`);

      let xpoint = multiplierT;  // You need to define multiplierT
      console.log(xpoint, "xpoint");
      const winAmount = parseFloat(userTotal * xpoint).toFixed(2);
      // pool = pool - winAmount; // Make sure pool is a number, not undefined or null
      poolRemove(winAmount);

      const userSocket = userSockets[userId];
      if (userSocket) {
        userSocket.emit("cashoutResult", { winAmount });
        console.log(`Win amount ${winAmount} sent to user ${userId}`);
      } else {
        console.error(`Socket not found for userId ${userId}`);
      }
      const [userupdate] = await conn.query("UPDATE user SET winamount = ? WHERE id = ?", [winAmount, userId]);
      const [betting] = await conn.query("UPDATE betting SET winamount = ? WHERE periodid = ?", [winAmount, gameid]);
    } catch (error) {
      console.error('Error processing cashout request:', error);
    }
  });

  // Handle user disconnection
  socket.on('disconnect', () => {
    for (const userId in userSockets) {
      if (userSockets[userId] === socket) {
        delete userSockets[userId]; // Remove disconnected user's socket
        console.log(`User ${userId} disconnected.`);
        break;
      }
    }
  });
});


const clear = (array) => {
  array.length = 0;
  return array;
};

function waitforbetting() {
    io.emit("oldUser", { isBettime: true, crashpoint });
    setTimeout(() => {
        flyingStart();
        console.log("betting time");
    }, 10000); 
}

// Event: Listen for server responses
io.on('message', (data) => {
  console.log('Message from server:', data);
});



async function crachpoint(amount, lenght){
  try{
    const [pool] = await conn.query("SELECT Online_Game,admin_comm from admin_pool WHERE id = 1");
    let xpoint = pool[0].Online_Game/amount;
    console.log("Game pool"+  pool[0].Online_Game + "xpoint " + xpoint); 

    return xpoint;
  }catch (error){
    console.error("Error in crachpoint function:", error.message);
    throw error;
  }
}
async function poolAdd(amount) {
  try {
    // Update the Online_Game field by adding the amount
    await conn.query("UPDATE admin_pool SET Online_Game = Online_Game + ? WHERE id = 1", [amount]);
    console.log(`Successfully added ${amount} to Online_Game.`);
  } catch (error) {
    console.error("Error in poolAdd function:", error.message);
    throw error;
  }
}
async function poolRemove(amount) {
  try {
    // Update the Online_Game field by adding the amount
    await conn.query("UPDATE admin_pool SET Online_Game = Online_Game - ? WHERE id = 1", [amount]);
    console.log(`Successfully remove ${amount} to Online_Game.`);
  } catch (error) {
    console.error("Error in poolAdd function:", error.message);
    throw error;
  }
}


async function flyingStart() {
  let crashpoint;
  multiplierT = 0;
  let arraylenght = betArray.length;
  console.log(JSON.stringify(betArray));
  const totalAmount = betArray.reduce((total, bet) => total + parseFloat(bet.amount), 0);
  console.log(totalAmount , "total amount");
  if(arraylenght != 0){
    crashpoint = await crachpoint(totalAmount, betArray.length);
    console.log(crashpoint , "result");
  }else{
    crashpoint = Math.random() * 15 + 1; // Generate new crash point
  }
  if(crashpoint < 1){
    crashpoint = 1.1;
  }
  crashpoint = Math.round(crashpoint * 1000);
  console.log(crashpoint, "crash point");
  io.emit("oldUser", { isBettime: false, crashpoint });
  flyIntervaltimer = setInterval(() => {
    multiplierT += 0.1; 
  }, 100);
  setTimeout(() => {
    // console.log(pool);
    let addpool = (totalAmount * (100-admin)) / 100; // Calculate the admin share
    // pool += addpool;
    poolAdd(addpool);
      // console.log(pool , "pool");
      console.log("flying time");
      clear(betArray);
      waitforbetting();
      clearInterval(flyIntervaltimer);
  }, crashpoint); 
}


waitforbetting();
}

export default {
    sendMessageAdmin,
};
