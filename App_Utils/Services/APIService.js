var BASE_URL = "https://dev.dine360.ca/backend/API/DearBasket";
BASE_URL = "https://dev.dine360.ca/backend/API/DearBasket";
 BASE_URL = "https://dev.dine360.ca/backend/API/DearBasket";
 //BASE_URL = "http://192.168.73.97/API/DearBasket";
//BASE_URL = "http://192.168.1.4rrrr/API/DearBasket";
// BASE_URL = "https://dev.dine360.ca/backend/API/DearBasket"
// API/ConstructionDelivery";

const headers = {
  Accept: "application/json",
};

const fetchWithTimeout = async (url, options, timeout = 15000) => {
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Request timed out")), timeout)
  );

  try {
    //console.log(url,options)
    const response = await Promise.race([fetch(url, options), timeoutPromise]);
    const data = await response.json();

    if (!response.ok) {
      console.log(data); 
      throw new Error(data.Message || data.message|| data.error||  "API Error");
    }

    return data;
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
};

const apiRequest = async (endpoint, method = "GET", body = null) => {
  const options = { method, headers };

  if (body) {
    options.body = JSON.stringify(body);
    options.headers["Content-Type"] = "application/json";
  }

  try {
    //console.log("Endpoint : ",`${BASE_URL}/${endpoint}`, options)
    return await fetchWithTimeout(`${BASE_URL}/${endpoint}`, options, 15000);

  } catch (error) {
    console.error("API Error from apiRequest:", error);
    throw error;
  }
};

// ✅ Function to handle file uploads using FormData
const uploadFile = async (endpoint, file, extraData = {}) => {
  const formData = new FormData();

   Object.keys(extraData).forEach((key) => {
    formData.append(key, extraData[key]);
  });
  // Append file
  formData.append("file", {
    uri: file.uri,
    name: file.name,
    type: file.type,
  });

  // Append additional data (e.g., folder path)
 

  const options = {
    method: "POST",
    body: formData,
    headers: {
      Accept: "application/json",
      // ⚠️ Do NOT set "Content-Type" manually; let the browser handle it
    },
  };

  try {
    return await fetchWithTimeout(`${BASE_URL}/${endpoint}`, options, 20000); // Increased timeout for file upload
  } catch (error) {
    console.log(error)
    console.error("File Upload Error:", error);
    throw error;
  }
};

// Exporting individual methods for direct usage
export const API = {
  GET: (endpoint) => apiRequest(endpoint, "GET"),
  GETBYID: (endpoint, id) => apiRequest(`${endpoint}/${id}`, "GET"),
  POST: (endpoint, body) => apiRequest(endpoint, "POST", body),
  PUT: (endpoint, body) => apiRequest(endpoint, "PUT", body),
  DELETE: (endpoint, body) => apiRequest(endpoint, "DELETE", body),
  UPLOAD: (endpoint, file, extraData) => uploadFile(endpoint, file, extraData), // 📌 Added Upload API
};
