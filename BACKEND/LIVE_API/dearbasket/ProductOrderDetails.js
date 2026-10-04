const express = require('express');
const router = express.Router();
const { pool, poolConnect, sql } = require('../../config/db_dearbasket');

// GET all Order Details
router.get('/', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .query('SELECT * FROM tbl_product_order_details ORDER BY rcm DESC;');
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// GET Order Details by productorderdetailsid
router.get('/:detailsid', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('productorderdetailsid', sql.VarChar(sql.MAX), req.params.detailsid)
      .query('SELECT * FROM tbl_product_order_details WHERE productorderdetailsid = @productorderdetailsid;');
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// GET Order Details by Order ID
router.get('/order/:orderid', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('productorderid', sql.VarChar(sql.MAX), req.params.orderid)
      .query('SELECT * FROM tbl_product_order_details WHERE productorderid = @productorderid ORDER BY rcm DESC;');
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// GET Order Details by Product ID
router.get('/product/:productid', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('productid', sql.NVarChar(255), req.params.productid)
      .query('SELECT * FROM tbl_product_order_details WHERE productid = @productid ORDER BY rcm DESC;');
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// GET Order Details by Variant ID
router.get('/variant/:variantid', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('variantid', sql.UniqueIdentifier, req.params.variantid)
      .query('SELECT * FROM tbl_product_order_details WHERE variantid = @variantid ORDER BY rcm DESC;');
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// GET Order Summary (aggregated data by order)
router.get('/summary/:orderid', async (req, res, next) => {
  try {
    await poolConnect;
    const result = await pool.request()
      .input('productorderid', sql.VarChar(sql.MAX), req.params.orderid)
      .query(`
        SELECT 
          productorderid,
          COUNT(*) as total_items,
          SUM(orderquantity) as total_quantity,
          SUM(price * orderquantity) as total_amount,
          SUM(baseprice * orderquantity) as total_base_amount,
          AVG(discount) as average_discount
        FROM tbl_product_order_details 
        WHERE productorderid = @productorderid
        GROUP BY productorderid;
      `);
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

// POST - Create new Order Detail
router.post('/', async (req, res, next) => {
  try {
        const {
        productorderdetailsid,
        productorderid,
        productid,
        productname,
        productcode,
        shortdescription,
        fulldescription,
        isfeatured,
        isactive,
        typename,
        typeid,
        categoryname,
        categoryid,
        sectionname,
        sectionid,
        menuname,
        menuid,
        imageurl,
        variantid,
        variantname,
        price,
        baseprice,
        discount,
        quantity,
        orderquantity,
        rcu
        } = req.body;

    // Basic Input Validation
    if (!productorderdetailsid || !productorderid || !productid || !productname || !orderquantity || !rcu) {
      return res.status(400).json({
        message: "Missing required fields. Please provide productorderdetailsid, productorderid, productid, productname, orderquantity, and rcu."
      });
    }

    await poolConnect;
    const result = await pool.request()
      .input('productorderdetailsid', sql.VarChar(sql.MAX), productorderdetailsid)
      .input('productorderid', sql.VarChar(sql.MAX), productorderid)
      .input('productid', sql.NVarChar(255), productid)
      .input('productname', sql.NVarChar(255), productname)
      .input('productcode', sql.NVarChar(100), productcode || null)
      .input('shortdescription', sql.NVarChar(255), shortdescription || null)
      .input('fulldescription', sql.NVarChar(sql.MAX), fulldescription || null)
      .input('isfeatured', sql.Bit, isfeatured !== undefined ? isfeatured : false)
      .input('isactive', sql.Bit, isactive !== undefined ? isactive : true)
      .input('typename', sql.NVarChar(255), typename || null)
      .input('typeid', sql.UniqueIdentifier, typeid || null)
      .input('categoryname', sql.NVarChar(255), categoryname || null)
      .input('categoryid', sql.UniqueIdentifier, categoryid || null)
      .input('sectionname', sql.NVarChar(255), sectionname || null)
      .input('sectionid', sql.UniqueIdentifier, sectionid || null)
      .input('menuname', sql.NVarChar(255), menuname || null)
      .input('menuid', sql.UniqueIdentifier, menuid || null)
      .input('imageurl', sql.NVarChar(500), imageurl || null)
      .input('variantid', sql.UniqueIdentifier, variantid || null)
      .input('variantname', sql.NVarChar(255), variantname || null)
      .input('price', sql.Decimal(10,2), price || null)
      .input('baseprice', sql.Decimal(10,2), baseprice || null)
      .input('discount', sql.Decimal(5,2), discount || null)
      .input('quantity', sql.Int, quantity || 0)
      .input('orderquantity', sql.Int, orderquantity)
      .input('rcu', sql.VarChar(sql.MAX), rcu)
      .query(`
        INSERT INTO tbl_product_order_details
          (productorderdetailsid, productorderid, productid, productname, productcode, 
           shortdescription, fulldescription, isfeatured, isactive, typename, typeid,
           categoryname, categoryid, sectionname, sectionid, menuname, menuid, imageurl,
           variantid, variantname, price, baseprice, discount, quantity, orderquantity, rcu)
        OUTPUT INSERTED.*
        VALUES
          (@productorderdetailsid, @productorderid, @productid, @productname, @productcode,
           @shortdescription, @fulldescription, @isfeatured, @isactive, @typename, @typeid,
           @categoryname, @categoryid, @sectionname, @sectionid, @menuname, @menuid, @imageurl,
           @variantid, @variantname, @price, @baseprice, @discount, @quantity, @orderquantity, @rcu);
      `);

    res.status(201).json({
      message: "Order detail created successfully.",
      orderDetail: result.recordset[0]
    });

  } catch (err) {
    console.error("Error creating order detail:", err);
    next(err);
  }
});

// POST - Create multiple Order Details (Bulk Insert)
router.post('/bulk', async (req, res, next) => {
  try {
    const { orderDetails } = req.body;

    if (!orderDetails || !Array.isArray(orderDetails) || orderDetails.length === 0) {
      return res.status(400).json({
        message: "Order details array is required and cannot be empty."
      });
    }

    await poolConnect;
    const transaction = pool.transaction();
    await transaction.begin();

    try {
      const insertedDetails = [];

      for (const detail of orderDetails) {
        const {
          productorderdetailsid,
          productorderid,
          productid,
          productname,
          productcode,
          shortdescription,
          fulldescription,
          isfeatured,
          isactive,
          typename,
          typeid,
          categoryname,
          categoryid,
          sectionname,
          sectionid,
          menuname,
          menuid,
          imageurl,
          variantid,
          variantname,
          price,
          baseprice,
          discount,
          quantity,
          orderquantity,
          rcu
        } = detail;

        const result = await transaction.request()
          .input('productorderdetailsid', sql.VarChar(sql.MAX), productorderdetailsid)
          .input('productorderid', sql.VarChar(sql.MAX), productorderid)
          .input('productid', sql.NVarChar(255), productid)
          .input('productname', sql.NVarChar(255), productname)
          .input('productcode', sql.NVarChar(100), productcode || null)
          .input('shortdescription', sql.NVarChar(255), shortdescription || null)
          .input('fulldescription', sql.NVarChar(sql.MAX), fulldescription || null)
          .input('isfeatured', sql.Bit, isfeatured !== undefined ? isfeatured : false)
          .input('isactive', sql.Bit, isactive !== undefined ? isactive : true)
          .input('typename', sql.NVarChar(255), typename || null)
          .input('typeid', sql.UniqueIdentifier, typeid || null)
          .input('categoryname', sql.NVarChar(255), categoryname || null)
          .input('categoryid', sql.UniqueIdentifier, categoryid || null)
          .input('sectionname', sql.NVarChar(255), sectionname || null)
          .input('sectionid', sql.UniqueIdentifier, sectionid || null)
          .input('menuname', sql.NVarChar(255), menuname || null)
          .input('menuid', sql.UniqueIdentifier, menuid || null)
          .input('imageurl', sql.NVarChar(500), imageurl || null)
          .input('variantid', sql.UniqueIdentifier, variantid || null)
          .input('variantname', sql.NVarChar(255), variantname || null)
          .input('price', sql.Decimal(10,2), price || null)
          .input('baseprice', sql.Decimal(10,2), baseprice || null)
          .input('discount', sql.Decimal(5,2), discount || null)
          .input('quantity', sql.Int, quantity || 0)
          .input('orderquantity', sql.Int, orderquantity)
          .input('rcu', sql.VarChar(sql.MAX), rcu)
          .query(`
            INSERT INTO tbl_product_order_details
              (productorderdetailsid, productorderid, productid, productname, productcode, 
               shortdescription, fulldescription, isfeatured, isactive, typename, typeid,
               categoryname, categoryid, sectionname, sectionid, menuname, menuid, imageurl,
               variantid, variantname, price, baseprice, discount, quantity, orderquantity, rcu)
            OUTPUT INSERTED.*
            VALUES
              (@productorderdetailsid, @productorderid, @productid, @productname, @productcode,
               @shortdescription, @fulldescription, @isfeatured, @isactive, @typename, @typeid,
               @categoryname, @categoryid, @sectionname, @sectionid, @menuname, @menuid, @imageurl,
               @variantid, @variantname, @price, @baseprice, @discount, @quantity, @orderquantity, @rcu);
          `);

        insertedDetails.push(result.recordset[0]);
      }

      await transaction.commit();

      res.status(201).json({
        message: "Order details created successfully.",
        orderDetails: insertedDetails,
        count: insertedDetails.length
      });

    } catch (err) {
      await transaction.rollback();
      throw err;
    }

  } catch (err) {
    console.error("Error creating bulk order details:", err);
    next(err);
  }
});

// PUT - Update Order Detail
router.put('/', async (req, res, next) => {
  try {
    const detailsid = req.body.productorderdetailsid;

    if (!detailsid) {
      return res.status(400).json({ message: 'Product Order Details ID is required.' });
    }

    const allowedFields = [
      'productorderid', 'productid', 'productname', 'productcode', 'shortdescription',
      'fulldescription', 'isfeatured', 'isactive', 'typename', 'typeid', 'categoryname',
      'categoryid', 'sectionname', 'sectionid', 'menuname', 'menuid', 'imageurl',
      'variantid', 'variantname', 'price', 'baseprice', 'discount', 'quantity', 
      'orderquantity', 'luu'
    ];

    const updates = [];
    const request = pool.request();

    request.input('productorderdetailsid', sql.VarChar(sql.MAX), detailsid);

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = @${field}`);

        switch (field) {
          case 'productid':
          case 'productname':
            request.input(field, sql.NVarChar(255), req.body[field]);
            break;
          case 'productcode':
            request.input(field, sql.NVarChar(100), req.body[field]);
            break;
          case 'shortdescription':
          case 'typename':
          case 'categoryname':
          case 'sectionname':
          case 'menuname':
          case 'variantname':
            request.input(field, sql.NVarChar(255), req.body[field]);
            break;
          case 'fulldescription':
            request.input(field, sql.NVarChar(sql.MAX), req.body[field]);
            break;
          case 'isfeatured':
          case 'isactive':
            request.input(field, sql.Bit, req.body[field]);
            break;
          case 'typeid':
          case 'categoryid':
          case 'sectionid':
          case 'menuid':
          case 'variantid':
            request.input(field, sql.UniqueIdentifier, req.body[field]);
            break;
          case 'imageurl':
            request.input(field, sql.NVarChar(500), req.body[field]);
            break;
          case 'price':
          case 'baseprice':
            request.input(field, sql.Decimal(10,2), req.body[field]);
            break;
          case 'discount':
            request.input(field, sql.Decimal(5,2), req.body[field]);
            break;
          case 'quantity':
          case 'orderquantity':
            request.input(field, sql.Int, req.body[field]);
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
        UPDATE tbl_product_order_details
        SET ${setClause}
        WHERE productorderdetailsid = @productorderdetailsid;
        SELECT @@ROWCOUNT AS affected;
    `);

    if (result.recordset[0].affected === 0) {
      return res.status(404).json({ message: 'Order detail not found with the provided ID.' });
    }

    res.json({ message: 'Order detail updated successfully.' });

  } catch (err) {
    console.error("Error updating order detail:", err);
    next(err);
  }
});

// PUT - Update Order Quantity
router.put('/quantity', async (req, res, next) => {
  try {
    const { productorderdetailsid, orderquantity, luu } = req.body;

    if (!productorderdetailsid || orderquantity === undefined || !luu) {
      return res.status(400).json({ 
        message: 'Product Order Details ID, order quantity, and luu are required.' 
      });
    }

    await poolConnect;
    const result = await pool.request()
      .input('productorderdetailsid', sql.VarChar(sql.MAX), productorderdetailsid)
      .input('orderquantity', sql.Int, orderquantity)
      .input('luu', sql.VarChar(sql.MAX), luu)
      .query(`
        UPDATE tbl_product_order_details
        SET orderquantity = @orderquantity, luu = @luu, lum = DATEADD(MINUTE, 330, GETUTCDATE())
        WHERE productorderdetailsid = @productorderdetailsid;
        SELECT @@ROWCOUNT AS affected;
      `);

    if (result.recordset[0].affected === 0) {
      return res.status(404).json({ message: 'Order detail not found.' });
    }

    res.json({ message: 'Order quantity updated successfully.' });

  } catch (err) {
    console.error("Error updating order quantity:", err);
    next(err);
  }
});

// PUT - Update Price
router.put('/price', async (req, res, next) => {
  try {
    const { productorderdetailsid, price, baseprice, discount, luu } = req.body;

    if (!productorderdetailsid || !luu) {
      return res.status(400).json({ 
        message: 'Product Order Details ID and luu are required.' 
      });
    }

    const updates = [];
    const request = pool.request();
    
    request.input('productorderdetailsid', sql.VarChar(sql.MAX), productorderdetailsid);
    request.input('luu', sql.VarChar(sql.MAX), luu);

    if (price !== undefined) {
      updates.push('price = @price');
      request.input('price', sql.Decimal(10,2), price);
    }
    
    if (baseprice !== undefined) {
      updates.push('baseprice = @baseprice');
      request.input('baseprice', sql.Decimal(10,2), baseprice);
    }
    
    if (discount !== undefined) {
      updates.push('discount = @discount');
      request.input('discount', sql.Decimal(5,2), discount);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'At least one price field must be provided.' });
    }

    const setClause = updates.join(', ') + ', luu = @luu, lum = DATEADD(MINUTE, 330, GETUTCDATE())';

    await poolConnect;
    const result = await request.query(`
        UPDATE tbl_product_order_details
        SET ${setClause}
        WHERE productorderdetailsid = @productorderdetailsid;
        SELECT @@ROWCOUNT AS affected;
    `);

    if (result.recordset[0].affected === 0) {
      return res.status(404).json({ message: 'Order detail not found.' });
    }

    res.json({ message: 'Price information updated successfully.' });

  } catch (err) {
    console.error("Error updating price:", err);
    next(err);
  }
});

// DELETE - Delete Order Detail
router.delete('/', async (req, res, next) => {
  try {
    const { productorderdetailsid } = req.body;

    if (!productorderdetailsid) {
      return res.status(400).json({ message: 'Product Order Details ID is required.' });
    }

    await poolConnect;
    const result = await pool.request()
      .input('productorderdetailsid', sql.VarChar(sql.MAX), productorderdetailsid)
      .query(`
        DELETE FROM tbl_product_order_details
        WHERE productorderdetailsid = @productorderdetailsid;
        SELECT @@ROWCOUNT AS affected;
      `);

    if (result.recordset[0].affected === 0) {
      return res.status(404).json({ message: 'Order detail not found.' });
    }

    res.json({ message: 'Order detail deleted successfully.' });

  } catch (err) {
    console.error("Error deleting order detail:", err);
    next(err);
  }
});

// DELETE - Delete all Order Details by Order ID
router.delete('/order/:orderid', async (req, res, next) => {
  try {
    const { orderid } = req.params;

    if (!orderid) {
      return res.status(400).json({ message: 'Product Order ID is required.' });
    }

    await poolConnect;
    const result = await pool.request()
      .input('productorderid', sql.VarChar(sql.MAX), orderid)
      .query(`
        DELETE FROM tbl_product_order_details
        WHERE productorderid = @productorderid;
        SELECT @@ROWCOUNT AS affected;
      `);

    res.json({ 
      message: `${result.recordset[0].affected} order detail(s) deleted successfully.`,
      deletedCount: result.recordset[0].affected
    });

  } catch (err) {
    console.error("Error deleting order details:", err);
    next(err);
  }
});

// SEARCH order details by product name
router.get('/search/:searchterm', async (req, res, next) => {
  try {
    await poolConnect;
    const searchTerm = `%${req.params.searchterm}%`;
    const result = await pool.request()
      .input('searchTerm', sql.NVarChar, searchTerm)
      .query(`SELECT * FROM tbl_product_order_details 
              WHERE (productname LIKE @searchTerm 
                 OR productcode LIKE @searchTerm
                 OR shortdescription LIKE @searchTerm
                 OR variantname LIKE @searchTerm) 
              ORDER BY rcm DESC;`);
    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

module.exports = router;