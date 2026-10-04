// routes/API/DearBasket/DailyMilkRegistration.js
const express = require('express');
const router = express.Router();
const { pool, poolConnect, sql } = require('../../config/db_dearbasket');

const genTransId = require('./GenerateDailyMilkRegistrationID');


router.get("/CheckUserForRegistration/:id", async (req, res, next) => {
  try {
 
    await poolConnect;
    
    const result = await pool
      .request()
      .input("transid", sql.VarChar, req.params.id)
      .query(
        "SELECT * FROM tbl_dailymilkregistration WHERE userid = @transid;"

      );
    // if (!result.recordset.length) {
    //   return res.status(404).json({ message: 'Not found' });
    // }
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// GET all registrations
router.get('/', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      //.query('SELECT * FROM tbl_dailymilkregistration;');
      .query('select a.* from tbl_dailymilkregistration a inner join tbl_user b on a.userid = b.transid order by mappedpartnerid');
    // e.g. "E-wz369"
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

router.get('/getalldailymilkusers', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      //.query('SELECT * FROM tbl_dailymilkregistration;');
      .query('select * from fn_get_all_dailymilk_active_users()');
    // e.g. "E-wz369"
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});


router.get('/View', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      //.query('SELECT * FROM tbl_dailymilkregistration;');
      .query('select a.* from tbl_dailymilkregistration a inner join tbl_user b on a.userid = b.transid where a.transid in (select dailymilkregistrationid from tbl_dailymilkbooking )  order by mappedpartnerid');
    // e.g. "E-wz369"
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

router.get("/CheckUser/:id", async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool
      .request()
      .input("transid", sql.VarChar, req.params.id)
      .query(
        // "SELECT * FROM tbl_dailymilkregistration WHERE userid = @transid;"
        "SELECT * FROM tbl_dailymilkbooking WHERE dailymilkregistrationid = @transid;"
      );
    // if (!result.recordset.length) {
    //   return res.status(404).json({ message: 'Not found' });
    // }
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});




// GET registration by transid
router.get('/:id', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('transid', sql.VarChar, req.params.id)
      .query('SELECT * FROM tbl_dailymilkregistration WHERE transid = @transid;');
    // if (!result.recordset.length) {
    //   return res.status(404).json({ message: 'Not found' });
    // }
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});



// CREATE registration
router.post('/', async (req, res, next) => {
  try {
    const {
      userid,
      name,
      dob,
      address,
      mobile,
      latitude,
      longitude,
      familymembers,
      status,
      rcu
    } = req.body;

    // require all inputs
    if (
      !userid ||
      !name ||
      !dob ||
      !address ||
      !mobile ||

      !rcu
    ) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    await poolConnect;

    const { recordset } = await pool.request()
      .query('SELECT count(transid) as cnt FROM tbl_dailymilkregistration;');

    var count = parseInt(recordset[0].cnt) + 1
    //var transid = genTransId(count) + mobile
    var transid = genTransId(count)
    console.log(transid)


    const result = await pool.request()
      .input('transid', sql.NVarChar, transid)
      .input('userid', sql.NVarChar, userid)
      .input('name', sql.NVarChar, name)
      .input('dob', sql.Date, dob)
      .input('address', sql.NVarChar, address)
      .input('mobile', sql.NVarChar, mobile)
      .input('latitude', sql.NVarChar, latitude)
      .input('longitude', sql.NVarChar, longitude)
      .input('familymembers', sql.Int, familymembers)
      .input('status', sql.Int, status)
      .input('rcu', sql.NVarChar, rcu)
      .query(`
        INSERT INTO tbl_dailymilkregistration
          (transid,userid, name, dob, address, mobile, latitude, longitude, familymembers, status, rcu)
        OUTPUT INSERTED.*
        VALUES
          (@transid,@userid, @name, @dob, @address, @mobile, @latitude, @longitude, @familymembers, @status, @rcu);
      `);

    res.status(201).json(result.recordset[0]);
  } catch (err) {
    next(err);
  }
});

// UPDATE registration by transid in body
router.put('/', async (req, res, next) => {
  try {
    const id = req.body.transid;
    const fields = [
      'userid',
      'name',
      'dob',
      'address',
      'mobile',
      'latitude',
      'longitude',
      'familymembers',
      'status',
      'luu'
    ];
    const updates = [];
    const request = pool.request();

    request.input('transid', sql.VarChar, id);

    fields.forEach(f => {
      if (req.body[f] != null) {
        updates.push(`${f} = @${f}`);
        let type;
        switch (f) {
          case 'dob': type = sql.Date; break;
          case 'familymembers': type = sql.Int; break;
          case 'status': type = sql.Int; break;
          default: type = sql.NVarChar; break;
        }
        request.input(f, type, req.body[f]);
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields provided to update' });
    }

    // always update last-updated-timestamp
    updates.push('lum = DATEADD(MINUTE, 330, GETUTCDATE())');

    await poolConnect;
    const result = await request.query(`
      UPDATE tbl_dailymilkregistration
      SET ${updates.join(', ')}
      WHERE transid = @transid;
      SELECT @@ROWCOUNT AS affected;
    `);

    if (!result.recordset[0].affected) {
      return res.status(404).json({ message: 'Not found' });
    }

    res.json({ message: 'Updated successfully' });
  } catch (err) {
    next(err);
  }
});

// DELETE registration by transid in body
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
        DELETE FROM tbl_dailymilkregistration
        WHERE transid = @transid;
        SELECT @@ROWCOUNT AS affected;
      `);

    if (!result.recordset[0].affected) {
      return res.status(404).json({ message: 'Not found' });
    }

    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
