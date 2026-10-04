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



router.get('/DailyMilkApproval', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .query(`SELECT a.productname,a.price,a.quantity,a.deliverytype,a.bookingstartdate,a.bookingenddate,a.status,
b.transid,b.userid,b.name,b.dob,b.address,b.mobile,b.latitude,b.longitude,b.familymembers,a.rcu,a.rcm
 FROM tbl_dailymilkbooking a inner join tbl_dailymilkregistration b on b.transid=a.dailymilkregistrationid
`);
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// GET category by transid
router.get('/:id', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('transid', sql.VarChar, req.params.id)
      .query('SELECT * FROM tbl_dailymilkbooking WHERE transid = @transid;');
    // if (result.recordset.length === 0) {
    //   return res.status(404).json({ message: 'Not found' });
    // }
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
      .query('SELECT * FROM tbl_dailymilkbooking WHERE dailymilkregistrationid = @transid;');
    // if (result.recordset.length === 0) {
    //   return res.status(404).json({ message: 'Not found' });
    // }
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
    res.json({Response:result.recordset});
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
      .query(
        // "SELECT * FROM tbl_dailymilkregistration WHERE userid = @transid;"
         "SELECT * FROM tbl_dailymilkbooking WHERE dailymilkregistrationid = @transid;"
      );
    // if (!result.recordset.length) {
    //   return res.status(404).json({ message: 'Not found' });
    // }
    res.json({Response:result.recordset});
  } catch (err) {
    next(err);
  }
});


// router.post('/', async (req, res, next) => {
//   try {
//     // 1. Destructure fields from the request body
//     const {

//       bookingid,
//       dailymilkregistrationid,
//       userid,
//       productid,
//       productname,
//       price,
//       quantity,
//       deliverytype,
//       bookingstartdate, // Expecting 'YYYY-MM-DD' string
//       bookingenddate,   // Expecting 'YYYY-MM-DD' string
//       rcu // Record Created User (mandatory)
//     } = req.body;

//     // 2. Basic Input Validation for mandatory fields
//     if (!bookingid || !userid || !productid || !productname || price === undefined || quantity === undefined || !deliverytype || !bookingstartdate || !bookingenddate || !rcu) {
//       return res.status(400).json({
//         message: "Missing required fields. Please provide bookingid, userid, productid, productname, price, quantity, deliverytype, bookingstartdate, bookingenddate, and rcu."
//       });
//     }

//     // Optional: More specific type/value validation
//     if (isNaN(parseFloat(price)) || isNaN(parseFloat(quantity))) {
//         return res.status(400).json({
//             message: "Price and Quantity must be valid numbers."
//         });
//     }

//     // 3. Ensure database connection is established
//     await poolConnect;

//     // 4. Create a new request and input parameters with specific SQL types
//     const result = await pool.request()
//       .input('bookingid',  bookingid)
//       .input('dailymilkregistrationid',  dailymilkregistrationid || null) // Optional field
//       .input('userid',  userid)
//       .input('productid',  productid)
//       .input('productname',  productname)
//       .input('price',  price) // Use sql.Decimal for accurate decimal storage
//       .input('quantity',  quantity) // Use sql.Decimal
//       .input('deliverytype',  deliverytype)
//       .input('bookingstartdate',  bookingstartdate) // Use sql.Date for date fields
//       .input('bookingenddate',  bookingenddate)   // Use sql.Date
//       .input('rcu',  rcu)
//       // 'rcm' (record creation timestamp) will default to GETDATE() in SQL schema

//       .query(`
//         INSERT INTO tbl_dailymilkbooking
//           (bookingid, dailymilkregistrationid, userid, productid, productname, price, quantity, deliverytype, bookingstartdate, bookingenddate, rcu)
//         OUTPUT INSERTED.* -- This returns the newly inserted row
//         VALUES
//           (@bookingid, @dailymilkregistrationid, @userid, @productid, @productname, @price, @quantity, @deliverytype, @bookingstartdate, @bookingenddate, @rcu);
//       `);

//     // 5. Send the response
//     // Status 201 indicates a resource was successfully created.
//     res.status(201).json(result.recordset);

//   } catch (err) {
//     // 6. Error handling
//     console.error("Error inserting daily milk booking:", err);
//     next(err); // Pass the error to Express's centralized error handling middleware
//   }
// });


router.post('/', async (req, res, next) => {
  let transaction; // Declare transaction outside try block to ensure scope
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
      bookingstartdate, // Expecting 'YYYY-MM-DD' string
      bookingenddate,   // Expecting 'YYYY-MM-DD' string
      rcu // Record Created User (mandatory)
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

    // Ensure database connection is established
    await poolConnect;

    // Start a transaction to ensure atomicity for booking and status inserts
    // If one fails, both rollback.
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    // 1. Insert into tbl_dailymilkbooking
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
      .input('rcu', rcu)
      .query(`
        INSERT INTO tbl_dailymilkbooking
          (transid,bookingid, dailymilkregistrationid, userid, productid, productname, price, quantity, deliverytype, bookingstartdate, bookingenddate, rcu)
        OUTPUT INSERTED.*
        VALUES
          (@transid,@bookingid, @dailymilkregistrationid, @userid, @productid, @productname, @price, @quantity, @deliverytype, @bookingstartdate, @bookingenddate, @rcu);
      `);

    const newBooking = bookingResult.recordset[0];
    if (!newBooking) {
      throw new Error("Failed to insert new daily milk booking record.");
    }

    // 2. Generate and Insert into tbl_dailymilkstatus for 30 days
    const startDate = new Date(bookingstartdate); // Convert bookingstartdate to a Date object
    const totalAmount = parseFloat(price) * parseFloat(quantity); // Calculate amount once

    for (let i = 0; i < 30; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i); // Add 'i' days to get the next date

      // Format date to YYYY-MM-DD for SQL insertion
      const formattedDate = currentDate.toISOString().split('T')[0];

      const statusRequest = new sql.Request(transaction);
      await statusRequest
        .input('dailymilkbookingid', transid) // Use bookingid from request
        .input('date', formattedDate) // The current date in the loop
        .input('quantity', quantity)
        .input('cancelled', null) // Default status
        .input('extra', 0.00) // Default extra
        .input('amount', totalAmount) // Calculated amount
        .input('received', null) // Default received status
        .input('receivedtime', null) // Default to null for initial insert
        .input('rcu', rcu)
        .query(`
          INSERT INTO tbl_dailymilkstatus
            (dailymilkbookingid, date, quantity, cancelled, extra, amount, received, receivedtime, rcu)
          VALUES
            (@dailymilkbookingid, @date, @quantity, @cancelled, @extra, @amount, @received, @receivedtime, @rcu);
        `);
    }

    await transaction.commit(); // Commit the transaction if all inserts are successful

    // Send the response with the newly created booking record
    res.status(201).json({
      message: "Daily milk booking and 30 daily status entries created successfully.",
      booking: newBooking
    });

  } catch (err) {
    if (transaction && transaction.recordset) { // Check if transaction was started
      try {
        await transaction.rollback(); // Rollback on error
        console.error("Transaction rolled back due to error:", err);
      } catch (rollbackErr) {
        console.error("Error during transaction rollback:", rollbackErr);
      }
    }
    console.error("Error inserting daily milk booking or status:", err);
    next(err); // Pass the error to Express's centralized error handling middleware
  }
});


router.put('/', async (req, res, next) => {
  try {
    // 1. Extract the unique identifier (transid) from the request body
    const id = req.body.transid;

    // 2. Define the fields that are allowed to be updated in tbl_dailymilkbooking
    // 'transid', 'rcm', 'rcu' are excluded as they are primary key or creation audit fields.
    // 'lum' will be set automatically by GETDATE().
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
      'luu' // Last Updated User - always include as it's typically updated on PUT
    ];

    const updates = []; // Array to build the SET clause of the SQL query
    const request = pool.request(); // Create a new SQL request instance

    // 3. Input 'transid' for the WHERE clause
    request.input('transid', id); // Assuming transid is NVARCHAR

    // 4. Dynamically build the UPDATE SET clause and add input parameters
    allowedFields.forEach(f => {
      // Check if the field is present in the request body (and not undefined)
      if (req.body[f] !== undefined) {
        updates.push(`${f} = @${f}`); // Add 'field = @field' to the updates array

        // Use appropriate SQL types for inputs
        if (f === 'price' || f === 'quantity') {
          request.input(f, req.body[f]);
        } else if (f === 'bookingstartdate' || f === 'bookingenddate') {
          // Assuming dates are sent in 'YYYY-MM-DD' string format for direct SQL conversion
          request.input(f, req.body[f]);
        } else {
          // Default to NVarChar for other string fields
          request.input(f, req.body[f]);
        }
      }
    });

    // 5. Handle cases where no valid fields are provided for update
    if (updates.length === 0) {
      return res.status(400).json({ message: 'No valid fields provided to update.' });
    }

    // 6. Append 'lum = DATEADD(MINUTE, 330, GETUTCDATE())' (last update timestamp) to the update clause
    const setClause = updates.join(', ') + ', lum = DATEADD(MINUTE, 330, GETUTCDATE())';

    // 7. Ensure database connection is established
    await poolConnect;

    // 8. Execute the UPDATE query
    const result = await request.query(`
        UPDATE tbl_dailymilkbooking
        SET ${setClause}
        WHERE transid = @transid;
        SELECT @@ROWCOUNT AS affected; -- Returns the number of rows affected by the UPDATE
    `);

    // 9. Check if a record was updated
    if (result.recordset[0].affected === 0) {
      return res.status(404).json({ message: 'Daily milk booking not found with the provided transid.' });
    }

    // 10. Send success response
    res.json({ message: 'Daily milk booking updated successfully.' });

  } catch (err) {
    // 11. Error handling
    console.error("Error updating daily milk booking:", err);
    next(err); // Pass the error to Express's centralized error handling middleware
  }
});


router.put('/DailyMilkStatusUpdate', async (req, res, next) => {
  try {
    // 1. Extract the unique identifier (transid) from the request body
    const id = req.body.transid;

    // 2. Define the fields that are allowed to be updated in tbl_dailymilkbooking
    // 'transid', 'rcm', 'rcu' are excluded as they are primary key or creation audit fields.
    // 'lum' will be set automatically by GETDATE().
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
      'luu' // Last Updated User - always include as it's typically updated on PUT
    ];

    const updates = []; // Array to build the SET clause of the SQL query
    const request = pool.request(); // Create a new SQL request instance

    // 3. Input 'transid' for the WHERE clause
    request.input('transid', id); // Assuming transid is NVARCHAR

    // 4. Dynamically build the UPDATE SET clause and add input parameters
    allowedFields.forEach(f => {
      // Check if the field is present in the request body (and not undefined)
      if (req.body[f] !== undefined) {
        updates.push(`${f} = @${f}`); // Add 'field = @field' to the updates array

        // Use appropriate SQL types for inputs
        if (f === 'price' || f === 'quantity') {
          request.input(f, req.body[f]);
        } else if (f === 'bookingstartdate' || f === 'bookingenddate') {
          // Assuming dates are sent in 'YYYY-MM-DD' string format for direct SQL conversion
          request.input(f, req.body[f]);
        } else {
          // Default to NVarChar for other string fields
          request.input(f, req.body[f]);
        }
      }
    });

    // 5. Handle cases where no valid fields are provided for update
    if (updates.length === 0) {
      return res.status(400).json({ message: 'No valid fields provided to update.' });
    }

    // 6. Append 'lum = DATEADD(MINUTE, 330, GETUTCDATE())' (last update timestamp) to the update clause
    const setClause = updates.join(', ') + ', lum = DATEADD(MINUTE, 330, GETUTCDATE())';

    // 7. Ensure database connection is established
    await poolConnect;

    // 8. Execute the UPDATE query
    const result = await request.query(`
        UPDATE tbl_dailymilkbooking
        SET ${setClause}
        WHERE dailymilkregistrationid = @transid;
        SELECT @@ROWCOUNT AS affected; -- Returns the number of rows affected by the UPDATE
    `);

    // 9. Check if a record was updated
    if (result.recordset[0].affected === 0) {
      return res.status(404).json({ message: 'Daily milk booking not found with the provided transid.' });
    }

    // 10. Send success response
    res.json({ message: 'Daily milk booking updated successfully.' });

  } catch (err) {
    // 11. Error handling
    console.error("Error updating daily milk booking:", err);
    next(err); // Pass the error to Express's centralized error handling middleware
  }
});


// DELETE category by transid in body
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
