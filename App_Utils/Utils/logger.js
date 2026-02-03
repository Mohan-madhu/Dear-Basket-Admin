// // src/utils/logger.js
// export function createLogger(screenName) {
//   return (message, error) => {
//     if (error) console.error(`[${screenName}] ${message} --- `, error);
//     else console.warn(`[${screenName}] ${message}`);
//   };
// }
// a
// src/utils/logger.js
export function createLogger(screenName) {
  return (message, error) => {
    let formattedMessage = message;

    try {
      // If it's an object, stringify with 2-space indentation
      if (typeof message === "object") {
        formattedMessage = JSON.stringify(message, null, 2);
      }
    } catch (e) {
      // If stringify fails (like circular refs), fall back to normal
      formattedMessage = message;
    }

    if (error) {
      console.warn(`[${screenName}] ${formattedMessage} --- `, error);
    } else {
      console.warn(`[${screenName}] => ${formattedMessage}`);
    }
  };
}
