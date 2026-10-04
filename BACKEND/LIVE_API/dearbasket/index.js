const express = require("express");
const router = express.Router();

// pull in each table-file
router.use("/MenuSectionCategory", require("./MenuSectionCategory"));
router.use("/Menu", require("./Menu"));
router.use("/Section", require("./Section"));
router.use("/Category", require("./Category"));
router.use("/Type", require("./Type"));
router.use("/Product", require("./Product"));
router.use("/User", require("./User"));
router.use("/DailyMilkRegistration", require("./DailyMilkRegistration"));
router.use("/UserSignUp", require("./UserSignUp"));
router.use("/Login", require("./Login"));
router.use("/DailyMilkProducts", require("./DailyMilkProducts"));
router.use("/DailyMilkBooking", require("./DailyMilkBooking"));
router.use("/DailyMilkStatus", require("./DailyMilkStatus"));
router.use("/FileUpload", require("./FileUpload"));
router.use("/DailyMilkOrders", require("./DailyMilkOrders"));
router.use("/PregnancyApplication", require("./PregnancyApplication"));
router.use("/AdminSettings", require("./AdminSettings"));
router.use("/PartnerPayoutApplication", require("./PartnerPayoutApplication"));
router.use("/DailyMilkComplaint", require("./DailyMilkComplaint"));






router.use("/ProductVariant", require("./ProductVariant"));
router.use("/Products_new", require("./Products_new"));
router.use("/ProductImages", require("./ProductImages"));
router.use("/Offers", require("./Offers"));

router.use("/ProductOrder", require("./ProductOrder"));
router.use("/ProductOrderDetails", require("./ProductOrderDetails"));
router.use("/ProductReturn", require("./ProductReturn"));
router.use("/ProductAttributes", require("./ProductAttributes"));


// Dear Kitchen Routes
router.use("/DearKitchen/MealTypes",      require("./Dear-Kitchen/DK_MealTypes"));
router.use("/DearKitchen/Kitchens",       require("./Dear-Kitchen/DK_Kitchens"));
router.use("/DearKitchen/KitchenImages",  require("./Dear-Kitchen/DK_KitchenImages"));
router.use("/DearKitchen/Timeslots",      require("./Dear-Kitchen/DK_Timeslots"));
router.use("/DearKitchen/MenuCategories", require("./Dear-Kitchen/DK_MenuCategories"));
router.use("/DearKitchen/MenuItems",      require("./Dear-Kitchen/DK_MenuItems"));
router.use("/DearKitchen/Orders",         require("./Dear-Kitchen/DK_Orders"));
router.use("/DearKitchen/OrderItems",     require("./Dear-Kitchen/DK_OrderItems"));
router.use("/DearKitchen/Ratings",        require("./Dear-Kitchen/DK_Ratings"));
router.use("/DearKitchen/Ratings",        require("./Dear-Kitchen/DK_Ratings"));

// …more tables as you add them…
router.use("/PartnerApplication",        require("./PartnerApplication"));
module.exports = router;
