import { Config } from "../../config";
import AsyncStorage from "@react-native-async-storage/async-storage";

var BASE_URL = Config.API_URL;
var DEAR_KITCHEN_BASE_URL = Config.DEAR_KITCHEN_API_URL;
 //BASE_URL = "http://192.168.73.97/API/DearBasket";
//BASE_URL = "http://192.168.1.4rrrr/API/DearBasket";

const headers = {
  Accept: "application/json",
};

const API_CACHE_PREFIX = "api_get_cache:";
const API_CACHE_INDEX_KEY = "api_get_cache:index";
const cacheListeners = new Set();

const normalizeEndpoint = (endpoint) => String(endpoint || "").replace(/^\/+/, "");

const buildCacheKey = (baseUrl, endpoint) =>
  `${API_CACHE_PREFIX}${baseUrl}/${normalizeEndpoint(endpoint)}`;

const notifyCacheListeners = (event) => {
  cacheListeners.forEach((listener) => {
    try {
      listener(event);
    } catch (error) {
      console.error("API cache listener error:", error);
    }
  });
};

export const subscribeApiCache = (listener) => {
  cacheListeners.add(listener);
  return () => cacheListeners.delete(listener);
};

const readCachedGet = async (cacheKey) => {
  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    return cached ? JSON.parse(cached)?.data ?? null : null;
  } catch (error) {
    console.error("API cache read error:", error);
    return null;
  }
};

const rememberCacheKey = async (cacheKey) => {
  try {
    const raw = await AsyncStorage.getItem(API_CACHE_INDEX_KEY);
    const keys = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(keys) || keys.includes(cacheKey)) return;
    await AsyncStorage.setItem(API_CACHE_INDEX_KEY, JSON.stringify([...keys, cacheKey]));
  } catch (error) {
    console.error("API cache index error:", error);
  }
};

const writeCachedGet = async ({ cacheKey, baseUrl, endpoint, data }) => {
  try {
    await AsyncStorage.setItem(
      cacheKey,
      JSON.stringify({
        data,
        baseUrl,
        endpoint: normalizeEndpoint(endpoint),
        cachedAt: new Date().toISOString(),
      })
    );
    await rememberCacheKey(cacheKey);
    notifyCacheListeners({ cacheKey, baseUrl, endpoint: normalizeEndpoint(endpoint), data });
  } catch (error) {
    console.error("API cache write error:", error);
  }
};

export const clearApiGetCache = async () => {
  try {
    const raw = await AsyncStorage.getItem(API_CACHE_INDEX_KEY);
    const keys = raw ? JSON.parse(raw) : [];
    if (Array.isArray(keys) && keys.length > 0) {
      await AsyncStorage.multiRemove(keys);
    }
    await AsyncStorage.removeItem(API_CACHE_INDEX_KEY);
  } catch (error) {
    console.error("API cache clear error:", error);
  }
};

const fetchWithTimeout = async (url, options, timeout = 60000) => {
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Request timed out")), timeout)
  );

  try {
    const response = await Promise.race([fetch(url, options), timeoutPromise]);
    const raw = await response.text();
    const contentType = response.headers?.get?.("content-type") || "";
    const isJsonLike =
      contentType.toLowerCase().includes("application/json") ||
      raw.trim().startsWith("{") ||
      raw.trim().startsWith("[");

    let data = null;
    if (isJsonLike) {
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        try {
          // Some responses contain illegal control chars (U+0000..U+001F) inside strings.
          // Strip them as a recovery fallback so clients don't crash on otherwise-valid payloads.
          const sanitized = (raw || "").replace(/[\u0000-\u0019]/g, "");
          data = sanitized ? JSON.parse(sanitized) : {};
        } catch {
          throw new Error("Invalid JSON response from server.");
        }
      }
    } else {
      const snippet = (raw || "").replace(/\s+/g, " ").slice(0, 160);
      throw new Error(
        `Server returned non-JSON response (${response.status}) for ${options?.method || "GET"} ${url}. ${snippet || "No response body"}`
      );
    }

    if (!response.ok) {
      console.log(data);
      throw new Error(
        data.Message ||
          data.message ||
          data.error ||
          `API Error (${response.status}) for ${options?.method || "GET"} ${url}`
      );
    }

    return data;
  } catch (error) {
    console.error("API Error:", {
      method: options?.method || "GET",
      url,
      message: error?.message || "Unknown error",
    });
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
    console.log("Endpoint : ",`${BASE_URL}/${endpoint}`, options)
    return await fetchWithTimeout(`${BASE_URL}/${endpoint}`, options, 15000);

  } catch (error) {
    const enrichedMessage = `API ${method} ${BASE_URL}/${endpoint} failed: ${error?.message || "Unknown error"}`;
    console.error("API Error from apiRequest:", enrichedMessage);
    throw new Error(enrichedMessage);
  }
};

const cachedApiGetRequest = async (baseUrl, endpoint, requestFn) => {
  const normalizedEndpoint = normalizeEndpoint(endpoint);
  const cacheKey = buildCacheKey(baseUrl, normalizedEndpoint);
  const cached = await readCachedGet(cacheKey);

  if (cached) {
    requestFn(normalizedEndpoint)
      .then((fresh) =>
        writeCachedGet({
          cacheKey,
          baseUrl,
          endpoint: normalizedEndpoint,
          data: fresh,
        })
      )
      .catch((error) => {
        console.warn(
          `Background refresh failed for ${baseUrl}/${normalizedEndpoint}:`,
          error?.message || error
        );
      });

    return cached;
  }

  const fresh = await requestFn(normalizedEndpoint);
  await writeCachedGet({ cacheKey, baseUrl, endpoint: normalizedEndpoint, data: fresh });
  return fresh;
};

const freshApiGetRequest = async (baseUrl, endpoint, requestFn) => {
  const normalizedEndpoint = normalizeEndpoint(endpoint);
  const cacheKey = buildCacheKey(baseUrl, normalizedEndpoint);
  const fresh = await requestFn(normalizedEndpoint);
  await writeCachedGet({ cacheKey, baseUrl, endpoint: normalizedEndpoint, data: fresh });
  return fresh;
};

const kitchenApiRequest = async (endpoint, method = "GET", body = null) => {
  const options = { method, headers: { ...headers } };

  if (body) {
    options.body = JSON.stringify(body);
    options.headers["Content-Type"] = "application/json";
  }

  try {
    //console.log("DearKitchen Endpoint : ", `${DEAR_KITCHEN_BASE_URL}/${endpoint}`, options);
    return await fetchWithTimeout(`${DEAR_KITCHEN_BASE_URL}/${endpoint}`, options, 15000);
  } catch (error) {
    const enrichedMessage = `DearKitchen API ${method} ${DEAR_KITCHEN_BASE_URL}/${endpoint} failed: ${error?.message || "Unknown error"}`;
    console.error("API Error from kitchenApiRequest:", enrichedMessage);
    throw new Error(enrichedMessage);
  }
};

const writeApiRequest = async (endpoint, method, body, requestFn) => {
  const result = await requestFn(endpoint, method, body);
  await clearApiGetCache();
  return result;
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
    const result = await fetchWithTimeout(`${BASE_URL}/${endpoint}`, options, 20000); // Increased timeout for file upload
    await clearApiGetCache();
    return result;
  } catch (error) {
    console.log(error)
    console.error("File Upload Error:", error);
    throw error;
  }
};

// Exporting individual methods for direct usage
export const API = {
  GET: (endpoint) => cachedApiGetRequest(BASE_URL, endpoint, (nextEndpoint) => apiRequest(nextEndpoint, "GET")),
  GET_FRESH: (endpoint) => freshApiGetRequest(BASE_URL, endpoint, (nextEndpoint) => apiRequest(nextEndpoint, "GET")),
  GETBYID: (endpoint, id) => cachedApiGetRequest(BASE_URL, `${endpoint}/${id}`, (nextEndpoint) => apiRequest(nextEndpoint, "GET")),
  POST: (endpoint, body) => writeApiRequest(endpoint, "POST", body, apiRequest),
  PUT: (endpoint, body) => writeApiRequest(endpoint, "PUT", body, apiRequest),
  DELETE: (endpoint, body) => writeApiRequest(endpoint, "DELETE", body, apiRequest),
  UPLOAD: (endpoint, file, extraData) => uploadFile(endpoint, file, extraData), // 📌 Added Upload API
  CLEAR_CACHE: clearApiGetCache,
};

export const DearKitchenAPI = {
  GET: (endpoint) => cachedApiGetRequest(DEAR_KITCHEN_BASE_URL, endpoint, (nextEndpoint) => kitchenApiRequest(nextEndpoint, "GET")),
  GET_FRESH: (endpoint) => freshApiGetRequest(DEAR_KITCHEN_BASE_URL, endpoint, (nextEndpoint) => kitchenApiRequest(nextEndpoint, "GET")),
  POST: (endpoint, body) => writeApiRequest(endpoint, "POST", body, kitchenApiRequest),
  PUT: (endpoint, body) => writeApiRequest(endpoint, "PUT", body, kitchenApiRequest),
  DELETE: (endpoint, body) => writeApiRequest(endpoint, "DELETE", body, kitchenApiRequest),
  CLEAR_CACHE: clearApiGetCache,
};
