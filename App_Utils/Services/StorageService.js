import AsyncStorage from "@react-native-async-storage/async-storage";

const Storage= {
  async storeData(id, data) {
    // console.log(id,data)
    // console.log( JSON.stringify(data))
    try {
      await AsyncStorage.setItem(id, JSON.stringify(data));
    } catch (error) {
      console.error("Error storing data:", error);
    }
  },

  async getData(id) {
    try {
      const value = await AsyncStorage.getItem(id);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error("Error retrieving data:", error);
      return null;
    }
  },

  async removeData(id) {
    try {
      await AsyncStorage.removeItem(id);
    } catch (error) {
      console.error("Error removing data:", error);
    }
  }
};

export default Storage; // ✅ Ensure this export
