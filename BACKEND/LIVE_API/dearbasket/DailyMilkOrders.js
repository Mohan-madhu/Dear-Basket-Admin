// routes/API/DearBasket/DailyMilkRegistration.js
const express = require('express');
const router  = express.Router();
const { pool, poolConnect, sql } = require('../../config/db_dearbasket');




router.post('/', async (req, res, next) => {
  try {
    await poolConnect; // Ensure the pool is connected

    // Get startDate and endDate from the request body
    // The client will be responsible for sending these dates
    const { startDate, endDate } = req.body;

    // Basic validation (optional but recommended)
    if (!startDate || !endDate) {
      return res.status(400).json({ error: "Missing startDate or endDate in request body." });
    }

    console.log(`Received dates for query: ${startDate} to ${endDate}`); // For debugging

    const result = await pool.request()
      .query(`SELECT * FROM dbo.GetCompleteMilkOrdersByDateRange('${startDate}', '${endDate}')`);

    res.json({ Response: result.recordset });
  } catch (err) {
    console.error("Database query error:", err);
    next(err); // Pass the error to the next middleware (e.g., an error handler)
  }
});


module.exports = router;
