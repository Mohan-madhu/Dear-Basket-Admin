const express = require('express');
const router = express.Router();
const { pool, poolConnect, sql } = require('../../config/db_dearbasket');


// ✅ GET all payout applications
router.get('/', async (req, res, next) => {
  try {
    await poolConnect;

    const result = await pool.request().query(`
      SELECT *
      FROM tbl_partner_payout_applications
      ORDER BY rcm DESC
    `);

    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});


// ✅ GET all payout applications for a particular partner
router.get('/partner/:partnerid', async (req, res, next) => {
  try {
    await poolConnect;

    const result = await pool.request()
      .input('partnerid', sql.VarChar(sql.MAX), req.params.partnerid)
      .query(`
        SELECT *
        FROM tbl_partner_payout_applications
        WHERE partnerid = @partnerid
        ORDER BY rcm DESC
      `);

    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});


// ✅ GET all payout applications by status
router.get('/status/:status', async (req, res, next) => {
  try {
    await poolConnect;

    const result = await pool.request()
      .input('status', sql.VarChar(sql.MAX), req.params.status)
      .query(`
        SELECT *
        FROM tbl_partner_payout_applications
        WHERE payoutapplicationstatus = @status
        ORDER BY rcm DESC
      `);

    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});


// ✅ CREATE payout application
router.post('/', async (req, res, next) => {
  try {
    const {
      partnerid,
      partnername,
      nooforders,
      totalamount,
      payouttype,
      payoutgpaynumber,
      payoutbankname,
      payoutaccountnumber,
      payoutifsc,
      payoutapplicationapplied,
      payoutapplicationappliedby,
      payoutapplicationorderids,
      rcu
    } = req.body;

    if (!partnerid || !rcu) {
      return res.status(400).json({
        message: 'partnerid and rcu are required.'
      });
    }

    await poolConnect;

    const result = await pool.request()
      .input('partnerid', sql.VarChar(sql.MAX), partnerid)
      .input('partnername', sql.VarChar(sql.MAX), partnername || null)
      .input('nooforders', sql.VarChar(sql.MAX), nooforders || null)
      .input('totalamount', sql.VarChar(sql.MAX), totalamount || null)
      .input('payouttype', sql.VarChar(sql.MAX), payouttype || null)
      .input('payoutgpaynumber', sql.VarChar(sql.MAX), payoutgpaynumber || null)
      .input('payoutbankname', sql.VarChar(sql.MAX), payoutbankname || null)
      .input('payoutaccountnumber', sql.VarChar(sql.MAX), payoutaccountnumber || null)
      .input('payoutifsc', sql.VarChar(sql.MAX), payoutifsc || null)
      .input('payoutapplicationapplied', sql.VarChar(sql.MAX), payoutapplicationapplied || '1')
      .input('payoutapplicationappliedby', sql.VarChar(sql.MAX), payoutapplicationappliedby || null)
      .input('payoutapplicationorderids', sql.VarChar(sql.MAX), payoutapplicationorderids || null)
      .input('payoutapplicationstatus', sql.VarChar(sql.MAX), 'Applied')
      .input('rcu', sql.VarChar(sql.MAX), rcu)
      .query(`
        INSERT INTO tbl_partner_payout_applications (
          partnerid,
          partnername,
          nooforders,
          totalamount,
          payouttype,
          payoutgpaynumber,
          payoutbankname,
          payoutaccountnumber,
          payoutifsc,
          payoutapplicationapplied,
          payoutapplicationappliedby,
          payoutapplicationstatus,
          payoutapplicationorderids,
          rcu
        )
        OUTPUT INSERTED.*
        VALUES (
          @partnerid,
          @partnername,
          @nooforders,
          @totalamount,
          @payouttype,
          @payoutgpaynumber,
          @payoutbankname,
          @payoutaccountnumber,
          @payoutifsc,
          @payoutapplicationapplied,
          @payoutapplicationappliedby,
          @payoutapplicationstatus,
          @payoutapplicationorderids,
          @rcu
        )
      `);

    res.status(201).json({
      message: 'Payout application created successfully.',
      Response: result.recordset[0]
    });
  } catch (err) {
    console.error('Error creating payout application:', err);
    next(err);
  }
});


// ✅ APPROVE payout application
router.put('/approve', async (req, res, next) => {
  try {
    const { payoutapplicationid, payoutapplicationapprovedby, luu } = req.body;

    if (!payoutapplicationid || !payoutapplicationapprovedby || !luu) {
      return res.status(400).json({
        message: 'payoutapplicationid, payoutapplicationapprovedby and luu are required.'
      });
    }

    await poolConnect;

    const result = await pool.request()
      .input('payoutapplicationid', sql.VarChar(sql.MAX), payoutapplicationid)
      .input('payoutapplicationapprovedby', sql.VarChar(sql.MAX), payoutapplicationapprovedby)
      .input('luu', sql.VarChar(sql.MAX), luu)
      .query(`
        UPDATE tbl_partner_payout_applications
        SET payoutapplicationapproved = '1',
            payoutapplicationapprovedby = @payoutapplicationapprovedby,
            payoutapplicationapprovedat = DATEADD(MINUTE, 330, GETUTCDATE()),
            payoutapplicationstatus = 'Approved',
            luu = @luu,
            lum = DATEADD(MINUTE, 330, GETUTCDATE())
        WHERE payoutapplicationid = @payoutapplicationid;

        SELECT @@ROWCOUNT AS affected;
      `);

    if (result.recordset[0].affected === 0) {
      return res.status(404).json({ message: 'Payout application not found.' });
    }

    res.json({ message: 'Payout application approved successfully.' });
  } catch (err) {
    console.error('Error approving payout application:', err);
    next(err);
  }
});


// ✅ MARK payout application as paid
router.put('/paid', async (req, res, next) => {
  try {
    const { payoutapplicationid, payoutapplicationamountpaidby, luu } = req.body;

    if (!payoutapplicationid || !payoutapplicationamountpaidby || !luu) {
      return res.status(400).json({
        message: 'payoutapplicationid, payoutapplicationamountpaidby and luu are required.'
      });
    }

    await poolConnect;

    const result = await pool.request()
      .input('payoutapplicationid', sql.VarChar(sql.MAX), payoutapplicationid)
      .input('payoutapplicationamountpaidby', sql.VarChar(sql.MAX), payoutapplicationamountpaidby)
      .input('luu', sql.VarChar(sql.MAX), luu)
      .query(`
        UPDATE tbl_partner_payout_applications
        SET payoutapplicationamountpaid = '1',
            payoutapplicationamountpaidby = @payoutapplicationamountpaidby,
            payoutapplicationamountpaidat = DATEADD(MINUTE, 330, GETUTCDATE()),
            payoutapplicationstatus = 'Paid',
            luu = @luu,
            lum = DATEADD(MINUTE, 330, GETUTCDATE())
        WHERE payoutapplicationid = @payoutapplicationid;

        SELECT @@ROWCOUNT AS affected;
      `);

    if (result.recordset[0].affected === 0) {
      return res.status(404).json({ message: 'Payout application not found.' });
    }

    res.json({ message: 'Payout application marked as paid successfully.' });
  } catch (err) {
    console.error('Error marking payout application as paid:', err);
    next(err);
  }
});


// ✅ VERIFY payout payment
router.put('/verify', async (req, res, next) => {
  try {
    const { payoutapplicationid, payoutapplicationpaymentverifiedby, luu } = req.body;

    if (!payoutapplicationid || !payoutapplicationpaymentverifiedby || !luu) {
      return res.status(400).json({
        message: 'payoutapplicationid, payoutapplicationpaymentverifiedby and luu are required.'
      });
    }

    await poolConnect;

    const result = await pool.request()
      .input('payoutapplicationid', sql.VarChar(sql.MAX), payoutapplicationid)
      .input('payoutapplicationpaymentverifiedby', sql.VarChar(sql.MAX), payoutapplicationpaymentverifiedby)
      .input('luu', sql.VarChar(sql.MAX), luu)
      .query(`
        UPDATE tbl_partner_payout_applications
        SET payoutapplicationpaymentverified = '1',
            payoutapplicationpaymentverifiedby = @payoutapplicationpaymentverifiedby,
            payoutapplicationpaymentverifiedat = DATEADD(MINUTE, 330, GETUTCDATE()),
            payoutapplicationstatus = 'Verified',
            luu = @luu,
            lum = DATEADD(MINUTE, 330, GETUTCDATE())
        WHERE payoutapplicationid = @payoutapplicationid;

        SELECT @@ROWCOUNT AS affected;
      `);

    if (result.recordset[0].affected === 0) {
      return res.status(404).json({ message: 'Payout application not found.' });
    }

    res.json({ message: 'Payout payment verified successfully.' });
  } catch (err) {
    console.error('Error verifying payout payment:', err);
    next(err);
  }
});


// ✅ CANCEL payout application
router.put('/cancel', async (req, res, next) => {
  try {
    const { payoutapplicationid, payoutapplicationcancelledby, luu } = req.body;

    if (!payoutapplicationid || !payoutapplicationcancelledby || !luu) {
      return res.status(400).json({
        message: 'payoutapplicationid, payoutapplicationcancelledby and luu are required.'
      });
    }

    await poolConnect;

    const result = await pool.request()
      .input('payoutapplicationid', sql.VarChar(sql.MAX), payoutapplicationid)
      .input('payoutapplicationcancelledby', sql.VarChar(sql.MAX), payoutapplicationcancelledby)
      .input('luu', sql.VarChar(sql.MAX), luu)
      .query(`
        UPDATE tbl_partner_payout_applications
        SET payoutapplicationcancelled = '1',
            payoutapplicationcancelledby = @payoutapplicationcancelledby,
            payoutapplicationcancelledat = DATEADD(MINUTE, 330, GETUTCDATE()),
            payoutapplicationstatus = 'Cancelled',
            luu = @luu,
            lum = DATEADD(MINUTE, 330, GETUTCDATE())
        WHERE payoutapplicationid = @payoutapplicationid;

        SELECT @@ROWCOUNT AS affected;
      `);

    if (result.recordset[0].affected === 0) {
      return res.status(404).json({ message: 'Payout application not found.' });
    }

    res.json({ message: 'Payout application cancelled successfully.' });
  } catch (err) {
    console.error('Error cancelling payout application:', err);
    next(err);
  }
});


// ✅ REJECT payout application
router.put('/reject', async (req, res, next) => {
  try {
    const {
      payoutapplicationid,
      payoutapplicationrejectedby,
      payoutapplicationrejectedreason,
      luu
    } = req.body;

    if (!payoutapplicationid || !payoutapplicationrejectedby || !luu) {
      return res.status(400).json({
        message: 'payoutapplicationid, payoutapplicationrejectedby and luu are required.'
      });
    }

    await poolConnect;

    const result = await pool.request()
      .input('payoutapplicationid', sql.VarChar(sql.MAX), payoutapplicationid)
      .input('payoutapplicationrejectedby', sql.VarChar(sql.MAX), payoutapplicationrejectedby)
      .input('payoutapplicationrejectedreason', sql.VarChar(sql.MAX), payoutapplicationrejectedreason || null)
      .input('luu', sql.VarChar(sql.MAX), luu)
      .query(`
        UPDATE tbl_partner_payout_applications
        SET payoutapplicationrejected = '1',
            payoutapplicationrejectedby = @payoutapplicationrejectedby,
            payoutapplicationrejectedat = DATEADD(MINUTE, 330, GETUTCDATE()),
            payoutapplicationrejectedreason = @payoutapplicationrejectedreason,
            payoutapplicationstatus = 'Rejected',
            luu = @luu,
            lum = DATEADD(MINUTE, 330, GETUTCDATE())
        WHERE payoutapplicationid = @payoutapplicationid;

        SELECT @@ROWCOUNT AS affected;
      `);

    if (result.recordset[0].affected === 0) {
      return res.status(404).json({ message: 'Payout application not found.' });
    }

    res.json({ message: 'Payout application rejected successfully.' });
  } catch (err) {
    console.error('Error rejecting payout application:', err);
    next(err);
  }
});


// ✅ GENERAL UPDATE payout application
router.put('/', async (req, res, next) => {
  try {
    const payoutapplicationid = req.body.payoutapplicationid;

    if (!payoutapplicationid) {
      return res.status(400).json({
        message: 'payoutapplicationid is required.'
      });
    }

    const allowedFields = [
      'partnerid',
      'partnername',
      'nooforders',
      'totalamount',
      'payouttype',
      'payoutgpaynumber',
      'payoutbankname',
      'payoutaccountnumber',
      'payoutifsc',
      'payoutapplicationapplied',
      'payoutapplicationappliedby',
      'payoutapplicationapproved',
      'payoutapplicationapprovedby',
      'payoutapplicationamountpaid',
      'payoutapplicationamountpaidby',
      'payoutapplicationpaymentverified',
      'payoutapplicationpaymentverifiedby',
      'payoutapplicationcancelled',
      'payoutapplicationcancelledby',
      'payoutapplicationrejected',
      'payoutapplicationrejectedby',
      'payoutapplicationrejectedreason',
      'payoutapplicationstatus',
      'payoutapplicationorderids',
      'luu'
    ];

    const updates = [];
    const request = pool.request();

    request.input('payoutapplicationid', sql.VarChar(sql.MAX), payoutapplicationid);

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = @${field}`);
        request.input(field, sql.VarChar(sql.MAX), req.body[field]);
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({
        message: 'No valid fields provided to update.'
      });
    }

    const setClause = updates.join(', ') + `, lum = DATEADD(MINUTE, 330, GETUTCDATE())`;

    await poolConnect;

    const result = await request.query(`
      UPDATE tbl_partner_payout_applications
      SET ${setClause}
      WHERE payoutapplicationid = @payoutapplicationid;

      SELECT @@ROWCOUNT AS affected;
    `);

    if (result.recordset[0].affected === 0) {
      return res.status(404).json({
        message: 'Payout application not found.'
      });
    }

    res.json({ message: 'Payout application updated successfully.' });
  } catch (err) {
    console.error('Error updating payout application:', err);
    next(err);
  }
});


// ✅ DELETE payout application permanently
router.delete('/permanent', async (req, res, next) => {
  try {
    const { payoutapplicationid } = req.body;

    if (!payoutapplicationid) {
      return res.status(400).json({
        message: 'payoutapplicationid is required.'
      });
    }

    await poolConnect;

    const result = await pool.request()
      .input('payoutapplicationid', sql.VarChar(sql.MAX), payoutapplicationid)
      .query(`
        DELETE FROM tbl_partner_payout_applications
        WHERE payoutapplicationid = @payoutapplicationid;

        SELECT @@ROWCOUNT AS affected;
      `);

    if (result.recordset[0].affected === 0) {
      return res.status(404).json({
        message: 'Payout application not found.'
      });
    }

    res.json({ message: 'Payout application deleted permanently.' });
  } catch (err) {
    console.error('Error deleting payout application:', err);
    next(err);
  }
});


// ✅ GET payout application by ID
router.get('/:id', async (req, res, next) => {
  try {
    await poolConnect;

    const result = await pool.request()
      .input('id', sql.VarChar(sql.MAX), req.params.id)
      .query(`
        SELECT *
        FROM tbl_partner_payout_applications
        WHERE payoutapplicationid = @id
      `);

    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});


module.exports = router;