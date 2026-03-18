import express from 'express';
import conn from '../config/db_conn.js';
const userDashboard = async (req, res) => {
  const { userid, startdate, enddate } = req.body;

  try {
    if (!userid) {
      return res.status(400).json({ message: "userid is required" });
    }

    const [[user]] = await conn.query(
      "SELECT login_type FROM user WHERE id = ?",
      [userid]
    );

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    let sql = `
      SELECT 
        IFNULL(SUM(bet_amount), 0) AS bet_amount, 
        IFNULL(SUM(amount), 0) AS amount 
      FROM bet_c 
      WHERE admin_id = ?
    `;

    const queryParams = [userid];

    // If not agent (login_type != 3), restrict to own records
    if (user.login_type != 3) {
      sql += ` AND userid = ?`;
      queryParams.push(userid);
    }

    // ✅ Proper Date Filter (Full Day Included)
    if (startdate && enddate) {
      sql += ` AND time BETWEEN ? AND ?`;
      queryParams.push(
        `${startdate} 00:00:00`,
        `${enddate} 23:59:59`
      );
    }

    const [datacomm] = await conn.query(sql, queryParams);

    return res.status(200).json({
      status: 1,
      datacomm: datacomm[0]
    });

  } catch (error) {
    console.error("Error in userDashboard:", error);
    return res.status(500).json({ Qstatus: 5, message: "Internal error" });
  }
};
// Recursive function for counting users across levels
const customCount = async (conn, promocode, levels, startdate, enddate) => {
  if (levels <= 0) return 0;

  const queryParams = [promocode];
  const conditions = ['use_promocode = ?'];

  // Add date filter if provided
  if (startdate && enddate) {
    conditions.push('time BETWEEN ? AND ?');
    queryParams.push(startdate, enddate);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  // Query to fetch the next level users
  const [results] = await conn.query(
    `SELECT promocode FROM user ${whereClause}`,
    queryParams
  );

  // Count the number of users at this level
  let totalUsers = results.length;

  // Recursive count for the next level
  for (const user of results) {
    totalUsers += await customCount(conn, user.promocode, levels - 1, startdate, enddate);
  }

  return totalUsers;
};

const userDeposit = async (req, res) => {
  const { page = 1, item = '', startdate, enddate, status, tableName, userid } = req.body;
  const limit = 10;
  const offset = (page - 1) * limit;

  try {
    const conditions = [];
    const queryParams = [];

    if (item) {
      conditions.push('(name LIKE ? OR mobile LIKE ? OR time LIKE ? OR id LIKE ?)');
      queryParams.push(`%${item}%`, `%${item}%`, `%${item}%`, `%${item}%`);
    }
    if (startdate && enddate) {
      conditions.push('time BETWEEN ? AND ');
      queryParams.push(startdate, enddate);
    };
    if (status) {
      conditions.push(' userid = ? ');
      queryParams.push(userid);
    }
    const whereClause = conditions.length ? ` AND ${conditions.join(' AND ')}` : '';
    const query = `SELECT * FROM ${tableName} WHERE 1=1 ${whereClause} ORDER BY time DESC LIMIT ? OFFSET ?;`;
    queryParams.push(limit, offset);
    const [records] = await conn.query(query, queryParams);

    const countQuery = `
  SELECT 
    COUNT(*) AS Total,
    SUM(CASE WHEN addcut = 1 THEN amount ELSE 0 END) AS total_add_amount,
    SUM(CASE WHEN addcut = 2 THEN amount ELSE 0 END) AS total_cut_amount
  FROM ${tableName}
  WHERE 1=1 ${whereClause};
`;

    const [countResult] = await conn.query(countQuery, queryParams.slice(0, -2), status);
    const totalRows = countResult[0].Total;
    const totalPages = Math.ceil(totalRows / limit);
    const getAmount = Number(countResult[0]?.total_add_amount || 0).toFixed(2);
    const getCutAmount = Number(countResult[0]?.total_cut_amount || 0).toFixed(2);
    const reData = records.map(record => {
      return {
        id: record.id,
        amount: record.amount,
        status: record.addcut,
        time: record.time instanceof Date
          ? record.time.toISOString().replace('T', ' ').split('.')[0]
          : record.time,

      }
    });

    res.json({
      reData,
      getAmount,
      getCutAmount,
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

};
const userWithdrawl = async (req, res) => {
  const { page = 1, item = '', startdate, enddate, status, tableName, userid } = req.body;
  const limit = 10;
  const offset = (page - 1) * limit;

  try {
    const conditions = [];
    const queryParams = [];

    if (item) {
      conditions.push('(name LIKE ? OR mobile LIKE ? OR time LIKE ? OR id LIKE ?)');
      queryParams.push(`%${item}%`, `%${item}%`, `%${item}%`, `%${item}%`);
    }
    if (startdate && enddate) {
      conditions.push('time BETWEEN ? AND ');
      queryParams.push(startdate, enddate);
    };
    if (status) {
      conditions.push(' userid = ? OR referid = ?');
      queryParams.push(userid, userid);
    }
    const whereClause = conditions.length ? ` AND ${conditions.join(' AND ')}` : '';
    const query = `SELECT * FROM ${tableName} WHERE 1=1 ${whereClause} ORDER BY time DESC LIMIT ? OFFSET ?;`;
    queryParams.push(limit, offset);
    const [records] = await conn.query(query, queryParams);

    const countQuery = `SELECT COUNT(*) AS Total FROM ${tableName} WHERE 1=1 ${whereClause};`;
    const [countResult] = await conn.query(countQuery, queryParams.slice(0, -2), status);
    const totalRows = countResult[0].Total;
    const totalPages = Math.ceil(totalRows / limit);
    const [pendingTotal] = await conn.query(`SELECT
          SUM(CASE WHEN status = 1 THEN amount ELSE 0 END) AS pending,
          SUM(CASE WHEN status = 2 THEN amount ELSE 0 END) AS success,
          SUM(CASE WHEN status = 3 THEN amount ELSE 0 END) AS reject FROM withdraw WHERE userid = ${userid}`);
    const DesPending = Number(pendingTotal[0]?.pending || 0).toFixed(2);
    const DesSuccess = Number(pendingTotal[0]?.success || 0).toFixed(2);
    const DesReject = Number(pendingTotal[0]?.reject || 0).toFixed(2);

    const reData = records.map(record => {
      const upi = (record.bankaccount == "") ? record.bankaccount : record.upiid;
      return {
        id: record.id,
        amount: record.amount,
        transtion: record.transtion,
        userwallet: record.old_wallet,
        userid: record.userid,
        referid: record.referid,
        upi: upi,
        status: record.status,
        time: record.time instanceof Date
          ? record.time.toISOString().replace('T', ' ').split('.')[0]
          : record.time,

      }
    });

    res.json({
      reData,
      DesPending,
      DesSuccess,
      DesReject,
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

};
const usertrade = async (req, res) => {
  const { page = 1, item = '', startdate, enddate, status, tableName, userid } = req.body;
  const limit = 10;
  const offset = (page - 1) * limit;

  try {
    const conditions = [];
    const queryParams = [];

    if (item) {
      conditions.push('(gamename LIKE ? OR betamount LIKE ? OR userid LIKE ? OR time LIKE ?)');
      queryParams.push(`%${item}%`, `%${item}%`, `%${item}%`, `%${item}%`);
    }
    if (startdate && enddate) {
      conditions.push('time BETWEEN ? AND ');
      queryParams.push(startdate, enddate);
    };
    if (status) {
      conditions.push(' userid = ? OR admin_id=?');
      queryParams.push(userid, userid);
    }
    const whereClause = conditions.length ? ` AND ${conditions.join(' AND ')}` : '';
    const query = `SELECT * FROM ${tableName} WHERE 1=1 ${whereClause} ORDER BY time DESC LIMIT ? OFFSET ?;`;
    queryParams.push(limit, offset);
    const [records] = await conn.query(query, queryParams);

    const countQuery = `SELECT COUNT(*) AS Total FROM ${tableName} WHERE 1=1 ${whereClause};`;
    const [countResult] = await conn.query(countQuery, queryParams.slice(0, -2), status);
    const totalRows = countResult[0].Total;
    const totalPages = Math.ceil(totalRows / limit);
    const [pendingTotal] = await conn.query(`SELECT
          SUM(betamount) AS betamount,
          SUM(winamount) AS winamount FROM betting WHERE userid = ${userid} OR admin_id=${userid}`);
    const betamount = Number(pendingTotal[0]?.betamount || 0).toFixed(2);
    const winamount = Number(pendingTotal[0]?.winamount || 0).toFixed(2);

    const reData = records.map(record => {
      return {
        id: record.id,
        gamename: record.gamename,
        userid: record.userid,
        admin_id: record.admin_id,
        betamount: record.betamount,
        winamount: record.winamount,
        userwallet: record.userwallet,
        time: record.time instanceof Date ? record.time.toISOString().replace('T', ' ').split('.')[0] : record.time,

      }
    });

    res.json({
      reData,
      winamount,
      betamount,
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

};



const UserPassbook = async (req, res) => {
  const {
    page = 1,
    item = '',
    startdate,
    enddate,
    userid,
    tableName
  } = req.body;

  const limit = 10;
  const offset = (page - 1) * limit;

  // ✅ Whitelisted tables
  const allowedTables = ['bet_c', 'passbook', 'transactions'];
  if (!allowedTables.includes(tableName)) {
    return res.status(400).json({ error: 'Invalid table name' });
  }

  try {
    if (!userid) {
      return res.status(400).json({ error: 'userid is required' });
    }

    const [[user]] = await conn.query(
      "SELECT login_type FROM user WHERE id = ?",
      [userid]
    );

    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }

    const conditions = [];
    const queryParams = [];

    /* 🔐 Role Filter */
    if (user.login_type == 3) {
      // Agent → see own + users under him
      conditions.push('(userid = ? OR admin_id = ?)');
      queryParams.push(userid, userid);
    } else {
      // Normal user → only own records
      conditions.push('userid = ? AND admin_id = ?');
      queryParams.push(userid, userid);
    }

    /* 🔍 Search */
    if (item) {
      conditions.push(`(
        gameid LIKE ? OR 
        userid LIKE ? OR 
        admin_id LIKE ? OR 
        bet_amount LIKE ? OR 
        amount LIKE ? OR 
        time LIKE ?
      )`);
      queryParams.push(
        `%${item}%`,
        `%${item}%`,
        `%${item}%`,
        `%${item}%`,
        `%${item}%`,
        `%${item}%`
      );
    }

    /* 📅 Date Filter (Correct & Optimized) */
    // if (startdate && enddate) {
    //   conditions.push('time >= ? AND time < DATE_ADD(?, INTERVAL 1 DAY)');
    //   queryParams.push(startdate, enddate);
    // }
    if (startdate && enddate) {
      conditions.push('time BETWEEN ? AND ?');
      queryParams.push(
        `${startdate} 00:00:00`,
        `${enddate} 23:59:59`
      );
    }
    const whereClause = conditions.length
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    /* 📄 Data Query */
    const dataQuery = `
      SELECT *
      FROM ${tableName}
      ${whereClause}
      ORDER BY time DESC
      LIMIT ? OFFSET ?
    `;

    const [records] = await conn.query(
      dataQuery,
      [...queryParams, limit, offset]
    );

    /* 🔢 Count + Sum Query */
    const countQuery = `
      SELECT 
        COUNT(*) AS total,
        IFNULL(SUM(bet_amount), 0) AS bet_amount_sum,
        IFNULL(SUM(amount), 0) AS amount_sum
      FROM ${tableName}
      ${whereClause}
    `;

    const [countResult] = await conn.query(countQuery, queryParams);

    const totalRows = countResult[0].total;
    const totalPages = Math.ceil(totalRows / limit);

    /* 🧾 Format Data */
    const reData = records.map(r => ({
      id: r.id,
      gameid: r.gameid,
      userid: r.userid,
      admin_id: r.admin_id,
      bet_amount: r.bet_amount,
      amount: r.amount,
      claimtime: r.claimtime,
      userwallet: r.userwallet,
      time: r.time instanceof Date
        ? r.time.toISOString().slice(0, 19).replace('T', ' ')
        : r.time
    }));

    return res.json({
      reData,
      betAmountSum: Number(countResult[0].bet_amount_sum).toFixed(2),
      amountSum: Number(countResult[0].amount_sum).toFixed(2),
      pagination: {
        totalRows,
        totalPages,
        currentPage: Number(page),
      }
    });

  } catch (error) {
    console.error('Error in UserPassbook:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
const usercommshow = async (req, res) => {
  const { page = 1, item = '', startdate, enddate, status, tableName, userid } = req.body;
  const limit = 10;
  const offset = (page - 1) * limit;

  try {
    const conditions = [];
    const queryParams = [];

    if (item) {
      conditions.push('(gamename LIKE ? OR betamount LIKE ? OR userid LIKE ? OR time LIKE ?)');
      queryParams.push(`%${item}%`, `%${item}%`, `%${item}%`, `%${item}%`);
    }
    if (startdate && enddate) {
      conditions.push('time BETWEEN ? AND ');
      queryParams.push(startdate, enddate);
    };
    if (status) {
      conditions.push(' userid = ?');
      queryParams.push(userid);
    }
    const whereClause = conditions.length ? ` AND ${conditions.join(' AND ')}` : '';
    const query = `SELECT * FROM ${tableName} WHERE 1=1 ${whereClause} ORDER BY time DESC LIMIT ? OFFSET ?;`;
    queryParams.push(limit, offset);
    const [records] = await conn.query(query, queryParams);

    const countQuery = `SELECT COUNT(*) AS Total FROM ${tableName} WHERE 1=1 ${whereClause};`;
    const [countResult] = await conn.query(countQuery, queryParams.slice(0, -2), status);
    const totalRows = countResult[0].Total;
    const totalPages = Math.ceil(totalRows / limit);
    const [pendingTotal] = await conn.query(`SELECT
          SUM(betamount) AS betamount,
          SUM(amount) AS winamount FROM passbook WHERE userid = ${userid}`);
    const betamount = Number(pendingTotal[0]?.betamount || 0).toFixed(2);
    const winamount = Number(pendingTotal[0]?.winamount || 0).toFixed(2);

    const reData = records.map(record => {
      return {
        id: record.id,
        gamename: record.type,
        betamount: record.betamount,
        winamount: record.amount,
        userwallet: record.old_wallet,
        time: record.time instanceof Date
          ? record.time.toISOString().replace('T', ' ').split('.')[0]
          : record.time,

      }
    });

    res.json({
      reData,
      winamount,
      betamount,
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

};
const Userlevel = async (req, res) => {
  const { userid } = req.body;

  try {
    if (!userid) {
      return res.status(400).json({ message: "userid is required" });
    }

    // Get user promocode
    const [userResult] = await conn.query(
      "SELECT id, promocode FROM user WHERE id = ?",
      [userid]
    );

    if (!userResult.length) {
      return res.status(404).json({ message: "User not found" });
    }

    const { promocode } = userResult[0];

    // Get referrals
    const [referrals] = await conn.query(
      `SELECT id, name, mobile, wallet, winamount , time
       FROM user 
       WHERE use_promocode = ?`,
      [promocode]
    );

    const Rdata = referrals.map(user => ({
      id: user.id,
      name: user.name.substring(0, 10),
      mobile: user.mobile,
      balance: user.wallet + user.winamount,
      time: user.time instanceof Date ? user.time.toLocaleString('en-IN', { hour12: false }) : user.time
    }));

    return res.json({
      totalReferrals: referrals.length,
      Rdata
    });

  } catch (error) {
    console.error("Error in Userlevel:", error);
    res.status(500).json({ Qstatus: 5, message: "Internal error" });
  }
};

const customCountRfer = async (conn, promocode, levels, data, number) => {
  if (levels <= 0) return;
  const level = 6 - levels + 1;
  const [proResult] = await conn.query(
    "SELECT id, promocode, name, mobile, time FROM `user` WHERE `use_promocode` = ?",
    [promocode]
  );

  const proNum = proResult.length;
  if (proNum > 0) {
    number += proNum;
    for (const lv of proResult) {
      const newPromocode = lv.promocode;
      const [depositResult] = await conn.query(`SELECT SUM(amount) AS Total_amount FROM (
          SELECT amount FROM auto_rechage WHERE userid = ? AND status = 1 UNION ALL
          SELECT amount FROM recharge WHERE userid = ? AND status = 1 ) AS combined`,
        [lv.id, lv.id]
      );

      const deposit = depositResult[0]?.Total_amount || 0;
      data.push({
        id: lv.id,
        name: lv.name.substring(0, 10),
        mobile: lv.mobile,
        level: level,
        deposit: deposit,
        time: lv.time instanceof Date ? lv.time.toLocaleString('en-IN', { hour12: false }) : record.time,
      });
      await customCountRfer(conn, newPromocode, levels - 1, data, number);
    }
  }
};


// Export the controller
export default {
  userDashboard,
  userDeposit,
  userWithdrawl,
  usertrade,
  Userlevel,
  UserPassbook,
  usercommshow,

};
