const express = require('express');
const router = express.Router();
const { pool, poolConnect, sql } = require('../../config/db_dearbasket');

// GET all Offers
router.get('/', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .query('SELECT * FROM tbl_offers ORDER BY rcm DESC;');
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// GET all active offers
router.get('/active', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .query('SELECT * FROM tbl_offers WHERE isactive = 1 ORDER BY rcm DESC;');
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// GET current active offers (within date range)
router.get('/current', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .query(`SELECT * FROM tbl_offers 
              WHERE isactive = 1 
                AND startdate <= GETDATE() 
                AND enddate >= GETDATE()
                AND (usagelimit IS NULL OR usagecount < usagelimit)
              ORDER BY startdate DESC;`);
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// GET offers by type
router.get('/type/:offertype', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('offertype', sql.NVarChar(50), req.params.offertype)
      .query(`SELECT * FROM tbl_offers 
              WHERE offertype = @offertype AND isactive = 1
              ORDER BY rcm DESC;`);
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// GET upcoming offers
router.get('/upcoming', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .query(`SELECT * FROM tbl_offers 
              WHERE isactive = 1 AND startdate > GETDATE()
              ORDER BY startdate ASC;`);
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// GET expired offers
router.get('/expired', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .query(`SELECT * FROM tbl_offers 
              WHERE enddate < GETDATE()
              ORDER BY enddate DESC;`);
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// GET offers by value range
router.get('/value/:minvalue/:maxvalue', async (req, res, next) => {
  try {
    const minValue = parseFloat(req.params.minvalue);
    const maxValue = parseFloat(req.params.maxvalue);

    if (isNaN(minValue) || isNaN(maxValue) || minValue < 0 || maxValue < minValue) {
      return res.status(400).json({ message: 'Invalid value range.' });
    }

    await poolConnect;
    const result = await pool.request()
      .input('minvalue', sql.Decimal(10, 2), minValue)
      .input('maxvalue', sql.Decimal(10, 2), maxValue)
      .query(`SELECT * FROM tbl_offers 
              WHERE offervalue BETWEEN @minvalue AND @maxvalue 
                AND isactive = 1
              ORDER BY offervalue DESC;`);
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// GET offers with usage statistics
router.get('/stats', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .query(`SELECT *,
                CASE 
                  WHEN usagelimit IS NULL THEN 'Unlimited'
                  ELSE CAST((usagelimit - ISNULL(usagecount, 0)) AS VARCHAR)
                END as remaining_usage,
                CASE 
                  WHEN usagelimit IS NULL THEN 0
                  ELSE CAST((ISNULL(usagecount, 0) * 100.0 / usagelimit) AS DECIMAL(5,2))
                END as usage_percentage,
                CASE 
                  WHEN GETDATE() < startdate THEN 'Upcoming'
                  WHEN GETDATE() > enddate THEN 'Expired'
                  WHEN isactive = 0 THEN 'Inactive'
                  WHEN usagelimit IS NOT NULL AND usagecount >= usagelimit THEN 'Limit Reached'
                  ELSE 'Active'
                END as offer_status
              FROM tbl_offers 
              ORDER BY rcm DESC;`);
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// GET offer by offerid
router.get('/:id', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('offerid', sql.VarChar(sql.MAX), req.params.id)
      .query('SELECT * FROM tbl_offers WHERE offerid = @offerid;');
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// SEARCH offers by title or description
router.get('/search/:searchterm', async (req, res, next) => {
  try {
    await poolConnect;
    const searchTerm = `%${req.params.searchterm}%`;
    const result = await pool.request()
      .input('searchTerm', sql.NVarChar, searchTerm)
      .query(`SELECT * FROM tbl_offers
              WHERE (offertitle LIKE @searchTerm 
                 OR offerdescription LIKE @searchTerm
                 OR offertype LIKE @searchTerm) 
                AND isactive = 1
              ORDER BY rcm DESC;`);
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// POST - Create new offer
router.post('/', async (req, res, next) => {
  try {
    const {
      offerid,
      offertitle,
      offerdescription,
      offertype,
      offervalue,
      minordervalue,
      maxdiscountamount,
      startdate,
      enddate,
      isactive,
      usagelimit,
      usagecount,
      rcu // Record Created User (mandatory)
    } = req.body;

    // Basic Input Validation
    if (!offertitle || !offertype || !startdate || !enddate || !rcu) {
      return res.status(400).json({
        message: "Missing required fields. Please provide offertitle, offertype, startdate, enddate, and rcu."
      });
    }

    // Validate field lengths
    if (offertitle.length > 200) {
      return res.status(400).json({
        message: "Offer title cannot exceed 200 characters."
      });
    }

    if (offerdescription && offerdescription.length > 500) {
      return res.status(400).json({
        message: "Offer description cannot exceed 500 characters."
      });
    }

    if (offertype.length > 50) {
      return res.status(400).json({
        message: "Offer type cannot exceed 50 characters."
      });
    }

    // Validate dates
    const startDate = new Date(startdate);
    const endDate = new Date(enddate);
    const currentDate = new Date();

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({
        message: "Invalid date format. Please provide valid start and end dates."
      });
    }

    if (endDate <= startDate) {
      return res.status(400).json({
        message: "End date must be after start date."
      });
    }

    // Validate numeric fields
    if (offervalue !== undefined && offervalue !== null) {
      if (isNaN(parseFloat(offervalue)) || offervalue < 0) {
        return res.status(400).json({
          message: "Offer value must be a valid non-negative number."
        });
      }
    }

    // if (minordervalue !== undefined && minordervalue !== null) {
    //   if (isNaN(parseFloat(minordervalue)) || minordervalue < 0) {
    //     return res.status(400).json({
    //       message: "Minimum order value must be a valid non-negative number."
    //     });
    //   }
    // }

    // if (maxdiscountamount !== undefined && maxdiscountamount !== null) {
    //   if (isNaN(parseFloat(maxdiscountamount)) || maxdiscountamount < 0) {
    //     return res.status(400).json({
    //       message: "Maximum discount amount must be a valid non-negative number."
    //     });
    //   }
    // }

    // if (usagelimit !== undefined && usagelimit !== null) {
    //   if (isNaN(parseInt(usagelimit)) || usagelimit < 1) {
    //     return res.status(400).json({
    //       message: "Usage limit must be a valid positive integer."
    //     });
    //   }
    // }

    // if (usagecount !== undefined && usagecount !== null) {
    //   if (isNaN(parseInt(usagecount)) || usagecount < 0) {
    //     return res.status(400).json({
    //       message: "Usage count must be a valid non-negative integer."
    //     });
    //   }
    // }

    // // Business rule validation
    // if (usagecount !== undefined && usagelimit !== undefined && usagecount > usagelimit) {
    //   return res.status(400).json({
    //     message: "Usage count cannot exceed usage limit."
    //   });
    // }

    // Generate unique offerid if not provided
    await poolConnect;
    const generatedOfferId = offerid || `OFF_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const result = await pool.request()
      .input('offerid', sql.VarChar(sql.MAX), generatedOfferId)
      .input('offertitle', sql.NVarChar(200), offertitle)
      .input('offerdescription', sql.NVarChar(500), offerdescription || null)
      .input('offertype', sql.NVarChar(50), offertype)
      .input('offervalue', sql.Decimal(10, 2), offervalue || null)
      .input('minordervalue', sql.Decimal(10, 2), minordervalue || null)
      .input('maxdiscountamount', sql.Decimal(10, 2), maxdiscountamount || null)
      .input('startdate', sql.DateTime2(7), startdate)
      .input('enddate', sql.DateTime2(7), enddate)
      .input('isactive', sql.Bit, isactive !== undefined ? isactive : true)
      .input('usagelimit', sql.Int, usagelimit || null)
      .input('usagecount', sql.Int, usagecount !== undefined ? usagecount : 0)
      .input('rcu', sql.VarChar(sql.MAX), rcu)
      .query(`
        INSERT INTO tbl_offers
          (offerid, offertitle, offerdescription, offertype, offervalue, minordervalue, 
           maxdiscountamount, startdate, enddate, isactive, usagelimit, usagecount, rcu, rcm)
        VALUES
          (@offerid, @offertitle, @offerdescription, @offertype, @offervalue, @minordervalue,
           @maxdiscountamount, @startdate, @enddate, @isactive, @usagelimit, @usagecount, @rcu, GETDATE());
        
        SELECT * FROM tbl_offers WHERE offerid = @offerid;
      `);

    res.status(201).json({
      message: "Offer created successfully.",
      offer: result.recordset[0]
    });

  } catch (err) {
    console.error("Error creating offer:", err);
    next(err);
  }
});

// PUT - Update offer
router.put('/', async (req, res, next) => {
  try {
    const id = req.body.offerid;

    if (!id) {
      return res.status(400).json({ message: 'Offer ID is required.' });
    }

    // Define allowed fields for update
    const allowedFields = [
      'offertitle',
      'offerdescription',
      'offertype',
      'offervalue',
      'minordervalue',
      'maxdiscountamount',
      'startdate',
      'enddate',
      'isactive',
      'usagelimit',
      'luu' // Last Updated User
    ];

    const updates = [];
    const request = pool.request();

    // Input offerid for WHERE clause
    request.input('offerid', sql.VarChar(sql.MAX), id);

    // Validate field lengths if being updated
    if (req.body.offertitle && req.body.offertitle.length > 200) {
      return res.status(400).json({
        message: "Offer title cannot exceed 200 characters."
      });
    }

    if (req.body.offerdescription && req.body.offerdescription.length > 500) {
      return res.status(400).json({
        message: "Offer description cannot exceed 500 characters."
      });
    }

    if (req.body.offertype && req.body.offertype.length > 50) {
      return res.status(400).json({
        message: "Offer type cannot exceed 50 characters."
      });
    }

    // Validate dates if being updated
    if (req.body.startdate || req.body.enddate) {
      await poolConnect;
      
      // Get current dates if only one is being updated
      const currentRecord = await pool.request()
        .input('offerid', sql.VarChar(sql.MAX), id)
        .query('SELECT startdate, enddate FROM tbl_offers WHERE offerid = @offerid;');
      
      if (currentRecord.recordset.length === 0) {
        return res.status(404).json({ message: 'Offer not found.' });
      }

      const currentStart = req.body.startdate ? new Date(req.body.startdate) : currentRecord.recordset[0].startdate;
      const currentEnd = req.body.enddate ? new Date(req.body.enddate) : currentRecord.recordset[0].enddate;

      if (isNaN(currentStart.getTime()) || isNaN(currentEnd.getTime())) {
        return res.status(400).json({
          message: "Invalid date format."
        });
      }

      if (currentEnd <= currentStart) {
        return res.status(400).json({
          message: "End date must be after start date."
        });
      }
    }

    // Validate numeric fields if being updated
    if (req.body.offervalue !== undefined && req.body.offervalue !== null) {
      if (isNaN(parseFloat(req.body.offervalue)) || req.body.offervalue < 0) {
        return res.status(400).json({
          message: "Offer value must be a valid non-negative number."
        });
      }
    }

    if (req.body.usagelimit !== undefined && req.body.usagelimit !== null) {
      if (isNaN(parseInt(req.body.usagelimit)) || req.body.usagelimit < 1) {
        return res.status(400).json({
          message: "Usage limit must be a valid positive integer."
        });
      }
    }

    // Dynamically build UPDATE SET clause
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = @${field}`);

        // Use appropriate SQL types
        switch (field) {
          case 'offertitle':
            request.input(field, sql.NVarChar(200), req.body[field]);
            break;
          case 'offerdescription':
            request.input(field, sql.NVarChar(500), req.body[field]);
            break;
          case 'offertype':
            request.input(field, sql.NVarChar(50), req.body[field]);
            break;
          case 'offervalue':
          case 'minordervalue':
          case 'maxdiscountamount':
            request.input(field, sql.Decimal(10, 2), req.body[field]);
            break;
          case 'startdate':
          case 'enddate':
            request.input(field, sql.DateTime2(7), req.body[field]);
            break;
          case 'usagelimit':
            request.input(field, sql.Int, req.body[field]);
            break;
          case 'isactive':
            request.input(field, sql.Bit, req.body[field]);
            break;
          default:
            request.input(field, sql.VarChar(sql.MAX), req.body[field]);
        }
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No valid fields provided to update.' });
    }

    const setClause = updates.join(', ') + ', lcm = GETDATE()';

    await poolConnect;
    const result = await request.query(`
        UPDATE tbl_offers
        SET ${setClause}
        WHERE offerid = @offerid;
        SELECT @@ROWCOUNT AS affected;
    `);

    if (result.recordset[0].affected === 0) {
      return res.status(404).json({ message: 'Offer not found with the provided ID.' });
    }

    res.json({ message: 'Offer updated successfully.' });

  } catch (err) {
    console.error("Error updating offer:", err);
    next(err);
  }
});

// PUT - Update offer status (activate/deactivate)
router.put('/status', async (req, res, next) => {
  try {
    const { offerid, isactive, luu } = req.body;

    if (!offerid || isactive === undefined || !luu) {
      return res.status(400).json({ 
        message: 'Offer ID, isactive status, and luu are required.' 
      });
    }

    await poolConnect;
    const result = await pool.request()
      .input('offerid', sql.VarChar(sql.MAX), offerid)
      .input('isactive', sql.Bit, isactive)
      .input('luu', sql.VarChar(sql.MAX), luu)
      .query(`
        UPDATE tbl_offers
        SET isactive = @isactive, luu = @luu, lcm = GETDATE()
        WHERE offerid = @offerid;
        SELECT @@ROWCOUNT AS affected;
      `);

    if (result.recordset[0].affected === 0) {
      return res.status(404).json({ message: 'Offer not found.' });
    }

    res.json({ 
      message: `Offer ${isactive ? 'activated' : 'deactivated'} successfully.` 
    });

  } catch (err) {
    console.error("Error updating offer status:", err);
    next(err);
  }
});

// PUT - Update usage count (increment when offer is used)
router.put('/usage', async (req, res, next) => {
  try {
    const { offerid, increment, luu } = req.body;

    if (!offerid || increment === undefined || !luu) {
      return res.status(400).json({ 
        message: 'Offer ID, increment value, and luu are required.' 
      });
    }

    const incrementValue = parseInt(increment);
    if (isNaN(incrementValue) || incrementValue < 1) {
      return res.status(400).json({
        message: "Increment must be a positive integer."
      });
    }

    await poolConnect;
    
    // Check current usage and limit
    const checkResult = await pool.request()
      .input('offerid', sql.VarChar(sql.MAX), offerid)
      .query(`SELECT usagecount, usagelimit, isactive, startdate, enddate 
              FROM tbl_offers WHERE offerid = @offerid;`);

    if (checkResult.recordset.length === 0) {
      return res.status(404).json({ message: 'Offer not found.' });
    }

    const offer = checkResult.recordset[0];
    const currentUsage = offer.usagecount || 0;
    const newUsage = currentUsage + incrementValue;

    // Validate offer can be used
    if (!offer.isactive) {
      return res.status(400).json({ message: 'Offer is not active.' });
    }

    const currentDate = new Date();
    if (currentDate < offer.startdate || currentDate > offer.enddate) {
      return res.status(400).json({ message: 'Offer is not within valid date range.' });
    }

    if (offer.usagelimit && newUsage > offer.usagelimit) {
      return res.status(400).json({ 
        message: `Usage limit exceeded. Current: ${currentUsage}, Limit: ${offer.usagelimit}` 
      });
    }

    // Update usage count
    const result = await pool.request()
      .input('offerid', sql.VarChar(sql.MAX), offerid)
      .input('newusage', sql.Int, newUsage)
      .input('luu', sql.VarChar(sql.MAX), luu)
      .query(`
        UPDATE tbl_offers
        SET usagecount = @newusage, luu = @luu, lcm = GETDATE()
        WHERE offerid = @offerid;
        SELECT @@ROWCOUNT AS affected;
      `);

    res.json({ 
      message: `Offer usage updated successfully. New count: ${newUsage}` 
    });

  } catch (err) {
    console.error("Error updating offer usage:", err);
    next(err);
  }
});

// PUT - Extend offer dates
router.put('/extend', async (req, res, next) => {
  try {
    const { offerid, newEndDate, luu } = req.body;

    if (!offerid || !newEndDate || !luu) {
      return res.status(400).json({ 
        message: 'Offer ID, new end date, and luu are required.' 
      });
    }

    const endDate = new Date(newEndDate);
    if (isNaN(endDate.getTime())) {
      return res.status(400).json({
        message: "Invalid end date format."
      });
    }

    await poolConnect;
    
    // Check current offer
    const checkResult = await pool.request()
      .input('offerid', sql.VarChar(sql.MAX), offerid)
      .query('SELECT startdate, enddate FROM tbl_offers WHERE offerid = @offerid;');

    if (checkResult.recordset.length === 0) {
      return res.status(404).json({ message: 'Offer not found.' });
    }

    const currentOffer = checkResult.recordset[0];
    if (endDate <= currentOffer.startdate) {
      return res.status(400).json({
        message: "New end date must be after start date."
      });
    }

    const result = await pool.request()
      .input('offerid', sql.VarChar(sql.MAX), offerid)
      .input('enddate', sql.DateTime2(7), newEndDate)
      .input('luu', sql.VarChar(sql.MAX), luu)
      .query(`
        UPDATE tbl_offers
        SET enddate = @enddate, luu = @luu, lcm = GETDATE()
        WHERE offerid = @offerid;
        SELECT @@ROWCOUNT AS affected;
      `);

    res.json({ message: 'Offer end date extended successfully.' });

  } catch (err) {
    console.error("Error extending offer:", err);
    next(err);
  }
});

// DELETE - Soft delete (deactivate) offer
router.delete('/', async (req, res, next) => {
  try {
    const { offerid, luu } = req.body;

    if (!offerid || !luu) {
      return res.status(400).json({ 
        message: 'Offer ID and luu are required.' 
      });
    }

    await poolConnect;
    const result = await pool.request()
      .input('offerid', sql.VarChar(sql.MAX), offerid)
      .input('luu', sql.VarChar(sql.MAX), luu)
      .query(`
        UPDATE tbl_offers
        SET isactive = 0, luu = @luu, lcm = GETDATE()
        WHERE offerid = @offerid;
        SELECT @@ROWCOUNT AS affected;
      `);

    if (result.recordset[0].affected === 0) {
      return res.status(404).json({ message: 'Offer not found.' });
    }

    res.json({ message: 'Offer deactivated successfully.' });

  } catch (err) {
    console.error("Error deactivating offer:", err);
    next(err);
  }
});

// DELETE - Hard delete offer (permanent deletion)
router.delete('/permanent', async (req, res, next) => {
  try {
    const { offerid } = req.body;

    if (!offerid) {
      return res.status(400).json({ message: 'Offer ID is required.' });
    }

    await poolConnect;
    const result = await pool.request()
      .input('offerid', sql.VarChar(sql.MAX), offerid)
      .query(`
        DELETE FROM tbl_offers
        WHERE offerid = @offerid;
        SELECT @@ROWCOUNT AS affected;
      `);

    if (result.recordset[0].affected === 0) {
      return res.status(404).json({ message: 'Offer not found.' });
    }

    res.json({ message: 'Offer deleted permanently.' });

  } catch (err) {
    console.error("Error deleting offer permanently:", err);
    next(err);
  }
});

// DELETE - Bulk deactivate expired offers
router.delete('/expired', async (req, res, next) => {
  try {
    const { luu } = req.body;

    if (!luu) {
      return res.status(400).json({ message: 'luu is required.' });
    }

    await poolConnect;
    const result = await pool.request()
      .input('luu', sql.VarChar(sql.MAX), luu)
      .query(`
        UPDATE tbl_offers
        SET isactive = 0, luu = @luu, lcm = GETDATE()
        WHERE enddate < GETDATE() AND isactive = 1;
        SELECT @@ROWCOUNT AS affected;
      `);

    res.json({ 
      message: `${result.recordset[0].affected} expired offers deactivated successfully.` 
    });

  } catch (err) {
    console.error("Error deactivating expired offers:", err);
    next(err);
  }
});

module.exports = router;