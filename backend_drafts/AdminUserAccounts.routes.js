const express = require('express');
const router = express.Router();
const { pool, poolConnect, sql } = require('../config/db_dearbasket');

const SERVER_NOW_SQL = "CONVERT(datetime, SWITCHOFFSET(SYSDATETIMEOFFSET(), '+05:30'))";
const clean = (value) => String(value ?? '').trim();

const accountSelectSql = `
  SELECT
    u.transid,
    u.name,
    u.dob,
    u.profile,
    u.address,
    u.mobile,
    u.latitude,
    u.longitude,
    u.usertype,
    u.status,
    u.rcu,
    u.rcm,
    u.luu,
    u.lum,
    u.mappedpartnerid,
    u.deliveryaddress,
    u.deliverycity,
    u.deliverystate,
    u.deliverypincode,
    u.milkdeliverytype,
    l.transid AS loginid,
    l.username,
    l.password,
    l.failedattempts,
    l.islocked,
    l.isdeleted,
    l.lastloginat
  FROM dbo.tbl_user AS u
  OUTER APPLY (
    SELECT TOP 1 *
    FROM dbo.tbl_login AS lx
    WHERE lx.userid = u.transid
      AND ISNULL(lx.isdeleted, 0) = 0
    ORDER BY lx.rcm DESC, lx.transid DESC
  ) AS l
`;

router.get('/admin/accounts', async (req, res, next) => {
  try {
    await poolConnect;

    const result = await pool.request().query(`
      ${accountSelectSql}
      ORDER BY
        CASE UPPER(ISNULL(u.usertype, '')) WHEN 'ADMIN' THEN 1 WHEN 'PARTNER' THEN 2 WHEN 'KITCHENPARTNER' THEN 3 ELSE 4 END,
        u.rcm DESC,
        u.transid DESC;
    `);

    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

router.put('/admin/accounts', async (req, res, next) => {
  try {
    await poolConnect;

    const transid = clean(req.body.transid);
    const name = clean(req.body.fullname || req.body.name);
    const mobile = clean(req.body.mobile).replace(/\D/g, '');
    const username = clean(req.body.username) || mobile;
    const password = Object.prototype.hasOwnProperty.call(req.body, 'password')
      ? clean(req.body.password)
      : null;
    const usertype = clean(req.body.usertype || 'USER').toUpperCase();
    const status = Number(req.body.status) === 1 ? 1 : 0;
    const luu = clean(req.body.luu || req.body.updatedby || 'ADMIN');

    if (!transid) return res.status(400).json({ Message: 'Account id is required.' });
    if (!name) return res.status(400).json({ Message: 'Name is required.' });
    if (mobile.length !== 10) return res.status(400).json({ Message: 'Mobile must contain 10 digits.' });
    if (!username) return res.status(400).json({ Message: 'Username is required.' });
    if (!['ADMIN', 'PARTNER', 'KITCHENPARTNER', 'USER'].includes(usertype)) return res.status(400).json({ Message: 'Invalid account role.' });
    if (String(transid) === String(luu) && status !== 1) {
      return res.status(400).json({ Message: 'You cannot disable your own admin account.' });
    }

    const result = await pool.request()
      .input('transid', sql.VarChar(sql.MAX), transid)
      .input('name', sql.VarChar(sql.MAX), name)
      .input('mobile', sql.VarChar(sql.MAX), mobile)
      .input('username', sql.VarChar(sql.MAX), username)
      .input('password', sql.NVarChar(sql.MAX), password || null)
      .input('dob', sql.VarChar(sql.MAX), clean(req.body.dob) || null)
      .input('profile', sql.VarChar(sql.MAX), clean(req.body.profile) || 'No File Uploaded')
      .input('address', sql.VarChar(sql.MAX), clean(req.body.address) || null)
      .input('usertype', sql.VarChar(sql.MAX), usertype)
      .input('status', sql.Int, status)
      .input('luu', sql.VarChar(sql.MAX), luu)
      .query(`
        SET XACT_ABORT ON;
        BEGIN TRAN;

        IF NOT EXISTS (SELECT 1 FROM dbo.tbl_user WHERE transid = @transid)
          THROW 50001, 'Account not found.', 1;

        IF EXISTS (
          SELECT 1
          FROM dbo.tbl_user
          WHERE mobile = @mobile
            AND transid <> @transid
        )
          THROW 50002, 'Another account already uses this mobile number.', 1;

        IF EXISTS (
          SELECT 1
          FROM dbo.tbl_login
          WHERE ISNULL(isdeleted, 0) = 0
            AND userid <> @transid
            AND (username = @username OR mobile = @mobile)
        )
          THROW 50003, 'Another login already uses this username or mobile number.', 1;

        UPDATE dbo.tbl_user
        SET
          name = @name,
          mobile = @mobile,
          dob = @dob,
          profile = @profile,
          address = @address,
          usertype = @usertype,
          status = @status,
          luu = @luu,
          lum = ${SERVER_NOW_SQL}
        WHERE transid = @transid;

        IF EXISTS (
          SELECT 1
          FROM dbo.tbl_login
          WHERE userid = @transid
            AND ISNULL(isdeleted, 0) = 0
        )
        BEGIN
          UPDATE dbo.tbl_login
          SET
            username = @username,
            mobile = @mobile,
            usertype = @usertype,
            password = CASE WHEN @password IS NULL THEN password ELSE @password END,
            islocked = CASE WHEN @status = 1 THEN 0 ELSE 1 END,
            isdeleted = 0,
            luu = @luu,
            lum = ${SERVER_NOW_SQL}
          WHERE userid = @transid
            AND ISNULL(isdeleted, 0) = 0;
        END
        ELSE
        BEGIN
          IF @password IS NULL
            THROW 50004, 'Password is required because this account has no login record.', 1;

          INSERT INTO dbo.tbl_login
            (transid, userid, username, password, usertype, mobile, failedattempts, islocked, isdeleted, rcu, rcm)
          VALUES
            (CONVERT(varchar(36), NEWID()), @transid, @username, @password, @usertype, @mobile, 0, CASE WHEN @status = 1 THEN 0 ELSE 1 END, 0, @luu, ${SERVER_NOW_SQL});
        END

        COMMIT TRAN;

        ${accountSelectSql}
        WHERE u.transid = @transid;
      `);

    res.json({ Message: 'Account updated successfully.', Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

router.delete('/admin/accounts', async (req, res, next) => {
  try {
    await poolConnect;

    const transid = clean(req.body.transid);
    const luu = clean(req.body.luu || req.body.updatedby || 'ADMIN');
    if (!transid) return res.status(400).json({ Message: 'Account id is required.' });
    if (String(transid) === String(luu)) {
      return res.status(400).json({ Message: 'You cannot delete your own admin account.' });
    }

    await pool.request()
      .input('transid', sql.VarChar(sql.MAX), transid)
      .input('luu', sql.VarChar(sql.MAX), luu)
      .query(`
        SET XACT_ABORT ON;
        BEGIN TRAN;

        IF NOT EXISTS (SELECT 1 FROM dbo.tbl_user WHERE transid = @transid)
          THROW 50001, 'Account not found.', 1;

        UPDATE dbo.tbl_user
        SET status = 0, luu = @luu, lum = ${SERVER_NOW_SQL}
        WHERE transid = @transid;

        UPDATE dbo.tbl_login
        SET isdeleted = 1, islocked = 1, luu = @luu, lum = ${SERVER_NOW_SQL}
        WHERE userid = @transid
          AND ISNULL(isdeleted, 0) = 0;

        COMMIT TRAN;
      `);

    res.json({ Message: 'Account deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
