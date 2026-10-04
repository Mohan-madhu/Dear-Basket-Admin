
// routes/API/DearBasket/UserSignUp.js
const express = require('express');
const router = express.Router();
const { pool, poolConnect, sql } = require('../../config/db_dearbasket');

// POST /API/DearBasket/UserSignUp
router.post("/", async (req, res, next) => {
  try {
    const {
      fullname,
      dob,
      profile,
      address,
      mobile,
      usertype,
      username,
      password,
      rcu
    } = req.body;

    if (!fullname || !mobile || !usertype || !username || !password || !rcu) {
      return res.status(405).json({ message: "Method Not Allowed" });
    }

    await poolConnect;
    const request = pool.request();

    // Inputs
    request.input("fullname", sql.NVarChar(200), fullname);
    request.input("dob", sql.NVarChar(50), dob ?? null); // or keep null
    request.input("profile", sql.NVarChar(sql.MAX), usertype !== "USER" ? profile : null);
    request.input("address", sql.NVarChar(sql.MAX), usertype !== "USER" ? address : null);
    request.input("mobile", sql.NVarChar(20), mobile);
    request.input("usertype", sql.NVarChar(50), usertype);
    request.input("username", sql.NVarChar(200), username);
    request.input("password", sql.NVarChar(200), password);
    request.input("rcu", sql.NVarChar(200), rcu);

    // Outputs
    request.output("userid", sql.NVarChar(50));      // ✅ NEW
    request.output("sts", sql.Int);
    request.output("msg", sql.NVarChar(500));

    const result = await request.execute("sp_insertuser_new");

    const sts = result.output.sts;
    const msg = result.output.msg;
    const userid = result.output.userid;

    res.json({
      Status: sts,
      Message: msg,
      UserId: userid,           // ✅ NEW
      Response: [],
      ResponseCode: "200",
      RequestReceived: req.body
    });
  } catch (err) {
    next(err);
  }
});



router.post('/bak', async (req, res, next) => {
  try {
    const {
      fullname,
      dob,
      profile,
      address,
      mobile,
      usertype,
      username,
      password,
      rcu
    } = req.body;

    // require all nine inputs
    if (
      !fullname ||
      //   !dob ||
      //   !profile ||
      //   !address ||
      !mobile ||
      !usertype ||
      !username ||
      !password ||
      !rcu
    ) {
      return res.status(405).json({ message: 'Method Not Allowed' });
    }

    await poolConnect;
    const request = pool.request();

    // input parameters
    // request.input('dob', sql.Date, usertype !== "USER" ? dob : null);
    request.input('dob', sql.Date,  null);
    request.input('profile', sql.NVarChar, usertype !== "USER" ? profile : null);
    request.input('address', sql.NVarChar, usertype !== "USER" ? address : null);
    request.input('fullname', sql.NVarChar, fullname);
    request.input('mobile', sql.NVarChar, mobile);
    request.input('usertype', sql.NVarChar, usertype);
    request.input('username', sql.NVarChar, username);
    request.input('password', sql.NVarChar, password);
    request.input('rcu', sql.NVarChar, rcu);

    // output parameters
    request.output('sts', sql.Int);
    request.output('msg', sql.NVarChar(500));

    // execute the stored procedure
    const result = await request.execute('sp_insertuser');

    // grab result‐set and output values
    const responseTable = result.recordset;
    const sts = result.output.sts;
    const msg = result.output.msg;

    // send back the same envelope
    res.json({
      Status: sts,
      Message: msg,
      Response: [],
      ResponseCode: '200',
      RequestReceived: req.body
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
