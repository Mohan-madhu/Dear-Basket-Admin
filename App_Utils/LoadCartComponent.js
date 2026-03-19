import React, { useEffect } from "react";
import { useDispatch } from "react-redux";
import { loadCart } from "../App/Redux/CartReducer"; // Adjust the path to your CartReducer

export const LoadCartComponent = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(loadCart());
  }, [dispatch]);

  return null; // This component doesn't need to render anything
};
