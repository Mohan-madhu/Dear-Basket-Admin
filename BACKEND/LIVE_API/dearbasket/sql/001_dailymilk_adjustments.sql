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

-- The existing dailymilkbookingid/date columns are varchar(max), which SQL
-- Server cannot use as index key columns. No index is created here.
