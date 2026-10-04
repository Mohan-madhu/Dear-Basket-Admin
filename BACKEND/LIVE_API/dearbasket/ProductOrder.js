const express = require('express');
const router = express.Router();
const { pool, poolConnect, sql } = require('../../config/db_dearbasket');

// GET all Product Orders
router.get('/', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request().execute('dbo.usp_get_all_orders_with_dailymilk');
    // .query(`
    //     SELECT 
    //         p.*,
    //         dbo.fn_getusercontact(p.userid) AS user_mobile
    //     FROM tbl_product_orders AS p
    //     ORDER BY p.rcm DESC;
    // `);

    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

router.get('/new', async (req, res, next) => {
  try {
    await poolConnect;
    const request = pool.request();

    const filter = String(req.query.filter || 'all').trim().toLowerCase();

    let orderFrom = null;
    let orderTo = null;

    const now = new Date();

    const startOfDay = (d) => {
      const x = new Date(d);
      x.setHours(0, 0, 0, 0);
      return x;
    };

    const addDays = (d, days) => {
      const x = new Date(d);
      x.setDate(x.getDate() + days);
      return x;
    };

    const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
    const startOfYear = (d) => new Date(d.getFullYear(), 0, 1, 0, 0, 0, 0);
    const startOfWeek = (d) => {
      const x = startOfDay(d);
      const day = x.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      x.setDate(x.getDate() + diff);
      return x;
    };

    switch (filter) {
      case 'today':
        orderFrom = startOfDay(now);
        orderTo = addDays(orderFrom, 1);
        break;
      case 'yesterday':
        orderTo = startOfDay(now);
        orderFrom = addDays(orderTo, -1);
        break;
      case 'week':
        orderFrom = startOfWeek(now);
        orderTo = addDays(startOfDay(now), 1);
        break;
      case 'month':
        orderFrom = startOfMonth(now);
        orderTo = addDays(startOfDay(now), 1);
        break;
      case 'year':
        orderFrom = startOfYear(now);
        orderTo = addDays(startOfDay(now), 1);
        break;
      default:
        break;
    }

    request.input('UserId', null);
    request.input('OrderFrom', orderFrom);
    request.input('OrderTo', orderTo);

    const result = await request.execute('sp_get_all_orders');

    res.json({ Response: result.recordset || [] });
  } catch (err) {
    next(err);
  }
});

router.get('/GroceryOrdersDashboard', async (req, res, next) => {
  try {
    await poolConnect;

    const {
      orderType = 'ALL',
      filterType = 'TODAY',
      fromDate = null,
      toDate = null,
      mappedPartnerId = null
    } = req.query;

    const request = pool.request();

    request.input('OrderType', sql.VarChar(20), orderType);
    request.input('FilterType', sql.VarChar(20), filterType);
    request.input('FromDate', sql.DateTime, fromDate ? new Date(fromDate) : null);
    request.input('ToDate', sql.DateTime, toDate ? new Date(toDate) : null);
    request.input('MappedPartnerId', sql.VarChar(100), mappedPartnerId || null);

    const query = `
      SELECT *
      FROM dbo.fn_GetGroceryOrdersDashboardSummary(
        @OrderType,
        @FilterType,
        @FromDate,
        @ToDate,
        @MappedPartnerId
      );

      SELECT *
      FROM dbo.fn_GetGroceryOrdersPartners(
        @OrderType,
        @FilterType,
        @FromDate,
        @ToDate,
        @MappedPartnerId
      );

      SELECT *
      FROM dbo.fn_GetGroceryOrdersDashboardOrders(
        @OrderType,
        @FilterType,
        @FromDate,
        @ToDate,
        @MappedPartnerId
      )
      ORDER BY mappedpartnerid, userid, ordertime DESC;
    `;

    const result = await request.query(query);

    const summaryRaw = result.recordsets?.[0]?.[0] || {};
    const partnersRaw = result.recordsets?.[1] || [];
    const ordersRaw = result.recordsets?.[2] || [];

    const summary = {
      totalorders: summaryRaw.totalorders || 0,
      totalusers: summaryRaw.totalusers || 0,
      totalpartners: summaryRaw.totalpartners || 0,
      totalitems: summaryRaw.totalitems || 0,
      totalitemqty: summaryRaw.totalitemqty || 0,
      grossitemtotal: summaryRaw.grossitemtotal || 0,
      totaldeliverycharge: summaryRaw.totaldeliverycharge || 0,
      totaltax: summaryRaw.totaltax || 0,
      grandtotal: summaryRaw.grandtotal || 0,
      avgordervalue: summaryRaw.avgordervalue || 0,
      placedorders: summaryRaw.placedorders || 0,
      confirmedorders: summaryRaw.confirmedorders || 0,
      packedorders: summaryRaw.packedorders || 0,
      outfordeliveryorders: summaryRaw.outfordeliveryorders || 0,
      deliveredorders: summaryRaw.deliveredorders || 0,
      cancelledorders: summaryRaw.cancelledorders || 0,
      pendingorders: summaryRaw.pendingorders || 0
    };

    const partnerMap = {};

    partnersRaw.forEach((partner) => {
      const partnerId = partner.mappedpartnerid || 'NO_PARTNER';

      partnerMap[partnerId] = {
        mappedpartnerid: partner.mappedpartnerid,
        partnername: partner.partnername,
        totalorders: partner.totalorders || 0,
        totalusers: partner.totalusers || 0,
        totalamount: partner.totalamount || 0,
        users: []
      };
    });

    ordersRaw.forEach((order) => {
      const partnerId = order.mappedpartnerid || 'NO_PARTNER';

      if (!partnerMap[partnerId]) {
        partnerMap[partnerId] = {
          mappedpartnerid: order.mappedpartnerid,
          partnername: order.partnername || null,
          totalorders: order.partnerordercount || 0,
          totalusers: order.partnerusercount || 0,
          totalamount: order.partnergrandtotal || 0,
          users: []
        };
      }

      let userObj = partnerMap[partnerId].users.find(
        (u) => u.userid === order.userid
      );

      if (!userObj) {
        userObj = {
          userid: order.userid,
          username: order.username,
          userordercount: order.userordercount || 0,
          usergrandtotal: order.usergrandtotal || 0,
          isdailymilkuser: order.isdailymilkuser,
          usersummary: {
            totalorders: order.userordercount || 0,
            totalamount: order.usergrandtotal || 0
          },
          orders: []
        };

        partnerMap[partnerId].users.push(userObj);
      }

      userObj.orders.push({
        productorderid: order.productorderid,
        ordertime: order.ordertime,
        orderdate: order.orderdate,
        orderstatus: order.orderstatus,

        itemtotal: order.itemtotal || 0,
        deliverycharge: order.deliverycharge || 0,
        tax: order.tax || 0,
        ordergrandtotal: order.ordergrandtotal || 0,

        itemcount: order.itemcount || 0,
        itemqty: order.itemqty || 0,

        deliveryaddress: order.deliveryaddress,
        deliverycity: order.deliverycity,
        deliverystate: order.deliverystate,
        deliverypincode: order.deliverypincode,
        latitude: order.latitude,
        longitude: order.longitude,

        orderplaced: order.orderplaced,
        orderconfirmed: order.orderconfirmed,
        orderpacked: order.orderpacked,
        orderoutofdelivery: order.orderoutofdelivery,
        orderdelivered: order.orderdelivered,
        ordercancelled: order.ordercancelled,

        orderplacedtime: order.orderplacedtime,
        orderconfirmedtime: order.orderconfirmedtime,
        orderpackedtime: order.orderpackedtime,
        orderoutofdeliverytime: order.orderoutofdeliverytime,
        orderdeliveredtime: order.orderdeliveredtime,
        ordercancelledtime: order.ordercancelledtime,

        orderdata: order.orderdata,
        partnerpayoutapplicationid: order.partnerpayoutapplicationid,
        partnerpayoutapplicationstatus: order.partnerpayoutapplicationstatus,
        partnerpayoutpaid: order.partnerpayoutpaid,
      });
    });

    const partners = Object.values(partnerMap);

    res.json({
      summary,
      partners,
      orders: ordersRaw
    });
  } catch (err) {
    next(err);
  }
});

router.get('/PayoutOrdersDashboard', async (req, res, next) => {
  try {
    await poolConnect;

    const {
      orderType = 'ALL',
      filterType = 'TODAY',
      fromDate = null,
      toDate = null,
      mappedPartnerId = null
    } = req.query;

    const request = pool.request();

    request.input('OrderType', sql.VarChar(20), orderType);
    request.input('FilterType', sql.VarChar(20), filterType);
    request.input('FromDate', sql.DateTime, fromDate ? new Date(fromDate) : null);
    request.input('ToDate', sql.DateTime, toDate ? new Date(toDate) : null);
    request.input('MappedPartnerId', sql.VarChar(100), mappedPartnerId || null);

    const query = `
      SELECT *
      FROM dbo.fn_GetPayoutOrdersDashboardSummary(
        @OrderType,
        @FilterType,
        @FromDate,
        @ToDate,
        @MappedPartnerId
      );

      SELECT *
      FROM dbo.fn_GetPayoutOrdersPartners(
        @OrderType,
        @FilterType,
        @FromDate,
        @ToDate,
        @MappedPartnerId
      );

      SELECT *
      FROM dbo.fn_GetPayoutOrdersDashboardOrders(
        @OrderType,
        @FilterType,
        @FromDate,
        @ToDate,
        @MappedPartnerId
      )
      ORDER BY mappedpartnerid, userid, ordertime DESC;
    `;

    const result = await request.query(query);


    

    const summaryRaw = result.recordsets?.[0]?.[0] || {};
    const partnersRaw = result.recordsets?.[1] || [];
    const ordersRaw = result.recordsets?.[2] || [];

    const summary = {
      totalorders: summaryRaw.totalorders || 0,
      totalusers: summaryRaw.totalusers || 0,
      totalpartners: summaryRaw.totalpartners || 0,
      totalitems: summaryRaw.totalitems || 0,
      totalitemqty: summaryRaw.totalitemqty || 0,
      grossitemtotal: summaryRaw.grossitemtotal || 0,
      totaldeliverycharge: summaryRaw.totaldeliverycharge || 0,
      totaltax: summaryRaw.totaltax || 0,
      grandtotal: summaryRaw.grandtotal || 0,
      avgordervalue: summaryRaw.avgordervalue || 0,
      placedorders: summaryRaw.placedorders || 0,
      confirmedorders: summaryRaw.confirmedorders || 0,
      packedorders: summaryRaw.packedorders || 0,
      outfordeliveryorders: summaryRaw.outfordeliveryorders || 0,
      deliveredorders: summaryRaw.deliveredorders || 0,
      cancelledorders: summaryRaw.cancelledorders || 0,
      pendingorders: summaryRaw.pendingorders || 0
    };

    const partnerMap = {};

    partnersRaw.forEach((partner) => {
      const partnerId = partner.mappedpartnerid || 'NO_PARTNER';

      partnerMap[partnerId] = {
        mappedpartnerid: partner.mappedpartnerid,
        partnername: partner.partnername,
        totalorders: partner.totalorders || 0,
        totalusers: partner.totalusers || 0,
        totalamount: partner.totalamount || 0,
        users: []
      };
    });

    ordersRaw.forEach((order) => {
      const partnerId = order.mappedpartnerid || 'NO_PARTNER';

      if (!partnerMap[partnerId]) {
        partnerMap[partnerId] = {
          mappedpartnerid: order.mappedpartnerid,
          partnername: order.partnername || null,
          totalorders: order.partnerordercount || 0,
          totalusers: order.partnerusercount || 0,
          totalamount: order.partnergrandtotal || 0,
          users: []
        };
      }

      let userObj = partnerMap[partnerId].users.find(
        (u) => u.userid === order.userid
      );

      if (!userObj) {
        userObj = {
          userid: order.userid,
          username: order.username,
          userordercount: order.userordercount || 0,
          usergrandtotal: order.usergrandtotal || 0,
          isdailymilkuser: order.isdailymilkuser,
          usersummary: {
            totalorders: order.userordercount || 0,
            totalamount: order.usergrandtotal || 0
          },
          orders: []
        };

        partnerMap[partnerId].users.push(userObj);
      }

      userObj.orders.push({
        productorderid: order.productorderid,
        ordertime: order.ordertime,
        orderdate: order.orderdate,
        orderstatus: order.orderstatus,

        itemtotal: order.itemtotal || 0,
        deliverycharge: order.deliverycharge || 0,
        tax: order.tax || 0,
        ordergrandtotal: order.ordergrandtotal || 0,

        itemcount: order.itemcount || 0,
        itemqty: order.itemqty || 0,

        deliveryaddress: order.deliveryaddress,
        deliverycity: order.deliverycity,
        deliverystate: order.deliverystate,
        deliverypincode: order.deliverypincode,
        latitude: order.latitude,
        longitude: order.longitude,

        orderplaced: order.orderplaced,
        orderconfirmed: order.orderconfirmed,
        orderpacked: order.orderpacked,
        orderoutofdelivery: order.orderoutofdelivery,
        orderdelivered: order.orderdelivered,
        ordercancelled: order.ordercancelled,

        orderplacedtime: order.orderplacedtime,
        orderconfirmedtime: order.orderconfirmedtime,
        orderpackedtime: order.orderpackedtime,
        orderoutofdeliverytime: order.orderoutofdeliverytime,
        orderdeliveredtime: order.orderdeliveredtime,
        ordercancelledtime: order.ordercancelledtime,

        orderdata: order.orderdata,
        partnerpayoutapplicationid: order.partnerpayoutapplicationid,
        partnerpayoutapplicationstatus: order.partnerpayoutapplicationstatus,
        partnerpayoutpaid: order.partnerpayoutpaid,
      });
    });

    const partners = Object.values(partnerMap);

    res.json({
      summary,
      partners,
      orders: ordersRaw
    });
  } catch (err) {
    next(err);
  }
});


router.get('/all-combined', async (req, res, next) => {
  try {
    await poolConnect;

    const kitchenId = req.query.kitchenId || null;

    const result = await pool.request()
      .input('UserId', sql.VarChar(64), null)
      .input('OrderFrom', sql.DateTime2, null)
      .input('OrderTo', sql.DateTime2, null)
      .input('KitchenId', sql.VarChar(64), kitchenId)
      .execute('dbo.usp_get_all_orders_combined_all3');

    res.json({ Response: result.recordset || [] });
  } catch (err) {
    next(err);
  }
});

router.get('/all-combined/user/:userid', async (req, res, next) => {
  try {
    await poolConnect;

    const userid = String(req.params.userid || '').trim();
    const kitchenId = req.query.kitchenId || null;

    const result = await pool.request()
      .input('UserId', sql.VarChar(64), userid)
      .input('OrderFrom', sql.DateTime2, null)
      .input('OrderTo', sql.DateTime2, null)
      .input('KitchenId', sql.VarChar(64), kitchenId)
      .execute('dbo.usp_get_all_orders_combined_all3');

    res.json({ Response: result.recordset || [] });
  } catch (err) {
    next(err);
  }
});

router.get('/orders_with_dailymilk', async (req, res, next) => {
  try {
    await poolConnect;
    const request = pool.request();

    // Run both queries in parallel
    const [dailyMilkResult, ordersResult] = await Promise.all([
      request.query("SELECT * FROM fn_get_today_dailymilk_deliveries()"),
      request.execute("sp_get_all_orders")
    ]);

    // Extract data
    const dailyMilk = dailyMilkResult.recordset || [];
    const orders = ordersResult.recordset || [];

    // Combine results into a single list
    const combined = [...dailyMilk, ...orders];

    // Return JSON
    res.json({ Response: combined });

  } catch (err) {
    next(err);
  }
});


router.get('/pending_orders_with_dailymilk', async (req, res, next) => {
  try {
    await poolConnect;
    const request = pool.request();

    // Run both queries in parallel
    const [dailyMilkResult, ordersResult] = await Promise.all([
      request.query("SELECT * FROM fn_get_today_dailymilk_deliveries()"),
      request.execute("sp_get_all_orders")
    ]);

    // Extract data
    const dailyMilk = dailyMilkResult.recordset || [];
    const orders = ordersResult.recordset || [];

    // Combine results into a single list
    const combined = [...dailyMilk, ...orders];

    // Return JSON
    res.json({ Response: combined });

  } catch (err) {
    next(err);
  }
});


router.post('/get_orderid_partner_date', async (req, res, next) => {
  try {

    const mappedpartnerid = req.body.mappedpartnerid;
    const date = req.body.orderdate;
    console.log("Mapped Partner ID:", mappedpartnerid);
    console.log("Order Date:", date);

    await poolConnect
    const result = await pool.request()
      .input("mappedpartnerid", sql.VarChar(sql.MAX), mappedpartnerid)
      .input("date", sql.Date, date)
      //     .query(
      //       `
      // select count(transid)+1 as newordernumber from tbl_dailymilkstatus where mappedpartnerid=@mappedpartnerid and date =@date
      //       `
      //     )
      .query(
        `
SELECT 
    (SELECT COUNT(transid) 
     FROM tbl_dailymilkstatus
     WHERE mappedpartnerid = @mappedpartnerid
       AND [date] = @date)
    +
    (SELECT COUNT(productorderid)
     FROM tbl_product_orders
     WHERE isdailymilkuser = 1
       AND mappedpartnerid = @mappedpartnerid
       AND DATEADD(day, 1, CONVERT(date, ordertime)) = @date)
    + 1  AS newordernumber;
      `
      )

    console.log("Result:", result);

    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// GET Product Order by orderid
router.get('/:orderid', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('productorderid', sql.VarChar(sql.MAX), req.params.orderid)
      .query('SELECT * FROM tbl_product_orders WHERE productorderid = @productorderid;');
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});


router.get('/demo-daily-milk/:userid', async (req, res, next) => {
  try {

    // Basic Input Validation
    if (!req.params.userid) {
      return res.status(400).json({
        message: "Missing required fields. Please provide userid."
      });
    }

    const resultsearch = await pool
      .request()


      .input('userid', sql.VarChar(sql.MAX), req.params.userid)
      .query(
        "SELECT * FROM tbl_product_orders WHERE userid = @userid and isdailymilkuser = 2;"

      );




    res.status(201).json({
      message: "Fetched the Daily Milk Demo Order.",
      Response: resultsearch.recordset
    });

  } catch (err) {
    console.error("Error fetching Daily Milk Demo Order:", err);
    next(err);
  }
});

// GET Orders by User ID

router.get('/user/:userid', async (req, res, next) => {
  try {
    await poolConnect;
    const request = pool.request();

    const userid = String(req.params.userid || '').trim();

    // Run both queries in parallel
    const [dailyMilkResult, ordersResult] = await Promise.all([
      request.query("SELECT * FROM fn_get_today_dailymilk_deliveries()"),
      request.execute("sp_get_all_orders")
    ]);

    // Extract data
    const dailyMilk = dailyMilkResult.recordset || [];
    const orders = ordersResult.recordset || [];

    // Combine results
    let combined = [...dailyMilk, ...orders];

    // 🔥 FILTER BY USERID
    combined = combined.filter(item =>
      String(item.userid).toLowerCase() === userid.toLowerCase() &&
      item.orderoutofdelivery === 1 &&
      (item.orderdelivered === null || item.orderdelivered === 0)
    );

    // Return JSON
    res.json({ Response: combined });

  } catch (err) {
    next(err);
  }
});


router.get('/user_orders_history/:userid', async (req, res, next) => {
  try {
    await poolConnect;
    const request = pool.request();

    const userid = String(req.params.userid || '').trim();
    const filter = String(req.query.filter || 'all').trim().toLowerCase();

    let orderFrom = null;
    let orderTo = null;

    const now = new Date();

    const startOfDay = (d) => {
      const x = new Date(d);
      x.setHours(0, 0, 0, 0);
      return x;
    };

    const addDays = (d, days) => {
      const x = new Date(d);
      x.setDate(x.getDate() + days);
      return x;
    };

    const startOfMonth = (d) => {
      return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
    };

    const startOfYear = (d) => {
      return new Date(d.getFullYear(), 0, 1, 0, 0, 0, 0);
    };

    const startOfWeek = (d) => {
      const x = startOfDay(d);
      const day = x.getDay(); // 0 = Sunday
      const diff = day === 0 ? -6 : 1 - day; // Monday start
      x.setDate(x.getDate() + diff);
      return x;
    };

    switch (filter) {
      case 'today':
        orderFrom = startOfDay(now);
        orderTo = addDays(orderFrom, 1);
        break;

      case 'yesterday':
        orderTo = startOfDay(now);
        orderFrom = addDays(orderTo, -1);
        break;

      case 'week':
        orderFrom = startOfWeek(now);
        orderTo = addDays(startOfDay(now), 1);
        break;

      case 'month':
        orderFrom = startOfMonth(now);
        orderTo = addDays(startOfDay(now), 1);
        break;

      case 'year':
        orderFrom = startOfYear(now);
        orderTo = addDays(startOfDay(now), 1);
        break;

      case 'all':
      default:
        break;
    }

    request.input('UserId', userid);
    request.input('OrderFrom', orderFrom);
    request.input('OrderTo', orderTo);

    const ordersResult = await request.execute('sp_get_all_orders');

    const orders = ordersResult.recordset || [];

    res.json({ Response: orders });
  } catch (err) {
    next(err);
  }
});

router.get('/user_orders_history_bak_0201/:userid', async (req, res, next) => {
  try {
    await poolConnect;
    const request = pool.request();

    const userid = String(req.params.userid || '').trim();

    // Run both queries in parallel
    const [dailyMilkResult, ordersResult] = await Promise.all([
      request.query("SELECT * FROM fn_get_today_dailymilk_deliveries()"),
      request.execute("sp_get_all_orders")
    ]);

    // Extract data
    const dailyMilk = dailyMilkResult.recordset || [];
    const orders = ordersResult.recordset || [];

    // Combine results
    let combined = [...dailyMilk, ...orders];

    // 🔥 FILTER BY USERID
    combined = combined.filter(item =>
      String(item.userid).toLowerCase() === userid.toLowerCase()

    );

    // Return JSON
    res.json({ Response: combined });

  } catch (err) {
    next(err);
  }
});



router.get('/user_old/:userid', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      // .input('userid', sql.VarChar(sql.MAX), req.params.userid)
      // .query('SELECT * FROM tbl_product_orders WHERE userid = @userid ORDER BY rcm DESC;');
      .input('UserId', sql.VarChar(64), String(req.params.userid || '').trim())
      // Optional date filters (uncomment if you want to support ?from= & ?to=)
      // .input('OrderFrom', sql.DateTime2, req.query.from ? new Date(req.query.from) : null)
      // .input('OrderTo',   sql.DateTime2, req.query.to   ? new Date(req.query.to)   : null)
      .execute('dbo.usp_get_all_orders_with_dailymilk');
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// GET Orders by Status
router.get('/status/:orderstatus', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('orderstatus', sql.VarChar(sql.MAX), req.params.orderstatus)
      .query('SELECT * FROM tbl_product_orders WHERE orderstatus = @orderstatus ORDER BY rcm DESC;');
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// GET Order with Details (Complete Order Information)
router.get('/complete/:orderid', async (req, res, next) => {
  try {
    await poolConnect;

    // Get order information
    const orderResult = await pool.request()
      .input('productorderid', sql.VarChar(sql.MAX), req.params.orderid)
      .query('SELECT * FROM tbl_product_orders WHERE productorderid = @productorderid;');

    if (orderResult.recordset.length === 0) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    // Get order details
    const detailsResult = await pool.request()
      .input('productorderid', sql.VarChar(sql.MAX), req.params.orderid)
      .query('SELECT * FROM tbl_product_order_details WHERE productorderid = @productorderid;');

    const orderWithDetails = {
      ...orderResult.recordset[0],
      orderDetails: detailsResult.recordset
    };

    res.json({ Response: orderWithDetails });
  } catch (err) {
    next(err);
  }
});

// GET Orders by Date Range
router.get('/daterange/:startdate/:enddate', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('startdate', sql.DateTime, new Date(req.params.startdate))
      .input('enddate', sql.DateTime, new Date(req.params.enddate))
      .query(`SELECT * FROM tbl_product_orders 
              WHERE ordertime >= @startdate AND ordertime <= @enddate 
              ORDER BY rcm DESC;`);
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

router.post('/demo-daily-milk', async (req, res, next) => {
  try {
    const {
      productorderid,
      userid,
      name,
      isdailymilkuser,
      mappedpartnerid,
      itemtotal,
      deliverycharge,
      tax,
      deliveryaddress,
      deliverycity,
      deliverystate,
      deliverypincode,
      latitude,
      longitude,
      orderstatus,
      orderplaced,
      orderplacedby,
      orderdata,
      rcu
    } = req.body;

    // Basic Input Validation
    if (!productorderid || !userid || !rcu) {
      return res.status(400).json({
        message: "Missing required fields. Please provide productorderid, userid, and rcu."
      });
    }

    const resultsearch = await pool
      .request()


      .input('userid', sql.VarChar(sql.MAX), userid)
      .query(
        "SELECT * FROM tbl_product_orders WHERE userid = @userid and isdailymilkuser = 2;"

      );
    if (resultsearch.recordset.length > 0) {
      return res.status(404).json({ message: 'Demo Daily Milk has already been created for this user.' });
    }


    await poolConnect;
    const result = await pool.request()
      .input('productorderid', sql.VarChar(sql.MAX), productorderid)
      .input('userid', sql.VarChar(sql.MAX), userid)
      .input('name', sql.VarChar(sql.MAX), name || null)
      .input('isdailymilkuser', sql.Int, isdailymilkuser || 0)
      .input('mappedpartnerid', sql.VarChar(sql.MAX), mappedpartnerid || null)
      .input('itemtotal', sql.Float, itemtotal || 0)
      .input('deliverycharge', sql.Float, deliverycharge || 0)
      .input('tax', sql.Float, tax || 0)
      .input('deliveryaddress', sql.VarChar(sql.MAX), deliveryaddress || null)
      .input('deliverycity', sql.VarChar(sql.MAX), deliverycity || null)
      .input('deliverystate', sql.VarChar(sql.MAX), deliverystate || null)
      .input('deliverypincode', sql.VarChar(sql.MAX), deliverypincode || null)
      .input('latitude', sql.VarChar(sql.MAX), latitude || null)
      .input('longitude', sql.VarChar(sql.MAX), longitude || null)
      .input('orderstatus', sql.VarChar(sql.MAX), orderstatus || 'Pending')
      .input('orderplaced', sql.Int, orderplaced || 1)
      .input('orderplacedby', sql.VarChar(sql.MAX), orderplacedby || null)
      .input('orderdata', sql.VarChar(sql.MAX), orderdata || null)
      .input('rcu', sql.VarChar(sql.MAX), rcu)
      .query(`
        INSERT INTO tbl_product_orders
          (productorderid, userid, name, isdailymilkuser, mappedpartnerid, itemtotal, 
           deliverycharge, tax, deliveryaddress, deliverycity, deliverystate, deliverypincode,
           latitude, longitude, orderstatus, orderplaced, orderplacedby, rcu, orderdata)
        OUTPUT INSERTED.*
        VALUES
          (@productorderid, @userid, @name, @isdailymilkuser, @mappedpartnerid, @itemtotal,
           @deliverycharge, @tax, @deliveryaddress, @deliverycity, @deliverystate, @deliverypincode,
           @latitude, @longitude, @orderstatus, @orderplaced, @orderplacedby, @rcu, @orderdata);
      `);

    res.status(201).json({
      message: "Daily Milk Demo Order Created successfully.",
      order: result.recordset[0]
    });

  } catch (err) {
    console.error("Error creating Daily Milk Demo Order:", err);
    next(err);
  }
});

// POST - Create new Product Order
router.post('/', async (req, res, next) => {
  try {
    const {
      productorderid,
      userid,
      name,
      isdailymilkuser,
      mappedpartnerid,
      itemtotal,
      deliverycharge,
      tax,
      deliveryaddress,
      deliverycity,
      deliverystate,
      deliverypincode,
      latitude,
      longitude,
      orderstatus,
      orderplaced,
      orderplacedby,
      orderdata,
      rcu
    } = req.body;

    // Basic Input Validation
    if (!productorderid || !userid || !rcu) {
      return res.status(400).json({
        message: "Missing required fields. Please provide productorderid, userid, and rcu."
      });
    }

    await poolConnect;



    const res_address = await pool.request()
      .input('deliveryaddress', sql.VarChar(sql.MAX), deliveryaddress || null)
      .input('deliverycity', sql.VarChar(sql.MAX), deliverycity || null)
      .input('deliverystate', sql.VarChar(sql.MAX), deliverystate || null)
      .input('deliverypincode', sql.VarChar(sql.MAX), deliverypincode || null)
      .input('latitude', sql.VarChar(sql.MAX), latitude || null)
      .input('longitude', sql.VarChar(sql.MAX), longitude || null)
      .input('transid', sql.VarChar(sql.MAX), userid || null)
      .input('luu', sql.VarChar(sql.MAX), userid || null)
      .query(`
        update tbl_user set latitude=@latitude,longitude=@longitude,deliveryaddress=@deliveryaddress,deliverycity=@deliverycity,deliverystate=@deliverystate,deliverypincode=@deliverypincode
        ,luu=@luu, lum = DATEADD(MINUTE, 330, GETUTCDATE()) where transid = @transid
        `);



    const result = await pool.request()
      .input('productorderid', sql.VarChar(sql.MAX), productorderid)
      .input('userid', sql.VarChar(sql.MAX), userid)
      .input('name', sql.VarChar(sql.MAX), name || null)
      .input('isdailymilkuser', sql.Int, isdailymilkuser || 0)
      .input('mappedpartnerid', sql.VarChar(sql.MAX), mappedpartnerid || null)
      .input('itemtotal', sql.Float, itemtotal || 0)
      .input('deliverycharge', sql.Float, deliverycharge || 0)
      .input('tax', sql.Float, tax || 0)
      .input('deliveryaddress', sql.VarChar(sql.MAX), deliveryaddress || null)
      .input('deliverycity', sql.VarChar(sql.MAX), deliverycity || null)
      .input('deliverystate', sql.VarChar(sql.MAX), deliverystate || null)
      .input('deliverypincode', sql.VarChar(sql.MAX), deliverypincode || null)
      .input('latitude', sql.VarChar(sql.MAX), latitude || null)
      .input('longitude', sql.VarChar(sql.MAX), longitude || null)
      .input('orderstatus', sql.VarChar(sql.MAX), orderstatus || 'Pending')
      .input('orderplaced', sql.Int, orderplaced || 1)
      .input('orderplacedby', sql.VarChar(sql.MAX), orderplacedby || null)
      .input('orderdata', sql.VarChar(sql.MAX), orderdata || null)
      .input('rcu', sql.VarChar(sql.MAX), rcu)
      .query(`
        INSERT INTO tbl_product_orders
          (productorderid, userid, name, isdailymilkuser, mappedpartnerid, itemtotal, 
           deliverycharge, tax, deliveryaddress, deliverycity, deliverystate, deliverypincode,
           latitude, longitude, orderstatus, orderplaced, orderplacedby, rcu, orderdata)
        OUTPUT INSERTED.*
        VALUES
          (@productorderid, @userid, @name, @isdailymilkuser, @mappedpartnerid, @itemtotal,
           @deliverycharge, @tax, @deliveryaddress, @deliverycity, @deliverystate, @deliverypincode,
           @latitude, @longitude, @orderstatus, @orderplaced, @orderplacedby, @rcu, @orderdata);
      `);

    res.status(201).json({
      message: "Product order created successfully.",
      order: result.recordset[0]
    });

  } catch (err) {
    console.error("Error creating product order:", err);
    next(err);
  }
});

// PUT - Update Order Status
router.put('/status', async (req, res, next) => {
  try {
    const { productorderid, orderstatus, luu } = req.body;

    if (!productorderid || !orderstatus || !luu) {
      return res.status(400).json({
        message: 'Product Order ID, order status, and luu are required.'
      });
    }

    await poolConnect;
    const result = await pool.request()
      .input('productorderid', sql.VarChar(sql.MAX), productorderid)
      .input('orderstatus', sql.VarChar(sql.MAX), orderstatus)
      .input('luu', sql.VarChar(sql.MAX), luu)
      .query(`
        UPDATE tbl_product_orders
        SET orderstatus = @orderstatus, luu = @luu, lum = DATEADD(MINUTE, 330, GETUTCDATE())
        WHERE productorderid = @productorderid;
        SELECT @@ROWCOUNT AS affected;
      `);

    if (result.recordset[0].affected === 0) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    res.json({
      message: `Order status updated to ${orderstatus} successfully.`
    });

  } catch (err) {
    console.error("Error updating order status:", err);
    next(err);
  }
});

// PUT - Confirm Order
router.put('/confirm', async (req, res, next) => {
  try {
    const { productorderid, orderconfirmedby, luu } = req.body;

    if (!productorderid || !orderconfirmedby || !luu) {
      return res.status(400).json({
        message: 'Product Order ID, confirmed by, and luu are required.'
      });
    }

    await poolConnect;
    const result = await pool.request()
      .input('productorderid', sql.VarChar(sql.MAX), productorderid)
      .input('orderconfirmedby', sql.VarChar(sql.MAX), orderconfirmedby)
      .input('luu', sql.VarChar(sql.MAX), luu)
      .query(`
        UPDATE tbl_product_orders
        SET orderconfirmed = 1, orderconfirmedby = @orderconfirmedby, 
            orderconfirmedtime = DATEADD(MINUTE, 330, GETUTCDATE()), orderstatus = 'Confirmed',
            luu = @luu, lum = DATEADD(MINUTE, 330, GETUTCDATE())
        WHERE productorderid = @productorderid;
        SELECT @@ROWCOUNT AS affected;
      `);


    // console.log("Confirm Order Result:", result);
    // console.log(`
    //   UPDATE tbl_product_orders
    //   SET orderconfirmed = 1, orderconfirmedby = @orderconfirmedby, 
    //       orderconfirmedtime = DATEADD(MINUTE, 330, GETUTCDATE()), orderstatus = 'Confirmed',
    //       luu = @luu, lum = DATEADD(MINUTE, 330, GETUTCDATE())
    //   WHERE productorderid = @productorderid;
    //   SELECT @@ROWCOUNT AS affected;
    // `)

    if (result.recordset[0].affected === 0) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    res.json({ message: 'Order confirmed successfully.' });

  } catch (err) {
    console.error("Error confirming order:", err);
    next(err);
  }
});

// PUT - Pack Order
router.put('/pack', async (req, res, next) => {
  try {
    const { productorderid, orderpackedby, luu } = req.body;

    if (!productorderid || !orderpackedby || !luu) {
      return res.status(400).json({
        message: 'Product Order ID, packed by, and luu are required.'
      });
    }

    await poolConnect;
    const result = await pool.request()
      .input('productorderid', sql.VarChar(sql.MAX), productorderid)
      .input('orderpackedby', sql.VarChar(sql.MAX), orderpackedby)
      .input('luu', sql.VarChar(sql.MAX), luu)
      .query(`
        UPDATE tbl_product_orders
        SET orderpacked = 1, orderpackedby = @orderpackedby, 
            orderpackedtime = DATEADD(MINUTE, 330, GETUTCDATE()), orderstatus = 'Packed',
            luu = @luu, lum = DATEADD(MINUTE, 330, GETUTCDATE())
        WHERE productorderid = @productorderid;
        SELECT @@ROWCOUNT AS affected;
      `);

    if (result.recordset[0].affected === 0) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    res.json({ message: 'Order packed successfully.' });

  } catch (err) {
    console.error("Error packing order:", err);
    next(err);
  }
    await poolConnect;
    const result = await pool.request()
      .input('productorderid', sql.VarChar(sql.MAX), productorderid)
      .input('orderdeliveredby', sql.VarChar(sql.MAX), orderdeliveredby)
      .input('luu', sql.VarChar(sql.MAX), luu)
      .query(`
        UPDATE tbl_product_orders
        SET orderdelivered = 1, orderdeliveredby = @orderdeliveredby, 
            orderdeliveredtime = DATEADD(MINUTE, 330, GETUTCDATE()), orderstatus = 'Delivered',
            luu = @luu, lum = DATEADD(MINUTE, 330, GETUTCDATE())
        WHERE productorderid = @productorderid;
        SELECT @@ROWCOUNT AS affected;
      `);
});

// PUT - Out for Delivery
router.put('/outfordelivery', async (req, res, next) => {
  try {
    const { productorderid, orderoutofdeliveryby, luu } = req.body;

    if (!productorderid || !orderoutofdeliveryby || !luu) {
      return res.status(400).json({
        message: 'Product Order ID, out for delivery by, and luu are required.'
      });
    }

    await poolConnect;
    const result = await pool.request()
      .input('productorderid', sql.VarChar(sql.MAX), productorderid)
      .input('orderoutofdeliveryby', sql.VarChar(sql.MAX), orderoutofdeliveryby)
      .input('luu', sql.VarChar(sql.MAX), luu)
      .query(`
        UPDATE tbl_product_orders
        SET orderoutofdelivery = 1, orderoutofdeliveryby = @orderoutofdeliveryby, 
            orderoutofdeliverytime = DATEADD(MINUTE, 330, GETUTCDATE()), orderstatus = 'Out for Delivery',
            luu = @luu, lum = DATEADD(MINUTE, 330, GETUTCDATE())
        WHERE productorderid = @productorderid;
        SELECT @@ROWCOUNT AS affected;
      `);

    if (result.recordset[0].affected === 0) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    res.json({ message: 'Order marked as out for delivery successfully.' });

  } catch (err) {
    console.error("Error updating order delivery status:", err);
    next(err);
  }
});

// PUT - Deliver Order
// router.put('/deliver', async (req, res, next) => {
//   try {
//     const { productorderid, orderdeliveredby, luu } = req.body;

//     if (!productorderid || !orderdeliveredby || !luu) {
//       return res.status(400).json({
//         message: 'Product Order ID, delivered by, and luu are required.'
//       });
//     }


//     if (result.recordset[0].affected === 0) {
//       return res.status(404).json({ message: 'Order not found.' });
//     }

//     res.json({ message: 'Order delivered successfully.' });

//   } catch (err) {
//     console.error("Error delivering order:", err);
//     next(err);
//   }
// });

// PUT - Deliver Order
router.put('/deliver', async (req, res, next) => {
  try {
    const { productorderid, orderdeliveredby, luu } = req.body;

    if (!productorderid || !orderdeliveredby || !luu) {
      return res.status(400).json({
        message: 'Product Order ID, delivered by, and luu are required.'
      });
    }

    await poolConnect;
    const result = await pool.request()
      .input('productorderid', sql.VarChar(sql.MAX), productorderid)
      .input('orderdeliveredby', sql.VarChar(sql.MAX), orderdeliveredby)
      .input('luu', sql.VarChar(sql.MAX), luu)
      .query(`
        UPDATE tbl_product_orders
        SET orderdelivered = 1,
            orderdeliveredby = @orderdeliveredby,
            orderdeliveredtime = DATEADD(MINUTE, 330, GETUTCDATE()),
            orderstatus = 'Delivered',
            luu = @luu,
            lum = DATEADD(MINUTE, 330, GETUTCDATE())
        WHERE productorderid = @productorderid;

        SELECT @@ROWCOUNT AS affected;
      `);

    if (result.recordset[0].affected === 0) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    res.json({ message: 'Order delivered successfully.' });

  } catch (err) {
    console.error('Error delivering order:', err);
    next(err);
  }
});

// PUT - Cancel Order
router.put('/cancel', async (req, res, next) => {
  try {
    const { productorderid, ordercalcelledby, ordercancelledreason, luu } = req.body;

    if (!productorderid || !ordercalcelledby || !luu) {
      return res.status(400).json({
        message: 'Product Order ID, cancelled by, and luu are required.'
      });
    }

    await poolConnect;
    const result = await pool.request()
      .input('productorderid', sql.VarChar(sql.MAX), productorderid)
      .input('ordercalcelledby', sql.VarChar(sql.MAX), ordercalcelledby)
      .input('ordercancelledreason', sql.VarChar(sql.MAX), ordercancelledreason || null)
      .input('luu', sql.VarChar(sql.MAX), luu)
      .query(`
        UPDATE tbl_product_orders
        SET ordercancelled = 1, ordercalcelledby = @ordercalcelledby, 
            ordercancelledtime = DATEADD(MINUTE, 330, GETUTCDATE()), ordercancelledreason = @ordercancelledreason,
            orderstatus = 'Cancelled', luu = @luu, lum = DATEADD(MINUTE, 330, GETUTCDATE())
        WHERE productorderid = @productorderid;
        SELECT @@ROWCOUNT AS affected;
      `);

    if (result.recordset[0].affected === 0) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    res.json({ message: 'Order cancelled successfully.' });

  } catch (err) {
    console.error("Error cancelling order:", err);
    next(err);
  }
});

// PUT - Update Order (General Update)
router.put('/', async (req, res, next) => {
  try {
    const productorderid = req.body.productorderid;

    if (!productorderid) {
      return res.status(400).json({ message: 'Product Order ID is required.' });
    }

    const allowedFields = [
      'userid', 'name', 'isdailymilkuser', 'mappedpartnerid', 'itemtotal',
      'deliverycharge', 'tax', 'deliveryaddress', 'deliverycity', 'deliverystate',
      'deliverypincode', 'latitude', 'longitude', 'orderstatus', 'luu'
    ];

    const updates = [];
    const request = pool.request();

    request.input('productorderid', sql.VarChar(sql.MAX), productorderid);

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = @${field}`);

        switch (field) {
          case 'isdailymilkuser':
          case 'orderplaced':
          case 'orderconfirmed':
          case 'orderpacked':
          case 'orderoutofdelivery':
          case 'orderdelivered':
          case 'ordercancelled':
            request.input(field, sql.Int, req.body[field]);
            break;
          case 'itemtotal':
          case 'deliverycharge':
          case 'tax':
            request.input(field, sql.Float, req.body[field]);
            break;
          default:
            request.input(field, sql.VarChar(sql.MAX), req.body[field]);
        }
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No valid fields provided to update.' });
    }

    const setClause = updates.join(', ') + ', lum = DATEADD(MINUTE, 330, GETUTCDATE())';

    await poolConnect;
    const result = await request.query(`
        UPDATE tbl_product_orders
        SET ${setClause}
        WHERE productorderid = @productorderid;
        SELECT @@ROWCOUNT AS affected;
    `);

    if (result.recordset[0].affected === 0) {
      return res.status(404).json({ message: 'Order not found with the provided ID.' });
    }

    res.json({ message: 'Order updated successfully.' });

  } catch (err) {
    console.error("Error updating order:", err);
    next(err);
  }
});

// DELETE - Delete Order (Soft delete by cancellation)
router.delete('/', async (req, res, next) => {
  try {
    const { productorderid, ordercalcelledby, ordercancelledreason, luu } = req.body;

    if (!productorderid || !ordercalcelledby || !luu) {
      return res.status(400).json({
        message: 'Product Order ID, cancelled by, and luu are required.'
      });
    }

    await poolConnect;
    const result = await pool.request()
      .input('productorderid', sql.VarChar(sql.MAX), productorderid)
      .input('ordercalcelledby', sql.VarChar(sql.MAX), ordercalcelledby)
      .input('ordercancelledreason', sql.VarChar(sql.MAX), ordercancelledreason || 'Deleted')
      .input('luu', sql.VarChar(sql.MAX), luu)
      .query(`
        UPDATE tbl_product_orders
        SET ordercancelled = 1, ordercalcelledby = @ordercalcelledby, 
            ordercancelledtime = DATEADD(MINUTE, 330, GETUTCDATE()), ordercancelledreason = @ordercancelledreason,
            orderstatus = 'Cancelled', luu = @luu, lum = DATEADD(MINUTE, 330, GETUTCDATE())
        WHERE productorderid = @productorderid;
        SELECT @@ROWCOUNT AS affected;
      `);

    if (result.recordset[0].affected === 0) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    res.json({ message: 'Order deleted (cancelled) successfully.' });

  } catch (err) {
    console.error("Error deleting order:", err);
    next(err);
  }
});

// DELETE - Hard delete order (permanent deletion)
router.delete('/permanent', async (req, res, next) => {
  try {
    const { productorderid } = req.body;

    if (!productorderid) {
      return res.status(400).json({ message: 'Product Order ID is required.' });
    }

    await poolConnect;

    // Delete order details first (foreign key constraint)
    await pool.request()
      .input('productorderid', sql.VarChar(sql.MAX), productorderid)
      .query('DELETE FROM tbl_product_order_details WHERE productorderid = @productorderid;');

    // Delete main order
    const result = await pool.request()
      .input('productorderid', sql.VarChar(sql.MAX), productorderid)
      .query(`
        DELETE FROM tbl_product_orders
        WHERE productorderid = @productorderid;
        SELECT @@ROWCOUNT AS affected;
      `);

    if (result.recordset[0].affected === 0) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    res.json({ message: 'Order and its details deleted permanently.' });

  } catch (err) {
    console.error("Error deleting order permanently:", err);
    next(err);
  }
});

// SEARCH orders by customer name or address
router.get('/search/:searchterm', async (req, res, next) => {
  try {
    await poolConnect;
    const searchTerm = `%${req.params.searchterm}%`;
    const result = await pool.request()
      .input('searchTerm', sql.NVarChar, searchTerm)
      .query(`SELECT * FROM tbl_product_orders 
              WHERE (name LIKE @searchTerm 
                 OR deliveryaddress LIKE @searchTerm
                 OR deliverycity LIKE @searchTerm
                 OR productorderid LIKE @searchTerm) 
              ORDER BY rcm DESC;`);
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

module.exports = router;