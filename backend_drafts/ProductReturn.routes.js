const express = require('express');
const router = express.Router();
const { pool, poolConnect, sql } = require('../config/db_dearbasket');
const { randomUUID } = require('crypto');

const RETURN_WINDOW_DAYS = 7;
const ALLOWED_STATUS_TRANSITIONS = new Set([
  'Requested',
  'Approved',
  'Rejected',
  'PickupScheduled',
  'PickedUp',
  'ReceivedAtHub',
  'QCInProgress',
  'RefundInitiated',
  'Refunded',
  'Closed',
]);

const getOrderById = async (productorderid) => {
  const result = await pool
    .request()
    .input('productorderid', sql.VarChar(sql.MAX), productorderid)
    .query(`
      SELECT TOP 1 *
      FROM dbo.tbl_product_orders
      WHERE productorderid = @productorderid
    `);
  return result.recordset?.[0] || null;
};

const parseOrderItems = (orderdata) => {
  try {
    if (!orderdata) return [];
    if (Array.isArray(orderdata)) return orderdata;
    if (typeof orderdata === 'string') return JSON.parse(orderdata);
    return [];
  } catch {
    return [];
  }
};

const validateRefundPayload = (body) => {
  const method = String(body.refundmethod || '').trim();
  const status = String(body.paymentstatus || '').trim();
  if (!['Cash', 'GPay', 'BankTransfer'].includes(method)) {
    return 'refundmethod must be one of Cash, GPay, BankTransfer.';
  }
  if (!['Pending', 'Processing', 'Success', 'Failed'].includes(status)) {
    return 'paymentstatus must be one of Pending, Processing, Success, Failed.';
  }
  if (method === 'GPay' && !body.gpaynumber && !body.upiid) {
    return 'For GPay refund, provide gpaynumber or upiid.';
  }
  if (
    method === 'BankTransfer' &&
    (!body.bankholdername || !body.bankname || !body.accountnumber || !body.ifsccode)
  ) {
    return 'For BankTransfer refund, bankholdername, bankname, accountnumber, ifsccode are required.';
  }
  if (method === 'Cash' && status === 'Success' && !body.cashpaidby) {
    return 'For successful Cash refund, cashpaidby is required.';
  }
  return null;
};

const readParam = (req, key, fallback = null) => {
  if (req?.body && req.body[key] !== undefined) return req.body[key];
  if (req?.query && req.query[key] !== undefined) return req.query[key];
  return fallback;
};

const validateUserRefundPreference = (body) => {
  const method = String(body?.refundmethod || '').trim();
  if (!method) return null; // Optional at request time
  if (!['Cash', 'GPay', 'BankTransfer'].includes(method)) {
    return 'refundmethod must be one of Cash, GPay, BankTransfer.';
  }
  if (method === 'GPay' && !body?.gpaynumber && !body?.upiid) {
    return 'For GPay refund, provide gpaynumber or upiid.';
  }
  if (
    method === 'BankTransfer' &&
    (!body?.bankholdername || !body?.bankname || !body?.accountnumber || !body?.ifsccode)
  ) {
    return 'For BankTransfer refund, bankholdername, bankname, accountnumber, ifsccode are required.';
  }
  return null;
};

// GET admin return dashboard summary
const getAdminDashboard = async (req, res, next) => {
  try {
    await poolConnect;
    const filterType = readParam(req, 'filterType', 'TODAY');
    const fromDate = readParam(req, 'fromDate', null);
    const toDate = readParam(req, 'toDate', null);
    const partnerId = readParam(req, 'partnerId', null);

    const request = pool.request();
    request.input('FilterType', sql.VarChar(20), String(filterType || 'TODAY').toUpperCase());
    request.input('FromDate', sql.DateTime2, fromDate ? new Date(fromDate) : null);
    request.input('ToDate', sql.DateTime2, toDate ? new Date(toDate) : null);
    request.input('PartnerId', sql.VarChar(100), partnerId || null);

    const result = await request.execute('dbo.sp_get_product_returns_dashboard');
    res.json({ Response: result.recordset || [] });
  } catch (err) {
    next(err);
  }
};

router.get('/admin/dashboard', getAdminDashboard);
router.put('/admin/dashboard', getAdminDashboard);

// GET admin return list
const getAdminReturns = async (req, res, next) => {
  try {
    await poolConnect;
    const status = readParam(req, 'status', null);
    const partnerId = readParam(req, 'partnerId', null);
    const userId = readParam(req, 'userId', null);
    const search = readParam(req, 'search', null);
    const fromDate = readParam(req, 'fromDate', null);
    const toDate = readParam(req, 'toDate', null);
    const page = readParam(req, 'page', 1);
    const pageSize = readParam(req, 'pageSize', 25);

    const request = pool.request();
    request.input('Status', sql.VarChar(50), status || null);
    request.input('PartnerId', sql.VarChar(100), partnerId || null);
    request.input('UserId', sql.VarChar(100), userId || null);
    request.input('Search', sql.VarChar(200), search || null);
    request.input('FromDate', sql.DateTime2, fromDate ? new Date(fromDate) : null);
    request.input('ToDate', sql.DateTime2, toDate ? new Date(toDate) : null);
    request.input('Page', sql.Int, Number(page) || 1);
    request.input('PageSize', sql.Int, Number(pageSize) || 25);

    const result = await request.execute('dbo.sp_get_product_returns_list');
    res.json({
      Response: result.recordset || [],
      Meta: result.recordsets?.[1]?.[0] || null,
    });
  } catch (err) {
    next(err);
  }
};

router.get('/admin/list', getAdminReturns);
router.put('/admin/list', getAdminReturns);

// GET user return list
const getUserReturns = async (req, res, next) => {
  try {
    await poolConnect;
    const request = pool.request();
    request.input('UserId', sql.VarChar(100), req.params.userid);
    request.input('Status', sql.VarChar(50), readParam(req, 'status', null));
    request.input(
      'FromDate',
      sql.DateTime2,
      readParam(req, 'fromDate', null) ? new Date(readParam(req, 'fromDate', null)) : null
    );
    request.input(
      'ToDate',
      sql.DateTime2,
      readParam(req, 'toDate', null) ? new Date(readParam(req, 'toDate', null)) : null
    );
    request.input('Page', sql.Int, Number(readParam(req, 'page', 1)) || 1);
    request.input('PageSize', sql.Int, Number(readParam(req, 'pageSize', 25)) || 25);

    const result = await request.execute('dbo.sp_get_product_returns_by_user');
    res.json({
      Response: result.recordset || [],
      Meta: result.recordsets?.[1]?.[0] || null,
    });
  } catch (err) {
    next(err);
  }
};

router.get('/user/:userid', getUserReturns);
router.put('/user/:userid', getUserReturns);

// POST create return request (header + item details)
const createReturnRequest = async (req, res, next) => {
  try {
    await poolConnect;
    const {
      productorderid,
      userid,
      username,
      partnerid,
      pickupaddress,
      pickupcity,
      pickupstate,
      pickuppincode,
      pickuplatitude,
      pickuplongitude,
      returnreason,
      refundmethod,
      gpaynumber,
      upiid,
      bankholdername,
      bankname,
      accountnumber,
      ifsccode,
      items = [],
      rcu,
    } = req.body;

    if (!productorderid || !userid || !Array.isArray(items) || items.length === 0 || !rcu) {
      return res.status(400).json({
        message: 'productorderid, userid, items[], and rcu are required.',
      });
    }
    if (!String(returnreason || '').trim()) {
      return res.status(400).json({
        message: 'returnreason is required.',
      });
    }

    const refundPreferenceError = validateUserRefundPreference(req.body);
    if (refundPreferenceError) {
      return res.status(400).json({ message: refundPreferenceError });
    }

    const sourceOrder = await getOrderById(productorderid);
    if (!sourceOrder) {
      return res.status(404).json({ message: 'Source order not found.' });
    }
    if (String(sourceOrder.userid || '').toLowerCase() !== String(userid).toLowerCase()) {
      return res.status(403).json({ message: 'User does not match source order.' });
    }
    if (Number(sourceOrder.orderdelivered || 0) !== 1) {
      return res.status(400).json({ message: 'Only delivered orders are eligible for return.' });
    }

    const deliveredAt = sourceOrder.orderdeliveredtime ? new Date(sourceOrder.orderdeliveredtime) : null;
    if (!deliveredAt || Number.isNaN(deliveredAt.getTime())) {
      return res.status(400).json({ message: 'Invalid delivery timestamp for source order.' });
    }
    const windowEnd = new Date(deliveredAt);
    windowEnd.setDate(windowEnd.getDate() + RETURN_WINDOW_DAYS);
    if (new Date() > windowEnd) {
      return res.status(400).json({ message: `Return window expired (${RETURN_WINDOW_DAYS} days).` });
    }

    if (Number(sourceOrder.isdailymilkuser || 0) === 2) {
      return res.status(400).json({ message: 'Demo daily milk orders are not eligible for return.' });
    }

    const sourceItems = parseOrderItems(sourceOrder.orderdata);
    if (!sourceItems.length) {
      return res.status(400).json({ message: 'Source order has no returnable item lines.' });
    }

    const normalizeKey = (x) => `${x?.productid || ''}::${x?.variantid || ''}`;
    const orderedQtyMap = new Map();
    sourceItems.forEach((x) => {
      const key = normalizeKey(x);
      const existing = orderedQtyMap.get(key) || 0;
      orderedQtyMap.set(key, existing + Number(x?.orderquantity || 0));
    });

    // Existing non-terminal return quantities for this order
    const existingReturnRes = await pool
      .request()
      .input('productorderid', sql.VarChar(100), productorderid)
      .query(`
        SELECT d.productid, d.variantid, SUM(ISNULL(d.returnqty,0)) AS alreadyqty
        FROM dbo.tbl_product_return_details d
        INNER JOIN dbo.tbl_product_returns r ON r.returnid = d.returnid
        WHERE r.productorderid = @productorderid
          AND r.returnstatus NOT IN ('Rejected','Refunded','Closed')
        GROUP BY d.productid, d.variantid
      `);
    const existingQtyMap = new Map();
    existingReturnRes.recordset.forEach((row) => {
      existingQtyMap.set(`${row.productid || ''}::${row.variantid || ''}`, Number(row.alreadyqty || 0));
    });

    for (const item of items) {
      const rq = Number(item.returnqty || 0);
      if (!Number.isFinite(rq) || rq <= 0) {
        return res.status(400).json({ message: 'Each return item must have returnqty > 0.' });
      }
      const key = normalizeKey(item);
      const orderedQty = Number(orderedQtyMap.get(key) || 0);
      if (orderedQty <= 0) {
        return res.status(400).json({
          message: `Item not found in source order: ${item.productname || key}`,
        });
      }
      const existingQty = Number(existingQtyMap.get(key) || 0);
      if (existingQty + rq > orderedQty) {
        return res.status(400).json({
          message: `Return qty exceeds ordered qty for ${item.productname || key}. Ordered=${orderedQty}, ExistingReturn=${existingQty}, Requested=${rq}`,
        });
      }
    }

    const returnId = randomUUID();
    const returnNumber = `RET-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(
      Math.floor(Math.random() * 10000)
    ).padStart(4, '0')}`;

    const totalItems = items.length;
    const totalReturnQty = items.reduce((s, x) => s + Number(x.returnqty || 0), 0);
    const totalReturnAmount = items.reduce(
      (s, x) => s + Number(x.returnqty || 0) * Number(x.unitprice || 0),
      0
    );

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const headerReq = new sql.Request(transaction);
      await headerReq
        .input('returnid', sql.UniqueIdentifier, returnId)
        .input('returnnumber', sql.VarChar(40), returnNumber)
        .input('productorderid', sql.VarChar(100), productorderid)
        .input('userid', sql.VarChar(100), userid)
        .input('username', sql.VarChar(200), username || null)
        .input('partnerid', sql.VarChar(100), partnerid || null)
        .input('pickupaddress', sql.VarChar(sql.MAX), pickupaddress || null)
        .input('pickupcity', sql.VarChar(120), pickupcity || null)
        .input('pickupstate', sql.VarChar(120), pickupstate || null)
        .input('pickuppincode', sql.VarChar(20), pickuppincode || null)
        .input('pickuplatitude', sql.VarChar(50), pickuplatitude || null)
        .input('pickuplongitude', sql.VarChar(50), pickuplongitude || null)
        .input('totalitems', sql.Int, totalItems)
        .input('totalreturnqty', sql.Decimal(10, 2), totalReturnQty)
        .input('totalreturnamount', sql.Decimal(18, 2), totalReturnAmount)
        .input('returnreason', sql.VarChar(500), returnreason || null)
        .input('rcu', sql.VarChar(200), rcu)
        .query(`
          INSERT INTO dbo.tbl_product_returns
          (returnid, returnnumber, productorderid, userid, username, partnerid,
           pickupaddress, pickupcity, pickupstate, pickuppincode, pickuplatitude, pickuplongitude,
           totalitems, totalreturnqty, totalreturnamount, returnreason, returnstatus, requestedtime, rcu, rcm)
          VALUES
          (@returnid, @returnnumber, @productorderid, @userid, @username, @partnerid,
           @pickupaddress, @pickupcity, @pickupstate, @pickuppincode, @pickuplatitude, @pickuplongitude,
           @totalitems, @totalreturnqty, @totalreturnamount, @returnreason, 'Requested', DATEADD(MINUTE,330,GETUTCDATE()), @rcu, DATEADD(MINUTE,330,GETUTCDATE()));
        `);

      for (const item of items) {
        const detailReq = new sql.Request(transaction);
        await detailReq
          .input('returnid', sql.UniqueIdentifier, returnId)
          .input('productorderdetailsid', sql.UniqueIdentifier, item.productorderdetailsid || null)
          .input('productid', sql.UniqueIdentifier, item.productid || null)
          .input('variantid', sql.UniqueIdentifier, item.variantid || null)
          .input('productname', sql.VarChar(250), item.productname || null)
          .input('variantname', sql.VarChar(250), item.variantname || null)
          .input('orderedqty', sql.Decimal(10, 2), Number(item.orderedqty || 0))
          .input('returnqty', sql.Decimal(10, 2), Number(item.returnqty || 0))
          .input('unitprice', sql.Decimal(18, 2), Number(item.unitprice || 0))
          .input('lineamount', sql.Decimal(18, 2), Number(item.lineamount || 0))
          .input('itemreason', sql.VarChar(500), item.itemreason || null)
          .input('rcu', sql.VarChar(200), rcu)
          .query(`
            INSERT INTO dbo.tbl_product_return_details
            (returndetailid, returnid, productorderdetailsid, productid, variantid, productname, variantname,
             orderedqty, returnqty, unitprice, lineamount, itemreason, itemstatus, rcu, rcm)
            VALUES
            (NEWID(), @returnid, @productorderdetailsid, @productid, @variantid, @productname, @variantname,
             @orderedqty, @returnqty, @unitprice, @lineamount, @itemreason, 'Requested', @rcu, DATEADD(MINUTE,330,GETUTCDATE()));
          `);
      }

      const historyReq = new sql.Request(transaction);
      await historyReq
        .input('returnid', sql.UniqueIdentifier, returnId)
        .input('changedby', sql.VarChar(200), rcu)
        .query(`
          INSERT INTO dbo.tbl_product_return_status_history
          (returnstatusid, returnid, oldstatus, newstatus, changedby, changedtime, remarks)
          VALUES
          (NEWID(), @returnid, NULL, 'Requested', @changedby, DATEADD(MINUTE,330,GETUTCDATE()), NULL);
        `);

      if (refundmethod) {
        const refundReq = new sql.Request(transaction);
        await refundReq
          .input('returnid', sql.UniqueIdentifier, returnId)
          .input('refundmethod', sql.VarChar(30), refundmethod)
          .input('refundamount', sql.Decimal(18, 2), Number(totalReturnAmount || 0))
          .input('paymentstatus', sql.VarChar(30), 'Pending')
          .input('gpaynumber', sql.VarChar(30), gpaynumber || null)
          .input('upiid', sql.VarChar(120), upiid || null)
          .input('bankholdername', sql.VarChar(200), bankholdername || null)
          .input('bankname', sql.VarChar(200), bankname || null)
          .input('accountnumber', sql.VarChar(50), accountnumber || null)
          .input('ifsccode', sql.VarChar(20), ifsccode || null)
          .input('rcu', sql.VarChar(200), rcu)
          .query(`
            INSERT INTO dbo.tbl_product_return_refund
            (refundid, returnid, refundmethod, refundamount, paymentstatus, paymentreference,
             gpaynumber, upiid, bankholdername, bankname, accountnumber, ifsccode, cashpaidby, cashpaidtime, rcu, rcm)
            VALUES
            (NEWID(), @returnid, @refundmethod, @refundamount, @paymentstatus, NULL,
             @gpaynumber, @upiid, @bankholdername, @bankname, @accountnumber, @ifsccode, NULL, NULL, @rcu, DATEADD(MINUTE,330,GETUTCDATE()));
          `);
      }

      await transaction.commit();
      res.status(201).json({
        message: 'Return request created successfully.',
        returnid: returnId,
        returnnumber: returnNumber,
      });
    } catch (innerErr) {
      await transaction.rollback();
      throw innerErr;
    }
  } catch (err) {
    next(err);
  }
};

router.post('/', createReturnRequest);
router.put('/', createReturnRequest);

// PUT user cancel return (allowed only before approval)
router.put('/cancel', async (req, res, next) => {
  try {
    await poolConnect;
    const { returnid, userid, reason, luu } = req.body;
    if (!returnid || !userid || !luu) {
      return res.status(400).json({ message: 'returnid, userid, luu are required.' });
    }

    const current = await pool
      .request()
      .input('returnid', sql.UniqueIdentifier, returnid)
      .query('SELECT TOP 1 * FROM dbo.tbl_product_returns WHERE returnid = @returnid');
    const row = current.recordset?.[0];
    if (!row) return res.status(404).json({ message: 'Return not found.' });
    if (String(row.userid || '').toLowerCase() !== String(userid).toLowerCase()) {
      return res.status(403).json({ message: 'User does not own this return request.' });
    }
    if (row.returnstatus !== 'Requested') {
      return res.status(400).json({ message: 'Only Requested returns can be cancelled by user.' });
    }

    const result = await pool
      .request()
      .input('ReturnId', sql.UniqueIdentifier, returnid)
      .input('Status', sql.VarChar(50), 'Closed')
      .input('Remarks', sql.VarChar(500), reason || 'Cancelled by user')
      .input('Luu', sql.VarChar(200), luu)
      .execute('dbo.sp_update_product_return_status');

    res.json({ message: 'Return request cancelled successfully.', Response: result.recordset || [] });
  } catch (err) {
    next(err);
  }
});

// PUT admin review (Approve / Reject)
router.put('/admin/review', async (req, res, next) => {
  try {
    await poolConnect;
    const { returnid, action, adminremarks, luu } = req.body;
    if (!returnid || !action || !luu) {
      return res.status(400).json({ message: 'returnid, action, luu are required.' });
    }

    const status = String(action).toUpperCase() === 'APPROVE' ? 'Approved' : 'Rejected';
    const result = await pool
      .request()
      .input('ReturnId', sql.UniqueIdentifier, returnid)
      .input('Status', sql.VarChar(50), status)
      .input('Remarks', sql.VarChar(500), adminremarks || null)
      .input('Luu', sql.VarChar(200), luu)
      .execute('dbo.sp_update_product_return_status');

    res.json({ message: `Return ${status.toLowerCase()} successfully.`, Response: result.recordset || [] });
  } catch (err) {
    next(err);
  }
});

// PUT common status transitions (pickup/qc/refund/close)
router.put('/admin/status', async (req, res, next) => {
  try {
    await poolConnect;
    const { returnid, newstatus, remarks, luu } = req.body;
    if (!returnid || !newstatus || !luu) {
      return res.status(400).json({ message: 'returnid, newstatus, luu are required.' });
    }
    if (!ALLOWED_STATUS_TRANSITIONS.has(newstatus)) {
      return res.status(400).json({ message: `Invalid status: ${newstatus}` });
    }

    const result = await pool
      .request()
      .input('ReturnId', sql.UniqueIdentifier, returnid)
      .input('Status', sql.VarChar(50), newstatus)
      .input('Remarks', sql.VarChar(500), remarks || null)
      .input('Luu', sql.VarChar(200), luu)
      .execute('dbo.sp_update_product_return_status');

    res.json({ message: 'Return status updated successfully.', Response: result.recordset || [] });
  } catch (err) {
    next(err);
  }
});

// PUT admin item-level QC decision
router.put('/admin/qc', async (req, res, next) => {
  try {
    await poolConnect;
    const { returnid, items = [], remarks, luu } = req.body;
    if (!returnid || !Array.isArray(items) || items.length === 0 || !luu) {
      return res.status(400).json({ message: 'returnid, items[], luu are required.' });
    }

    const tx = new sql.Transaction(pool);
    await tx.begin();
    try {
      for (const item of items) {
        if (!item.returndetailid || !item.itemstatus) {
          throw new Error('Each item requires returndetailid and itemstatus.');
        }
        if (!['Approved', 'Rejected', 'QCInProgress', 'QCPassed', 'QCFailed', 'Received'].includes(item.itemstatus)) {
          throw new Error(`Invalid itemstatus: ${item.itemstatus}`);
        }
        await new sql.Request(tx)
          .input('returndetailid', sql.UniqueIdentifier, item.returndetailid)
          .input('itemstatus', sql.VarChar(50), item.itemstatus)
          .input('returnqty', sql.Decimal(10, 2), item.approvedqty != null ? Number(item.approvedqty) : null)
          .input('luu', sql.VarChar(200), luu)
          .query(`
            UPDATE dbo.tbl_product_return_details
            SET itemstatus = @itemstatus,
                returnqty = COALESCE(@returnqty, returnqty),
                luu = @luu,
                lum = DATEADD(MINUTE,330,GETUTCDATE())
            WHERE returndetailid = @returndetailid
          `);
      }

      await new sql.Request(tx)
        .input('ReturnId', sql.UniqueIdentifier, returnid)
        .input('Status', sql.VarChar(50), 'QCInProgress')
        .input('Remarks', sql.VarChar(500), remarks || null)
        .input('Luu', sql.VarChar(200), luu)
        .execute('dbo.sp_update_product_return_status');

      await tx.commit();
      res.json({ message: 'QC updates saved successfully.' });
    } catch (innerErr) {
      await tx.rollback();
      throw innerErr;
    }
  } catch (err) {
    next(err);
  }
});

// PUT refund details
router.put('/admin/refund', async (req, res, next) => {
  try {
    await poolConnect;
    const {
      returnid,
      refundmethod,
      refundamount,
      paymentstatus,
      paymentreference,
      gpaynumber,
      upiid,
      bankholdername,
      bankname,
      accountnumber,
      ifsccode,
      cashpaidby,
      luu,
    } = req.body;

    if (!returnid || !refundmethod || refundamount == null || !paymentstatus || !luu) {
      return res.status(400).json({
        message: 'returnid, refundmethod, refundamount, paymentstatus, luu are required.',
      });
    }
    const validationError = validateRefundPayload(req.body);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    await pool
      .request()
      .input('ReturnId', sql.UniqueIdentifier, returnid)
      .input('RefundMethod', sql.VarChar(30), refundmethod)
      .input('RefundAmount', sql.Decimal(18, 2), Number(refundamount))
      .input('PaymentStatus', sql.VarChar(30), paymentstatus)
      .input('PaymentReference', sql.VarChar(200), paymentreference || null)
      .input('GpayNumber', sql.VarChar(30), gpaynumber || null)
      .input('UpiId', sql.VarChar(120), upiid || null)
      .input('BankHolderName', sql.VarChar(200), bankholdername || null)
      .input('BankName', sql.VarChar(200), bankname || null)
      .input('AccountNumber', sql.VarChar(50), accountnumber || null)
      .input('IfscCode', sql.VarChar(20), ifsccode || null)
      .input('CashPaidBy', sql.VarChar(200), cashpaidby || null)
      .input('Luu', sql.VarChar(200), luu)
      .execute('dbo.sp_upsert_product_return_refund');

    res.json({ message: 'Return refund details updated successfully.' });
  } catch (err) {
    next(err);
  }
});

// GET partner pickup queue
const getPartnerReturns = async (req, res, next) => {
  try {
    await poolConnect;
    const request = pool.request();
    request.input('Status', sql.VarChar(50), readParam(req, 'status', null));
    request.input('PartnerId', sql.VarChar(100), req.params.partnerid);
    request.input('UserId', sql.VarChar(100), null);
    request.input('Search', sql.VarChar(200), readParam(req, 'search', null));
    request.input(
      'FromDate',
      sql.DateTime2,
      readParam(req, 'fromDate', null) ? new Date(readParam(req, 'fromDate', null)) : null
    );
    request.input(
      'ToDate',
      sql.DateTime2,
      readParam(req, 'toDate', null) ? new Date(readParam(req, 'toDate', null)) : null
    );
    request.input('Page', sql.Int, Number(readParam(req, 'page', 1)) || 1);
    request.input('PageSize', sql.Int, Number(readParam(req, 'pageSize', 25)) || 25);

    const result = await request.execute('dbo.sp_get_product_returns_list');
    res.json({
      Response: result.recordset || [],
      Meta: result.recordsets?.[1]?.[0] || null,
    });
  } catch (err) {
    next(err);
  }
};

router.get('/partner/:partnerid', getPartnerReturns);
router.put('/partner/:partnerid', getPartnerReturns);

// PUT partner status update
router.put('/partner/status', async (req, res, next) => {
  try {
    await poolConnect;
    const { returnid, partnerid, newstatus, remarks, luu } = req.body;
    if (!returnid || !partnerid || !newstatus || !luu) {
      return res.status(400).json({ message: 'returnid, partnerid, newstatus, luu are required.' });
    }
    if (!['PickupScheduled', 'PickedUp', 'ReceivedAtHub'].includes(newstatus)) {
      return res.status(400).json({ message: 'Partner can update only PickupScheduled/PickedUp/ReceivedAtHub.' });
    }

    const ownership = await pool
      .request()
      .input('returnid', sql.UniqueIdentifier, returnid)
      .query('SELECT TOP 1 partnerid FROM dbo.tbl_product_returns WHERE returnid = @returnid');
    const row = ownership.recordset?.[0];
    if (!row) return res.status(404).json({ message: 'Return not found.' });
    if (String(row.partnerid || '').toLowerCase() !== String(partnerid).toLowerCase()) {
      return res.status(403).json({ message: 'Partner is not mapped to this return.' });
    }

    const result = await pool
      .request()
      .input('ReturnId', sql.UniqueIdentifier, returnid)
      .input('Status', sql.VarChar(50), newstatus)
      .input('Remarks', sql.VarChar(500), remarks || null)
      .input('Luu', sql.VarChar(200), luu)
      .execute('dbo.sp_update_product_return_status');

    res.json({ message: 'Partner return status updated successfully.', Response: result.recordset || [] });
  } catch (err) {
    next(err);
  }
});

// GET complete return details (keep this route near bottom to avoid shadowing /partner/:partnerid)
router.get('/:returnid', async (req, res, next) => {
  try {
    await poolConnect;
    const request = pool.request();
    request.input('ReturnId', sql.UniqueIdentifier, req.params.returnid);
    const result = await request.execute('dbo.sp_get_product_return_complete');

    res.json({
      Header: result.recordsets?.[0]?.[0] || null,
      Details: result.recordsets?.[1] || [],
      StatusHistory: result.recordsets?.[2] || [],
      Refund: result.recordsets?.[3]?.[0] || null,
    });
  } catch (err) {
    next(err);
  }
});

router.put('/detail', async (req, res, next) => {
  try {
    await poolConnect;
    const returnId = req.body?.returnid;
    if (!returnId) {
      return res.status(400).json({ message: 'returnid is required.' });
    }

    const request = pool.request();
    request.input('ReturnId', sql.UniqueIdentifier, returnId);
    const result = await request.execute('dbo.sp_get_product_return_complete');

    res.json({
      Header: result.recordsets?.[0]?.[0] || null,
      Details: result.recordsets?.[1] || [],
      StatusHistory: result.recordsets?.[2] || [],
      Refund: result.recordsets?.[3]?.[0] || null,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
