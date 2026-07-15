USE [db_dearbasket];
GO

IF NOT EXISTS (SELECT 1 FROM dbo.tbl_admin_settings WHERE setting_key = 'demo_daily_milk_enabled')
BEGIN
    INSERT INTO dbo.tbl_admin_settings (setting_key, setting_value, rcu)
    VALUES ('demo_daily_milk_enabled', '1', 'SYSTEM');
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.tbl_admin_settings WHERE setting_key = 'daily_milk_enabled')
BEGIN
    INSERT INTO dbo.tbl_admin_settings (setting_key, setting_value, rcu)
    VALUES ('daily_milk_enabled', '1', 'SYSTEM');
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.tbl_admin_settings WHERE setting_key = 'dear_kitchen_enabled')
BEGIN
    INSERT INTO dbo.tbl_admin_settings (setting_key, setting_value, rcu)
    VALUES ('dear_kitchen_enabled', '1', 'SYSTEM');
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.tbl_admin_settings WHERE setting_key = 'fast_delivery_enabled')
BEGIN
    INSERT INTO dbo.tbl_admin_settings (setting_key, setting_value, rcu)
    VALUES ('fast_delivery_enabled', '1', 'SYSTEM');
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.tbl_admin_settings WHERE setting_key = 'daily_milk_grocery_enabled')
BEGIN
    INSERT INTO dbo.tbl_admin_settings (setting_key, setting_value, rcu)
    VALUES ('daily_milk_grocery_enabled', '1', 'SYSTEM');
END
GO
