// routes/API/DearBasket/Login.js
const express = require('express');
const router = express.Router();
const { pool, poolConnect, sql } = require('../../config/db_dearbasket');

// POST /API/DearBasket/Login
router.post('/', async (req, res, next) => {
  try {
    const { username, password } = req.body;

    // require both inputs
    if (!username || !password) {
      return res.status(405).json({ message: 'Method Not Allowed' });
    }

    await poolConnect;
    const request = pool.request();

    // input parameters
    request.input('username', sql.NVarChar, username);
    request.input('password', sql.NVarChar, password);

    // output parameters
    request.output('sts', sql.Int);
    request.output('msg', sql.NVarChar(500));

    // execute stored procedure
    const result = await request.execute('sp_login');

    // grab result‐set and outputs
    const responseTable = result.recordset || []; // <--- CHANGE IS HERE
    const sts = result.output.sts;
    const msg = result.output.msg;

    // envelope
    res.json({
      Status:          sts,
      Message:         msg,
      Response:        responseTable.length ? responseTable : [],
      ResponseCode:    '200',
      RequestReceived: req.body
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
