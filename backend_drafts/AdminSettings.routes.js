const express = require('express');
const router = express.Router();
const { pool, poolConnect, sql } = require('../config/db_dearbasket');

const FEATURE_DEFAULTS = [
  ['demo_daily_milk_enabled', '1'],
  ['daily_milk_enabled', '1'],
  ['dear_kitchen_enabled', '1'],
  ['fast_delivery_enabled', '1'],
  ['daily_milk_grocery_enabled', '1'],
];

const seedFeatureDefaults = async () => {
  for (const [key, value] of FEATURE_DEFAULTS) {
    await pool.request()
      .input('setting_key', sql.VarChar(255), key)
      .input('setting_value', sql.VarChar(sql.MAX), value)
      .query(`
        IF NOT EXISTS (
          SELECT 1
          FROM dbo.tbl_admin_settings
          WHERE setting_key = @setting_key
        )
        BEGIN
          INSERT INTO dbo.tbl_admin_settings
            (setting_key, setting_value, rcu, rcm)
          VALUES
            (@setting_key, @setting_value, 'SYSTEM', GETDATE());
        END
      `);
  }
};

router.get('/features', async (req, res, next) => {
  try {
    await poolConnect;
    await seedFeatureDefaults();

    const result = await pool.request().query(`
      SELECT
        setting_id,
        setting_key,
        setting_value,
        rcu,
        rcm,
        luu,
        lcm
      FROM dbo.tbl_admin_settings
      WHERE setting_key IN (
        'demo_daily_milk_enabled',
        'daily_milk_enabled',
        'dear_kitchen_enabled',
        'fast_delivery_enabled',
        'daily_milk_grocery_enabled'
      )
      ORDER BY setting_key ASC;
    `);

    res.json({ Response: result.recordset });
  } catch (err) {
    next(err);
  }
});

router.put('/features', async (req, res, next) => {
  try {
    await poolConnect;

    const settingKey = String(req.body.settingkey || req.body.setting_key || '').trim();
    const rawValue = req.body.settingvalue ?? req.body.setting_value;
    const settingValue = ['1', 'true', 'yes', 'on', 'enabled'].includes(String(rawValue).trim().toLowerCase())
      ? '1'
      : '0';
    const updatedBy = String(req.body.luu || req.body.rcu || 'ADMIN').trim();
    const allowedKeys = FEATURE_DEFAULTS.map(([key]) => key);

    if (!allowedKeys.includes(settingKey)) {
      return res.status(400).json({ message: 'Invalid setting key.' });
    }

    const result = await pool.request()
      .input('setting_key', sql.VarChar(255), settingKey)
      .input('setting_value', sql.VarChar(sql.MAX), settingValue)
      .input('luu', sql.VarChar(100), updatedBy)
      .query(`
        IF EXISTS (
          SELECT 1
          FROM dbo.tbl_admin_settings
          WHERE setting_key = @setting_key
        )
        BEGIN
          UPDATE dbo.tbl_admin_settings
          SET
            setting_value = @setting_value,
            luu = @luu,
            lcm = GETDATE()
          WHERE setting_key = @setting_key;
        END
        ELSE
        BEGIN
          INSERT INTO dbo.tbl_admin_settings
            (setting_key, setting_value, rcu, rcm)
          VALUES
            (@setting_key, @setting_value, @luu, GETDATE());
        END

        SELECT
          setting_id,
          setting_key,
          setting_value,
          rcu,
          rcm,
          luu,
          lcm
        FROM dbo.tbl_admin_settings
        WHERE setting_key = @setting_key;
      `);

    res.json({
      message: 'Setting updated successfully.',
      Response: result.recordset,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
