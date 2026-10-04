const express = require('express');
const router = express.Router();
const { pool, poolConnect, sql } = require('../../config/db_dearbasket');

const IST_NOW_SQL = `DATEADD(MINUTE, 330, GETUTCDATE())`;

/**
 * Split comma separated ids into clean array
 */
function parseOrderIds(orderIdsString) {
  if (!orderIdsString || typeof orderIdsString !== 'string') return [];
  return orderIdsString
    .split(',')
    .map(x => x.trim())
    .filter(Boolean);
}

/**
 * Find possible columns in tbl_product_orders that may hold order identifiers.
 * This allows matching mixed values:
 * - productorderid like 369DO-B-20260301-02
 * - GUID-like values like 6f53a65c-efc9-49ea-8f23-3eb33d152756
 */
async function getOrderIdentifierColumns(transaction) {
  const request = new sql.Request(transaction);

  const result = await request.query(`
    SELECT name
    FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.tbl_product_orders')
  `);

  const existing = result.recordset.map(r => String(r.name).toLowerCase());

  // Add here if your table has some other id column names
  const candidates = [
    'productorderid',
    'orderid',
    'productorderguid',
    'orderguid',
    'orderuid',
    'uid',
    'id'
  ];

  return candidates.filter(col => existing.includes(col.toLowerCase()));
}

/**
 * Sync tbl_product_orders based on payout application.
 * Supports mixed values in payoutapplicationorderids:
 * - direct productorderid values
 * - GUID values, if there is a GUID column present in tbl_product_orders
 */
async function syncProductOrdersByPayout({
  transaction,
  payoutapplicationid,
  payoutapplicationstatus,
  payoutapplicationorderids,
  markPaid = false,
  clearPayoutId = false,
  luu = null
}) {
  const orderIds = parseOrderIds(payoutapplicationorderids);

  if (orderIds.length === 0) {
    return {
      updatedOrders: 0,
      matchedColumns: []
    };
  }

  const identifierColumns = await getOrderIdentifierColumns(transaction);

  if (identifierColumns.length === 0) {
    throw new Error(
      'No usable identifier columns found in tbl_product_orders. Please add productorderid/orderid/orderguid-like column.'
    );
  }

  const request = new sql.Request(transaction);

  const valueParams = [];
  orderIds.forEach((id, index) => {
    const paramName = `orderValue${index}`;
    request.input(paramName, sql.VarChar(sql.MAX), id);
    valueParams.push(`@${paramName}`);
  });

  request.input(
    'partnerpayoutapplicationid',
    sql.VarChar(sql.MAX),
    clearPayoutId ? null : payoutapplicationid
  );
  request.input(
    'partnerpayoutapplicationstatus',
    sql.VarChar(sql.MAX),
    payoutapplicationstatus || null
  );
  request.input('partnerpayoutpaid', sql.Bit, markPaid ? 1 : 0);
  request.input('luu', sql.VarChar(sql.MAX), luu);

  // Match against every usable id column found in table
  const whereParts = identifierColumns.map(col => {
    return `TRY_CONVERT(VARCHAR(100), ${col}) IN (${valueParams.join(',')})`;
  });

  const updateSql = `
    UPDATE tbl_product_orders
    SET
      partnerpayoutapplicationid = @partnerpayoutapplicationid,
      partnerpayoutapplicationstatus = @partnerpayoutapplicationstatus,
      partnerpayoutpaid = @partnerpayoutpaid,
      luu = COALESCE(@luu, luu),
      lum = ${IST_NOW_SQL}
    WHERE ${whereParts.join(' OR ')};

    SELECT @@ROWCOUNT AS affected;
  `;

  const result = await request.query(updateSql);

  return {
    updatedOrders: result.recordset[0]?.affected || 0,
    matchedColumns: identifierColumns
  };
}

/**
 * Get payout application by id
 */
async function getPayoutApplicationById(transaction, payoutapplicationid) {
  const request = new sql.Request(transaction);
  request.input('payoutapplicationid', sql.VarChar(sql.MAX), payoutapplicationid);

  const result = await request.query(`
    SELECT *
    FROM tbl_partner_payout_applications
    WHERE payoutapplicationid = @payoutapplicationid
  `);

  return result.recordset[0] || null;
}

/**
 * Common payout status update helper
 */
async function updatePayoutStatus({
  payoutapplicationid,
  setClause,
  inputs = [],
  finalStatus,
  luu,
  markPaid = false,
  clearPayoutId = false
}) {
  await poolConnect;
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    const request = new sql.Request(transaction);
    request.input('payoutapplicationid', sql.VarChar(sql.MAX), payoutapplicationid);
    request.input('luu', sql.VarChar(sql.MAX), luu);
    request.input('finalStatus', sql.VarChar(sql.MAX), finalStatus);

    for (const item of inputs) {
      request.input(item.name, item.type, item.value);
    }

    const updateResult = await request.query(`
      UPDATE tbl_partner_payout_applications
      SET
        ${setClause},
        payoutapplicationstatus = @finalStatus,
        luu = @luu,
        lum = ${IST_NOW_SQL}
      WHERE payoutapplicationid = @payoutapplicationid;

      SELECT @@ROWCOUNT AS affected;
    `);

    const affected = updateResult.recordset[0]?.affected || 0;

    if (affected === 0) {
      await transaction.rollback();
      return { notFound: true };
    }

    const payoutRow = await getPayoutApplicationById(transaction, payoutapplicationid);

    if (!payoutRow) {
      await transaction.rollback();
      return { notFound: true };
    }

    const syncResult = await syncProductOrdersByPayout({
      transaction,
      payoutapplicationid: payoutRow.payoutapplicationid,
      payoutapplicationstatus: finalStatus,
      payoutapplicationorderids: payoutRow.payoutapplicationorderids,
      markPaid,
      clearPayoutId,
      luu
    });

    await transaction.commit();

    return {
      notFound: false,
      payout: payoutRow,
      updatedOrders: syncResult.updatedOrders,
      matchedColumns: syncResult.matchedColumns
    };
  } catch (err) {
    try {
      await transaction.rollback();
    } catch (_) {}
    throw err;
  }
}


// ==============================
// GET all payout applications
// ==============================
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


// ==============================
// GET payout applications by partner
// ==============================
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


// ==============================
// GET payout applications by status
// ==============================
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


// ==============================
// CREATE payout application
// ==============================
router.post('/', async (req, res, next) => {
  const transaction = new sql.Transaction(pool);

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
    await transaction.begin();

    const request = new sql.Request(transaction);

    const insertResult = await request
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

    const inserted = insertResult.recordset[0];

    const syncResult = await syncProductOrdersByPayout({
      transaction,
      payoutapplicationid: inserted.payoutapplicationid,
      payoutapplicationstatus: 'Applied',
      payoutapplicationorderids: inserted.payoutapplicationorderids,
      markPaid: false,
      clearPayoutId: false,
      luu: rcu
    });

    await transaction.commit();

    res.status(201).json({
      message: 'Payout application created successfully.',
      updatedOrders: syncResult.updatedOrders,
      matchedColumns: syncResult.matchedColumns,
      Response: inserted
    });
  } catch (err) {
    try {
      await transaction.rollback();
    } catch (_) {}
    console.error('Error creating payout application:', err);
    next(err);
  }
});


// ==============================
// APPROVE payout application
// ==============================
router.put('/approve', async (req, res, next) => {
  try {
    const { payoutapplicationid, payoutapplicationapprovedby, luu } = req.body;

    if (!payoutapplicationid || !payoutapplicationapprovedby || !luu) {
      return res.status(400).json({
        message: 'payoutapplicationid, payoutapplicationapprovedby and luu are required.'
      });
    }

    const result = await updatePayoutStatus({
      payoutapplicationid,
      luu,
      finalStatus: 'Approved',
      markPaid: false,
      inputs: [
        {
          name: 'payoutapplicationapprovedby',
          type: sql.VarChar(sql.MAX),
          value: payoutapplicationapprovedby
        }
      ],
      setClause: `
        payoutapplicationapproved = '1',
        payoutapplicationapprovedby = @payoutapplicationapprovedby,
        payoutapplicationapprovedat = ${IST_NOW_SQL}
      `
    });

    if (result.notFound) {
      return res.status(404).json({ message: 'Payout application not found.' });
    }

    res.json({
      message: 'Payout application approved successfully.',
      updatedOrders: result.updatedOrders,
      matchedColumns: result.matchedColumns
    });
  } catch (err) {
    console.error('Error approving payout application:', err);
    next(err);
  }
});


// ==============================
// MARK payout application as paid
// ==============================
router.put('/paid', async (req, res, next) => {
  try {
    const { payoutapplicationid, payoutapplicationamountpaidby, luu } = req.body;

    if (!payoutapplicationid || !payoutapplicationamountpaidby || !luu) {
      return res.status(400).json({
        message: 'payoutapplicationid, payoutapplicationamountpaidby and luu are required.'
      });
    }

    const result = await updatePayoutStatus({
      payoutapplicationid,
      luu,
      finalStatus: 'Paid',
      markPaid: true,
      inputs: [
        {
          name: 'payoutapplicationamountpaidby',
          type: sql.VarChar(sql.MAX),
          value: payoutapplicationamountpaidby
        }
      ],
      setClause: `
        payoutapplicationamountpaid = '1',
        payoutapplicationamountpaidby = @payoutapplicationamountpaidby,
        payoutapplicationamountpaidat = ${IST_NOW_SQL}
      `
    });

    if (result.notFound) {
      return res.status(404).json({ message: 'Payout application not found.' });
    }

    res.json({
      message: 'Payout application marked as paid successfully.',
      updatedOrders: result.updatedOrders,
      matchedColumns: result.matchedColumns
    });
  } catch (err) {
    console.error('Error marking payout application as paid:', err);
    next(err);
  }
});


// ==============================
// VERIFY payout payment
// ==============================
router.put('/verify', async (req, res, next) => {
  try {
    const { payoutapplicationid, payoutapplicationpaymentverifiedby, luu } = req.body;

    if (!payoutapplicationid || !payoutapplicationpaymentverifiedby || !luu) {
      return res.status(400).json({
        message: 'payoutapplicationid, payoutapplicationpaymentverifiedby and luu are required.'
      });
    }

    const result = await updatePayoutStatus({
      payoutapplicationid,
      luu,
      finalStatus: 'Verified',
      markPaid: true,
      inputs: [
        {
          name: 'payoutapplicationpaymentverifiedby',
          type: sql.VarChar(sql.MAX),
          value: payoutapplicationpaymentverifiedby
        }
      ],
      setClause: `
        payoutapplicationpaymentverified = '1',
        payoutapplicationpaymentverifiedby = @payoutapplicationpaymentverifiedby,
        payoutapplicationpaymentverifiedat = ${IST_NOW_SQL}
      `
    });

    if (result.notFound) {
      return res.status(404).json({ message: 'Payout application not found.' });
    }

    res.json({
      message: 'Payout payment verified successfully.',
      updatedOrders: result.updatedOrders,
      matchedColumns: result.matchedColumns
    });
  } catch (err) {
    console.error('Error verifying payout payment:', err);
    next(err);
  }
});


// ==============================
// CANCEL payout application
// ==============================
router.put('/cancel', async (req, res, next) => {
  try {
    const { payoutapplicationid, payoutapplicationcancelledby, luu } = req.body;

    if (!payoutapplicationid || !payoutapplicationcancelledby || !luu) {
      return res.status(400).json({
        message: 'payoutapplicationid, payoutapplicationcancelledby and luu are required.'
      });
    }

    const result = await updatePayoutStatus({
      payoutapplicationid,
      luu,
      finalStatus: 'Cancelled',
      markPaid: false,
      inputs: [
        {
          name: 'payoutapplicationcancelledby',
          type: sql.VarChar(sql.MAX),
          value: payoutapplicationcancelledby
        }
      ],
      setClause: `
        payoutapplicationcancelled = '1',
        payoutapplicationcancelledby = @payoutapplicationcancelledby,
        payoutapplicationcancelledat = ${IST_NOW_SQL}
      `
    });

    if (result.notFound) {
      return res.status(404).json({ message: 'Payout application not found.' });
    }

    res.json({
      message: 'Payout application cancelled successfully.',
      updatedOrders: result.updatedOrders,
      matchedColumns: result.matchedColumns
    });
  } catch (err) {
    console.error('Error cancelling payout application:', err);
    next(err);
  }
});


// ==============================
// REJECT payout application
// ==============================
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

    const result = await updatePayoutStatus({
      payoutapplicationid,
      luu,
      finalStatus: 'Rejected',
      markPaid: false,
      inputs: [
        {
          name: 'payoutapplicationrejectedby',
          type: sql.VarChar(sql.MAX),
          value: payoutapplicationrejectedby
        },
        {
          name: 'payoutapplicationrejectedreason',
          type: sql.VarChar(sql.MAX),
          value: payoutapplicationrejectedreason || null
        }
      ],
      setClause: `
        payoutapplicationrejected = '1',
        payoutapplicationrejectedby = @payoutapplicationrejectedby,
        payoutapplicationrejectedat = ${IST_NOW_SQL},
        payoutapplicationrejectedreason = @payoutapplicationrejectedreason
      `
    });

    if (result.notFound) {
      return res.status(404).json({ message: 'Payout application not found.' });
    }

    res.json({
      message: 'Payout application rejected successfully.',
      updatedOrders: result.updatedOrders,
      matchedColumns: result.matchedColumns
    });
  } catch (err) {
    console.error('Error rejecting payout application:', err);
    next(err);
  }
});


// ==============================
// GENERAL UPDATE payout application
// ==============================
router.put('/', async (req, res, next) => {
  const transaction = new sql.Transaction(pool);

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

    await poolConnect;
    await transaction.begin();

    const request = new sql.Request(transaction);
    request.input('payoutapplicationid', sql.VarChar(sql.MAX), payoutapplicationid);

    const updates = [];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = @${field}`);
        request.input(field, sql.VarChar(sql.MAX), req.body[field]);
      }
    });

    if (updates.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        message: 'No valid fields provided to update.'
      });
    }

    const setClause = `${updates.join(', ')}, lum = ${IST_NOW_SQL}`;

    const result = await request.query(`
      UPDATE tbl_partner_payout_applications
      SET ${setClause}
      WHERE payoutapplicationid = @payoutapplicationid;

      SELECT @@ROWCOUNT AS affected;
    `);

    if ((result.recordset[0]?.affected || 0) === 0) {
      await transaction.rollback();
      return res.status(404).json({
        message: 'Payout application not found.'
      });
    }

    const payoutRow = await getPayoutApplicationById(transaction, payoutapplicationid);

    const currentStatus = payoutRow?.payoutapplicationstatus || null;
    const currentOrderIds = payoutRow?.payoutapplicationorderids || null;
    const markPaid = currentStatus === 'Paid' || currentStatus === 'Verified';

    const syncResult = await syncProductOrdersByPayout({
      transaction,
      payoutapplicationid,
      payoutapplicationstatus: currentStatus,
      payoutapplicationorderids: currentOrderIds,
      markPaid,
      clearPayoutId: false,
      luu: req.body.luu || null
    });

    await transaction.commit();

    res.json({
      message: 'Payout application updated successfully.',
      updatedOrders: syncResult.updatedOrders,
      matchedColumns: syncResult.matchedColumns
    });
  } catch (err) {
    try {
      await transaction.rollback();
    } catch (_) {}
    console.error('Error updating payout application:', err);
    next(err);
  }
});


// ==============================
// DELETE payout application permanently
// ==============================
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


// ==============================
// GET payout application by ID
// ==============================
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