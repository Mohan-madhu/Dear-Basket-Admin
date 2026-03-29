IF OBJECT_ID('dbo.tbl_product_return_refund', 'U') IS NOT NULL DROP TABLE dbo.tbl_product_return_refund;
IF OBJECT_ID('dbo.tbl_product_return_status_history', 'U') IS NOT NULL DROP TABLE dbo.tbl_product_return_status_history;
IF OBJECT_ID('dbo.tbl_product_return_details', 'U') IS NOT NULL DROP TABLE dbo.tbl_product_return_details;
IF OBJECT_ID('dbo.tbl_product_returns', 'U') IS NOT NULL DROP TABLE dbo.tbl_product_returns;
GO

CREATE TABLE dbo.tbl_product_returns (
    returnid UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    returnnumber NVARCHAR(40) NOT NULL UNIQUE,
    productorderid NVARCHAR(100) NOT NULL,
    userid NVARCHAR(100) NOT NULL,
    username NVARCHAR(200) NULL,
    partnerid NVARCHAR(100) NULL,
    pickupaddress NVARCHAR(500) NULL,
    pickupcity NVARCHAR(120) NULL,
    pickupstate NVARCHAR(120) NULL,
    pickuppincode NVARCHAR(20) NULL,
    pickuplatitude NVARCHAR(50) NULL,
    pickuplongitude NVARCHAR(50) NULL,
    totalitems INT NOT NULL DEFAULT 0,
    totalreturnqty DECIMAL(10,2) NOT NULL DEFAULT 0,
    totalreturnamount DECIMAL(18,2) NOT NULL DEFAULT 0,
    returnreason NVARCHAR(500) NULL,
    adminremarks NVARCHAR(500) NULL,
    returnstatus NVARCHAR(50) NOT NULL DEFAULT 'Requested',
    requestedtime DATETIME2 NOT NULL DEFAULT DATEADD(MINUTE,330,GETUTCDATE()),
    approvedtime DATETIME2 NULL,
    rejectedtime DATETIME2 NULL,
    pickuptime DATETIME2 NULL,
    refundedtime DATETIME2 NULL,
    closedtime DATETIME2 NULL,
    isactive BIT NOT NULL DEFAULT 1,
    rcu NVARCHAR(200) NULL,
    rcm DATETIME2 NOT NULL DEFAULT DATEADD(MINUTE,330,GETUTCDATE()),
    luu NVARCHAR(200) NULL,
    lum DATETIME2 NULL
);
GO

CREATE TABLE dbo.tbl_product_return_details (
    returndetailid UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    returnid UNIQUEIDENTIFIER NOT NULL,
    productorderdetailsid UNIQUEIDENTIFIER NULL,
    productid UNIQUEIDENTIFIER NULL,
    variantid UNIQUEIDENTIFIER NULL,
    productname NVARCHAR(250) NULL,
    variantname NVARCHAR(250) NULL,
    orderedqty DECIMAL(10,2) NOT NULL DEFAULT 0,
    returnqty DECIMAL(10,2) NOT NULL DEFAULT 0,
    unitprice DECIMAL(18,2) NOT NULL DEFAULT 0,
    lineamount DECIMAL(18,2) NOT NULL DEFAULT 0,
    itemreason NVARCHAR(500) NULL,
    itemstatus NVARCHAR(50) NOT NULL DEFAULT 'Requested',
    rcu NVARCHAR(200) NULL,
    rcm DATETIME2 NOT NULL DEFAULT DATEADD(MINUTE,330,GETUTCDATE()),
    luu NVARCHAR(200) NULL,
    lum DATETIME2 NULL,
    CONSTRAINT FK_tbl_product_return_details_returnid
      FOREIGN KEY (returnid) REFERENCES dbo.tbl_product_returns(returnid)
);
GO

CREATE TABLE dbo.tbl_product_return_status_history (
    returnstatusid UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    returnid UNIQUEIDENTIFIER NOT NULL,
    oldstatus NVARCHAR(50) NULL,
    newstatus NVARCHAR(50) NOT NULL,
    changedby NVARCHAR(200) NULL,
    changedtime DATETIME2 NOT NULL DEFAULT DATEADD(MINUTE,330,GETUTCDATE()),
    remarks NVARCHAR(500) NULL,
    CONSTRAINT FK_tbl_product_return_status_history_returnid
      FOREIGN KEY (returnid) REFERENCES dbo.tbl_product_returns(returnid)
);
GO

CREATE TABLE dbo.tbl_product_return_refund (
    refundid UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    returnid UNIQUEIDENTIFIER NOT NULL UNIQUE,
    refundmethod NVARCHAR(30) NOT NULL,
    refundamount DECIMAL(18,2) NOT NULL DEFAULT 0,
    gpaynumber NVARCHAR(30) NULL,
    upiid NVARCHAR(120) NULL,
    bankholdername NVARCHAR(200) NULL,
    bankname NVARCHAR(200) NULL,
    accountnumber NVARCHAR(50) NULL,
    ifsccode NVARCHAR(20) NULL,
    cashpaidby NVARCHAR(200) NULL,
    cashpaidtime DATETIME2 NULL,
    paymentstatus NVARCHAR(30) NOT NULL DEFAULT 'Pending',
    paymentreference NVARCHAR(200) NULL,
    failurereason NVARCHAR(500) NULL,
    rcu NVARCHAR(200) NULL,
    rcm DATETIME2 NOT NULL DEFAULT DATEADD(MINUTE,330,GETUTCDATE()),
    luu NVARCHAR(200) NULL,
    lum DATETIME2 NULL,
    CONSTRAINT FK_tbl_product_return_refund_returnid
      FOREIGN KEY (returnid) REFERENCES dbo.tbl_product_returns(returnid)
);
GO

CREATE INDEX IX_tbl_product_returns_productorderid ON dbo.tbl_product_returns(productorderid);
CREATE INDEX IX_tbl_product_returns_user_status_time ON dbo.tbl_product_returns(userid, returnstatus, requestedtime DESC);
CREATE INDEX IX_tbl_product_returns_partner_status_time ON dbo.tbl_product_returns(partnerid, returnstatus, requestedtime DESC);
CREATE INDEX IX_tbl_product_return_details_returnid ON dbo.tbl_product_return_details(returnid);
CREATE INDEX IX_tbl_product_return_status_history_return_time ON dbo.tbl_product_return_status_history(returnid, changedtime DESC);
GO

