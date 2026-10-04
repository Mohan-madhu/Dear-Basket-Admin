const express = require('express');
const router = express.Router();
const { pool, poolConnect, sql } = require('../../config/db_dearbasket');

// helper: fetch categories for a section
async function getCategories(sectionId) {
  await poolConnect;
  const result = await pool.request()
    .input('sectionid', sql.VarChar, sectionId)
    .query('SELECT * FROM tbl_category WHERE sectionid = @sectionid;');
  return result.recordset;
}

// helper: fetch sections (with categories) for a menu
async function getSections(menuId) {
  await poolConnect;
  const secRes = await pool.request()
    .input('menuid', sql.VarChar, menuId)
    .query('SELECT * FROM tbl_section WHERE menuid = @menuid;');
  return Promise.all(secRes.recordset.map(async s => ({
    ...s,
    categories: await getCategories(s.transid)
  })));
}

// GET all menus w/ nested sections & categories
router.get('/', async (req, res, next) => {
  try {
    await poolConnect;
    const menuRes = await pool.request().query('SELECT * FROM tbl_menu;');
    const menus = await Promise.all(menuRes.recordset.map(async m => ({
      ...m,
      sections: await getSections(m.transid)
    })));
      res.json({Response:menus});
  } catch (err) {
    next(err);
  }
});

// GET single menu w/ nested sections & categories
router.get('/:id', async (req, res, next) => {
  try {
    await poolConnect;
    const menuRes = await pool.request()
      .input('transid', sql.VarChar, req.params.id)
      .query('SELECT * FROM tbl_menu WHERE transid = @transid;');
    // if (menuRes.recordset.length === 0) {
    //   return res.status(404).json({ message: 'Not found' });
    // }
    const m = menuRes.recordset[0];
    m.sections = await getSections(m.transid);
       res.json({Response:[m]});
  } catch (err) {
    next(err);
  }
});

module.exports = router;
