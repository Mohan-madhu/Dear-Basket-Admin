// FavoritesSlice.js
import { createSlice } from "@reduxjs/toolkit";
import AsyncStorage from '@react-native-async-storage/async-storage';
import Storage from "../../App_Utils/Services/StorageService";

const initialState = {
    favorites: [],
};

const loadFavoritesFromStorage = async () => {
    try {
        const favorites = await AsyncStorage.getItem('favorites');
        return favorites ? JSON.parse(favorites) : [];
    } catch (error) {
        console.error('Error loading favorites from AsyncStorage', error);
        return [];
    }
};

const saveFavoritesToStorage = async (favorites) => {
    try {
        console.log(JSON.stringify(favorites));
        Storage.storeData('favorites', favorites);
        console.log("Favorites Saved");
        console.log(JSON.stringify(favorites));
    } catch (error) {
        console.error('Error saving favorites to AsyncStorage', error);
    }
};

export const FavoritesSlice = createSlice({
    name: "favorites",
    initialState,
    reducers: {
        addToFavorites: (state, action) => {
            const exists = state.favorites.find(
                (item) => item.variantid === action.payload.variantid
            );
            if (!exists) {
                state.favorites.push(action.payload);
            }
            // ✅ Convert draft to plain object before async call
           
            saveFavoritesToStorage(state.favorites);
        },

        removeFromFavorites: (state, action) => {
            state.favorites = state.favorites.filter(
                (item) => item.variantid !== action.payload.variantid
            );
            // ✅ Convert draft to plain object
            
            saveFavoritesToStorage(state.favorites);
        },

        clearFavorites: (state) => {
            state.favorites = [];
            // ✅ Convert draft to plain object
            saveFavoritesToStorage(state.favorites);
        },

        setFavorites: (state, action) => {
            state.favorites = action.payload || [];
        },
    },
});

export const {
    addToFavorites,
    removeFromFavorites,
    clearFavorites,
    setFavorites,
} = FavoritesSlice.actions;

export default FavoritesSlice.reducer;

export const loadFavorites = () => async (dispatch) => {
    const favorites = await loadFavoritesFromStorage();
    dispatch(setFavorites(favorites));
};