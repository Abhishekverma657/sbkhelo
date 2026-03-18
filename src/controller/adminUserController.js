import express, { json, query } from 'express';
import conn from '../config/db_conn.js';
// import { EventEmitterAsyncResource } from 'json2csv/JSON2CSVTransform.js';

const adminUserData = {
  getUsers: async (req, res) => {
    const { page = 1, item = '', startdate, enddate, userType = 0 } = req.body;
    const limit = 10;
    const offset = (page - 1) * limit;
    try {
      // Build dynamic conditions
      const conditions = [];
      const queryParams = [];
      if (item) {
        conditions.push('(name LIKE ? OR mobile LIKE ? OR time LIKE ? OR id LIKE ?)');
        queryParams.push(`%${item}%`, `%${item}%`, `%${item}%`, `%${item}%`);
      }
      if (userType !== 0) {
        conditions.push('login_type = ?');
        queryParams.push(userType);
      }
      if (startdate && enddate) {
        conditions.push('time BETWEEN ? AND ?');
        queryParams.push(startdate, enddate);
      }
      const whereClause = conditions.length ? ` AND ${conditions.join(' AND ')}` : '';
      // Main query
      const query = `
        SELECT * 
        FROM user 
        WHERE 1=1 
        ${whereClause} 
        ORDER BY time DESC 
        LIMIT ? OFFSET ?;
      `;
      queryParams.push(limit, offset);
      // Execute main query
      const [users] = await conn.query(query, queryParams);
      // Count total rows
      const countQuery = `SELECT COUNT(*) AS total FROM user WHERE 1=1 ${whereClause};`;
      const [countResult] = await conn.query(countQuery, queryParams.slice(0, -2));
      const totalRows = countResult[0].total;
      const totalPages = Math.ceil(totalRows / limit);

      // Format user data
      const data = await Promise.all(
        users.map(async (user) => {
          const totalrech = await Desposit(user.id); // Await result of Desposit function
          const totalwith = await WithDrawls(user.id); // Await result of Desposit function
          const totalwin = await userWin(user.id); // Await result of Desposit function
          const totalBet = await userBet(user.id); // Await result of Desposit function
          const uperline = await Upline(user.use_promocode ?? null); // Await result of Desposit function
          const uperline1 = await Upline(user.admin_promocode ?? null);
          const commission1 = await commission(user.id ?? null, user.login_type);
          return {
            id: user.id,
            name: user.name,
            mobile: user.mobile,
            email: user.email,
            totalrech: totalrech,
            totalwith: totalwith,
            totalwin: totalwin,
            totalBet: totalBet,
            commission1,
            uperline: uperline,
            admin_uperline: uperline1,
            wallet: Number(user.wallet).toFixed(2),
            winamount: Number(user.winamount).toFixed(2),
            bonus: Number(user.bonus).toFixed(2),
            joindate: user.time instanceof Date ? user.time.toLocaleString('en-IN', { hour12: false }) : user.time,
            block: user.block === 0 ? 'Active' : 'Blocked',
            Otp: user.otp,
            Commission: user.commision,
            login_type: user.login_type,
            spinlimit: [100, 500, 1000, 5000, 10000, 50000][user.spinfreelimit] || 100,
          };
        })
      );


      res.json({
        data,
        pagination: {
          totalRows,
          totalPages,
          currentPage: page,
        },
      });
    } catch (error) {
      console.error('Error fetching users:', error.message);
      res.status(500).json({ error: 'Internal server error' });
    }
  },



  ActiveUsers: async (req, res) => {
    const { page = 1, item = '', startdate, enddate } = req.body;
    const limit = 10;
    const offset = (page - 1) * limit;
    try {
      // Build dynamic conditions
      const conditions = [];
      const queryParams = [];
      if (item) {
        conditions.push('(name LIKE ? OR mobile LIKE ? OR time LIKE ? OR id LIKE ?)');
        queryParams.push(`%${item}%`, `%${item}%`, `%${item}%`, `%${item}%`);
      }
      if (startdate && enddate) {
        conditions.push('time BETWEEN ? AND ?');
        queryParams.push(startdate, enddate);
      }
      const whereClause = conditions.length ? ` AND ${conditions.join(' AND ')}` : '';
      // Main query
      const query = `
        SELECT * 
        FROM user 
        WHERE 1=1 
        ${whereClause} AND Ractive = ? 
        ORDER BY time DESC 
        LIMIT ? OFFSET ?;
      `;
      queryParams.push(1, limit, offset);
      // Execute main query
      const [users] = await conn.query(query, queryParams);
      // Count total rows
      const countQuery = `SELECT COUNT(*) AS total FROM user WHERE 1=1 ${whereClause} AND Ractive = 1;`;
      const [countResult] = await conn.query(countQuery, queryParams.slice(0, -2));
      const totalRows = countResult[0].total;
      const totalPages = Math.ceil(totalRows / limit);

      // Format user data
      const data = await Promise.all(
        users.map(async (user) => {
          const totalrech = await Desposit(user.id); // Await result of Desposit function
          const totalwith = await WithDrawls(user.id); // Await result of Desposit function
          const totalwin = await userWin(user.id); // Await result of Desposit function
          const totalBet = await userBet(user.id); // Await result of Desposit function
          const uperline = await Upline(user.use_promocode ?? null); // Await result of Desposit function
          // Await result of Desposit function
          return {
            id: user.id,
            name: user.name,
            mobile: user.mobile,
            totalrech: totalrech,
            totalwith: totalwith,
            totalwin: totalwin,
            totalBet: totalBet,
            uperline: uperline,

            wallet: Number(user.wallet).toFixed(2),
            winamount: Number(user.winamount).toFixed(2),
            bonus: Number(user.bonus).toFixed(2),
            joindate: user.time instanceof Date
              ? user.time.toLocaleString('en-IN', { hour12: false })
              : user.time,
            block: user.block === 0 ? 'Active' : 'Blocked',
            Otp: user.otp,
            spinlimit: [100, 500, 1000, 5000, 10000, 50000][user.spinfreelimit] || 100,
          };
        })
      );


      res.json({
        data,
        pagination: {
          totalRows,
          totalPages,
          currentPage: page,
        },
      });
    } catch (error) {
      console.error('Error fetching users:', error.message);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
};


async function commission(user, type) {

  let rows;

  if (type == 3) {

    [rows] = await conn.query(
      "SELECT SUM(amount) AS Total FROM bet_c WHERE status=0 AND admin_id=?",
      [user]
    );

  } else {

    [rows] = await conn.query(
      "SELECT SUM(amount) AS Total FROM bet_c WHERE status=0 AND userid=? AND admin_id=?",
      [user, user]
    );

  }

  const total = rows[0]?.Total ?? 0;

  return Math.round(total);

}

async function Desposit(user) {
  const [DepostiHO] = await conn.query(`SELECT COALESCE(SUM(CASE WHEN status = 1 THEN amount ELSE 0 END), 0) AS total_amount FROM (SELECT amount, status FROM auto_rechage WHERE userid = ${user} UNION ALL
    SELECT amount, status FROM recharge WHERE userid = ${user}) AS combined_recharges;`);
  const [Usdt] = await conn.query(`SELECT SUM(amount) AS Total FROM usdt_rechage WHERE userid = ${user} AND status = 1`);
  const [admin] = await conn.query(`SELECT usdtprice FROM admin_setting WHERE id = 1`);
  let useramount = Usdt[0].Total * admin[0].usdtprice;
  return DepostiHO[0].total_amount + useramount ?? 0.00;
}
async function WithDrawls(user) {
  const [manu] = await conn.query(`SELECT SUM(amount) AS Total FROM withdraw WHERE userid = ${user} AND status = 1`);
  const [Usdt] = await conn.query(`SELECT SUM(amount) AS Total FROM withdraw_usdt WHERE userid = ${user} AND status = 1`);
  const [admin] = await conn.query(`SELECT usdtprice FROM admin_setting WHERE id = 1`);
  let useramount = Usdt[0].Total * admin[0].usdtprice;
  return Math.round(manu[0].Total + useramount ?? 0.00);
}
async function userWin(user) {
  const [betting] = await conn.query(`SELECT SUM(winamount) AS Total FROM betting WHERE userid = ${user}`);
  // const [cp_betting] = await conn.query(`SELECT SUM(winamount) AS Total FROM cp_betting WHERE userid = ${user}`);
  let useramount = betting[0].Total;
  return Math.round(useramount ?? 0.00);
}
async function userBet(user) {
  const [betting] = await conn.query(`SELECT SUM(betamount) AS Total FROM betting WHERE userid = ${user}`);
  // const [cp_betting] = await conn.query(`SELECT SUM(betamount) AS Total FROM cp_betting WHERE userid = ${user}`);
  let useramount = betting[0].Total;
  return Math.round(useramount ?? 0.00);
}
async function Upline(promocode) {
  if (!promocode) {
    return null;
  }
  try {
    const [user] = await conn.query('SELECT mobile FROM user WHERE promocode = ?', [promocode]);
    if (user.length > 0) {
      return user[0].mobile ?? null;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error fetching upline data:', error.message);
    return null; // Return null in case of an error
  }
}




const getActiveUsers = async (req, res) => {
  const { page = 1, item = '', startdate, enddate } = req.body;
  const limit = 10;
  const offset = (page - 1) * limit;

  try {
    // Fetch user IDs from betting table
    const betQuery = `
      SELECT DISTINCT userid 
      FROM betting 
      WHERE betamount >= 10
      ${startdate && enddate ? 'AND time BETWEEN ? AND ?' : ''}
      LIMIT ? OFFSET ?;
    `;

    const betParams = [];
    if (startdate && enddate) betParams.push(startdate, enddate);
    betParams.push(limit, offset);

    const [bets] = await conn.query(betQuery, betParams);
    const userIds = bets.map((bet) => bet.userid);

    if (userIds.length === 0) {
      return res.json({ data: [], pagelimt: 0, pagenumberr: 1 });
    }

    // Dynamic placeholders for user IDs
    const userIdsPlaceholders = userIds.map(() => '?').join(',');

    // Build user query with optional filters
    const userConditions = [];
    if (item) {
      userConditions.push('(name LIKE ? OR mobile LIKE ? OR time LIKE ?)');
    }

    const userWhereClause = userConditions.length
      ? ` AND ${userConditions.join(' AND ')}`
      : '';

    const userQuery = `
      SELECT * 
      FROM user 
      WHERE id IN (${userIdsPlaceholders}) 
      ${userWhereClause};
    `;

    const userParams = [...userIds];
    if (item) {
      userParams.push(`%${item}%`, `%${item}%`, `%${item}%`);
    }

    const [users] = await conn.query(userQuery, userParams);

    // Prepare detailed data for each user
    const data = await Promise.all(
      users.map(async (user) => {
        const totalrech = await Desposit(user.id);
        const totalwith = await WithDrawls(user.id);
        const totalwin = await userWin(user.id);
        const totalBet = await userBet(user.id);
        const uperline = await Upline(user.use_promocode ?? null);

        return {
          id: user.id,
          name: user.name,
          mobile: user.mobile,
          totalrech: totalrech,
          totalwith: totalwith,
          totalwin: totalwin,
          totalBet: totalBet,
          uperline: uperline,
          wallet: Number(user.wallet).toFixed(2),
          winamount: Number(user.winamount).toFixed(2),
          bonus: Number(user.bonus).toFixed(2),
          joindate: user.time instanceof Date
            ? user.time.toLocaleString('en-IN', { hour12: false })
            : user.time,
          block: user.block === 0 ? 'Active' : 'Blocked',
          Otp: user.otp,
          spinlimit: [100, 500, 1000, 5000, 10000, 50000][user.spinfreelimit] || 100,
        };
      })
    );

    // Total record count for pagination
    const totalUsersQuery = `
      SELECT COUNT(*) AS total 
      FROM user 
      WHERE id IN (${userIdsPlaceholders})
      ${userWhereClause};
    `;

    const totalUsersParams = [...userIds];
    if (item) {
      totalUsersParams.push(`%${item}%`, `%${item}%`, `%${item}%`);
    }

    const [totalUsersResult] = await conn.query(totalUsersQuery, totalUsersParams);
    const totalRows = totalUsersResult[0].total;
    const totalPages = Math.ceil(totalRows / limit);

    // Send response
    res.json({
      data,
      pagination: {
        totalRows,
        totalPages,
        currentPage: page,
      },
    });
  } catch (error) {
    console.error('Error fetching active users:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};







export default { adminUserData, getActiveUsers, };
