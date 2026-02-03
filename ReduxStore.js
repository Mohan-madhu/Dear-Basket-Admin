// App/Redux/store.js
import { configureStore } from '@reduxjs/toolkit';
import cartReducer from './App/Redux/CartReducer';  // Adjust the path as needed
import favoritesReducer from './App/Redux/FavouriteReducer';  // Adjust the path as needed

export const store = configureStore({
    reducer: {
        cart: cartReducer,
        favorites: favoritesReducer,
    },
});
