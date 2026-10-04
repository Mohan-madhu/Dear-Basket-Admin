const express = require('express');
const router = express.Router();
const { pool, poolConnect, sql } = require('../../config/db_dearbasket');

// GET all Products
router.get('/', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .query('SELECT * FROM tbl_products_new ORDER BY rcm DESC;');
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// GET by typeid
router.get('/Type/:id', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('typeid', sql.VarChar, req.params.id)
      .query('SELECT * FROM tbl_products_new WHERE typeid = @typeid ORDER BY rcm DESC;');
      res.json({Response:result.recordset});
  } catch (err) {
    next(err);
  }
});


// GET products with variants by typeid
router.get('/ProductsWithAllDataForType/:id', async (req, res, next) => {
  try {
    await poolConnect;
    
    // Execute stored procedure
    const result = await pool.request()
      .input('typeid', sql.VarChar, req.params.id)
      .execute('sp_GetProductsWithVariantsByTypeId');
    
    const products = result.recordsets[0]; // First result set - products
    const variants = result.recordsets[1];  // Second result set - variants
    
    // Group variants by productid
    const variantsByProduct = variants.reduce((acc, variant) => {
      if (!acc[variant.productid]) {
        acc[variant.productid] = [];
      }
      
      // Parse images JSON and clean up the variant object
      const variantData = {
        variantid: variant.variantid,
        variantname: variant.variantname,
        images: variant.images_json ? JSON.parse(variant.images_json).map(img => img.imageurl) : [],
        sku: variant.sku,
        weight: variant.weight,
        dimensions: variant.dimensions,
        packsize: variant.packsize,
        baseprice: variant.baseprice,
        sellingprice: variant.sellingprice,
        discountpercentage: variant.discountpercentage,
        stockquantity: variant.stockquantity,
        minstocklevel: variant.minstocklevel,
        maxorderquantity: variant.maxorderquantity
      };
      
      acc[variant.productid].push(variantData);
      return acc;
    }, {});
    
    // Combine products with their variants
    const productsWithVariants = products.map(product => {
      const productVariants = variantsByProduct[product.productid] || [];
     
      return {
        productid: product.productid,
        productname: product.productname,
        productcode: product.productcode,
        shortdescription: product.shortdescription,
        fulldescription: product.fulldescription,
        isfeatured: product.isfeatured,
        isactive: product.isactive,
        typename: product.typename,
        typeid: product.typeid,
        categoryname: product.categoryname,
        categoryid: product.categoryid,
        sectionname: product.sectionname,
        sectionid: product.sectionid,
        menuname: product.menuname,
        menuid: product.menuid,
        imageurl: product.imageurl,
        variants: productVariants
      };
    });
    
    res.json({
      Response: productsWithVariants
    });
    
  } catch (err) {
    console.error('Error fetching products with variants:', err);
    next(err);
  }
});

// GET product by productid
router.get('/:id', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('productid', sql.VarChar, req.params.id)
      .query('SELECT * FROM tbl_products_new WHERE productid = @productid;');
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});


// SEARCH products
router.get('/search/:searchterm', async (req, res, next) => {
  try {
    await poolConnect;
    const searchTerm = `%${req.params.searchterm}%`;
    const result = await pool.request()
      .input('searchTerm', sql.NVarChar, searchTerm)
      .query(`SELECT * FROM tbl_products_new 
              WHERE (productname LIKE @searchTerm 
                 OR shortdescription LIKE @searchTerm
                 OR fulldescription LIKE @searchTerm
                 OR categoryname LIKE @searchTerm
                 OR typename LIKE @searchTerm) 
                AND isactive = 1
              ORDER BY rcm DESC;`);
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// POST - Create new product
router.post('/', async (req, res, next) => {
  try {
    const {
      productname,
      productcode,
      shortdescription,
      fulldescription,
      isactive,
      isfeatured,
      typename,
      typeid,
      categoryname,
      categoryid,
      sectionname,
      sectionid,
      menuname,
      menuid,
      imageurl,
      rcu // Record Created User (mandatory)
    } = req.body;

    // Basic Input Validation
    if (!productname || !rcu) {
      return res.status(400).json({
        message: "Missing required fields. Please provide productname and rcu."
      });
    }

    // // Check if productcode is unique (if provided)
    // if (productcode) {
    //   await poolConnect;
    //   const checkResult = await pool.request()
    //     .input('productcode', sql.NVarChar(50), productcode)
    //     .query('SELECT COUNT(*) as count FROM tbl_products_new WHERE productcode = @productcode;');
      
    //   if (checkResult.recordset[0].count > 0) {
    //     return res.status(400).json({
    //       message: "Product code already exists. Please use a unique product code."
    //     });
    //   }
    // }

    await poolConnect;
    const result = await pool.request()
      .input('productname', sql.NVarChar(200), productname)
      .input('productcode', sql.NVarChar(50), productcode || null)
      .input('shortdescription', sql.NVarChar(500), shortdescription || null)
      .input('fulldescription', sql.NVarChar(sql.MAX), fulldescription || null)
      .input('isactive', sql.Bit, isactive !== undefined ? isactive : true)
      .input('isfeatured', sql.Bit, isfeatured !== undefined ? isfeatured : false)
      .input('typename', sql.VarChar(sql.MAX), typename || null)
      .input('typeid', sql.VarChar(sql.MAX), typeid || null)
      .input('categoryname', sql.VarChar(sql.MAX), categoryname || null)
      .input('categoryid', sql.VarChar(sql.MAX), categoryid || null)
      .input('sectionname', sql.VarChar(sql.MAX), sectionname || null)
      .input('sectionid', sql.VarChar(sql.MAX), sectionid || null)
      .input('menuname', sql.VarChar(sql.MAX), menuname || null)
      .input('menuid', sql.VarChar(sql.MAX), menuid || null)
      .input('rcu', sql.VarChar(sql.MAX), rcu)
      .input('imageurl', sql.VarChar(sql.MAX), imageurl || null)

      .query(`
        INSERT INTO tbl_products_new
          (productname, productcode, shortdescription, fulldescription, isactive, isfeatured,
           typename, typeid, categoryname, categoryid, sectionname, sectionid, 
           menuname, menuid, rcu,imageurl)
        OUTPUT INSERTED.*
        VALUES
          (@productname, @productcode, @shortdescription, @fulldescription, @isactive, @isfeatured,
           @typename, @typeid, @categoryname, @categoryid, @sectionname, @sectionid,
           @menuname, @menuid, @rcu,@imageurl);
      `);

    res.status(201).json({
      message: "Product created successfully.",
      product: result.recordset[0]
    });

  } catch (err) {
    console.error("Error creating product:", err);
    next(err);
  }
});

// PUT - Update product
router.put('/', async (req, res, next) => {
  try {
    const id = req.body.productid;

    if (!id) {
      return res.status(400).json({ message: 'Product ID is required.' });
    }

    // Define allowed fields for update
    const allowedFields = [
      'productname',
      'productcode',
      'shortdescription',
      'fulldescription',
      'isactive',
      'isfeatured',
      'typename',
      'typeid',
      'categoryname',
      'categoryid',
      'sectionname',
      'sectionid',
      'menuname',
      'menuid',
      'imageurl',
      'luu' // Last Updated User
    ];

    const updates = [];
    const request = pool.request();

    // Input productid for WHERE clause
    request.input('productid', sql.VarChar(sql.MAX), id);

    // Check if productcode is being updated and if it's unique
    // if (req.body.productcode !== undefined) {
    //   await poolConnect;
    //   const checkResult = await pool.request()
    //     .input('productcode', sql.NVarChar(50), req.body.productcode)
    //     .input('productid', sql.VarChar(sql.MAX), id)
    //     .query(`SELECT COUNT(*) as count FROM tbl_products_new 
    //             WHERE productcode = @productcode AND productid != @productid;`);
      
    //   if (checkResult.recordset[0].count > 0) {
    //     return res.status(400).json({
    //       message: "Product code already exists. Please use a unique product code."
    //     });
    //   }
    // }

    // Dynamically build UPDATE SET clause
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = @${field}`);

        // Use appropriate SQL types
        switch (field) {
          case 'productname':
            request.input(field, sql.NVarChar(200), req.body[field]);
            break;
          case 'productcode':
            request.input(field, sql.NVarChar(50), req.body[field]);
            break;
          case 'shortdescription':
            request.input(field, sql.NVarChar(500), req.body[field]);
            break;
          case 'fulldescription':
            request.input(field, sql.NVarChar(sql.MAX), req.body[field]);
            break;
          case 'isactive':
          case 'isfeatured':
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
        UPDATE tbl_products_new
        SET ${setClause}
        WHERE productid = @productid;
        SELECT @@ROWCOUNT AS affected;
    `);

    if (result.recordset[0].affected === 0) {
      return res.status(404).json({ message: 'Product not found with the provided ID.' });
    }

    res.json({ message: 'Product updated successfully.' });

  } catch (err) {
    console.error("Error updating product:", err);
    next(err);
  }
});

// PUT - Update product status (activate/deactivate)
router.put('/status', async (req, res, next) => {
  try {
    const { productid, isactive, luu } = req.body;

    if (!productid || isactive === undefined || !luu) {
      return res.status(400).json({ 
        message: 'Product ID, isactive status, and luu are required.' 
      });
    }

    await poolConnect;
    const result = await pool.request()
      .input('productid', sql.VarChar(sql.MAX), productid)
      .input('isactive', sql.Bit, isactive)
      .input('luu', sql.VarChar(sql.MAX), luu)
      .query(`
        UPDATE tbl_products_new
        SET isactive = @isactive, luu = @luu, lcm = GETDATE()
        WHERE productid = @productid;
        SELECT @@ROWCOUNT AS affected;
      `);

    if (result.recordset[0].affected === 0) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    res.json({ 
      message: `Product ${isactive ? 'activated' : 'deactivated'} successfully.` 
    });

  } catch (err) {
    console.error("Error updating product status:", err);
    next(err);
  }
});

// PUT - Update featured status
router.put('/featured', async (req, res, next) => {
  try {
    const { productid, isfeatured, luu } = req.body;

    if (!productid || isfeatured === undefined || !luu) {
      return res.status(400).json({ 
        message: 'Product ID, isfeatured status, and luu are required.' 
      });
    }

    await poolConnect;
    const result = await pool.request()
      .input('productid', sql.VarChar(sql.MAX), productid)
      .input('isfeatured', sql.Bit, isfeatured)
      .input('luu', sql.VarChar(sql.MAX), luu)
      .query(`
        UPDATE tbl_products_new
        SET isfeatured = @isfeatured, luu = @luu, lcm = GETDATE()
        WHERE productid = @productid;
        SELECT @@ROWCOUNT AS affected;
      `);

    if (result.recordset[0].affected === 0) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    res.json({ 
      message: `Product ${isfeatured ? 'marked as featured' : 'removed from featured'} successfully.` 
    });

  } catch (err) {
    console.error("Error updating featured status:", err);
    next(err);
  }
});

// DELETE - Soft delete (deactivate) product
router.delete('/', async (req, res, next) => {
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
        UPDATE tbl_products_new
        SET isactive = 0, luu = @luu, lcm = GETDATE()
        WHERE productid = @productid;
        SELECT @@ROWCOUNT AS affected;
      `);

    if (result.recordset[0].affected === 0) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    res.json({ message: 'Product deactivated successfully.' });

  } catch (err) {
    console.error("Error deactivating product:", err);
    next(err);
  }
});

// DELETE - Hard delete product (permanent deletion)
router.delete('/permanent', async (req, res, next) => {
  try {
    const { productid } = req.body;

    if (!productid) {
      return res.status(400).json({ message: 'Product ID is required.' });
    }

    await poolConnect;
    const result = await pool.request()
      .input('productid', sql.VarChar(sql.MAX), productid)
      .query(`
        DELETE FROM tbl_products_new
        WHERE productid = @productid;
        SELECT @@ROWCOUNT AS affected;
      `);

    if (result.recordset[0].affected === 0) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    res.json({ message: 'Product deleted permanently.' });

  } catch (err) {
    console.error("Error deleting product permanently:", err);
    next(err);
  }
});









// GET product by product code
router.get('/code/:productcode', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('productcode', sql.NVarChar(50), req.params.productcode)
      .query('SELECT * FROM tbl_products_new WHERE productcode = @productcode;');
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});


// GET all active/featured products
router.get('/active', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .query('SELECT * FROM tbl_products_new WHERE isactive = 1 ORDER BY rcm DESC;');
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// GET featured products
router.get('/featured', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .query('SELECT * FROM tbl_products_new WHERE isfeatured = 1 AND isactive = 1 ORDER BY rcm DESC;');
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// GET products by category
router.get('/category/:categoryname', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('categoryname', sql.VarChar, req.params.categoryname)
      .query(`SELECT * FROM tbl_products_new 
              WHERE categoryname = @categoryname AND isactive = 1 
              ORDER BY rcm DESC;`);
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// GET products by type
router.get('/type/:typename', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('typename', sql.VarChar, req.params.typename)
      .query(`SELECT * FROM tbl_products_new 
              WHERE typename = @typename AND isactive = 1 
              ORDER BY rcm DESC;`);
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});


module.exports = router;