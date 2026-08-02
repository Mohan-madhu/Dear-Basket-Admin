import { createSlice } from "@reduxjs/toolkit";
import AsyncStorage from '@react-native-async-storage/async-storage';

// Load initial state from AsyncStorage if available
const initialState = {
  cart: [],
};

const isDearKitchenItem = (item) => item?.source === "dearkitchen";
const getAvailableStock = (item = {}) => {
  if (isDearKitchenItem(item)) return Infinity;

  const stock = Number(item.stockquantity ?? item.quantity ?? item.product?.stockquantity);
  return Number.isFinite(stock) ? stock : Infinity;
};

const canIncreaseCartItem = (item) => {
  const availableStock = getAvailableStock(item);
  return availableStock === Infinity || Number(item?.orderquantity || 0) < availableStock;
};

const canAddCartItem = (item) => getAvailableStock(item) > 0;

const matchesCartItem = (item, payload = {}) => {
  if (item?.variantid !== payload?.variantid) return false;

  if (payload?.source) {
    return item?.source === payload.source;
  }

  return !isDearKitchenItem(item);
};

const loadCartFromStorage = async () => {
  try {
    const cart = await AsyncStorage.getItem('cart');
    //console.log("Cart Loaded - - - ", cart ? JSON.parse(cart) : [])
    return cart ? JSON.parse(cart) : [];
  } catch (error) {
    console.error('Error loading cart from AsyncStorage', error);
    return [];
  }
};

const saveCartToStorage = async (cart) => {
  try {
    AsyncStorage.setItem('cart', JSON.stringify(cart));
   // AsyncStorage.setItem('cart', JSON.stringify([]));
    console.log("Cart Saved");
  } catch (error) {
    console.error('Error saving cart to AsyncStorage', error);
  }
};

// export const CartSlice = createSlice({
//   name: "cart",
//   initialState,
//   reducers: {
//     addToCart: (state, action) => {
//       const itemPresent = state.cart.find(
//         (item) => item.transid === action.payload.transid
//       );
//       if (itemPresent) {
//         itemPresent.orderquantity++;
//       } else {
//         state.cart.push({ ...action.payload, orderquantity: 1 });
//       }
//       saveCartToStorage(state.cart);
//     },

//     removeFromCart: (state, action) => {
//       const removeItem = state.cart.filter(
//         (item) => item.transid !== action.payload.transid
//       );
//       state.cart = removeItem;
//       saveCartToStorage(state.cart);
//     },

//     incrementQuantity: (state, action) => {
//       const itemPresent = state.cart.find(
//         (item) => item.transid === action.payload.transid
//       );
//       itemPresent.orderquantity++;
//       saveCartToStorage(state.cart);
//     },

//     decrementQuantity: (state, action) => {
//       const itemPresent = state.cart.find(
//         (item) => item.transid === action.payload.transid
//       );
//       if (itemPresent.orderquantity === 1) {
//         const removeItem = state.cart.filter(
//           (item) => item.transid !== action.payload.transid
//         );
//         state.cart = removeItem;
//       } else {
//         itemPresent.orderquantity--;
//       }
//       saveCartToStorage(state.cart);
//     },

//     clearCart: (state) => {
//       state.cart = [];
//       saveCartToStorage(state.cart);
//     },

//     addToCartWithMinQuantity: (state, action) => {
//       const itemPresent = state.cart.find(
//         (item) => item.transid === action.payload.transid
//       );
//       if (itemPresent) {
//         itemPresent.orderquantity++;
//       } else {
//         state.cart.push({
//           ...action.payload,
//           orderquantity: Number(action.payload.minorderorderquantity),
//         });
//       }
//       saveCartToStorage(state.cart);
//     },

//     setCartItemQuantity: (state, action) => {
//       const { material, orderquantity } = action.payload;
//       const itemPresent = state.cart.find((item) => item.transid === material.transid);
//       itemPresent.orderquantity = orderquantity;
//       saveCartToStorage(state.cart);
//     },
//   },
// });

// export const {
//   addToCart,
//   removeFromCart,
//   incrementQuantity,
//   decrementQuantity,
//   clearCart,
//   addToCartWithMinQuantity,
//   setCartItemQuantity,
// } = CartSlice.actions;
//export default CartSlice.reducer;


export const CartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addToCart: (state, action) => {
      console.log("Adding to cart with min quantity:", JSON.stringify(action.payload,null,3));
      const itemPresent = state.cart.find(
        (item) => matchesCartItem(item, action.payload)
      );
      if (itemPresent) {
        if (canIncreaseCartItem(itemPresent)) {
          itemPresent.orderquantity++;
        }
      } else {
        if (canAddCartItem(action.payload)) {
          state.cart.push({ ...action.payload, orderquantity: 1 });
        }
      }
      saveCartToStorage(state.cart);
    },

    removeFromCart: (state, action) => {
      const removeItem = state.cart.filter(
        (item) => !matchesCartItem(item, action.payload)
      );
      state.cart = removeItem;
      saveCartToStorage(state.cart);
    },

    incrementQuantity: (state, action) => {
      const itemPresent = state.cart.find(
        (item) => matchesCartItem(item, action.payload)
      );
      if (!itemPresent) return;
      if (canIncreaseCartItem(itemPresent)) {
        itemPresent.orderquantity++;
      }
      saveCartToStorage(state.cart);
    },

    decrementQuantity: (state, action) => {
      const itemPresent = state.cart.find(
        (item) => matchesCartItem(item, action.payload)
      );
      if (!itemPresent) return;
      if (itemPresent.orderquantity === 1) {
        const removeItem = state.cart.filter(
          (item) => !matchesCartItem(item, action.payload)
        );
        state.cart = removeItem;
      } else {
        itemPresent.orderquantity--;
      }
      saveCartToStorage(state.cart);
    },

    clearCart: (state) => {
      state.cart = [];
      saveCartToStorage(state.cart);
    },

    clearCartBySource: (state, action) => {
      const source = action.payload?.source;
      if (!source) return;

      state.cart = state.cart.filter((item) => item?.source !== source);
      saveCartToStorage(state.cart);
    },

    clearNormalCart: (state) => {
      state.cart = state.cart.filter(isDearKitchenItem);
      saveCartToStorage(state.cart);
    },

    addToCartWithMinQuantity: (state, action) => {
      console.log("Adding to cart with min quantity:", action.payload);
      const itemPresent = state.cart.find(
        (item) => matchesCartItem(item, action.payload)
      );
      if (itemPresent) {
        if (canIncreaseCartItem(itemPresent)) {
          itemPresent.orderquantity++;
        }
      } else {
        const requestedQuantity = Number(action.payload.minorderorderquantity) || 1;
        const availableStock = getAvailableStock(action.payload);
        if (availableStock > 0) {
          state.cart.push({
            ...action.payload,
            orderquantity: Math.min(requestedQuantity, availableStock),
          });
        }
      }
      saveCartToStorage(state.cart);
    },

    setCartItemQuantity: (state, action) => {
      const { material, orderquantity } = action.payload;
      const itemPresent = state.cart.find((item) => matchesCartItem(item, material));
      if (!itemPresent) return;
      itemPresent.orderquantity = Math.min(Number(orderquantity) || 1, getAvailableStock(itemPresent));
      saveCartToStorage(state.cart);
    },

    // New reducer to set the cart after loading from storage
    setCart: (state, action) => {
      state.cart = action.payload;
    },
  },
});

export const {
  addToCart,
  removeFromCart,
  incrementQuantity,
  decrementQuantity,
  clearCart,
  clearCartBySource,
  clearNormalCart,
  addToCartWithMinQuantity,
  setCartItemQuantity,
  setCart,  // Export the new action
} = CartSlice.actions;

export default CartSlice.reducer;




export const loadCart = () => async (dispatch) => {
  const cart = await loadCartFromStorage();
 // console.log(" 6 ", cart, " - ")
 // console.log("Cart Init...", cart)
  dispatch(setCart(cart));
};
