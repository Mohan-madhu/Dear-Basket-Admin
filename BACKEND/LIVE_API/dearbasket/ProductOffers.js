const express = require('express');
const router = express.Router();
const { pool, poolConnect, sql } = require('../../config/db_dearbasket');

// GET all Product Offers
router.get('/', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .query('SELECT * FROM tbl_productoffers ORDER BY rcm DESC;');
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// GET all active product offers
router.get('/active', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .query('SELECT * FROM tbl_productoffers WHERE isactive = 1 ORDER BY rcm DESC;');
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// GET product offers by offer ID
router.get('/offer/:offerid', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('offerid', sql.VarChar(sql.MAX), req.params.offerid)
      .query(`SELECT * FROM tbl_productoffers 
              WHERE offerid = @offerid 
              ORDER BY rcm DESC;`);
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// GET product offers by product ID
router.get('/product/:productid', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('productid', sql.VarChar(sql.MAX), req.params.productid)
      .query(`SELECT * FROM tbl_productoffers 
              WHERE productid = @productid AND isactive = 1 
              ORDER BY rcm DESC;`);
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// GET product offers with detailed product info (JOIN with products table)
router.get('/detailed', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .query(`SELECT po.*, p.productname, p.productcode, p.categoryname, p.typename
              FROM tbl_productoffers po
              INNER JOIN tbl_products_new p ON p.productid = po.productid
              WHERE po.isactive = 1 AND p.isactive = 1
              ORDER BY po.rcm DESC;`);
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// GET product offers with detailed offer info (JOIN with offers table)
router.get('/detailed/offers', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .query(`SELECT po.*, o.offername, o.offerdescription, o.discounttype, o.discountvalue, 
                     o.startdate, o.enddate, o.isactive as offer_isactive
              FROM tbl_productoffers po
              INNER JOIN tbl_offers o ON o.offerid = po.offerid
              WHERE po.isactive = 1 AND o.isactive = 1
              ORDER BY po.rcm DESC;`);
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// GET product offers with complete details (JOIN with both products and offers)
router.get('/detailed/complete', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .query(`SELECT po.*, 
                     p.productname, p.productcode, p.categoryname, p.typename,
                     o.offername, o.offerdescription, o.discounttype, o.discountvalue,
                     o.startdate, o.enddate, o.isactive as offer_isactive
              FROM tbl_productoffers po
              INNER JOIN tbl_products_new p ON p.productid = po.productid
              INNER JOIN tbl_offers o ON o.offerid = po.offerid
              WHERE po.isactive = 1 AND p.isactive = 1 AND o.isactive = 1
              ORDER BY po.rcm DESC;`);
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// GET product offer by productofferid
router.get('/:id', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('productofferid', sql.VarChar(sql.MAX), req.params.id)
      .query('SELECT * FROM tbl_productoffers WHERE productofferid = @productofferid;');
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// GET active offers for a specific product
router.get('/product/:productid/active', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('productid', sql.VarChar(sql.MAX), req.params.productid)
      .query(`SELECT po.*, o.offername, o.offerdescription, o.discounttype, o.discountvalue,
                     o.startdate, o.enddate
              FROM tbl_productoffers po
              INNER JOIN tbl_offers o ON o.offerid = po.offerid
              WHERE po.productid = @productid AND po.isactive = 1 AND o.isactive = 1
                AND o.startdate <= GETDATE() AND o.enddate >= GETDATE()
              ORDER BY o.startdate DESC;`);
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// SEARCH product offers
router.get('/search/:searchterm', async (req, res, next) => {
  try {
    await poolConnect;
    const searchTerm = `%${req.params.searchterm}%`;
    const result = await pool.request()
      .input('searchTerm', sql.NVarChar, searchTerm)
      .query(`SELECT po.*, p.productname, p.productcode, o.offername
              FROM tbl_productoffers po
              INNER JOIN tbl_products_new p ON p.productid = po.productid
              INNER JOIN tbl_offers o ON o.offerid = po.offerid
              WHERE (p.productname LIKE @searchTerm 
                 OR p.productcode LIKE @searchTerm
                 OR o.offername LIKE @searchTerm) 
                AND po.isactive = 1 AND p.isactive = 1 AND o.isactive = 1
              ORDER BY po.rcm DESC;`);
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// POST - Create new product offer
router.post('/', async (req, res, next) => {
  try {
    const {
      productofferid,
      offerid,
      productid,
      isactive,
      rcu // Record Created User (mandatory)
    } = req.body;

    // Basic Input Validation
    if (!offerid || !rcu) {
      return res.status(400).json({
        message: "Missing required fields. Please provide offerid and rcu."
      });
    }

    // Check if offerid exists and is active
    await poolConnect;
    const offerCheck = await pool.request()
      .input('offerid', sql.VarChar(sql.MAX), offerid)
      .query('SELECT COUNT(*) as count FROM tbl_offers WHERE offerid = @offerid AND isactive = 1;');
    
    if (offerCheck.recordset[0].count === 0) {
      return res.status(400).json({
        message: "Offer ID does not exist or is inactive."
      });
    }

    // Check if productid exists and is active (if provided)
    if (productid) {
      const productCheck = await pool.request()
        .input('productid', sql.VarChar(sql.MAX), productid)
        .query('SELECT COUNT(*) as count FROM tbl_products_new WHERE productid = @productid AND isactive = 1;');
      
      if (productCheck.recordset[0].count === 0) {
        return res.status(400).json({
          message: "Product ID does not exist or is inactive."
        });
      }
    }

    // Check for duplicate offer-product combination
    if (productid) {
      const duplicateCheck = await pool.request()
        .input('offerid', sql.VarChar(sql.MAX), offerid)
        .input('productid', sql.VarChar(sql.MAX), productid)
        .query(`SELECT COUNT(*) as count FROM tbl_productoffers 
                WHERE offerid = @offerid AND productid = @productid AND isactive = 1;`);
      
      if (duplicateCheck.recordset[0].count > 0) {
        return res.status(400).json({
          message: "This offer is already assigned to the specified product."
        });
      }
    }

    // Generate unique productofferid if not provided
    const generatedProductOfferId = productofferid || `PO_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const result = await pool.request()
      .input('productofferid', sql.VarChar(sql.MAX), generatedProductOfferId)
      .input('offerid', sql.VarChar(sql.MAX), offerid)
      .input('productid', sql.VarChar(sql.MAX), productid || null)
      .input('isactive', sql.Bit, isactive !== undefined ? isactive : true)
      .input('rcu', sql.VarChar(sql.MAX), rcu)
      .query(`
        INSERT INTO tbl_productoffers
          (productofferid, offerid, productid, isactive, rcu, rcm)
        VALUES
          (@productofferid, @offerid, @productid, @isactive, @rcu, GETDATE());
        
        SELECT * FROM tbl_productoffers WHERE productofferid = @productofferid;
      `);

    res.status(201).json({
      message: "Product offer created successfully.",
      productOffer: result.recordset[0]
    });

  } catch (err) {
    console.error("Error creating product offer:", err);
    next(err);
  }
});

// PUT - Update product offer
router.put('/', async (req, res, next) => {
  try {
    const id = req.body.productofferid;

    if (!id) {
      return res.status(400).json({ message: 'Product Offer ID is required.' });
    }

    // Define allowed fields for update
    const allowedFields = [
      'offerid',
      'productid',
      'isactive',
      'luu' // Last Updated User
    ];

    const updates = [];
    const request = pool.request();

    // Input productofferid for WHERE clause
    request.input('productofferid', sql.VarChar(sql.MAX), id);

    // Validate offerid if being updated
    if (req.body.offerid !== undefined) {
      await poolConnect;
      const offerCheck = await pool.request()
        .input('offerid', sql.VarChar(sql.MAX), req.body.offerid)
        .query('SELECT COUNT(*) as count FROM tbl_offers WHERE offerid = @offerid AND isactive = 1;');
      
      if (offerCheck.recordset[0].count === 0) {
        return res.status(400).json({
          message: "Offer ID does not exist or is inactive."
        });
      }
    }

    // Validate productid if being updated
    if (req.body.productid !== undefined) {
      const productCheck = await pool.request()
        .input('productid', sql.VarChar(sql.MAX), req.body.productid)
        .query('SELECT COUNT(*) as count FROM tbl_products_new WHERE productid = @productid AND isactive = 1;');
      
      if (productCheck.recordset[0].count === 0) {
        return res.status(400).json({
          message: "Product ID does not exist or is inactive."
        });
      }
    }

    // Check for duplicate if both offerid and productid are being updated
    if (req.body.offerid !== undefined || req.body.productid !== undefined) {
      // Get current record to check for duplicates
      const currentRecord = await pool.request()
        .input('productofferid', sql.VarChar(sql.MAX), id)
        .query('SELECT offerid, productid FROM tbl_productoffers WHERE productofferid = @productofferid;');
      
      if (currentRecord.recordset.length === 0) {
        return res.status(404).json({ message: 'Product offer not found.' });
      }

      const currentOfferid = req.body.offerid || currentRecord.recordset[0].offerid;
      const currentProductid = req.body.productid || currentRecord.recordset[0].productid;

      if (currentProductid) {
        const duplicateCheck = await pool.request()
          .input('offerid', sql.VarChar(sql.MAX), currentOfferid)
          .input('productid', sql.VarChar(sql.MAX), currentProductid)
          .input('productofferid', sql.VarChar(sql.MAX), id)
          .query(`SELECT COUNT(*) as count FROM tbl_productoffers 
                  WHERE offerid = @offerid AND productid = @productid 
                  AND (productofferid != @productofferid OR productofferid IS NULL) AND isactive = 1;`);
        
        if (duplicateCheck.recordset[0].count > 0) {
          return res.status(400).json({
            message: "This offer is already assigned to the specified product."
          });
        }
      }
    }

    // Dynamically build UPDATE SET clause
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = @${field}`);

        // Use appropriate SQL types
        switch (field) {
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
        UPDATE tbl_productoffers
        SET ${setClause}
        WHERE productofferid = @productofferid;
        SELECT @@ROWCOUNT AS affected;
    `);

    if (result.recordset[0].affected === 0) {
      return res.status(404).json({ message: 'Product offer not found with the provided ID.' });
    }

    res.json({ message: 'Product offer updated successfully.' });

  } catch (err) {
    console.error("Error updating product offer:", err);
    next(err);
  }
});

// PUT - Update product offer status (activate/deactivate)
router.put('/status', async (req, res, next) => {
  try {
    const { productofferid, isactive, luu } = req.body;

    if (!productofferid || isactive === undefined || !luu) {
      return res.status(400).json({ 
        message: 'Product Offer ID, isactive status, and luu are required.' 
      });
    }

    await poolConnect;
    const result = await pool.request()
      .input('productofferid', sql.VarChar(sql.MAX), productofferid)
      .input('isactive', sql.Bit, isactive)
      .input('luu', sql.VarChar(sql.MAX), luu)
      .query(`
        UPDATE tbl_productoffers
        SET isactive = @isactive, luu = @luu, lcm = GETDATE()
        WHERE productofferid = @productofferid;
        SELECT @@ROWCOUNT AS affected;
      `);

    if (result.recordset[0].affected === 0) {
      return res.status(404).json({ message: 'Product offer not found.' });
    }

    res.json({ 
      message: `Product offer ${isactive ? 'activated' : 'deactivated'} successfully.` 
    });

  } catch (err) {
    console.error("Error updating product offer status:", err);
    next(err);
  }
});

// PUT - Bulk assign offer to multiple products
router.put('/bulkassign', async (req, res, next) => {
  let transaction;
  try {
    const { offerid, productids, luu } = req.body; // productids: [id1, id2, id3...]

    if (!offerid || !productids || !Array.isArray(productids) || productids.length === 0 || !luu) {
      return res.status(400).json({ 
        message: 'Offer ID, product IDs array, and luu are required.' 
      });
    }

    // Validate offer exists
    await poolConnect;
    const offerCheck = await pool.request()
      .input('offerid', sql.VarChar(sql.MAX), offerid)
      .query('SELECT COUNT(*) as count FROM tbl_offers WHERE offerid = @offerid AND isactive = 1;');
    
    if (offerCheck.recordset[0].count === 0) {
      return res.status(400).json({
        message: "Offer ID does not exist or is inactive."
      });
    }

    transaction = new sql.Transaction(pool);
    await transaction.begin();

    let assignedCount = 0;

    for (let productid of productids) {
      // Check if product exists
      const productRequest = new sql.Request(transaction);
      const productCheck = await productRequest
        .input('productid', sql.VarChar(sql.MAX), productid)
        .query('SELECT COUNT(*) as count FROM tbl_products_new WHERE productid = @productid AND isactive = 1;');
      
      if (productCheck.recordset[0].count === 0) {
        continue; // Skip invalid products
      }

      // Check if combination already exists
      const duplicateRequest = new sql.Request(transaction);
      const duplicateCheck = await duplicateRequest
        .input('offerid', sql.VarChar(sql.MAX), offerid)
        .input('productid', sql.VarChar(sql.MAX), productid)
        .query(`SELECT COUNT(*) as count FROM tbl_productoffers 
                WHERE offerid = @offerid AND productid = @productid AND isactive = 1;`);
      
      if (duplicateCheck.recordset[0].count > 0) {
        continue; // Skip duplicates
      }

      // Insert new product offer
      const insertRequest = new sql.Request(transaction);
      const generatedId = `PO_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await insertRequest
        .input('productofferid', sql.VarChar(sql.MAX), generatedId)
        .input('offerid', sql.VarChar(sql.MAX), offerid)
        .input('productid', sql.VarChar(sql.MAX), productid)
        .input('rcu', sql.VarChar(sql.MAX), luu)
        .query(`
          INSERT INTO tbl_productoffers
            (productofferid, offerid, productid, isactive, rcu, rcm)
          VALUES
            (@productofferid, @offerid, @productid, 1, @rcu, GETDATE());
        `);

      assignedCount++;
    }

    await transaction.commit();

    res.json({ 
      message: `Bulk assignment completed. ${assignedCount} products assigned to offer.` 
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
    console.error("Error in bulk assignment:", err);
    next(err);
  }
});

// DELETE - Soft delete (deactivate) product offer
router.delete('/', async (req, res, next) => {
  try {
    const { productofferid, luu } = req.body;

    if (!productofferid || !luu) {
      return res.status(400).json({ 
        message: 'Product Offer ID and luu are required.' 
      });
    }

    await poolConnect;
    const result = await pool.request()
      .input('productofferid', sql.VarChar(sql.MAX), productofferid)
      .input('luu', sql.VarChar(sql.MAX), luu)
      .query(`
        UPDATE tbl_productoffers
        SET isactive = 0, luu = @luu, lcm = GETDATE()
        WHERE productofferid = @productofferid;
        SELECT @@ROWCOUNT AS affected;
      `);

    if (result.recordset[0].affected === 0) {
      return res.status(404).json({ message: 'Product offer not found.' });
    }

    res.json({ message: 'Product offer deactivated successfully.' });

  } catch (err) {
    console.error("Error deactivating product offer:", err);
    next(err);
  }
});

// DELETE - Hard delete product offer (permanent deletion)
router.delete('/permanent', async (req, res, next) => {
  try {
    const { productofferid } = req.body;

    if (!productofferid) {
      return res.status(400).json({ message: 'Product Offer ID is required.' });
    }

    await poolConnect;
    const result = await pool.request()
      .input('productofferid', sql.VarChar(sql.MAX), productofferid)
      .query(`
        DELETE FROM tbl_productoffers
        WHERE productofferid = @productofferid;
        SELECT @@ROWCOUNT AS affected;
      `);

    if (result.recordset[0].affected === 0) {
      return res.status(404).json({ message: 'Product offer not found.' });
    }

    res.json({ message: 'Product offer deleted permanently.' });

  } catch (err) {
    console.error("Error deleting product offer permanently:", err);
    next(err);
  }
});

// DELETE - Remove offer from product
router.delete('/product', async (req, res, next) => {
  try {
    const { offerid, productid, luu } = req.body;

    if (!offerid || !productid || !luu) {
      return res.status(400).json({ 
        message: 'Offer ID, Product ID, and luu are required.' 
      });
    }

    await poolConnect;
    const result = await pool.request()
      .input('offerid', sql.VarChar(sql.MAX), offerid)
      .input('productid', sql.VarChar(sql.MAX), productid)
      .input('luu', sql.VarChar(sql.MAX), luu)
      .query(`
        UPDATE tbl_productoffers
        SET isactive = 0, luu = @luu, lcm = GETDATE()
        WHERE offerid = @offerid AND productid = @productid;
        SELECT @@ROWCOUNT AS affected;
      `);

    res.json({ 
      message: `${result.recordset[0].affected} product offer(s) deactivated successfully.` 
    });

  } catch (err) {
    console.error("Error removing offer from product:", err);
    next(err);
  }
});

// DELETE - Bulk delete multiple product offers
router.delete('/bulk', async (req, res, next) => {
  let transaction;
  try {
    const { productofferids, luu } = req.body; // productofferids: [id1, id2, id3...]

    if (!productofferids || !Array.isArray(productofferids) || productofferids.length === 0 || !luu) {
      return res.status(400).json({ 
        message: 'Product Offer IDs array and luu are required.' 
      });
    }

    await poolConnect;
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    let deactivatedCount = 0;

    for (let productofferid of productofferids) {
      const deleteRequest = new sql.Request(transaction);
      const result = await deleteRequest
        .input('productofferid', sql.VarChar(sql.MAX), productofferid)
        .input('luu', sql.VarChar(sql.MAX), luu)
        .query(`
          UPDATE tbl_productoffers
          SET isactive = 0, luu = @luu, lcm = GETDATE()
          WHERE productofferid = @productofferid;
          SELECT @@ROWCOUNT AS affected;
        `);

      deactivatedCount += result.recordset[0].affected;
    }

    await transaction.commit();

    res.json({ 
      message: `Bulk deactivation completed. ${deactivatedCount} product offers deactivated.` 
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
    console.error("Error in bulk deactivation:", err);
    next(err);
  }
});

module.exports = router;