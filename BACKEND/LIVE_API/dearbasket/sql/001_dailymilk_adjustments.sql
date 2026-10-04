/*
  DearBasket Daily Milk adjustment support.
  Run once against db_dearbasket before deploying the updated API.
*/
IF COL_LENGTH('dbo.tbl_dailymilkstatus', 'adjustedquantity') IS NULL
BEGIN
  ALTER TABLE dbo.tbl_dailymilkstatus
    ADD adjustedquantity DECIMAL(18, 2) NULL;
END;
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'IX_tbl_dailymilkstatus_booking_date'
    AND object_id = OBJECT_ID('dbo.tbl_dailymilkstatus')
)
BEGIN
  CREATE INDEX IX_tbl_dailymilkstatus_booking_date
    ON dbo.tbl_dailymilkstatus (dailymilkbookingid, [date]);
END;
GO
