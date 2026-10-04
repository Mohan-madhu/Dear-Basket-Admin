const express = require('express');
const router = express.Router();
const { pool, poolConnect, sql } = require('../../config/db_dearbasket');

// GET all Product Reviews
router.get('/', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .query('SELECT * FROM tbl_productreviews ORDER BY rcm DESC;');
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// GET all active product reviews
router.get('/active', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .query('SELECT * FROM tbl_productreviews WHERE isactive = 1 ORDER BY rcm DESC;');
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// GET reviews by product ID
router.get('/product/:productid', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('productid', sql.VarChar(sql.MAX), req.params.productid)
      .query(`SELECT * FROM tbl_productreviews 
              WHERE productid = @productid AND isactive = 1 
              ORDER BY rcm DESC;`);
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// GET reviews by variant ID
router.get('/variant/:variantid', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('variantid', sql.VarChar(sql.MAX), req.params.variantid)
      .query(`SELECT * FROM tbl_productreviews 
              WHERE variantid = @variantid AND isactive = 1 
              ORDER BY rcm DESC;`);
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// GET reviews by user ID
router.get('/user/:userid', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('userid', sql.VarChar(sql.MAX), req.params.userid)
      .query(`SELECT * FROM tbl_productreviews 
              WHERE userid = @userid AND isactive = 1 
              ORDER BY rcm DESC;`);
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// GET reviews with detailed product info
router.get('/detailed', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .query(`SELECT r.*, p.productname, p.productcode, p.categoryname, p.typename,
                     v.variantname, v.sku
              FROM tbl_productreviews r
              INNER JOIN tbl_products_new p ON p.productid = r.productid
              LEFT JOIN tbl_productvariants v ON v.variantid = r.variantid
              WHERE r.isactive = 1 AND p.isactive = 1
              ORDER BY r.rcm DESC;`);
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// GET reviews with detailed info for specific product
router.get('/detailed/product/:productid', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('productid', sql.VarChar(sql.MAX), req.params.productid)
      .query(`SELECT r.*, p.productname, p.productcode, p.categoryname, p.typename,
                     v.variantname, v.sku, u.username, u.firstname, u.lastname
              FROM tbl_productreviews r
              INNER JOIN tbl_products_new p ON p.productid = r.productid
              LEFT JOIN tbl_productvariants v ON v.variantid = r.variantid
              LEFT JOIN tbl_users u ON u.userid = r.userid
              WHERE r.productid = @productid AND r.isactive = 1 AND p.isactive = 1
              ORDER BY r.rcm DESC;`);
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// GET verified purchase reviews only
router.get('/verified', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .query(`SELECT r.*, p.productname, p.productcode
              FROM tbl_productreviews r
              INNER JOIN tbl_products_new p ON p.productid = r.productid
              WHERE r.isverifiedpurchase = 1 AND r.isactive = 1 AND p.isactive = 1
              ORDER BY r.rcm DESC;`);
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// GET reviews by rating range
router.get('/rating/:minrating/:maxrating', async (req, res, next) => {
  try {
    const minRating = parseFloat(req.params.minrating);
    const maxRating = parseFloat(req.params.maxrating);

    if (isNaN(minRating) || isNaN(maxRating) || minRating < 0 || maxRating > 5) {
      return res.status(400).json({ message: 'Invalid rating range. Must be between 0 and 5.' });
    }

    await poolConnect;
    const result = await pool.request()
      .input('minrating', sql.Decimal(2, 1), minRating)
      .input('maxrating', sql.Decimal(2, 1), maxRating)
      .query(`SELECT r.*, p.productname, p.productcode
              FROM tbl_productreviews r
              INNER JOIN tbl_products_new p ON p.productid = r.productid
              WHERE r.rating BETWEEN @minrating AND @maxrating 
                AND r.isactive = 1 AND p.isactive = 1
              ORDER BY r.rating DESC, r.rcm DESC;`);
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// GET product rating statistics
router.get('/stats/product/:productid', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('productid', sql.VarChar(sql.MAX), req.params.productid)
      .query(`SELECT 
                COUNT(*) as total_reviews,
                AVG(CAST(rating as FLOAT)) as average_rating,
                COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star,
                COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star,
                COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star,
                COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star,
                COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star,
                COUNT(CASE WHEN isverifiedpurchase = 1 THEN 1 END) as verified_reviews
              FROM tbl_productreviews 
              WHERE productid = @productid AND isactive = 1;`);
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// GET review by reviewid
router.get('/:id', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('reviewid', sql.VarChar(sql.MAX), req.params.id)
      .query('SELECT * FROM tbl_productreviews WHERE reviewid = @reviewid;');
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// SEARCH reviews by title or text
router.get('/search/:searchterm', async (req, res, next) => {
  try {
    await poolConnect;
    const searchTerm = `%${req.params.searchterm}%`;
    const result = await pool.request()
      .input('searchTerm', sql.NVarChar, searchTerm)
      .query(`SELECT r.*, p.productname, p.productcode
              FROM tbl_productreviews r
              INNER JOIN tbl_products_new p ON p.productid = r.productid
              WHERE (r.reviewtitle LIKE @searchTerm 
                 OR r.reviewtext LIKE @searchTerm
                 OR p.productname LIKE @searchTerm) 
                AND r.isactive = 1 AND p.isactive = 1
              ORDER BY r.rcm DESC;`);
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// POST - Create new product review
router.post('/', async (req, res, next) => {
  try {
    const {
      reviewid,
      productid,
      variantid,
      userid,
      rating,
      reviewtitle,
      reviewtext,
      isverifiedpurchase,
      isactive,
      rcu // Record Created User (mandatory)
    } = req.body;

    // Basic Input Validation
    if (!productid || !userid || !rcu) {
      return res.status(400).json({
        message: "Missing required fields. Please provide productid, userid, and rcu."
      });
    }

    // Validate rating
    if (rating !== undefined && rating !== null) {
      const ratingValue = parseFloat(rating);
      if (isNaN(ratingValue) || ratingValue < 0 || ratingValue > 5) {
        return res.status(400).json({
          message: "Rating must be a number between 0 and 5."
        });
      }
    }

    // Validate review title length
    if (reviewtitle && reviewtitle.length > 200) {
      return res.status(400).json({
        message: "Review title cannot exceed 200 characters."
      });
    }

    // Check if productid exists
    await poolConnect;
    const productCheck = await pool.request()
      .input('productid', sql.VarChar(sql.MAX), productid)
      .query('SELECT COUNT(*) as count FROM tbl_products_new WHERE productid = @productid AND isactive = 1;');
    
    if (productCheck.recordset[0].count === 0) {
      return res.status(400).json({
        message: "Product ID does not exist or is inactive."
      });
    }

    // Check if variantid exists (if provided)
    if (variantid) {
      const variantCheck = await pool.request()
        .input('variantid', sql.VarChar(sql.MAX), variantid)
        .input('productid', sql.VarChar(sql.MAX), productid)
        .query(`SELECT COUNT(*) as count FROM tbl_productvariants 
                WHERE variantid = @variantid AND productid = @productid AND isactive = 1;`);
      
      if (variantCheck.recordset[0].count === 0) {
        return res.status(400).json({
          message: "Variant ID does not exist, is inactive, or does not belong to the specified product."
        });
      }
    }

    // Check if userid exists
    const userCheck = await pool.request()
      .input('userid', sql.VarChar(sql.MAX), userid)
      .query('SELECT COUNT(*) as count FROM tbl_users WHERE userid = @userid AND isactive = 1;');
    
    if (userCheck.recordset[0].count === 0) {
      return res.status(400).json({
        message: "User ID does not exist or is inactive."
      });
    }

    // Check for duplicate review (same user, product, variant combination)
    const duplicateCheck = await pool.request()
      .input('userid', sql.VarChar(sql.MAX), userid)
      .input('productid', sql.VarChar(sql.MAX), productid)
      .input('variantid', sql.VarChar(sql.MAX), variantid || null)
      .query(`SELECT COUNT(*) as count FROM tbl_productreviews 
              WHERE userid = @userid AND productid = @productid 
              AND (variantid = @variantid OR (variantid IS NULL AND @variantid IS NULL))
              AND isactive = 1;`);
    
    if (duplicateCheck.recordset[0].count > 0) {
      return res.status(400).json({
        message: "User has already reviewed this product/variant combination."
      });
    }

    // Generate unique reviewid if not provided
    const generatedReviewId = reviewid || `REV_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const result = await pool.request()
      .input('reviewid', sql.VarChar(sql.MAX), generatedReviewId)
      .input('productid', sql.VarChar(sql.MAX), productid)
      .input('variantid', sql.VarChar(sql.MAX), variantid || null)
      .input('userid', sql.VarChar(sql.MAX), userid)
      .input('rating', sql.Decimal(2, 1), rating || null)
      .input('reviewtitle', sql.NVarChar(200), reviewtitle || null)
      .input('reviewtext', sql.NVarChar(sql.MAX), reviewtext || null)
      .input('isverifiedpurchase', sql.Bit, isverifiedpurchase !== undefined ? isverifiedpurchase : false)
      .input('isactive', sql.Bit, isactive !== undefined ? isactive : true)
      .input('rcu', sql.VarChar(sql.MAX), rcu)
      .query(`
        INSERT INTO tbl_productreviews
          (reviewid, productid, variantid, userid, rating, reviewtitle, reviewtext, 
           isverifiedpurchase, isactive, rcu, rcm)
        VALUES
          (@reviewid, @productid, @variantid, @userid, @rating, @reviewtitle, @reviewtext,
           @isverifiedpurchase, @isactive, @rcu, GETDATE());
        
        SELECT * FROM tbl_productreviews WHERE reviewid = @reviewid;
      `);

    res.status(201).json({
      message: "Product review created successfully.",
      review: result.recordset[0]
    });

  } catch (err) {
    console.error("Error creating product review:", err);
    next(err);
  }
});

// PUT - Update product review
router.put('/', async (req, res, next) => {
  try {
    const id = req.body.reviewid;

    if (!id) {
      return res.status(400).json({ message: 'Review ID is required.' });
    }

    // Define allowed fields for update
    const allowedFields = [
      'rating',
      'reviewtitle',
      'reviewtext',
      'isverifiedpurchase',
      'isactive',
      'luu' // Last Updated User
    ];

    const updates = [];
    const request = pool.request();

    // Input reviewid for WHERE clause
    request.input('reviewid', sql.VarChar(sql.MAX), id);

    // Validate rating if being updated
    if (req.body.rating !== undefined && req.body.rating !== null) {
      const ratingValue = parseFloat(req.body.rating);
      if (isNaN(ratingValue) || ratingValue < 0 || ratingValue > 5) {
        return res.status(400).json({
          message: "Rating must be a number between 0 and 5."
        });
      }
    }

    // Validate review title length if being updated
    if (req.body.reviewtitle && req.body.reviewtitle.length > 200) {
      return res.status(400).json({
        message: "Review title cannot exceed 200 characters."
      });
    }

    // Dynamically build UPDATE SET clause
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = @${field}`);

        // Use appropriate SQL types
        switch (field) {
          case 'rating':
            request.input(field, sql.Decimal(2, 1), req.body[field]);
            break;
          case 'reviewtitle':
            request.input(field, sql.NVarChar(200), req.body[field]);
            break;
          case 'reviewtext':
            request.input(field, sql.NVarChar(sql.MAX), req.body[field]);
            break;
          case 'isverifiedpurchase':
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
        UPDATE tbl_productreviews
        SET ${setClause}
        WHERE reviewid = @reviewid;
        SELECT @@ROWCOUNT AS affected;
    `);

    if (result.recordset[0].affected === 0) {
      return res.status(404).json({ message: 'Product review not found with the provided ID.' });
    }

    res.json({ message: 'Product review updated successfully.' });

  } catch (err) {
    console.error("Error updating product review:", err);
    next(err);
  }
});

// PUT - Update review status (activate/deactivate)
router.put('/status', async (req, res, next) => {
  try {
    const { reviewid, isactive, luu } = req.body;

    if (!reviewid || isactive === undefined || !luu) {
      return res.status(400).json({ 
        message: 'Review ID, isactive status, and luu are required.' 
      });
    }

    await poolConnect;
    const result = await pool.request()
      .input('reviewid', sql.VarChar(sql.MAX), reviewid)
      .input('isactive', sql.Bit, isactive)
      .input('luu', sql.VarChar(sql.MAX), luu)
      .query(`
        UPDATE tbl_productreviews
        SET isactive = @isactive, luu = @luu, lcm = GETDATE()
        WHERE reviewid = @reviewid;
        SELECT @@ROWCOUNT AS affected;
      `);

    if (result.recordset[0].affected === 0) {
      return res.status(404).json({ message: 'Product review not found.' });
    }

    res.json({ 
      message: `Product review ${isactive ? 'activated' : 'deactivated'} successfully.` 
    });

  } catch (err) {
    console.error("Error updating review status:", err);
    next(err);
  }
});

// PUT - Verify purchase status
router.put('/verify', async (req, res, next) => {
  try {
    const { reviewid, isverifiedpurchase, luu } = req.body;

    if (!reviewid || isverifiedpurchase === undefined || !luu) {
      return res.status(400).json({ 
        message: 'Review ID, verification status, and luu are required.' 
      });
    }

    await poolConnect;
    const result = await pool.request()
      .input('reviewid', sql.VarChar(sql.MAX), reviewid)
      .input('isverifiedpurchase', sql.Bit, isverifiedpurchase)
      .input('luu', sql.VarChar(sql.MAX), luu)
      .query(`
        UPDATE tbl_productreviews
        SET isverifiedpurchase = @isverifiedpurchase, luu = @luu, lcm = GETDATE()
        WHERE reviewid = @reviewid;
        SELECT @@ROWCOUNT AS affected;
      `);

    if (result.recordset[0].affected === 0) {
      return res.status(404).json({ message: 'Product review not found.' });
    }

    res.json({ 
      message: `Review verification ${isverifiedpurchase ? 'confirmed' : 'removed'} successfully.` 
    });

  } catch (err) {
    console.error("Error updating verification status:", err);
    next(err);
  }
});

// PUT - Bulk update review status
router.put('/bulkstatus', async (req, res, next) => {
  let transaction;
  try {
    const { reviewids, isactive, luu } = req.body; // reviewids: [id1, id2, id3...]

    if (!reviewids || !Array.isArray(reviewids) || reviewids.length === 0 || isactive === undefined || !luu) {
      return res.status(400).json({ 
        message: 'Review IDs array, status, and luu are required.' 
      });
    }

    await poolConnect;
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    let updatedCount = 0;

    for (let reviewid of reviewids) {
      const statusRequest = new sql.Request(transaction);
      const result = await statusRequest
        .input('reviewid', sql.VarChar(sql.MAX), reviewid)
        .input('isactive', sql.Bit, isactive)
        .input('luu', sql.VarChar(sql.MAX), luu)
        .query(`
          UPDATE tbl_productreviews
          SET isactive = @isactive, luu = @luu, lcm = GETDATE()
          WHERE reviewid = @reviewid;
          SELECT @@ROWCOUNT AS affected;
        `);

      updatedCount += result.recordset[0].affected;
    }

    await transaction.commit();

    res.json({ 
      message: `Bulk status update completed. ${updatedCount} reviews updated.` 
    });

  } catch (err) {
    if (transaction) {
      try {
        await transaction.rollback();
        console.error("Transaction rolled back due to error:", err);
      } catch (rollbackErr) {
        console.error("Error during transaction rollback:", rollbackErr);
      }
    }
    console.error("Error in bulk status update:", err);
    next(err);
  }
});

// DELETE - Soft delete (deactivate) review
router.delete('/', async (req, res, next) => {
  try {
    const { reviewid, luu } = req.body;

    if (!reviewid || !luu) {
      return res.status(400).json({ 
        message: 'Review ID and luu are required.' 
      });
    }

    await poolConnect;
    const result = await pool.request()
      .input('reviewid', sql.VarChar(sql.MAX), reviewid)
      .input('luu', sql.VarChar(sql.MAX), luu)
      .query(`
        UPDATE tbl_productreviews
        SET isactive = 0, luu = @luu, lcm = GETDATE()
        WHERE reviewid = @reviewid;
        SELECT @@ROWCOUNT AS affected;
      `);

    if (result.recordset[0].affected === 0) {
      return res.status(404).json({ message: 'Product review not found.' });
    }

    res.json({ message: 'Product review deactivated successfully.' });

  } catch (err) {
    console.error("Error deactivating product review:", err);
    next(err);
  }
});

// DELETE - Hard delete review (permanent deletion)
router.delete('/permanent', async (req, res, next) => {
  try {
    const { reviewid } = req.body;

    if (!reviewid) {
      return res.status(400).json({ message: 'Review ID is required.' });
    }

    await poolConnect;
    const result = await pool.request()
      .input('reviewid', sql.VarChar(sql.MAX), reviewid)
      .query(`
        DELETE FROM tbl_productreviews
        WHERE reviewid = @reviewid;
        SELECT @@ROWCOUNT AS affected;
      `);

    if (result.recordset[0].affected === 0) {
      return res.status(404).json({ message: 'Product review not found.' });
    }

    res.json({ message: 'Product review deleted permanently.' });

  } catch (err) {
    console.error("Error deleting product review permanently:", err);
    next(err);
  }
});

// DELETE - Delete all reviews for a product
router.delete('/product', async (req, res, next) => {
  try {
    const { productid, luu } = req.body;

    if (!productid || !luu) {
      return res.status(400).json({ 
        message: 'Product ID and luu are required.' 
      });
    }

    await poolConnect;
    const result = await pool.request()
      .input('productid', sql.VarChar(sql.MAX), productid)
      .input('luu', sql.VarChar(sql.MAX), luu)
      .query(`
        UPDATE tbl_productreviews
        SET isactive = 0, luu = @luu, lcm = GETDATE()
        WHERE productid = @productid;
        SELECT @@ROWCOUNT AS affected;
      `);

    res.json({ 
      message: `${result.recordset[0].affected} product reviews deactivated successfully.` 
    });

  } catch (err) {
    console.error("Error deactivating product reviews:", err);
    next(err);
  }
});

// DELETE - Delete all reviews by a user
router.delete('/user', async (req, res, next) => {
  try {
    const { userid, luu } = req.body;

    if (!userid || !luu) {
      return res.status(400).json({ 
        message: 'User ID and luu are required.' 
      });
    }

    await poolConnect;
    const result = await pool.request()
      .input('userid', sql.VarChar(sql.MAX), userid)
      .input('luu', sql.VarChar(sql.MAX), luu)
      .query(`
        UPDATE tbl_productreviews
        SET isactive = 0, luu = @luu, lcm = GETDATE()
        WHERE userid = @userid;
        SELECT @@ROWCOUNT AS affected;
      `);

    res.json({ 
      message: `${result.recordset[0].affected} user reviews deactivated successfully.` 
    });

  } catch (err) {
    console.error("Error deactivating user reviews:", err);
    next(err);
  }
});

module.exports = router;