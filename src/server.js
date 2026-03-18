import express from 'express';
import configViewEngine from './config/configEngine.js';
import router from './route/web.js';
import cookieParser from 'cookie-parser';
import http from 'http';
// import { Server as SocketIoServer } from 'socket.io';
// import socketIoController from './controller/socket/aviatorController.js';
import cors from 'cors'; // <== ADD THIS LINE
// import  "./Cronjob/min5.js"; // cron job
// import  "./Cronjob/agentcomm.js"; // cron job

import dotenv from "dotenv";
dotenv.config();

const app = express();




// ✅ Allow Cross-Origin requests from any domain
app.use(cors());

// Middleware
app.use(express.static('public'));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Set up view engine
configViewEngine(app);

// Initialize routes
router.initWebRoute(app);

app.post('/login', (req, res) => {
  res.json({ status: 'success' });
});

// Express app listens on port 3000
const APP_PORT = 4009;

// app.listen(APP_PORT, "0.0.0.0", () => {
//   console.log(`Server running on http://0.0.0.0:${APP_PORT}`);
// });

app.listen(APP_PORT, () => {
  console.log(`Express server is running at http://localhost:${APP_PORT}/`);
});

// Create a separate server for Socket.IO on port 4000
// const socketServer = http.createServer();
// const io = new SocketIoServer(socketServer, {
//   cors: {
//     origin: '*', // Allow all origins; customize as needed
//     methods: ['GET', 'POST'],
//   },
// });

// Initialize Socket.IO functionality
// socketIoController.sendMessageAdmin(io);

// Socket.IO server listens on port 4000
// const SOCKET_PORT = 4009;
// socketServer.listen(SOCKET_PORT, () => {
//   console.log(`Socket.IO server is running at http://localhost:${SOCKET_PORT}/`);
// });
