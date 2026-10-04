const express = require('express');
const router = express.Router();
const { pool, poolConnect, sql } = require('../../config/db_dearbasket');

// GET all DailyMilkProducts
router.get('/', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .query('SELECT * FROM tbl_dailymilkbooking;');
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});
router.get('/with-delivery-type', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .query(`SELECT 
    a.transid,
    a.bookingid,
    a.dailymilkregistrationid,
    a.userid,
    a.productid,
    a.productname,
    a.price,
    a.quantity,
    a.bookingstartdate,
    a.bookingenddate,
    a.status,
    a.payment_status,
    a.payment_mode,
    a.totalamount,
    a.paidamount,
    a.mappedpartnerid,
    
    -- Custom value instead of deliverytype
    coalesce( b.milkdeliverytype,'Not Configured') AS deliverytype

FROM tbl_dailymilkbooking a inner join tbl_user b on a.userid = b.transid 
`);
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});


router.get('/active-bookings', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .query(`SELECT *
FROM tbl_dailymilkbooking
WHERE bookingenddate >= (SYSDATETIMEOFFSET() AT TIME ZONE 'India Standard Time')
  AND bookingstartdate <= (SYSDATETIMEOFFSET() AT TIME ZONE 'India Standard Time')
ORDER BY rcm DESC;`);
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

router.get('/DailyMilkApproval', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .query(`
        SELECT 
          a.productname,
          a.price,
          a.quantity,
          a.deliverytype,
          a.bookingstartdate,
          a.bookingenddate,
          a.status,
          a.payment_status,
          a.payment_mode,
          a.totalamount,
          a.paidamount,
          a.payment_time,
          b.transid,
          b.userid,
          b.name,
          b.dob,
          b.address,
          b.mobile,
          b.latitude,
          b.longitude,
          b.familymembers,
          a.rcu,
          a.rcm
        FROM tbl_dailymilkbooking a 
        INNER JOIN tbl_dailymilkregistration b 
          ON b.transid = a.dailymilkregistrationid
      `);
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// GET by transid
router.get('/:id', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('transid', sql.VarChar, req.params.id)
      .query('SELECT * FROM tbl_dailymilkbooking WHERE transid = @transid;');
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

router.get('/UserBookings/:id', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('transid', sql.VarChar, req.params.id)
      .query(`
        
SELECT *,
       (
         SELECT COUNT(transid)
         FROM tbl_pregnancyapplications 
         WHERE userid = tbl_dailymilkbooking.userid
           AND benefitsenddate >= GETDATE()
           AND benefitsstartdate <= GETDATE()
           AND applicationstatus = 1
           AND isbenefitsactive = 1
       ) AS pregnancy_status
FROM tbl_dailymilkbooking
WHERE dailymilkregistrationid = @transid
ORDER BY 
    CASE 
        WHEN bookingenddate >= CAST(SYSDATETIMEOFFSET() AT TIME ZONE 'India Standard Time' AS DATE) 
            THEN 1 
        ELSE 2 
    END,
    rcm;
        `)
    // .query('SELECT *,(select count(transid) from tbl_pregnancyapplications where userid = tbl_dailymilkbooking.userid and benefitsenddate >= getdate() and benefitsstartdate <= getdate() and applicationstatus=1 and isbenefitsactive =1) as pregnancy_status FROM  tbl_dailymilkbooking WHERE dailymilkregistrationid = @transid and    bookingenddate >=  CAST(SYSDATETIMEOFFSET() AT TIME ZONE \'India Standard Time\' AS DATE)    order by rcm  ;');
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});



router.get('/GetUserPaymentDetails/:id', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('transid', sql.VarChar, req.params.id)
      .query(`
        WITH payment_rows AS (
          SELECT
            b.transid AS dailymilkstatusid,
            b.bookingid,
            b.dailymilkregistrationid AS orderid,
            b.userid,
            b.productid,
            b.productname,
            b.price,
            b.quantity,
            b.deliverytype,
            b.bookingstartdate,
            b.bookingenddate,
            b.status AS booking_status,
            b.payment_status,
            s.date,
            s.cancelled,
            s.received,
            s.quantity AS booked_quantity,
            COALESCE(s.adjustedquantity, s.quantity) AS payable_quantity,
            COALESCE(s.extra, 0) AS extra,
            COALESCE(s.received, 0) AS received_flag
          FROM tbl_dailymilkbooking b
          LEFT JOIN tbl_dailymilkstatus s ON s.dailymilkbookingid = b.transid
          WHERE b.userid = @transid
        ), totals AS (
          SELECT
            MAX(dailymilkstatusid) AS dailymilkstatusid,
            MAX(bookingid) AS bookingid,
            MAX(orderid) AS orderid,
            MAX(userid) AS userid,
            MAX(productid) AS productid,
            MAX(productname) AS productname,
            MAX(price) AS price,
            MAX(quantity) AS quantity,
            MAX(deliverytype) AS deliverytype,
            MIN(bookingstartdate) AS bookingstartdate,
            MAX(bookingenddate) AS bookingenddate,
            MAX(booking_status) AS booking_status,
            MAX(payment_status) AS payment_status,
            SUM(CASE WHEN cancelled IS NULL THEN payable_quantity ELSE 0 END) AS total_qty,
            SUM(CASE WHEN cancelled IS NULL THEN extra ELSE 0 END) AS total_extra,
            SUM(CASE WHEN cancelled IS NULL THEN payable_quantity * price ELSE 0 END) AS baseamount,
            SUM(CASE WHEN cancelled IS NULL THEN extra * price ELSE 0 END) AS extraamount,
            SUM(CASE WHEN cancelled IS NULL AND received_flag = 1 THEN payable_quantity ELSE 0 END) AS received_quantity,
            SUM(CASE WHEN cancelled IS NULL AND received_flag = 1 THEN extra ELSE 0 END) AS received_extraquantity,
            SUM(CASE WHEN cancelled IS NULL AND received_flag = 1 THEN payable_quantity * price ELSE 0 END) AS received_baseamount,
            SUM(CASE WHEN cancelled IS NULL AND received_flag = 1 THEN extra * price ELSE 0 END) AS received_extraamount
          FROM payment_rows
          GROUP BY dailymilkstatusid
        )
        SELECT *,
          baseamount + extraamount AS fullamount,
          received_baseamount + received_extraamount AS received_fullamount,
          (baseamount + extraamount) - (received_baseamount + received_extraamount) AS balanceamount,
          'Match Found' AS match_status,
          CASE WHEN (baseamount + extraamount) <= (received_baseamount + received_extraamount) THEN 1 ELSE 0 END AS payment_status1
        FROM totals;
      `);
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
      .query("SELECT * FROM tbl_dailymilkbooking WHERE dailymilkregistrationid = @transid;");
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

router.get("/CheckUser1/:id", async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool
      .request()
      .input("transid", sql.VarChar, req.params.id)
      .query("SELECT * FROM tbl_dailymilkbooking WHERE dailymilkregistrationid = @transid;");
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  let transaction;
  try {
    const {
      transid,
      bookingid,
      dailymilkregistrationid,
      userid,
      productid,
      productname,
      price,
      quantity,
      deliverytype,
      bookingstartdate, // 'YYYY-MM-DD'
      bookingenddate,   // 'YYYY-MM-DD'
      // NEW payment fields (all optional on create)
      payment_status,
      payment_mode,
      totalamount,
      paidamount,
      payment_time,     // ISO string or 'YYYY-MM-DD HH:mm:ss'
      rcu,
      renewal
    } = req.body;

    // Basic Input Validation
    if (!bookingid || !userid || !productid || !productname || price === undefined || quantity === undefined || !deliverytype || !bookingstartdate || !bookingenddate || !rcu) {
      return res.status(400).json({
        message: "Missing required fields. Please provide bookingid, userid, productid, productname, price, quantity, deliverytype, bookingstartdate, bookingenddate, and rcu."
      });
    }
    if (isNaN(parseFloat(price)) || isNaN(parseFloat(quantity))) {
      return res.status(400).json({
        message: "Price and Quantity must be valid numbers."
      });
    }

    await poolConnect;

    // fallbacks / coercions for new payment fields
    const computedTotal = (totalamount !== undefined && totalamount !== null)
      ? parseFloat(totalamount)
      : (parseFloat(price) * parseFloat(quantity) * 30);
    const computedPaid = (paidamount !== undefined && paidamount !== null)
      ? parseFloat(paidamount)
      : 0;



    const parseLocalYMD = (value) => {
      if (!value) return null;

      // If already a Date object
      if (value instanceof Date) {
        return new Date(value.getFullYear(), value.getMonth(), value.getDate());
      }

      const str = String(value).trim();

      // Take only date part if ISO string comes in
      const datePart = str.includes("T") ? str.split("T")[0] : str;

      const parts = datePart.split("-");
      if (parts.length !== 3) return null;

      const [y, m, d] = parts.map(Number);

      if (!y || !m || !d) return null;

      return new Date(y, m - 1, d);
    };

    const formatLocalYMD = (dt) => {
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, "0");
      const d = String(dt.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    };

    console.log("booking dates:", bookingstartdate, bookingenddate);



    const startDate = parseLocalYMD(bookingstartdate);
    const endDate = parseLocalYMD(bookingenddate);
    const dayAmount = parseFloat(price) * parseFloat(quantity);

    if (!startDate || isNaN(startDate.getTime())) {
      throw new Error("Invalid bookingstartdate");
    }

    if (!endDate || isNaN(endDate.getTime())) {
      throw new Error("Invalid bookingenddate");
    }

    if (endDate < startDate) {
      throw new Error("bookingenddate cannot be before bookingstartdate");
    }

    const oneDayMs = 24 * 60 * 60 * 1000;
    const totalDays = Math.floor((endDate.getTime() - startDate.getTime()) / oneDayMs) + 1;

    

    transaction = new sql.Transaction(pool);
    await transaction.begin();

    // Insert booking (including new payment columns)
    const bookingRequest = new sql.Request(transaction);
    const bookingResult = await bookingRequest
      .input('transid', transid)
      .input('bookingid', bookingid)
      .input('dailymilkregistrationid', dailymilkregistrationid || null)
      .input('userid', userid)
      .input('productid', productid)
      .input('productname', productname)
      .input('price', price)
      .input('quantity', quantity)
      .input('deliverytype', deliverytype)
      .input('bookingstartdate', sql.Date, bookingstartdate)
      .input('bookingenddate', sql.Date, bookingenddate)
      .input('payment_status', payment_status || null)
      .input('payment_mode', payment_mode || null)
      .input('totalamount', computedTotal)
      .input('paidamount', computedPaid)
      .input('payment_time', payment_time ? new Date(payment_time) : null)
      .input('rcu', rcu)
      .input('renewal', renewal || 0)
      .query(`
        INSERT INTO tbl_dailymilkbooking
          (transid, bookingid, dailymilkregistrationid, userid, productid, productname, price, quantity, deliverytype, bookingstartdate, bookingenddate, payment_status, payment_mode, totalamount, paidamount, payment_time, rcu, status)
        OUTPUT INSERTED.*
        VALUES
          (@transid, @bookingid, @dailymilkregistrationid, @userid, @productid, @productname, @price, @quantity, @deliverytype, @bookingstartdate, @bookingenddate, @payment_status, @payment_mode, @totalamount, @paidamount, @payment_time, @rcu,@renewal);
      `);

    const newBooking = bookingResult.recordset[0];
    if (!newBooking) {
      throw new Error("Failed to insert new daily milk booking record.");
    }



    await poolConnect;
    const request1 = pool.request();









    // // Insert 30 status rows
    // const startDate = new Date(bookingstartdate);
    // const dayAmount = parseFloat(price) * parseFloat(quantity);

    // // for (let i = 0; i < 30; i++) {
    // for (let i = 0; i < 4; i++) {



    // console.log(bookingstartdate, bookingenddate)


    // // // Insert status rows from bookingstartdate to bookingenddate (inclusive)
    // // const parseLocalYMD = (ymd) => {
    // //   const [y, m, d] = String(ymd).split("-").map(Number);
    // //   return new Date(y, m - 1, d);
    // // };
    // const parseLocalYMD = (value) => {
    //   const datePart = String(value).split("T")[0];
    //   const [y, m, d] = datePart.split("-").map(Number);
    //   return new Date(y, m - 1, d);
    // };

    // const formatLocalYMD = (dt) => {
    //   const y = dt.getFullYear();
    //   const m = String(dt.getMonth() + 1).padStart(2, "0");
    //   const d = String(dt.getDate()).padStart(2, "0");
    //   return `${y}-${m}-${d}`;
    // };

    // const startDate = parseLocalYMD(bookingstartdate);
    // const endDate = parseLocalYMD(bookingenddate);
    // const dayAmount = parseFloat(price) * parseFloat(quantity);

    // if (endDate < startDate) {
    //   throw new Error("bookingenddate cannot be before bookingstartdate");
    // }

    // const oneDayMs = 24 * 60 * 60 * 1000;
    // const totalDays = Math.floor((endDate - startDate) / oneDayMs) + 1;




    // console.log("1111111111111", oneDayMs, totalDays, startDate, endDate, dayAmount)




    for (let i = 0; i < totalDays; i++) {

      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      const formattedDate = currentDate.toISOString().split('T')[0];

      const statusRequest = new sql.Request(transaction);
      await statusRequest
        .input('dailymilkbookingid', transid)
        .input('date', formattedDate)
        .input('quantity', quantity)
        .input('cancelled', null)
        .input('extra', 0.00)
        .input('amount', dayAmount)
        .input('received', null)
        .input('receivedtime', null)
        .input('rcu', rcu)
        .query(`
          INSERT INTO tbl_dailymilkstatus
            (dailymilkbookingid, date, quantity, cancelled, extra, amount, received, receivedtime, rcu)
          VALUES
            (@dailymilkbookingid, @date, @quantity, @cancelled, @extra, @amount, @received, @receivedtime, @rcu);
        `);
    }

    await transaction.commit();




    const checkResult = await request1
      .input('userid', userid)
      .query(`
    SELECT TOP 1 mappedpartnerid
    FROM tbl_user
    WHERE transid = @userid
      AND mappedpartnerid IS NOT NULL
  `);

    console.log("Check Result:", checkResult);
    let mappedPartnerId = null
    if (checkResult.recordset.length > 0) {
      mappedPartnerId = checkResult.recordset[0].mappedpartnerid;
      console.log("Mapped Partner ID:", mappedPartnerId);

      request1.input('mappedpartnerid', mappedPartnerId);
      request1.input('transid', transid);
      request1.query(`update tbl_dailymilkbooking set mappedpartnerid=@mappedpartnerid where transid=@transid`);








      request1.query(`
      UPDATE dms
SET dms.mappedpartnerid = dmb.mappedpartnerid
FROM tbl_dailymilkstatus dms
JOIN tbl_dailymilkbooking dmb
    ON dmb.transid = dms.dailymilkbookingid
   AND CAST(dmb.rcm AS DATE) = CAST(SYSDATETIMEOFFSET() AT TIME ZONE 'India Standard Time' AS DATE)

   where dms.mappedpartnerid is null

      `);



      request1.query(`
        

;WITH base AS (
  SELECT
    s.transid,
    s.mappedpartnerid,
    s.[date] AS delivery_date_varchar,
    TRY_CONVERT(date, s.[date], 23) AS delivery_date,
    RIGHT(s.mappedpartnerid, CHARINDEX('-', REVERSE(s.mappedpartnerid)) - 1) AS partner_code,
    s.rcm
  FROM tbl_dailymilkstatus s
  WHERE s.mappedpartnerid IS NOT NULL
),
existing_max AS (
  SELECT
    b.mappedpartnerid,
    b.delivery_date_varchar,
    MAX(TRY_CONVERT(int, RIGHT(b.orderid, 2))) AS max_suffix
  FROM (
    SELECT
      s.mappedpartnerid,
      s.[date] AS delivery_date_varchar,
      s.orderid
    FROM tbl_dailymilkstatus s
    WHERE s.orderid IS NOT NULL
  ) b
  GROUP BY b.mappedpartnerid, b.delivery_date_varchar
),
pending AS (
  SELECT
    b.transid AS status_pk,
    b.mappedpartnerid,
    b.delivery_date_varchar,
    b.delivery_date,
    b.partner_code,
    ROW_NUMBER() OVER (
      PARTITION BY b.mappedpartnerid, b.delivery_date_varchar
      ORDER BY b.rcm, b.transid
    ) AS rn,
    ISNULL(em.max_suffix, 0) AS max_suffix
  FROM base b
  LEFT JOIN existing_max em
    ON em.mappedpartnerid = b.mappedpartnerid
   AND em.delivery_date_varchar = b.delivery_date_varchar
  WHERE b.delivery_date IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM tbl_dailymilkstatus s2
      WHERE s2.transid = b.transid
        AND s2.orderid IS NULL
    )
)
UPDATE s
SET s.orderid =
  CONCAT(
    'DBO-',
    p.partner_code,
    '-',
    CONVERT(char(8), p.delivery_date, 112),               -- YYYYMMDD
    '-',
    RIGHT('00' + CAST(p.max_suffix + p.rn AS varchar(10)), 2)
  )
FROM tbl_dailymilkstatus s
JOIN pending p ON p.status_pk = s.transid
WHERE s.orderid IS NULL;




        `)
    }

    res.status(201).json({
      message: "Daily milk booking and 30 daily status entries created successfully.",
      booking: newBooking
    });

  } catch (err) {
    try {
      if (transaction) await transaction.rollback();
    } catch (rollbackErr) {
      console.error("Error during transaction rollback:", rollbackErr);
    }
    console.error("Error inserting daily milk booking or status:", err);
    next(err);
  }
});

router.put('/', async (req, res, next) => {
  try {
    const id = req.body.transid;

    // allow updates, including new payment fields
    const allowedFields = [
      'bookingid',
      'dailymilkregistrationid',
      'userid',
      'productid',
      'productname',
      'price',
      'quantity',
      'deliverytype',
      'bookingstartdate',
      'bookingenddate',
      // NEW payment fields
      'payment_status',
      'payment_mode',
      'totalamount',
      'paidamount',
      'payment_time',
      'luu'
    ];

    const updates = [];
    const request = pool.request();
    request.input('transid', id);

    allowedFields.forEach(f => {
      if (req.body[f] !== undefined) {
        updates.push(`${f} = @${f}`);
        // Loose typing as in original — adjust only where helpful
        if (f === 'bookingstartdate' || f === 'bookingenddate') {
          request.input(f, req.body[f]);
        } else if (f === 'price' || f === 'quantity' || f === 'totalamount' || f === 'paidamount') {
          request.input(f, req.body[f]);
        } else if (f === 'payment_time') {
          request.input(f, req.body[f] ? new Date(req.body[f]) : null);
        } else {
          request.input(f, req.body[f]);
        }
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No valid fields provided to update.' });
    }

    const setClause = updates.join(', ') + ', lum = DATEADD(MINUTE, 330, GETUTCDATE())';

    await poolConnect;

    const result = await request.query(`
        UPDATE tbl_dailymilkbooking
        SET ${setClause}
        WHERE transid = @transid;
        SELECT @@ROWCOUNT AS affected;
    `);

    if (result.recordset[0].affected === 0) {
      return res.status(404).json({ message: 'Daily milk booking not found with the provided transid.' });
    }

    res.json({ message: 'Daily milk booking updated successfully.' });

  } catch (err) {
    console.error("Error updating daily milk booking:", err);
    next(err);
  }
});

router.put('/DailyMilkStatusUpdate', async (req, res, next) => {
  try {
    const id = req.body.transid;
    const userid = req.body.userid;
    const dailymilkbookingid = req.body.dailymilkbookingid;

    const allowedFields = [
      'bookingid',
      'dailymilkregistrationid',
      'userid',
      'productid',
      'productname',
      'price',
      'quantity',
      'deliverytype',
      'status',
      'bookingstartdate',
      'bookingenddate',
      // NEW payment fields
      'payment_status',
      'payment_mode',
      'totalamount',
      'paidamount',
      'payment_time',
      //'mappedpartnerid',
      'luu'
    ];

    await poolConnect;
    const request1 = pool.request();


    const checkResult = await request1
      .input('userid', userid)
      .query(`
    SELECT TOP 1 mappedpartnerid
    FROM tbl_user
    WHERE transid = @userid
      AND mappedpartnerid IS NOT NULL
  `);


    if (checkResult.recordset.length === 0) {
      return res.status(500).json({
        message: 'The Daily Milk User is not mapped to any partner. Map the user to a partner before updating the booking.'
      });
    }

    // 👇 get the value into a variable
    const mappedPartnerId = checkResult.recordset[0].mappedpartnerid;


    const updates = [];
    const request = pool.request();
    request.input('transid', id);

    allowedFields.forEach(f => {
      if (req.body[f] !== undefined) {
        updates.push(`${f} = @${f}`);
        if (f === 'price' || f === 'quantity' || f === 'totalamount' || f === 'paidamount') {
          request.input(f, req.body[f]);
        } else if (f === 'bookingstartdate' || f === 'bookingenddate') {
          request.input(f, req.body[f]);
        } else if (f === 'payment_time') {
          request.input(f, req.body[f] ? new Date(req.body[f]) : null);
        } else {
          request.input(f, req.body[f]);
        }
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No valid fields provided to update.' });
    }

    updates.push('mappedpartnerid = @mappedpartnerid');
    request.input('mappedpartnerid', mappedPartnerId);


    const setClause = updates.join(', ') + ', lum = DATEADD(MINUTE, 330, GETUTCDATE())';







    const result = await request.query(`
        UPDATE tbl_dailymilkbooking
        SET ${setClause}
        WHERE dailymilkregistrationid = @transid;
        SELECT @@ROWCOUNT AS affected;
    `);


    // ONLY generate orderid when booking is approved
    if (req.body.status === 1) {

      const request2 = pool.request();
      request2.input('dailymilkbookingid', dailymilkbookingid);

      await request2.query(`
  UPDATE dms
SET dms.mappedpartnerid = dmb.mappedpartnerid
FROM tbl_dailymilkstatus dms
JOIN tbl_dailymilkbooking dmb
    ON dmb.transid = dms.dailymilkbookingid
   AND CAST(dmb.rcm AS DATE) = CAST(getdate() AS DATE)

   where dms.mappedpartnerid is null


  `);


      await request2.query(`
  
;WITH base AS (
  SELECT
    s.transid,
    s.mappedpartnerid,
    s.[date] AS delivery_date_varchar,
    TRY_CONVERT(date, s.[date], 23) AS delivery_date,
    RIGHT(s.mappedpartnerid, CHARINDEX('-', REVERSE(s.mappedpartnerid)) - 1) AS partner_code,
    s.rcm
  FROM tbl_dailymilkstatus s
  WHERE s.mappedpartnerid IS NOT NULL
),
existing_max AS (
  SELECT
    b.mappedpartnerid,
    b.delivery_date_varchar,
    MAX(TRY_CONVERT(int, RIGHT(b.orderid, 2))) AS max_suffix
  FROM (
    SELECT
      s.mappedpartnerid,
      s.[date] AS delivery_date_varchar,
      s.orderid
    FROM tbl_dailymilkstatus s
    WHERE s.orderid IS NOT NULL
  ) b
  GROUP BY b.mappedpartnerid, b.delivery_date_varchar
),
pending AS (
  SELECT
    b.transid AS status_pk,
    b.mappedpartnerid,
    b.delivery_date_varchar,
    b.delivery_date,
    b.partner_code,
    ROW_NUMBER() OVER (
      PARTITION BY b.mappedpartnerid, b.delivery_date_varchar
      ORDER BY b.rcm, b.transid
    ) AS rn,
    ISNULL(em.max_suffix, 0) AS max_suffix
  FROM base b
  LEFT JOIN existing_max em
    ON em.mappedpartnerid = b.mappedpartnerid
   AND em.delivery_date_varchar = b.delivery_date_varchar
  WHERE b.delivery_date IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM tbl_dailymilkstatus s2
      WHERE s2.transid = b.transid
        AND s2.orderid IS NULL
    )
)
UPDATE s
SET s.orderid =
  CONCAT(
    'DBO-',
    p.partner_code,
    '-',
    CONVERT(char(8), p.delivery_date, 112),               -- YYYYMMDD
    '-',
    RIGHT('00' + CAST(p.max_suffix + p.rn AS varchar(10)), 2)
  )
FROM tbl_dailymilkstatus s
JOIN pending p ON p.status_pk = s.transid
WHERE s.orderid IS NULL;




  `);
    }



    if (result.recordset[0].affected === 0) {
      return res.status(404).json({ message: 'Daily milk booking not found with the provided transid.' });
    }

    res.json({ message: 'Daily milk booking updated successfully.' });

  } catch (err) {
    console.error("Error updating daily milk booking:", err);
    next(err);
  }
});

// Mark a daily milk booking as paid
router.put('/DailyMilkMarkPaid', async (req, res, next) => {
  try {
    const { transid, payment_mode, totalamount, paidamount } = req.body;

    if (!transid) {
      return res.status(400).json({ message: 'transid is required.' });
    }

    await poolConnect;

    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    let result;
    try {
      const request = new sql.Request(transaction);
      request.input('transid', sql.NVarChar, transid);
      request.input('payment_status', sql.NVarChar, 'PAID');
      request.input('payment_mode', sql.NVarChar, payment_mode || '');
      request.input('totalamount', sql.Decimal(18, 2), Number(totalamount || 0));
      request.input('paidamount', sql.Decimal(18, 2), Number(paidamount || 0));

      result = await request.query(`
        DECLARE @bookingAffected INT;

        UPDATE tbl_dailymilkbooking
        SET paid = 1,
            payment_status = @payment_status,
            payment_mode = @payment_mode,
            totalamount = @totalamount,
            paidamount = @paidamount,
            payment_time = DATEADD(MINUTE, 330, GETUTCDATE()),
            lum = DATEADD(MINUTE, 330, GETUTCDATE())
        WHERE transid = @transid;

        SET @bookingAffected = @@ROWCOUNT;

        UPDATE tbl_dailymilkstatus
        SET paid = 1,
            received = 1,
            receivedtime = DATEADD(MINUTE, 330, GETUTCDATE()),
            lum = DATEADD(MINUTE, 330, GETUTCDATE())
        WHERE dailymilkbookingid = @transid
          AND cancelled IS NULL;

        SELECT @bookingAffected AS bookingAffected, @@ROWCOUNT AS statusAffected;
      `);
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }

    const rowInfo = result.recordset && result.recordset[0];

    if (!rowInfo || rowInfo.bookingAffected === 0) {
      return res.status(404).json({ message: 'Daily milk booking not found with the provided transid.' });
    }

    return res.json({
      message: 'Daily milk booking marked as paid successfully.',
      details: rowInfo
    });

  } catch (err) {
    console.error('Error marking daily milk booking as paid:', err);
    next(err);
  }
});


// DELETE by bookingid (kept as in original)
router.delete('/', async (req, res, next) => {
  try {
    const id = req.body.transid;
    await poolConnect;
    const result = await pool.request()
      .input('transid', sql.VarChar, id)
      .query(`
        DELETE FROM tbl_dailymilkbooking
        WHERE bookingid = @transid;
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
