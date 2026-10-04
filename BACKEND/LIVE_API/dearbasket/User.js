// routes/API/DearBasket/User.js
const express = require('express');
const router = express.Router();
const { pool, poolConnect, sql } = require('../../config/db_dearbasket');



const clean = (value) => String(value ?? '').trim();

// const accountSelectSql = `
//   SELECT
//     u.transid,
//     u.name,
//     u.dob,
//     u.profile,
//     u.address,
//     u.mobile,
//     u.latitude,
//     u.longitude,
//     u.usertype,
//     u.status,
//     u.rcu,
//     u.rcm,
//     u.luu,
//     u.lum,
//     u.mappedpartnerid,
//     u.deliveryaddress,
//     u.deliverycity,
//     u.deliverystate,
//     u.deliverypincode,
//     u.milkdeliverytype,
//     l.transid AS loginid,
//     l.username,
//     l.password,
//     l.failedattempts,
//     l.islocked,
//     l.isdeleted,
//     l.lastloginat
//   FROM dbo.tbl_user AS u
//   WHERE l.transid IS NOT NULL
//   OUTER APPLY (
//     SELECT TOP 1 *
//     FROM dbo.tbl_login AS lx
//     WHERE lx.userid = u.transid
//       AND ISNULL(lx.isdeleted, 0) = 0
//     ORDER BY lx.rcm DESC, lx.transid DESC
//   ) AS l
// `;


const SERVER_NOW_SQL = "CONVERT(datetime, SWITCHOFFSET(SYSDATETIMEOFFSET(), '+05:30'))";

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
      WHERE l.transid IS NOT NULL
      ORDER BY
        CASE UPPER(ISNULL(u.usertype, ''))
          WHEN 'ADMIN' THEN 1
          WHEN 'PARTNER' THEN 2
          WHEN 'KITCHENPARTNER' THEN 3
          ELSE 4
        END,
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
    if (!['ADMIN', 'PARTNER', 'USER'].includes(usertype)) return res.status(400).json({ Message: 'Invalid account role.' });
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



// GET all users
router.get('/', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .query('SELECT * FROM tbl_user;');
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

router.get('/partner-details/:userid', async (req, res, next) => {
  try {
    await poolConnect;

    const result = await pool.request()
      .input('userid', sql.VarChar, req.params.userid)
      .query(`
        SELECT *
        FROM dbo.fn_partner_details()
        WHERE userid = @userid
      `);

    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});


// GET user details (from function)
router.get('/user-details/:userid', async (req, res, next) => {
  try {
    await poolConnect;

    const result = await pool.request()
      .input('userid', sql.VarChar, req.params.userid)
      .query(`
        SELECT * 
        FROM dbo.fn_user_details()
        WHERE userid = @userid
      `);

    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});


router.get('/dailymilk-active-check/:userid', async (req, res, next) => {
  try {
    await poolConnect;

    const result = await pool.request()
      .input('userid', sql.VarChar, req.params.userid)
      .query(`
        select count(transid) as status from tbl_dailymilkbooking where bookingenddate  >= convert(date,getdate()) and bookingstartdate <= convert(date,GETdate()) and rcu  = @userid
      `);

    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// GET user by transid
router.get('/:id', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('transid', sql.VarChar, req.params.id)
      .query('SELECT * FROM tbl_user WHERE transid = @transid;');
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});



// CREATE user
// router.post('/', async (req, res, next) => {
//   console.log("234567890")
//   try {
//     const {
//       name,

//       profile,
//       address,
//       mobile,
//       latitude,
//       longitude,
//       usertype,
//       status,
//       rcu
//     } = req.body;

//     // require all inputs
//     if (
//       !name ||
//       // !dob ||
//       // !profile ||
//       // !address ||
//       !mobile ||
//       // !latitude ||
//       // !longitude ||
//       !usertype ||
//       status == null ||
//       !rcu
//     ) {
//       return res.status(400).json({ message: 'All fields are required' });
//     }

//     await poolConnect;
//     const result = await pool.request()
//       .input('name', sql.NVarChar, name)

//       .input('profile', sql.NVarChar, profile)
//       .input('address', sql.NVarChar, address)
//       .input('mobile', sql.NVarChar, mobile)
//       .input('latitude', sql.NVarChar, latitude)
//       .input('longitude', sql.NVarChar, longitude)
//       .input('usertype', sql.NVarChar, usertype)
//       .input('status', sql.Int, status)
//       .input('rcu', sql.NVarChar, rcu)
//       .query(`
//         INSERT INTO tbl_user
//           (name, profile, address, mobile, latitude, longitude, usertype, status, rcu)
//         OUTPUT INSERTED.*
//         VALUES
//           (@name, @profile, @address, @mobile, @latitude, @longitude, @usertype, @status, @rcu);
//       `);



//     res.status(201).json(result.recordset[0]);
//   } catch (err) {
//     next(err);
//   }
// });
router.post('/', async (req, res, next) => {
  try {
    const {
      name,
      dob,
      profile,
      address,
      mobile,
      latitude,
      longitude,
      usertype,
      status,
      rcu
    } = req.body;

    // require all inputs
    if (
      !name ||
      !dob ||
      !profile ||
      !address ||
      !mobile ||
      !latitude ||
      !longitude ||
      !usertype ||
      status == null ||
      !rcu
    ) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    await poolConnect;
    const result = await pool.request()
      .input('name', sql.NVarChar, name)
      .input('dob', sql.NVarChar, dob)
      .input('profile', sql.NVarChar, profile)
      .input('address', sql.NVarChar, address)
      .input('mobile', sql.NVarChar, mobile)
      .input('latitude', sql.NVarChar, latitude)
      .input('longitude', sql.NVarChar, longitude)
      .input('usertype', sql.NVarChar, usertype)
      .input('status', sql.Int, status)
      .input('rcu', sql.NVarChar, rcu)
      .query(`
        INSERT INTO tbl_user
          (name, dob, profile, address, mobile, latitude, longitude, usertype, status, rcu)
        OUTPUT INSERTED.*
        VALUES
          (@name, @dob, @profile, @address, @mobile, @latitude, @longitude, @usertype, @status, @rcu);
      `);

    res.status(201).json(result.recordset[0]);
  } catch (err) {
    next(err);
  }
});




// UPDATE user by transid in body
router.put('/', async (req, res, next) => {
  try {
    const id = req.body.transid;
    const fields = [
      'name',
      'dob',
      'profile',
      'address',
      'mobile',
      'latitude',
      'longitude',
      'usertype',
      'status',
      'mappedpartnerid',
      'milkdeliverytype',
      'luu'
    ];
    const updates = [];
    const request = pool.request();

    request.input('transid', sql.VarChar, id);

    fields.forEach(f => {
      if (req.body[f] != null) {
        updates.push(`${f} = @${f}`);
        const type = (f === 'status')
          ? sql.Int
          : sql.NVarChar;
        request.input(f, type, req.body[f]);
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields provided to update' });
    }

    // always update last‐modified timestamp
    updates.push('lum = DATEADD(MINUTE, 330, GETUTCDATE())');
    const setClause = updates.join(', ');

    await poolConnect;
    const result = await request.query(`
      UPDATE tbl_user
      SET ${setClause}
      WHERE transid = @transid;
      SELECT @@ROWCOUNT AS affected;
    `);

    if (result.recordset[0].affected === 0) {
      return res.status(404).json({ message: 'Not found' });
    }

    res.json({ message: 'Updated successfully' });
  } catch (err) {
    next(err);
  }
});

// PUT /API/DearBasket/partner-user-mapping
router.put('/partner-user-mapping/', async (req, res, next) => {
  try {
    const partnerid = req.body.partnerid;
    const userids = req.body.userids;

    console.log('Partner ID:', partnerid);
    console.log('User IDs:', userids);

    if (!partnerid) {
      return res.status(400).json({ message: 'Missing PartnerID.' });
    }

    if (!Array.isArray(userids) || userids.length === 0) {
      return res.status(400).json({ message: 'Missing or empty UserIDs.' });
    }

    await poolConnect; // same as in login

    // 1) Clear existing mapping for this partner
    const clearRequest = pool.request();
    clearRequest.input('transid', sql.VarChar, partnerid);

    const result1 = await clearRequest.query(`
      UPDATE tbl_user
      SET mappedpartnerid = NULL
      WHERE mappedpartnerid = @transid;

      SELECT @@ROWCOUNT AS affected;
    `);

    console.log('Users unmapped from this partner:', result1.recordset[0].affected);

    // 2) Map selected users to this partner
    const useridlist = userids.map(d => `'${d}'`).join(',');

    console.log('UserID list for update:', useridlist);

    const mapRequest = pool.request();
    mapRequest.input('transid', sql.VarChar, partnerid);

    const result = await mapRequest.query(`
      UPDATE tbl_user
      SET mappedpartnerid = @transid
      WHERE transid IN (${useridlist});

      SELECT @@ROWCOUNT AS affected;
    `);

    if (!result.recordset || result.recordset[0].affected === 0) {
      return res.status(404).json({ message: 'Not found' });
    }

    console.log('Users mapped to this partner:', result.recordset[0].affected);

    // 3) Call SP for each user to update tbl_dailymilkstatus + orderid
    for (const userid of userids) {
      console.log(`➡️ Calling SP for User: ${userid}, Partner: ${partnerid}`);

      const spRequest = pool.request();
      spRequest.input('userid', sql.VarChar, userid);
      spRequest.input('partnerid', sql.VarChar, partnerid);

      // optional: if you want to be explicit about timeout for this call

      const spResult = await spRequest.execute('sp_update_dailymilkstatus_user_partner_mapping');

      console.log(`✔️ SP finished for User: ${userid}`);
      console.log('SP result:', spResult.recordset || spResult.recordsets);
    }

    // final response
    res.json({ message: 'Updated successfully' });
  } catch (err) {
    next(err);
  }
});


// UPDATE user details using SP
router.put('/user-details', async (req, res, next) => {
  try {
    const {
      userid,
      name,
      mobile,
      latitude,
      longitude,
      deliveryaddress,
      deliverycity,
      deliverystate,
      deliverypincode,
      familymembers, luu
    } = req.body;

    if (!userid) {
      return res.status(400).json({ message: 'userid is required' });
    }

    await poolConnect;

    const request = pool.request()
      .input('userid', sql.VarChar, userid)
      .input('name', sql.NVarChar, name)
      .input('mobile', sql.VarChar, mobile)
      .input('latitude', sql.VarChar, latitude)
      .input('longitude', sql.VarChar, longitude)
      .input('deliveryaddress', sql.NVarChar, deliveryaddress)
      .input('deliverycity', sql.NVarChar, deliverycity)
      .input('deliverystate', sql.NVarChar, deliverystate)
      .input('deliverypincode', sql.VarChar, deliverypincode)
      .input('familymembers', sql.Int, familymembers)
      .input('luu', sql.VarChar, luu);

    const result = await request.execute('sp_update_user_details');

    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

router.put('/partner-details', async (req, res, next) => {
  try {
    const {
      userid,
      name,
      mobile,
      username,
      password, luu
    } = req.body;

    if (!userid) {
      return res.status(400).json({ message: 'userid is required' });
    }

    await poolConnect;

    const result = await pool.request()
      .input('userid', sql.VarChar, userid)
      .input('name', sql.NVarChar, name)
      .input('mobile', sql.VarChar, mobile)
      .input('username', sql.VarChar, username)
      .input('password', sql.VarChar, password)
      .input('luu', sql.VarChar, luu)
      .execute('sp_update_partner_details');

    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

router.put('/partner-user-mapping_bak/', async (req, res, next) => {
  try {
    const partnerid = req.body.partnerid;
    const userids = req.body.userids;

    console.log("PArtner ID", partnerid)
    console.log("userids", userids)
    const request = pool.request();

    request.input('transid', sql.VarChar, partnerid);

    if (!Array.isArray(userids) || userids.length === 0) {
      return res.status(400).json({ message: 'Missing or empty UserIDs.' });
    }


    const useridlist = userids.map(d => `'${d}'`).join(',');

    console.log(partnerid)
    console.log(useridlist)
    await poolConnect;

    const result1 = await request.query(`
      UPDATE tbl_user
      SET mappedpartnerid = null
      WHERE mappedpartnerid =  @transid
      SELECT @@ROWCOUNT AS affected;
    `);


    const result = await request.query(`
      UPDATE tbl_user
      SET mappedpartnerid = @transid
      WHERE transid in (${useridlist})
      SELECT @@ROWCOUNT AS affected;
    `);

    if (result.recordset[0].affected === 0) {
      return res.status(404).json({ message: 'Not found' });
    }

    res.json({ message: 'Updated successfully' });
  } catch (err) {
    next(err);
  }
});



// DELETE user by transid in body
router.delete('/', async (req, res, next) => {
  try {
    const id = req.body.transid;
    if (!id) {
      return res.status(400).json({ message: 'transid required' });
    }

    await poolConnect;
    const result = await pool.request()
      .input('transid', sql.VarChar, id)
      .query(`
        DELETE FROM tbl_user
        WHERE transid = @transid;
        SELECT @@ROWCOUNT AS affected;
      `);

    if (result.recordset[0].affected === 0) {
      return res.status(404).json({ message: 'Not found' });
    }

    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
