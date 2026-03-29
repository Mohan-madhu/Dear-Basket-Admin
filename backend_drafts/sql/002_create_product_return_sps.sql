CREATE OR ALTER PROCEDURE dbo.sp_get_product_returns_list
    @Status NVARCHAR(50) = NULL,
    @PartnerId NVARCHAR(100) = NULL,
    @UserId NVARCHAR(100) = NULL,
    @Search NVARCHAR(200) = NULL,
    @FromDate DATETIME2 = NULL,
    @ToDate DATETIME2 = NULL,
    @Page INT = 1,
    @PageSize INT = 25
AS
BEGIN
    SET NOCOUNT ON;
    IF @Page < 1 SET @Page = 1;
    IF @PageSize < 1 SET @PageSize = 25;

    ;WITH Q AS (
        SELECT r.*
        FROM dbo.tbl_product_returns r
        WHERE (@Status IS NULL OR r.returnstatus = @Status)
          AND (@PartnerId IS NULL OR r.partnerid = @PartnerId)
          AND (@UserId IS NULL OR r.userid = @UserId)
          AND (@FromDate IS NULL OR r.requestedtime >= @FromDate)
          AND (@ToDate IS NULL OR r.requestedtime < DATEADD(DAY, 1, @ToDate))
          AND (
              @Search IS NULL
              OR r.returnnumber LIKE '%' + @Search + '%'
              OR r.productorderid LIKE '%' + @Search + '%'
              OR r.username LIKE '%' + @Search + '%'
              OR r.userid LIKE '%' + @Search + '%'
          )
    )
    SELECT *
    FROM Q
    ORDER BY requestedtime DESC
    OFFSET (@Page - 1) * @PageSize ROWS
    FETCH NEXT @PageSize ROWS ONLY;

    SELECT COUNT(*) AS totalcount, @Page AS page, @PageSize AS pagesize
    FROM dbo.tbl_product_returns r
    WHERE (@Status IS NULL OR r.returnstatus = @Status)
      AND (@PartnerId IS NULL OR r.partnerid = @PartnerId)
      AND (@UserId IS NULL OR r.userid = @UserId)
      AND (@FromDate IS NULL OR r.requestedtime >= @FromDate)
      AND (@ToDate IS NULL OR r.requestedtime < DATEADD(DAY, 1, @ToDate))
      AND (
          @Search IS NULL
          OR r.returnnumber LIKE '%' + @Search + '%'
          OR r.productorderid LIKE '%' + @Search + '%'
          OR r.username LIKE '%' + @Search + '%'
          OR r.userid LIKE '%' + @Search + '%'
      );
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_get_product_returns_by_user
    @UserId NVARCHAR(100),
    @Status NVARCHAR(50) = NULL,
    @FromDate DATETIME2 = NULL,
    @ToDate DATETIME2 = NULL,
    @Page INT = 1,
    @PageSize INT = 25
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_get_product_returns_list
      @Status = @Status,
      @PartnerId = NULL,
      @UserId = @UserId,
      @Search = NULL,
      @FromDate = @FromDate,
      @ToDate = @ToDate,
      @Page = @Page,
      @PageSize = @PageSize;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_get_product_return_complete
    @ReturnId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM dbo.tbl_product_returns WHERE returnid = @ReturnId;
    SELECT * FROM dbo.tbl_product_return_details WHERE returnid = @ReturnId ORDER BY rcm ASC;
    SELECT * FROM dbo.tbl_product_return_status_history WHERE returnid = @ReturnId ORDER BY changedtime ASC;
    SELECT * FROM dbo.tbl_product_return_refund WHERE returnid = @ReturnId;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_update_product_return_status
    @ReturnId UNIQUEIDENTIFIER,
    @Status NVARCHAR(50),
    @Remarks NVARCHAR(500) = NULL,
    @Luu NVARCHAR(200)
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @OldStatus NVARCHAR(50);

    SELECT @OldStatus = returnstatus
    FROM dbo.tbl_product_returns
    WHERE returnid = @ReturnId;

    IF @OldStatus IS NULL
    BEGIN
        RAISERROR('Return not found.', 16, 1);
        RETURN;
    END

    UPDATE dbo.tbl_product_returns
    SET returnstatus = @Status,
        adminremarks = COALESCE(@Remarks, adminremarks),
        approvedtime = CASE WHEN @Status = 'Approved' THEN DATEADD(MINUTE,330,GETUTCDATE()) ELSE approvedtime END,
        rejectedtime = CASE WHEN @Status = 'Rejected' THEN DATEADD(MINUTE,330,GETUTCDATE()) ELSE rejectedtime END,
        pickuptime = CASE WHEN @Status = 'PickedUp' THEN DATEADD(MINUTE,330,GETUTCDATE()) ELSE pickuptime END,
        refundedtime = CASE WHEN @Status = 'Refunded' THEN DATEADD(MINUTE,330,GETUTCDATE()) ELSE refundedtime END,
        closedtime = CASE WHEN @Status = 'Closed' THEN DATEADD(MINUTE,330,GETUTCDATE()) ELSE closedtime END,
        luu = @Luu,
        lum = DATEADD(MINUTE,330,GETUTCDATE())
    WHERE returnid = @ReturnId;

    INSERT INTO dbo.tbl_product_return_status_history
    (returnstatusid, returnid, oldstatus, newstatus, changedby, changedtime, remarks)
    VALUES
    (NEWID(), @ReturnId, @OldStatus, @Status, @Luu, DATEADD(MINUTE,330,GETUTCDATE()), @Remarks);

    SELECT * FROM dbo.tbl_product_returns WHERE returnid = @ReturnId;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_upsert_product_return_refund
    @ReturnId UNIQUEIDENTIFIER,
    @RefundMethod NVARCHAR(30),
    @RefundAmount DECIMAL(18,2),
    @PaymentStatus NVARCHAR(30),
    @PaymentReference NVARCHAR(200) = NULL,
    @GpayNumber NVARCHAR(30) = NULL,
    @UpiId NVARCHAR(120) = NULL,
    @BankHolderName NVARCHAR(200) = NULL,
    @BankName NVARCHAR(200) = NULL,
    @AccountNumber NVARCHAR(50) = NULL,
    @IfscCode NVARCHAR(20) = NULL,
    @CashPaidBy NVARCHAR(200) = NULL,
    @Luu NVARCHAR(200)
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (SELECT 1 FROM dbo.tbl_product_return_refund WHERE returnid = @ReturnId)
    BEGIN
        UPDATE dbo.tbl_product_return_refund
        SET refundmethod = @RefundMethod,
            refundamount = @RefundAmount,
            paymentstatus = @PaymentStatus,
            paymentreference = @PaymentReference,
            gpaynumber = @GpayNumber,
            upiid = @UpiId,
            bankholdername = @BankHolderName,
            bankname = @BankName,
            accountnumber = @AccountNumber,
            ifsccode = @IfscCode,
            cashpaidby = @CashPaidBy,
            cashpaidtime = CASE WHEN @RefundMethod = 'Cash' AND @PaymentStatus = 'Success' THEN DATEADD(MINUTE,330,GETUTCDATE()) ELSE cashpaidtime END,
            luu = @Luu,
            lum = DATEADD(MINUTE,330,GETUTCDATE())
        WHERE returnid = @ReturnId;
    END
    ELSE
    BEGIN
        INSERT INTO dbo.tbl_product_return_refund
        (refundid, returnid, refundmethod, refundamount, paymentstatus, paymentreference,
         gpaynumber, upiid, bankholdername, bankname, accountnumber, ifsccode, cashpaidby, cashpaidtime, rcu, rcm)
        VALUES
        (NEWID(), @ReturnId, @RefundMethod, @RefundAmount, @PaymentStatus, @PaymentReference,
         @GpayNumber, @UpiId, @BankHolderName, @BankName, @AccountNumber, @IfscCode, @CashPaidBy,
         CASE WHEN @RefundMethod = 'Cash' AND @PaymentStatus = 'Success' THEN DATEADD(MINUTE,330,GETUTCDATE()) ELSE NULL END,
         @Luu, DATEADD(MINUTE,330,GETUTCDATE()));
    END

    IF @PaymentStatus = 'Success'
    BEGIN
        EXEC dbo.sp_update_product_return_status @ReturnId = @ReturnId, @Status = 'Refunded', @Remarks = NULL, @Luu = @Luu;
    END
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_get_product_returns_dashboard
    @FilterType NVARCHAR(20) = 'TODAY',
    @FromDate DATETIME2 = NULL,
    @ToDate DATETIME2 = NULL,
    @PartnerId NVARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @StartDate DATETIME2 = @FromDate;
    DECLARE @EndDate DATETIME2 = @ToDate;
    DECLARE @Now DATETIME2 = DATEADD(MINUTE,330,GETUTCDATE());

    IF @FilterType = 'TODAY'
    BEGIN
      SET @StartDate = CAST(CAST(@Now AS DATE) AS DATETIME2);
      SET @EndDate = DATEADD(DAY, 1, @StartDate);
    END
    ELSE IF @FilterType = 'WEEK'
    BEGIN
      SET @StartDate = DATEADD(DAY, -6, CAST(CAST(@Now AS DATE) AS DATETIME2));
      SET @EndDate = DATEADD(DAY, 1, CAST(CAST(@Now AS DATE) AS DATETIME2));
    END
    ELSE IF @FilterType = 'MONTH'
    BEGIN
      SET @StartDate = DATEFROMPARTS(YEAR(@Now), MONTH(@Now), 1);
      SET @EndDate = DATEADD(DAY, 1, CAST(CAST(@Now AS DATE) AS DATETIME2));
    END
    ELSE IF @FilterType = 'YEAR'
    BEGIN
      SET @StartDate = DATEFROMPARTS(YEAR(@Now), 1, 1);
      SET @EndDate = DATEADD(DAY, 1, CAST(CAST(@Now AS DATE) AS DATETIME2));
    END

    SELECT
      COUNT(1) AS totalreturns,
      SUM(CASE WHEN returnstatus = 'Requested' THEN 1 ELSE 0 END) AS requested,
      SUM(CASE WHEN returnstatus = 'Approved' THEN 1 ELSE 0 END) AS approved,
      SUM(CASE WHEN returnstatus = 'Rejected' THEN 1 ELSE 0 END) AS rejected,
      SUM(CASE WHEN returnstatus = 'PickedUp' THEN 1 ELSE 0 END) AS pickedup,
      SUM(CASE WHEN returnstatus = 'Refunded' THEN 1 ELSE 0 END) AS refunded,
      SUM(totalreturnamount) AS totalreturnamount
    FROM dbo.tbl_product_returns r
    WHERE (@PartnerId IS NULL OR r.partnerid = @PartnerId)
      AND (@StartDate IS NULL OR r.requestedtime >= @StartDate)
      AND (@EndDate IS NULL OR r.requestedtime < @EndDate);
END
GO
