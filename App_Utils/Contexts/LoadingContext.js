// LoadingContext.js
import React, { createContext, useState, useContext, useEffect } from "react";

const LoadingContext = createContext();

export const LoadingProvider = ({ children }) => {
  const [loading, setLoad] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [timeoutId, setTimeoutId] = useState(null);

  const setLoading = (isLoading, text = "Loading...") => {
    setLoad(isLoading);
    setLoadingText(text);

    if (isLoading) {
      // Set a timeout to automatically hide loading after 20 seconds
      const id = setTimeout(() => {
        setLoad(false);
        setLoadingText("");
        setTimeoutId(null);
      }, 20000);
      setTimeoutId(id);
    } else {
      // Clear any existing timeout if loading is manually set to false
      if (timeoutId) {
        clearTimeout(timeoutId);
        setTimeoutId(null);
      }
    }
  };

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [timeoutId]);

  return (
    <LoadingContext.Provider value={{ loading, loadingText, setLoading }}>
      {children}
    </LoadingContext.Provider>
  );
};

export const useLoading = () => useContext(LoadingContext);