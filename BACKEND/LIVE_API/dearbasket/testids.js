const { getUserId, getPartnerId, getOrderId } = require("./helper/idGenerator");

console.log(getPartnerId(0));   // #369DP-A
console.log(getPartnerId(95));  // #369DP-CR

console.log(getUserId(27));     // #369DU-AB

console.log(getOrderId("A", 0));   // #DBO-A-20251218-01
console.log(getOrderId("AB", 6));  // #DBO-AB-20251218-07