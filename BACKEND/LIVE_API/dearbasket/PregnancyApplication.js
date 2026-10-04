// routes/API/DearBasket/PregnancyApplications.js
const express = require('express');
const router = express.Router();
const { pool, poolConnect, sql } = require('../../config/db_dearbasket');

// GET all pregnancy applications

router.get('/check-is-user-booked/:id', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('userid', sql.VarChar, req.params.id)
      .query(`select * from tbl_dailymilkbooking where userid = @userid
and bookingstartdate<= convert(date,  GETDATE() AT TIME ZONE 'UTC' AT TIME ZONE 'India Standard Time' )
and bookingenddate >=  convert(date,  GETDATE() AT TIME ZONE 'UTC' AT TIME ZONE 'India Standard Time' )
`);

    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});



router.get('/', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .query('SELECT * FROM tbl_pregnancyapplications;');
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});





// GET pregnancy application by transid
router.get('/:id', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('transid', sql.VarChar, req.params.id)
      .query('SELECT * FROM tbl_pregnancyapplications WHERE transid = @transid;');

    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});




router.get('/user/:id', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('userid', sql.VarChar, req.params.id)
      .query('SELECT * FROM tbl_pregnancyapplications WHERE userid = @userid;');

    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});
// CREATE pregnancy application
router.post('/', async (req, res, next) => {
  try {
    const {
      userid,
      name,
      dob,
      mobilenumber,
      pregnancystartmonth,
      pregnancystartyear,
      expectedendmonth,
      expectedendyear,

      documentpath,
      documentfilename,
      documentmimetype,

      applicationstatus, // optional (defaults to 0 in DB)
      milkamountml,      // optional (defaults to 250 in DB)
      benefitsstartdate,
      benefitsenddate,
      isbenefitsactive,  // optional (defaults to 0 in DB)

      notes,
      rejectionreason,

      rcm,
      lcm
    } = req.body;

    // Required fields (based on NOT NULL columns)
    if (
      !name ||
      !dob ||
      !mobilenumber ||
      pregnancystartmonth == null ||
      pregnancystartyear == null ||
      expectedendmonth == null ||
      expectedendyear == null
    ) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Basic validations (match your constraints)
    if (pregnancystartmonth < 1 || pregnancystartmonth > 12) {
      return res.status(400).json({ message: 'pregnancystartmonth must be 1-12' });
    }
    if (expectedendmonth < 1 || expectedendmonth > 12) {
      return res.status(400).json({ message: 'expectedendmonth must be 1-12' });
    }
    if (String(mobilenumber).length < 10) {
      return res.status(400).json({ message: 'mobilenumber must be at least 10 digits' });
    }
    if (applicationstatus != null && ![0, 1, 2].includes(applicationstatus)) {
      return res.status(400).json({ message: 'applicationstatus must be 0, 1, or 2' });
    }

    await poolConnect;

    const request = pool.request()
      .input('userid', sql.VarChar, userid ?? null)
      .input('name', sql.NVarChar, name)
      .input('dob', sql.Date, dob)
      .input('mobilenumber', sql.VarChar, mobilenumber)

      .input('pregnancystartmonth', sql.Int, pregnancystartmonth)
      .input('pregnancystartyear', sql.Int, pregnancystartyear)
      .input('expectedendmonth', sql.Int, expectedendmonth)
      .input('expectedendyear', sql.Int, expectedendyear)

      .input('documentpath', sql.NVarChar, documentpath ?? null)
      .input('documentfilename', sql.NVarChar, documentfilename ?? null)
      .input('documentmimetype', sql.VarChar, documentmimetype ?? null)

      .input('applicationstatus', sql.Int, applicationstatus ?? null)
      .input('milkamountml', sql.Int, milkamountml ?? null)
      .input('benefitsstartdate', sql.Date, benefitsstartdate ?? null)
      .input('benefitsenddate', sql.Date, benefitsenddate ?? null)
      .input('isbenefitsactive', sql.Bit, isbenefitsactive ?? null)

      .input('notes', sql.NVarChar(sql.MAX), notes ?? null)
      .input('rejectionreason', sql.NVarChar, rejectionreason ?? null)

      .input('rcm', sql.VarChar(sql.MAX), rcm ?? null)
      .input('lcm', sql.VarChar(sql.MAX), lcm ?? null);

    // Handle approved/rejected date logic if status is set
    // (DB columns are nullable; this keeps the record consistent)
    const status = applicationstatus ?? 0;
    const approveddate = status === 1 ? new Date() : null;
    const rejecteddate = status === 2 ? new Date() : null;

    request
      .input('approveddate', sql.DateTime, approveddate)
      .input('rejecteddate', sql.DateTime, rejecteddate);

    const result = await request.query(`
      INSERT INTO tbl_pregnancyapplications
        (userid, name, dob, mobilenumber,
         pregnancystartmonth, pregnancystartyear, expectedendmonth, expectedendyear,
         documentpath, documentfilename, documentmimetype,
         applicationstatus, approveddate, rejecteddate,
         milkamountml, benefitsstartdate, benefitsenddate, isbenefitsactive,
         notes, rejectionreason,
         rcm, lcm)
      OUTPUT INSERTED.*
      VALUES
        (@userid, @name, @dob, @mobilenumber,
         @pregnancystartmonth, @pregnancystartyear, @expectedendmonth, @expectedendyear,
         @documentpath, @documentfilename, @documentmimetype,
         COALESCE(@applicationstatus, 0), @approveddate, @rejecteddate,
         COALESCE(@milkamountml, 250), @benefitsstartdate, @benefitsenddate, COALESCE(@isbenefitsactive, 0),
         @notes, @rejectionreason,
         @rcm, @lcm);
    `);

    res.status(201).json(result.recordset[0]);
  } catch (err) {
    next(err);
  }
});

// UPDATE pregnancy application by transid (in body)
router.put('/', async (req, res, next) => {
  try {
    const id = req.body.transid;
    if (!id) return res.status(400).json({ message: 'transid required' });

    const fields = [
      'userid',
      'name',
      'dob',
      'mobilenumber',
      'pregnancystartmonth',
      'pregnancystartyear',
      'expectedendmonth',
      'expectedendyear',
      'documentpath',
      'documentfilename',
      'documentmimetype',
      'applicationstatus',
      'milkamountml',
      'benefitsstartdate',
      'benefitsenddate',
      'isbenefitsactive',
      'notes',
      'rejectionreason',
      'isactive',
      'isdeleted',
      'lcm'
    ];

    const updates = [];
    const request = pool.request();
    request.input('transid', sql.VarChar, id);

    for (const f of fields) {
      if (req.body[f] != null) {
        updates.push(`${f} = @${f}`);

        let type = sql.NVarChar;
        if (['pregnancystartmonth', 'pregnancystartyear', 'expectedendmonth', 'expectedendyear', 'applicationstatus', 'milkamountml'].includes(f)) type = sql.Int;
        if (['isbenefitsactive', 'isactive', 'isdeleted'].includes(f)) type = sql.Bit;
        if (['dob', 'benefitsstartdate', 'benefitsenddate'].includes(f)) type = sql.Date;
        if (['documentmimetype', 'mobilenumber', 'userid'].includes(f)) type = sql.VarChar;
        if (['notes'].includes(f)) type = sql.NVarChar(sql.MAX);
        if (['lcm', 'rejectionreason'].includes(f)) type = sql.VarChar(sql.MAX);

        request.input(f, type, req.body[f]);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields provided to update' });
    }

    // status-driven timestamps (if applicationstatus is being updated)
    if (req.body.applicationstatus === 1) {
      updates.push('approveddate = GETDATE()');
      updates.push('rejecteddate = NULL');
    }
    if (req.body.applicationstatus === 2) {
      updates.push('rejecteddate = GETDATE()');
      updates.push('approveddate = NULL');
    }
    if (req.body.applicationstatus === 0) {
      updates.push('approveddate = NULL');
      updates.push('rejecteddate = NULL');
    }

    // always update luu timestamp
    updates.push('luu = GETDATE()');

    await poolConnect;
    const result = await request.query(`
      UPDATE tbl_pregnancyapplications
      SET ${updates.join(', ')}
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

// DELETE application by transid (hard delete)
router.delete('/', async (req, res, next) => {
  try {
    const id = req.body.transid;
    if (!id) return res.status(400).json({ message: 'transid required' });

    await poolConnect;
    const result = await pool.request()
      .input('transid', sql.VarChar, id)
      .query(`
        DELETE FROM tbl_pregnancyapplications
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
