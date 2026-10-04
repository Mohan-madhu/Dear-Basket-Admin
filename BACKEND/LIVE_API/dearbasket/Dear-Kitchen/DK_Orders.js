const express = require('express');
const router = express.Router();
const { pool, poolConnect, sql } = require('../../../config/db_dearbasket');

const SERVER_NOW_SQL = "GETDATE()";

const STATUS_TRACKING = {
  Placed: {
    flag: 'orderplaced',
    by: 'orderplacedby',
    time: 'orderplacedtime',
  },
  Accepted: {
    flag: 'orderaccepted',
    by: 'orderacceptedby',
    time: 'orderacceptedtime',
  },
  Preparing: {
    flag: 'orderpreparing',
    by: 'orderpreparingby',
    time: 'orderpreparingtime',
  },
  Ready: {
    flag: 'orderready',
    by: 'orderreadyby',
    time: 'orderreadytime',
  },
  Assigned: {
    flag: 'orderassigned',
    by: 'orderassignedby',
    time: 'orderassignedtime',
  },
  Picked: {
    flag: 'orderpicked',
    by: 'orderpickedby',
    time: 'orderpickedtime',
  },
  Delivered: {
    flag: 'orderdelivered',
    by: 'orderdeliveredby',
    time: 'orderdeliveredtime',
  },
  Cancelled: {
    flag: 'ordercancelled',
    by: 'ordercancelledby',
    time: 'ordercancelledtime',
  },
  Rejected: {
    flag: 'orderrejected',
    by: 'orderrejectedby',
    time: 'orderrejectedtime',
  },
};

const ROLE_STATUS_ACCESS = {
  KITCHENPARTNER: ['Accepted', 'Preparing', 'Ready'],
  DELIVERYPARTNER: ['Assigned', 'Picked', 'Delivered'],
  USER: ['Placed'],
  ADMIN: ['Placed', 'Accepted', 'Preparing', 'Ready', 'Assigned', 'Picked', 'Delivered', 'Cancelled', 'Rejected'],
};

const normalizeRole = (value) => String(value || '').trim().toUpperCase();

const validateStatusAccess = ({ role, status }) => {
  const normalizedRole = normalizeRole(role);
  const normalizedStatus = String(status || '').trim();
  if (!normalizedRole || !normalizedStatus) return null;

  const allowedStatuses = ROLE_STATUS_ACCESS[normalizedRole];
  if (!allowedStatuses) {
    return `Invalid Dear Kitchen order role: ${role}`;
  }

  if (!allowedStatuses.includes(normalizedStatus)) {
    return `${normalizedRole} cannot update Dear Kitchen order status to ${normalizedStatus}`;
  }

  return null;
};

const addStatusTrackingUpdates = ({ updates, request, status, actor }) => {
  const config = STATUS_TRACKING[String(status || '').trim()];
  if (!config) return;

  updates.push(`${config.flag} = CASE WHEN ${config.flag} IS NULL THEN 1 ELSE ${config.flag} END`);
  updates.push(`${config.by} = CASE WHEN ${config.by} IS NULL THEN @statusactor ELSE ${config.by} END`);
  updates.push(`${config.time} = CASE WHEN ${config.time} IS NULL THEN ${SERVER_NOW_SQL} ELSE ${config.time} END`);
  request.input('statusactor', sql.VarChar, actor || 'System');
};

const addDeliveryPartnerAssignment = ({ updates, request, body, status }) => {
  const role = normalizeRole(body.statusactorrole);
  const partnerId = body.statusactorid || body.mappedpartnerid || body.luu;
  const shouldAssignPartner =
    role === 'DELIVERYPARTNER' &&
    ['Assigned', 'Picked'].includes(String(status || '').trim()) &&
    partnerId &&
    body.mappedpartnerid == null;

  if (!shouldAssignPartner) return;

  updates.push('mappedpartnerid = @assignedpartnerid');
  request.input('assignedpartnerid', sql.VarChar, partnerId);
};

const getStatusUpdateGuard = ({ body, status }) => {
  const role = normalizeRole(body.statusactorrole);
  const normalizedStatus = String(status || '').trim();
  const partnerId = body.statusactorid || body.mappedpartnerid || body.luu;

  if (role === 'DELIVERYPARTNER' && normalizedStatus === 'Assigned') {
    return {
      clause: "orderstatus = 'Ready' AND mappedpartnerid IS NULL",
      partnerId,
      conflictMessage: 'This kitchen order was already accepted by another delivery partner.',
    };
  }

  if (role === 'DELIVERYPARTNER' && normalizedStatus === 'Picked') {
    return {
      clause: "orderstatus = 'Assigned' AND mappedpartnerid = @guardpartnerid",
      partnerId,
      conflictMessage: 'This kitchen order is not assigned to this delivery partner.',
    };
  }

  if (role === 'DELIVERYPARTNER' && normalizedStatus === 'Delivered') {
    return {
      clause: "orderstatus = 'Picked' AND mappedpartnerid = @guardpartnerid",
      partnerId,
      conflictMessage: 'This kitchen order is not assigned to this delivery partner.',
    };
  }

  return null;
};

// GET orders by user, kitchen, or partner
router.get('/', async (req, res, next) => {
  try {
    await poolConnect;

    if (String(req.query.payout || '').toLowerCase() === '1') {
      const filterType = String(req.query.filterType || 'ALL').toUpperCase();
      const fromDate = req.query.fromDate || null;
      const toDate = req.query.toDate || null;
      const mappedpartnerid = req.query.mappedpartnerid || null;

      const result = await pool.request()
        .input('mappedpartnerid', sql.VarChar, mappedpartnerid)
        .input('filterType', sql.VarChar, filterType)
        .input('fromDate', sql.Date, fromDate)
        .input('toDate', sql.Date, toDate)
        .query(`
          DECLARE @Today DATE = CONVERT(DATE, ${SERVER_NOW_SQL});
          DECLARE @StartDate DATE = NULL;
          DECLARE @EndDate DATE = NULL;

          IF @filterType = 'TODAY'
          BEGIN
            SET @StartDate = @Today;
            SET @EndDate = DATEADD(DAY, 1, @Today);
          END
          ELSE IF @filterType = 'TOMORROW'
          BEGIN
            SET @StartDate = DATEADD(DAY, 1, @Today);
            SET @EndDate = DATEADD(DAY, 2, @Today);
          END
          ELSE IF @filterType = 'WEEK'
          BEGIN
            SET @StartDate = DATEADD(DAY, -6, @Today);
            SET @EndDate = DATEADD(DAY, 1, @Today);
          END
          ELSE IF @filterType = 'MONTH'
          BEGIN
            SET @StartDate = DATEFROMPARTS(YEAR(@Today), MONTH(@Today), 1);
            SET @EndDate = DATEADD(MONTH, 1, @StartDate);
          END
          ELSE IF @filterType = 'YEAR'
          BEGIN
            SET @StartDate = DATEFROMPARTS(YEAR(@Today), 1, 1);
            SET @EndDate = DATEADD(YEAR, 1, @StartDate);
          END
          ELSE IF @filterType = 'CUSTOM'
          BEGIN
            SET @StartDate = @fromDate;
            SET @EndDate = CASE WHEN @toDate IS NULL THEN NULL ELSE DATEADD(DAY, 1, @toDate) END;
          END

          SELECT
            o.orderid,
            o.orderid AS productorderid,
            o.userid,
            COALESCE(u.name, o.rcu, 'Client') AS username,
            COALESCE(u.name, o.rcu, 'Client') AS name,
            u.mobile AS usermobile,
            o.kitchenid,
            k.kitchenname,
            o.mappedpartnerid,
            4 AS isdailymilkuser,
            'kitchen_order' AS order_type,
            'Food Delivery' AS type,
            o.orderstatus,
            o.orderdata,
            o.itemtotal,
            o.deliverycharge,
            o.tax,
            o.totalamount,
            o.totalamount AS ordergrandtotal,
            o.deliveryaddress,
            o.deliverycity,
            o.deliverystate,
            o.deliverypincode,
            o.latitude,
            o.longitude,
            o.rcm AS ordertime,
            o.orderdelivered,
            o.orderdeliveredby,
            o.orderdeliveredtime,
            o.partnerpayoutapplicationid,
            o.partnerpayoutapplicationstatus,
            o.partnerpayoutpaid
          FROM dbo.tbl_dk_orders o
          LEFT JOIN dbo.tbl_user u ON u.transid = o.userid
          LEFT JOIN dbo.tbl_dk_kitchens k ON k.kitchenid = o.kitchenid
          WHERE (o.orderstatus = 'Delivered' OR ISNULL(o.orderdelivered, 0) = 1)
            AND o.mappedpartnerid IS NOT NULL
            AND (@mappedpartnerid IS NULL OR o.mappedpartnerid = @mappedpartnerid)
            AND (@StartDate IS NULL OR CONVERT(DATE, ISNULL(o.orderdeliveredtime, o.lum)) >= @StartDate)
            AND (@EndDate IS NULL OR CONVERT(DATE, ISNULL(o.orderdeliveredtime, o.lum)) < @EndDate)
          ORDER BY ISNULL(o.orderdeliveredtime, o.lum) DESC, o.orderid DESC;
        `);
      return res.json({ Response: result.recordset });
    }

    if (req.query.userid) {
      const result = await pool.request()
        .input('userid', sql.VarChar, req.query.userid)
        .query('EXEC sp_dk_GetOrdersByUser @userid;');
      return res.json({ Response: result.recordset });
    }

if (req.query.kitchenid) {
  const result = await pool.request()
    .input('kitchenid', sql.VarChar, req.query.kitchenid)
    .input('orderstatus', sql.NVarChar, req.query.orderstatus || null)
    .input('orderbucket', sql.VarChar, req.query.orderbucket || 'ALL')
    .query('EXEC sp_dk_GetOrdersByKitchen @kitchenid, @orderstatus, @orderbucket;');

  return res.json({ Response: result.recordset });
}

    if (req.query.mappedpartnerid) {
      const result = await pool.request()
        .input('mappedpartnerid', sql.VarChar, req.query.mappedpartnerid)
        .query('EXEC sp_dk_GetOrdersByPartner @mappedpartnerid;');
      return res.json({ Response: result.recordset });
    }

    const result = await pool.request().query('SELECT * FROM tbl_dk_orders;');
    res.json({ Response: result.recordset });
  } catch (err) { next(err); }
});

// GET order detail by orderid
router.get('/:id', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('orderid', sql.VarChar, req.params.id)
      .query('EXEC sp_dk_GetOrderDetail @orderid;');
    // sp_dk_GetOrderDetail returns two result sets: header (0) and items (1)
    const header = (result.recordsets && result.recordsets[0] && result.recordsets[0][0]) || (result.recordset && result.recordset[0]) || null;
    const items = (result.recordsets && result.recordsets[1]) || [];
    res.json({ Response: { order: header, items } });
  } catch (err) { next(err); }
});

// CREATE order
router.post('/', async (req, res, next) => {
  try {
    await poolConnect;

    const validation = await pool.request()
  .input('kitchenid', sql.VarChar, req.body.kitchenid)
  .input('deliverydate', sql.Date, req.body.deliverydate)
  .query(`
    DECLARE @Today DATE = CONVERT(DATE, SWITCHOFFSET(SYSDATETIMEOFFSET(), '+05:30'));

    SELECT
      allowprebooking,
      CASE
        WHEN @deliverydate < @Today THEN 'PAST_DATE'
        WHEN @deliverydate > DATEADD(DAY, 2, @Today) THEN 'BEYOND_LIMIT'
        WHEN @deliverydate > @Today AND ISNULL(allowprebooking, 0) <> 1 THEN 'PREBOOKING_DISABLED'
        ELSE 'OK'
      END AS validationstatus
    FROM dbo.tbl_dk_kitchens
    WHERE kitchenid = @kitchenid;
  `);

const rule = validation.recordset[0];
if (!rule) return res.status(400).json({ message: 'Kitchen not found.' });
if (rule.validationstatus !== 'OK') {
  return res.status(400).json({
    message:
      rule.validationstatus === 'PAST_DATE'
        ? 'Past delivery dates are not allowed.'
        : rule.validationstatus === 'BEYOND_LIMIT'
          ? 'Pre-orders are allowed only up to 2 days.'
          : 'This kitchen does not accept pre-orders.',
  });
}

    const result = await pool.request()
      .input('userid', sql.VarChar, req.body.userid)
      .input('kitchenid', sql.VarChar, req.body.kitchenid)
      .input('slotid', sql.VarChar, req.body.slotid)
      .input('mealtypeid', sql.VarChar, req.body.mealtypeid)
      .input('deliverydate', sql.Date, req.body.deliverydate)
      .input('deliveryaddress', sql.NVarChar, req.body.deliveryaddress)
      .input('deliverycity', sql.NVarChar, req.body.deliverycity)
      .input('deliverystate', sql.NVarChar, req.body.deliverystate)
      .input('deliverypincode', sql.VarChar, req.body.deliverypincode)
      .input('latitude', sql.Decimal(10, 2), req.body.latitude)
      .input('longitude', sql.Decimal(10, 2), req.body.longitude)
      .input('specialinstructions', sql.NVarChar, req.body.specialinstructions)
      // Default monetary fields to 0 when not provided
      .input('itemtotal', sql.Decimal(10, 2), req.body.itemtotal ?? 0)
      .input('deliverycharge', sql.Decimal(10, 2), req.body.deliverycharge ?? 0)
      .input('tax', sql.Decimal(10, 2), req.body.tax ?? 0)
      .input('totalamount', sql.Decimal(10, 2), req.body.totalamount ?? 0)
      .input('paymentmode', sql.NVarChar, req.body.paymentmode)
      .input('rcu', sql.VarChar, req.body.rcu)
      .input('orderdata', sql.NVarChar(sql.MAX), req.body.orderdata || null)
      .query(`
        INSERT INTO tbl_dk_orders
          (orderid, userid, kitchenid, mappedpartnerid, slotid, mealtypeid, deliverydate, deliveryaddress, deliverycity, deliverystate, deliverypincode, latitude, longitude, specialinstructions, itemtotal, deliverycharge, tax, totalamount, paymentmode, paymentstatus, orderstatus, orderplaced, orderplacedby, orderplacedtime, rcu, rcm, orderdata)
        OUTPUT INSERTED.*
        VALUES
          (NEWID(), @userid, @kitchenid, NULL, @slotid, @mealtypeid, @deliverydate, @deliveryaddress, @deliverycity, @deliverystate, @deliverypincode, @latitude, @longitude, @specialinstructions, @itemtotal, @deliverycharge, @tax, @totalamount, @paymentmode, 'Pending', 'Placed', 1, @rcu, ${SERVER_NOW_SQL}, @rcu, ${SERVER_NOW_SQL}, @orderdata);
      `);
    res.status(201).json(result.recordset);
  } catch (err) { next(err); }
});

// UPDATE order by orderid in body
router.put('/', async (req, res, next) => {
  try {
    const id = req.body.orderid;
    const nextStatus = req.body.orderstatus;
    const actor = req.body.statusactorname || req.body.statusactorid || req.body.luu || req.body.updatedby || req.body.mappedpartnerid || 'System';
    const statusGuard = getStatusUpdateGuard({
      body: req.body,
      status: nextStatus,
    });
    if (statusGuard && !statusGuard.partnerId) {
      return res.status(400).json({ message: 'Delivery partner id is required for this status update.' });
    }

    const accessError = validateStatusAccess({
      role: req.body.statusactorrole,
      status: nextStatus,
    });
    if (accessError) {
      return res.status(403).json({ message: accessError });
    }

    const fields = ['userid', 'kitchenid', 'mappedpartnerid', 'slotid', 'mealtypeid', 'deliverydate', 'deliveryaddress', 'deliverycity', 'deliverystate', 'deliverypincode', 'latitude', 'longitude', 'specialinstructions', 'itemtotal', 'deliverycharge', 'tax', 'totalamount', 'paymentmode', 'paymentstatus', 'orderstatus', 'rejectionreason', 'partnerpayoutapplicationid', 'partnerpayoutapplicationstatus', 'partnerpayoutpaid', 'orderdata', 'luu'];
    const updates = [];
    const request = pool.request();
    request.input('orderid', sql.VarChar, id);
    if (statusGuard?.partnerId) {
      request.input('guardpartnerid', sql.VarChar, statusGuard.partnerId);
    }

    fields.forEach(f => {
      if (req.body[f] != null) {
        updates.push(`${f} = @${f}`);
        if (f === 'deliverydate') request.input(f, sql.Date, req.body[f]);
        else if (['latitude', 'longitude', 'itemtotal', 'deliverycharge', 'tax', 'totalamount'].includes(f)) request.input(f, sql.Decimal(10, 2), req.body[f]);
        else if (['userid', 'kitchenid', 'mappedpartnerid', 'slotid', 'mealtypeid', 'deliverypincode', 'partnerpayoutapplicationid', 'partnerpayoutapplicationstatus', 'partnerpayoutpaid', 'luu'].includes(f)) request.input(f, sql.VarChar, req.body[f]);
        else if (f === 'orderdata') request.input(f, sql.NVarChar(sql.MAX), req.body[f]);
        else request.input(f, sql.NVarChar, req.body[f]);
      }
    });

    addStatusTrackingUpdates({
      updates,
      request,
      status: nextStatus,
      actor,
    });

    addDeliveryPartnerAssignment({
      updates,
      request,
      body: req.body,
      status: nextStatus,
    });

    if (updates.length === 0) return res.status(400).json({ message: 'No fields provided to update' });
    const setClause = updates.join(', ') + `, lum = ${SERVER_NOW_SQL}`;
    const whereClause = statusGuard
      ? `orderid = @orderid AND ${statusGuard.clause}`
      : 'orderid = @orderid';
    await poolConnect;
    const result = await request.query(`
      UPDATE tbl_dk_orders
      SET ${setClause}
      WHERE ${whereClause};
      SELECT @@ROWCOUNT AS affected;
    `);
    if (result.recordset[0].affected === 0) {
      return res.status(statusGuard ? 409 : 404).json({ message: statusGuard?.conflictMessage || 'Not found' });
    }
    res.json({ message: 'Updated successfully' });
  } catch (err) { next(err); }
});

// DELETE order by orderid in body
router.delete('/', async (req, res, next) => {
  try {
    const id = req.body.orderid;
    await poolConnect;
    const result = await pool.request()
      .input('orderid', sql.VarChar, id)
      .query(`
        DELETE FROM tbl_dk_orders
        WHERE orderid = @orderid;
        SELECT @@ROWCOUNT AS affected;
      `);
    if (result.recordset[0].affected === 0) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) { next(err); }
});

module.exports = router;
