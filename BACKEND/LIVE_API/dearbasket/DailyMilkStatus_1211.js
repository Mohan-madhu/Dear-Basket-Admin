const express = require('express');
const router = express.Router();
const { pool, poolConnect, sql } = require('../../config/db_dearbasket');

// GET all DailyMilkProducts
router.get('/', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .query('SELECT * FROM tbl_dailymilkstatus;');
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// GET category by transid
router.get('/Dates/:id', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('transid', sql.VarChar, req.params.id)
      .query('SELECT date,quantity,cancelled,extra,amount,received,receivedtime FROM tbl_dailymilkstatus WHERE dailymilkbookingid = @transid;');
    // if (result.recordset.length === 0) {
    //   return res.status(404).json({ message: 'Not found' });
    // }
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});


router.get('/DailyMilkAccountsDashboard', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .query('select * from fn_dailymilkaccountsdashboard()');
    // if (result.recordset.length === 0) {
    //   return res.status(404).json({ message: 'Not found' });
    // }
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});


router.get('/:id', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('transid', sql.VarChar, req.params.id)
      .query('SELECT * FROM tbl_dailymilkstatus WHERE transid = @transid;');
    // if (result.recordset.length === 0) {
    //   return res.status(404).json({ message: 'Not found' });
    // }
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});


router.post('/', async (req, res, next) => {
  try {
    const {
      dailymilkbookingid,
      date, // Expecting date string, e.g., 'YYYY-MM-DD' or 'DD/MM/YYYY'
      quantity,
      cancelled,
      extra,
      amount,
      received,
      receivedtime, // Expecting datetime string
      rcu
    } = req.body;

    if (!dailymilkbookingid || !date || quantity === undefined || amount === undefined || !rcu) {
      return res.status(400).json({
        message: "Missing required fields. Please provide dailymilkbookingid, date, quantity,  amount and rcu."
      });
    }

    if (isNaN(parseFloat(quantity)) || isNaN(parseFloat(amount))) {
      return res.status(400).json({
        message: "Quantity, Extra, and Amount must be valid numbers."
      });
    }

    await poolConnect;

    const result = await pool.request()
      .input('dailymilkbookingid', dailymilkbookingid)
      .input('date', date) // Assuming date is stored as varchar(max)
      .input('quantity', quantity)
      .input('cancelled', cancelled)
      .input('extra', extra)
      .input('amount', amount)
      .input('received', received)
      .input('receivedtime', receivedtime)
      .input('rcu', rcu)
      .query(`
          INSERT INTO tbl_dailymilkstatus
            (dailymilkbookingid, date, quantity, cancelled, extra, amount, received, receivedtime, rcu)
          OUTPUT INSERTED.*
          VALUES
            (@dailymilkbookingid, @date, @quantity, @cancelled, @extra, @amount, @received, @receivedtime, @rcu);
        `);

    res.status(201).json(result.recordset);

  } catch (err) {
    console.error("Error inserting daily milk status:", err);
    next(err);
  }
});


// router.put('/cancel-dates-and-extra-milk', async (req, res, next) => {
//   try {
//     const { transid, dates,extramilk } = req.body; // Destructure transid and dates from the payload

//     // --- Input Validation ---
//     if (!transid || typeof transid !== 'string') {
//       return res.status(400).json({ message: 'Missing or invalid transid.' });
//     }
//     if (!Array.isArray(dates) || dates.length === 0) {
//       return res.status(400).json({ message: 'Missing or empty dates array for cancellation.' });
//     }

//        if (!Array.isArray(extramilk) || extramilk.length === 0) {
//       return res.status(400).json({ message: 'Missing or empty extra milk array for cancellation.' });
//     }

//     // --- Prepare SQL Parameters ---
//     const request = pool.request();
//     request.input('transid', sql.NVarChar, transid);

//     const validDates = dates.filter(date => typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/));

//     if (validDates.length === 0) {
//       return res.status(400).json({ message: 'No valid date strings provided for cancellation.' });
//     }

//     // Create a comma-separated string of quoted dates for the IN clause
//     const dateList = validDates.map(d => `'${d}'`).join(',');

//     // --- Construct and Execute Query ---
//     await poolConnect; // Ensure connection pool is ready

//     const result = await request.query(`
//       UPDATE tbl_dailymilkstatus
//       SET
//           cancelled = 1,     -- Set cancelled to 1
//           lum = DATEADD(MINUTE, 330, GETUTCDATE())    -- Update last modified timestamp
//       WHERE
//           dailymilkbookingid = @transid
//           AND date IN (${dateList}); -- Filter by the list of dates
//       SELECT @@ROWCOUNT AS affectedRows;
//     `);

//         const result1 = await request.query(`
//       UPDATE tbl_dailymilkstatus
//       SET
//           cancelled = null,     -- Set cancelled to 1
//           lum = DATEADD(MINUTE, 330, GETUTCDATE())    -- Update last modified timestamp
//       WHERE
//           dailymilkbookingid = @transid
//           AND date not IN (${dateList}); -- Filter by the list of dates
//       SELECT @@ROWCOUNT AS affectedRows;
//     `);


//     const affectedRows = result.recordset[0].affectedRows;

//     if (affectedRows === 0) {
//       return res.status(404).json({ message: 'No daily milk status records found or updated for the provided transid and dates. They might already be cancelled or not exist.' });
//     }

//     res.json({ message: `${affectedRows} daily milk status records cancelled successfully.` });

//   } catch (err) {
//     console.error("Error cancelling daily milk status:", err); // Specific error log
//     next(err); // Pass error to the next error handling middleware
//   }
// });


// router.put('/cancel-dates-and-extra-milk', async (req, res, next) => {
//   try {
//     const { transid, dates, extramilk } = req.body;

//     // --- Input Validation ---
//     if (!transid || typeof transid !== 'string') {
//       return res.status(400).json({ message: 'Missing or invalid transid.' });
//     }

//     if (
//       (!Array.isArray(dates) || dates.length === 0) &&
//       (!Array.isArray(extramilk) || extramilk.length === 0)
//     ) {
//       if (!Array.isArray(dates) || dates.length === 0) {
//         return res.status(400).json({ message: 'Missing or empty dates array for cancellation.' });
//       }
//       if (!Array.isArray(extramilk)) {
//         return res.status(400).json({ message: 'extramilk must be an array.' });
//       }
//     }



//     // Validate and prepare dates
//     const validDates = dates.filter(date => typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/));
//     if (validDates.length === 0) {
//       return res.status(400).json({ message: 'No valid date strings provided for cancellation.' });
//     }
//     const dateList = validDates.map(d => `'${d}'`).join(',');

//     // Validate extramilk data
//     const validExtraMilk = extramilk.filter(item =>
//       item.date && typeof item.date === 'string' && item.date.match(/^\d{4}-\d{2}-\d{2}$/) &&
//       item.qty !== undefined && !isNaN(item.qty)
//     );

//     // --- Database Operations ---
//     await poolConnect;
//     const request = pool.request();
//     request.input('transid', sql.NVarChar, transid);

//     // Start transaction
//     const transaction = new sql.Transaction(pool);
//     await transaction.begin();

//     try {
//       // 1. Update cancellation status for dates
//       const cancelResult = await request.query(`
//           UPDATE tbl_dailymilkstatus
//           SET
//               cancelled = 1,
//               lum = DATEADD(MINUTE, 330, GETUTCDATE())
//           WHERE
//               dailymilkbookingid = @transid
//               AND date IN (${dateList});
//           SELECT @@ROWCOUNT AS affectedRows;
//         `);

//       // 2. Set cancelled to null for dates not in the list
//       await request.query(`
//           UPDATE tbl_dailymilkstatus
//           SET
//               cancelled = null,
//               lum = DATEADD(MINUTE, 330, GETUTCDATE())
//           WHERE
//               dailymilkbookingid = @transid
//               AND date NOT IN (${dateList});
//         `);

//       await request.query(`
//             UPDATE tbl_dailymilkstatus
//             SET
//                 extra = null
//             WHERE
//                 dailymilkbookingid = @transid
              
//           `);

//       // 3. Process extra milk updates
//       for (const item of validExtraMilk) {
//         const extraRequest = pool.request();
//         extraRequest.input('transid', sql.NVarChar, transid);
//         extraRequest.input('date', sql.NVarChar, item.date);
//         extraRequest.input('qty', sql.Decimal(10, 2), item.qty);


//         await extraRequest.query(`
//             UPDATE tbl_dailymilkstatus
//             SET
//                 extra = @qty,
//                 lum = DATEADD(MINUTE, 330, GETUTCDATE())
//             WHERE
//                 dailymilkbookingid = @transid
//                 AND date = @date;
//           `);
//       }

//       // Commit transaction
//       await transaction.commit();

//       res.json({
//         message: `Successfully processed ${cancelResult.recordset[0].affectedRows} cancellations and ${validExtraMilk.length} extra milk updates.`
//       });

//     } catch (err) {
//       await transaction.rollback();
//       throw err;
//     }

//   } catch (err) {
//     console.error("Error in cancel-dates-and-extra-milk:", err);
//     next(err);
//   }
// });


router.put('/cancel-dates-and-extra-milk', async (req, res, next) => {
  try {
    const { transid, dates, extramilk } = req.body;

    // --- Basic transid validation ---
    if (!transid || typeof transid !== 'string') {
      return res.status(400).json({ message: 'Missing or invalid transid.' });
    }

    // --- At least one of dates/extramilk must be provided (and non-empty) ---
    const datesProvided = Array.isArray(dates) && dates.length > 0;
    const extraProvided = Array.isArray(extramilk) && extramilk.length > 0;

    if (!datesProvided && !extraProvided) {
      return res.status(400).json({
        message: 'Provide at least one: dates[] or extramilk[].',
      });
    }

    // --- Validate dates (if provided) ---
    let validDates = [];
    if (datesProvided) {
      validDates = dates.filter(
        (d) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)
      );
    }

    // --- Validate extramilk (if provided) ---
    let validExtraMilk = [];
    if (extraProvided) {
      validExtraMilk = extramilk.filter(
        (item) =>
          item &&
          typeof item.date === 'string' &&
          /^\d{4}-\d{2}-\d{2}$/.test(item.date) &&
          item.qty !== undefined &&
          !isNaN(item.qty)
      );
    }

    // If user sent *only* invalid stuff, fail early
    if ((datesProvided && validDates.length === 0) && (extraProvided && validExtraMilk.length === 0)) {
      return res.status(400).json({
        message: 'No valid dates or extramilk entries found.',
      });
    }

    // --- DB work ---
    await poolConnect;
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // Always use a Request bound to the transaction
      const tReq = new sql.Request(transaction);
      tReq.input('transid', sql.NVarChar, transid);

      let cancelledCount = 0;
      let extraUpdatedCount = 0;

      // ====== Handle DATES (only if we have valid dates) ======
      if (validDates.length > 0) {
        // Build parameterized IN clause: (@d0,@d1,....)
        const dateParams = validDates.map((_, i) => `@d${i}`);
        const dateReq = new sql.Request(transaction);
        dateReq.input('transid', sql.NVarChar, transid);
        validDates.forEach((d, i) => dateReq.input(`d${i}`, sql.Date, d));

        // 1) Set cancelled = 1 for provided dates
        const cancelSql = `
          UPDATE tbl_dailymilkstatus
          SET cancelled = 1, lum = DATEADD(MINUTE, 330, GETUTCDATE())
          WHERE dailymilkbookingid = @transid
            AND [date] IN (${dateParams.join(',')});
          SELECT @@ROWCOUNT AS affectedRows;
        `;
        const cancelRes = await dateReq.query(cancelSql);
        cancelledCount = cancelRes.recordset?.[0]?.affectedRows || 0;

        // 2) OPTIONAL: Set cancelled = NULL for *other* dates (only if dates were sent)
        const notInReq = new sql.Request(transaction);
        notInReq.input('transid', sql.NVarChar, transid);
        validDates.forEach((d, i) => notInReq.input(`nd${i}`, sql.Date, d));
        const notInParams = validDates.map((_, i) => `@nd${i}`);
        const unCancelSql = `
          UPDATE tbl_dailymilkstatus
          SET cancelled = NULL, lum = DATEADD(MINUTE, 330, GETUTCDATE())
          WHERE dailymilkbookingid = @transid
            AND [date] NOT IN (${notInParams.join(',')});
        `;
        await notInReq.query(unCancelSql);
      }

      // ====== Handle EXTRA MILK (only if we have extramilk input) ======
      if (extraProvided) {
        // First, clear existing extras for this booking (scoped only when client sent extramilk)
        const clearReq = new sql.Request(transaction);
        clearReq.input('transid', sql.NVarChar, transid);
        await clearReq.query(`
          UPDATE tbl_dailymilkstatus
          SET extra = NULL, lum = DATEADD(MINUTE, 330, GETUTCDATE())
          WHERE dailymilkbookingid = @transid;
        `);

        // Then apply provided extras (only valid rows)
        for (const item of validExtraMilk) {
          const extraReq = new sql.Request(transaction);
          extraReq.input('transid', sql.NVarChar, transid);
          extraReq.input('date', sql.Date, item.date);
          extraReq.input('qty', sql.Decimal(10, 2), Number(item.qty));
          const resUpd = await extraReq.query(`
            UPDATE tbl_dailymilkstatus
            SET extra = @qty, lum = DATEADD(MINUTE, 330, GETUTCDATE())
            WHERE dailymilkbookingid = @transid AND [date] = @date;
            SELECT @@ROWCOUNT AS affectedRows;
          `);
          extraUpdatedCount += resUpd.recordset?.[0]?.affectedRows || 0;
        }
      }

      await transaction.commit();

      // Compose a friendly result message based on what actually ran
      const parts = [];
      if (validDates.length > 0) parts.push(`${cancelledCount} date(s) cancelled`);
      if (extraProvided) parts.push(`${extraUpdatedCount} extra milk update(s)`);
      res.json({ message: `Success: ${parts.join(' and ')}.` });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    console.error('Error in cancel-dates-and-extra-milk:', err);
    next(err);
  }
});


router.put('/', async (req, res, next) => {
  try {
    await poolConnect;

    const id = req.body.transid;
    if (!id) return res.status(400).json({ message: 'transid is required.' });

    // Fields client is allowed to send
    const allowedFields = [
      'dailymilkbookingid',
      'date',
      'quantity',
      'cancelled',
      'extra',
      'amount',
      'received',
      'receivedtime', // will be ignored if 'received' is present
      'luu'           // user name / id (NOT a timestamp)
    ];

    const updates = [];
    const request = pool.request();
    request.input('transid', sql.NVarChar, id);

    allowedFields.forEach((f) => {
      if (req.body[f] !== undefined) {
        // we'll push the SET clause later for a couple of special cases
        if (f === 'quantity' || f === 'extra' || f === 'amount') {
          request.input(f, sql.Decimal(18, 2), req.body[f]);
          updates.push(`${f} = @${f}`);
        } else if (f === 'cancelled' || f === 'received') {
          request.input(f, sql.Int, req.body[f]); // assuming int/bit-ish status
          updates.push(`${f} = @${f}`);
        } else if (f === 'date') {
          request.input(f, sql.NVarChar, req.body[f]); // keep as string if that’s your schema
          updates.push(`${f} = @${f}`);
        } else if (f === 'luu') {
          request.input(f, sql.NVarChar, req.body[f]); // last updated user (string)
          updates.push(`${f} = @${f}`);
        } else if (f === 'dailymilkbookingid') {
          request.input(f, sql.NVarChar, req.body[f]);
          updates.push(`${f} = @${f}`);
        } else if (f === 'receivedtime') {
          // will be overridden below if 'received' is present
          request.input(f, sql.DateTime2, req.body[f]);
          updates.push(`${f} = @${f}`);
        }
      }
    });

    // If 'received' is present in body, force 'receivedtime' to IST "now"
    if (req.body.received !== undefined) {
      // remove any prior 'receivedtime' assignment
      const idx = updates.findIndex(s => s.startsWith('receivedtime ='));
      if (idx !== -1) updates.splice(idx, 1);
      updates.push(`receivedtime = CAST(SYSDATETIMEOFFSET() AT TIME ZONE 'India Standard Time' AS datetime2)`);
    }

    // Always bump LUM (last updated datetime) to IST "now"
    updates.push(`lum = CAST(SYSDATETIMEOFFSET() AT TIME ZONE 'India Standard Time' AS datetime2)`);

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No valid fields provided to update.' });
    }

    const setClause = updates.join(', ');

    const result = await request.query(`
      UPDATE tbl_dailymilkstatus
      SET ${setClause}
      WHERE transid = @transid;

      SELECT @@ROWCOUNT AS affected;
    `);

    if (!result.recordset?.[0]?.affected) {
      return res.status(404).json({
        message: 'Daily milk status record not found with the provided transid.'
      });
    }

    res.json({ message: 'Daily milk status updated successfully.' });
  } catch (err) {
    console.error('Error updating daily milk status:', err);
    next(err);
  }
});


// router.put('/', async (req, res, next) => {
//   try {
//     const id = req.body.transid;

//     // Define the fields that are allowed to be updated in tbl_dailymilkstatus
//     const allowedFields = [
//       'dailymilkbookingid',
//       'date',
//       'quantity',
//       'cancelled',
//       'extra',
//       'amount',
//       'received',
//       'receivedtime',
//       'luu' // Last Updated User
//     ];

//     const updates = [];
//     const request = pool.request();

//     request.input('transid', sql.NVarChar, id);

//     allowedFields.forEach(f => {
//       if (req.body[f] !== undefined) { // Check if the field is present
//         updates.push(`${f} = @${f}`);

//         // Use appropriate SQL types for inputs based on your table schema
//         if (f === 'quantity' || f === 'extra' || f === 'amount') {
//           request.input(f,  req.body[f]);
//         } else if (f === 'receivedtime') {
//           request.input(f,  req.body[f]); // For datetime column
//         } else if (f === 'date') {
//           request.input(f,  req.body[f]); // Assuming date is varchar(max)
//         } else {
//           request.input(f,  req.body[f]); // Default for other varchar fields
//         }
//       }
//     });

//     if (updates.length === 0) {
//       return res.status(400).json({ message: 'No valid fields provided to update.' });
//     }

//     const setClause = updates.join(', ') + ', lum = DATEADD(MINUTE, 330, GETUTCDATE())'; // Update last modified timestamp

//     await poolConnect;

//     const result = await request.query(`
//         UPDATE tbl_dailymilkstatus
//         SET ${setClause}
//         WHERE transid = @transid;
//         SELECT @@ROWCOUNT AS affected;
//     `);

//     if (result.recordset[0].affected === 0) {
//       // Changed message to reflect 'dailymilkstatus'
//       return res.status(404).json({ message: 'Daily milk status record not found with the provided transid.' });
//     }

//     res.json({ message: 'Daily milk status updated successfully.' });

//   } catch (err) {
//     console.error("Error updating daily milk status:", err); // Updated error log
//     next(err);
//   }
// });






// DELETE category by transid in body
router.delete('/', async (req, res, next) => {
  try {
    const id = req.body.transid;
    await poolConnect;
    const result = await pool.request()
      .input('transid', sql.VarChar, id)
      .query(`
          DELETE FROM tbl_dailymilkstatus
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
