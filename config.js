// Global Configuration
// To change the backend URL, modify only this file

export const Config = {
  // Backend API base URL
   BASE_URL: "https://dev.dine360.ca/backend",
   //BASE_URL: "http://82.25.105.135:15000",
  
  // API endpoint
  API_URL: "https://dev.dine360.ca/backend/API/DearBasket",
//  API_URL: "http://82.25.105.135:15000/API/DearBasket",
  DEAR_KITCHEN_API_URL: "https://dev.dine360.ca/backend/API/DearBasket/DearKitchen",
   FAST_DELIVERY_PARTNER_PAYOUT_PER_ORDER: 50,
   NORMAL_DELIVERY_CHARGE: 20,
   NORMAL_DELIVERY_TAX_PERCENTAGE: 0,
   DEAR_KITCHEN_DELIVERY_CHARGE: 20,
   DEAR_KITCHEN_TAX_PERCENTAGE: 0,
   DAILY_MILK_DELIVERY_PROMISE: {
     Morning: {
       startHour: 7,
       startMinute: 0,
       endHour: 9,
       endMinute: 0,
       cutoffHour: 21,
       cutoffMinute: 30,
       deliveryOffsetBeforeCutoff: 1,
       deliveryOffsetAfterCutoff: 2,
     },
     Evening: {
       startHour: 18,
       startMinute: 0,
       endHour: 19,
       endMinute: 0,
       cutoffHour: 16,
       cutoffMinute: 30,
       deliveryOffsetBeforeCutoff: 0,
       deliveryOffsetAfterCutoff: 1,
     },
   },
};

// Helper function to build image URLs
export const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  if (imagePath.startsWith("http")) return imagePath;
  



  // Remove leading slashes and handle different path formats
  const cleanPath = imagePath.replace(/^\/+/, "")  //.replace("~/", "");
  
  // If path starts with ~/ or ./, slice first 2 characters
  const finalPath = imagePath.startsWith("~/") || imagePath.startsWith("./") 
    ? cleanPath.slice(2) 
    : cleanPath;
  
 
  return `${Config.BASE_URL}/${finalPath}`;
};
