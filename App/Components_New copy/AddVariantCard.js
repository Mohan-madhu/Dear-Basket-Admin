import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, ScrollView } from 'react-native';

const AddVariantCard = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [formData, setFormData] = useState({
    variantname: '',
    sku: '',
    weight: '',
    dimensions: '',
    packsize: '1',
    baseprice: '',
    sellingprice: '',
    discountpercentage: '0',
    stockquantity: '0',
  });

  const toggleModal = () => setIsModalVisible(!isModalVisible);

  const handleInputChange = (name, value) => {
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = () => {
    console.log('Form Data:', formData);
    toggleModal();
    // Reset form
    setFormData({
      variantname: '',
      sku: '',
      weight: '',
      dimensions: '',
      packsize: '1',
      baseprice: '',
      sellingprice: '',
      discountpercentage: '0',
      stockquantity: '0',
    });
  };

  return (
    <View className="mb-8">
      <TouchableOpacity
        onPress={toggleModal}
        className="flex-row items-center justify-center bg-blue-600 py-3 px-6 rounded-lg shadow-md"
        activeOpacity={0.8}
      >
        <Text className="text-white font-bold mr-2">+</Text>
        <Text className="text-white font-bold">Add New Variant</Text>
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={toggleModal}
      >
        <View className="flex-1 justify-center items-center bg-black bg-opacity-50">
          <View className="bg-white w-11/12 max-w-md rounded-xl shadow-xl">
            <ScrollView className="max-h-[80vh] p-6">
              <Text className="text-2xl font-bold text-gray-800 mb-6">Add New Variant</Text>
              
              <View className="mb-4">
                <Text className="text-gray-600 mb-1">Variant Name</Text>
                <TextInput
                  placeholder="e.g., Black Edition"
                  value={formData.variantname}
                  onChangeText={(text) => handleInputChange('variantname', text)}
                  className="border border-gray-300 rounded-lg p-3"
                />
              </View>
              
              <View className="mb-4">
                <Text className="text-gray-600 mb-1">SKU</Text>
                <TextInput
                  placeholder="e.g., SKU12345"
                  value={formData.sku}
                  onChangeText={(text) => handleInputChange('sku', text)}
                  className="border border-gray-300 rounded-lg p-3"
                />
              </View>
              
              <View className="flex-row mb-4">
                <View className="flex-1 mr-2">
                  <Text className="text-gray-600 mb-1">Weight (kg)</Text>
                  <TextInput
                    placeholder="0.25"
                    keyboardType="numeric"
                    value={formData.weight}
                    onChangeText={(text) => handleInputChange('weight', text)}
                    className="border border-gray-300 rounded-lg p-3"
                  />
                </View>
                <View className="flex-1 ml-2">
                  <Text className="text-gray-600 mb-1">Dimensions</Text>
                  <TextInput
                    placeholder="18x16x8 cm"
                    value={formData.dimensions}
                    onChangeText={(text) => handleInputChange('dimensions', text)}
                    className="border border-gray-300 rounded-lg p-3"
                  />
                </View>
              </View>
              
              <View className="flex-row mb-4">
                <View className="flex-1 mr-2">
                  <Text className="text-gray-600 mb-1">Base Price ($)</Text>
                  <TextInput
                    placeholder="199.99"
                    keyboardType="numeric"
                    value={formData.baseprice}
                    onChangeText={(text) => handleInputChange('baseprice', text)}
                    className="border border-gray-300 rounded-lg p-3"
                  />
                </View>
                <View className="flex-1 ml-2">
                  <Text className="text-gray-600 mb-1">Selling Price ($)</Text>
                  <TextInput
                    placeholder="179.99"
                    keyboardType="numeric"
                    value={formData.sellingprice}
                    onChangeText={(text) => handleInputChange('sellingprice', text)}
                    className="border border-gray-300 rounded-lg p-3"
                  />
                </View>
              </View>
              
              <View className="flex-row mb-4">
                <View className="flex-1 mr-2">
                  <Text className="text-gray-600 mb-1">Discount (%)</Text>
                  <TextInput
                    placeholder="10"
                    keyboardType="numeric"
                    value={formData.discountpercentage}
                    onChangeText={(text) => handleInputChange('discountpercentage', text)}
                    className="border border-gray-300 rounded-lg p-3"
                  />
                </View>
                <View className="flex-1 ml-2">
                  <Text className="text-gray-600 mb-1">Stock Quantity</Text>
                  <TextInput
                    placeholder="50"
                    keyboardType="numeric"
                    value={formData.stockquantity}
                    onChangeText={(text) => handleInputChange('stockquantity', text)}
                    className="border border-gray-300 rounded-lg p-3"
                  />
                </View>
              </View>
              
              <View className="flex-row justify-between mt-6">
                <TouchableOpacity
                  onPress={toggleModal}
                  className="flex-1 mr-2 bg-gray-200 py-3 rounded-lg"
                  activeOpacity={0.7}
                >
                  <Text className="text-gray-800 font-bold text-center">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSubmit}
                  className="flex-1 ml-2 bg-blue-600 py-3 rounded-lg"
                  activeOpacity={0.7}
                >
                  <Text className="text-white font-bold text-center">Add Variant</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default AddVariantCard;