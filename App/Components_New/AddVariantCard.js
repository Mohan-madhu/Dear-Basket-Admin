import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { Image } from 'expo-image';
import { useLoading } from '../../App_Utils/Contexts/LoadingContext';
import { API, getUserFacingErrorMessage } from '../../App_Utils/Services/APIService';
import { useNavigation } from '@react-navigation/native';
import Storage from '../../App_Utils/Services/StorageService';
import * as DocumentPicker from 'expo-document-picker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const AddVariantCard = ({ productData, editProductData }) => {
  const { setLoading } = useLoading();
  const nav = useNavigation(); // still here if you want to use later

  const [isModalVisible, setIsModalVisible] = useState(editProductData ? true : false);
  const [imageUri, setImageUri] = useState(null);
  const [fileInfo, setFileInfo] = useState(null);
  const [errors, setErrors] = useState({});
  const [imageUrl, setImageUrl] = useState('');
  const [weightUnit, setWeightUnit] = useState('kg');

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

  // Scroll ref to control ScrollView when keyboard opens
  const scrollRef = useRef(null);

  const scrollToEnd = () => {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollToEnd({ animated: true });
      }
    }, 200);
  };

  // CHANGE 1: track keyboard visibility
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () =>
      setIsKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener('keyboardDidHide', () =>
      setIsKeyboardVisible(false)
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (editProductData) {
      setFormData({
        variantname: editProductData?.variantname,
        sku: editProductData?.sku,
        weight: editProductData?.weight,
        dimensions: editProductData?.dimensions,
        packsize: editProductData?.packsize,
        baseprice: editProductData?.baseprice,
        sellingprice: editProductData?.sellingprice,
        discountpercentage: editProductData?.discountpercentage,
        stockquantity: editProductData?.stockquantity,
      });
      setImageUrl(editProductData?.imageurl);
    } else {
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
    }
  }, []);

  const toggleModal = () => {
    setIsModalVisible(!isModalVisible);
    setErrors({});
    if (!isModalVisible) {
      setImageUri(null);
      setFileInfo(null);
      setImageUrl('');
      setWeightUnit('kg');
    }
  };

  const normalizeNumericText = (value) => String(value || '').replace(/[^0-9.]/g, '');

  const convertWeightToKg = (value, unit) => {
    const parsed = parseFloat(value);
    if (!Number.isFinite(parsed)) return value || '';
    return unit === 'g' ? (parsed / 1000).toString() : parsed.toString();
  };

  const getWeightPlaceholder = () => (weightUnit === 'g' ? '250' : '0.25');

  const validateForm = () => {
    const newErrors = {};

    if (!formData?.variantname?.trim()) {
      newErrors.variantname = 'Variant name is required';
    }

    if (!formData?.baseprice) {
      newErrors.baseprice = 'Base price is required';
    } else if (isNaN(formData?.baseprice)) {
      newErrors.baseprice = 'Base price must be a number';
    }

    if (!formData.sellingprice) {
      newErrors.sellingprice = 'Selling price is required';
    } else if (isNaN(formData.sellingprice)) {
      newErrors.sellingprice = 'Selling price must be a number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (name, value) => {
    let updatedFormData = {
      ...formData,
      [name]: value,
    };

    if (name === 'baseprice' || name === 'sellingprice') {
      const base = parseFloat(updatedFormData.baseprice) || 0;
      const selling = parseFloat(updatedFormData.sellingprice) || 0;

      if (base > 0 && selling > 0) {
        const discount = ((base - selling) / base) * 100;
        updatedFormData.discountpercentage = Math.round(discount).toString();
      } else {
        updatedFormData.discountpercentage = '0';
      }
    }

    setFormData(updatedFormData);
  };

  const pickImage = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || result.cancelled) return;

      const file = {
        uri: result.assets[0].uri,
        name: result.assets[0].name,
        type: result.assets[0].mimeType,
      };

      setImageUri(file.uri);
      setFileInfo(file);
      setImageUrl(''); // Clear URL if image is picked
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const InsertNewVariant = async (variantData) => {
    try {
      const USER = await Storage.getData('USER');
      toggleModal();
      let profilePath = '';

      try {
        // Use image URL if provided
        if (imageUrl) {
          profilePath = imageUrl;
        }
        // Otherwise upload the picked image
        else if (fileInfo) {
          setLoading(true, 'Uploading Variant Image');
          const uploadRes = await API.UPLOAD('FileUpload', fileInfo, {
            path: 'ProductVariant',
          });
          profilePath = uploadRes.virtualPath;
          setFileInfo(null);
        }
      } catch (uploadError) {
        console.error('Image upload failed:', uploadError);
        Alert.alert(
          'Warning',
          'Variant image upload failed, continuing without image'
        );
      } finally {
        setLoading(false);
      }

      setLoading(true, 'Adding New Variant for the Product ' + productData.productname);

      const data = {
        productid: productData.productid,
        variantname: variantData?.variantname,
        sku: variantData?.sku || 'No SKU',
        weight: convertWeightToKg(variantData?.weight, weightUnit),
        dimensions: variantData?.dimensions,
        packsize: variantData?.packsize,
        baseprice: variantData?.baseprice,
        sellingprice: variantData?.sellingprice,
        discountpercentage: variantData?.discountpercentage,
        stockquantity: variantData?.stockquantity,
        minstocklevel: variantData?.minstocklevel || 10,
        maxorderquantity: variantData?.maxorderquantity || 100,
        isactive: variantData?.isactive || 1,
        variantimage: profilePath || null,
        rcu: USER,
      };

      const { message, variant } = await API.POST('ProductVariant', data);

      if (message === 'Product variant created successfully.') {
        setLoading(true, 'Adding Image for the Variant ' + variantData.variantname);

        const dataforimage = {
          productid: productData.productid,
          variantid: variant.variantid,
          imageurl: profilePath,
          imagetype: 'Main',
          sortorder: 0,
          isactive: 1,
          rcu: USER,
        };

        const { message: imageMessage } = await API.POST('ProductImages', dataforimage);
        console.log('Image added for variant:', imageMessage);

        Alert.alert('Success', 'Variant added successfully');

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
        setWeightUnit('kg');
        setImageUri(null);
        setImageUrl('');
      } else {
        Alert.alert('Error', message);
      }
    } catch (err) {
      Alert.alert('Error', getUserFacingErrorMessage(err, 'Failed to add new variant'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (!validateForm()) return;
    InsertNewVariant(formData);
  };

  return (
    <View className="mb-8">
      <TouchableOpacity
        onPress={toggleModal}
        className="flex-row items-center justify-center bg-blue-600 py-3 px-6 rounded-lg shadow-md"
        activeOpacity={0.8}
      >
        <Icon name="plus" size={20} color="white" />
        <Text className="text-white font-bold ml-2">
          {editProductData ? 'Edit Variant' : 'Add New Variant'}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={toggleModal}
      >
        {/* CHANGE 2: use padding behavior always, no vertical offset */}
        <KeyboardAvoidingView
          behavior="padding"
          style={{ flex: 1 }}
          keyboardVerticalOffset={0}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            {/* CHANGE 3: remove justify-center from className, control via style */}
            <View
              className="flex-1 items-center bg-black bg-opacity-50 p-4"
              style={{
                justifyContent: isKeyboardVisible ? 'flex-end' : 'center',
              }}
            >
              <View className="bg-white w-full max-w-md rounded-xl shadow-xl">
                <ScrollView
                  ref={scrollRef}
                  showsVerticalScrollIndicator={false}
                  className="p-6" // CHANGE 4: removed max-h-[80vh]
                  style={{ maxHeight: '90%' }} // CHANGE 4: let it use up to 90% of available height
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={{
                    paddingBottom: isKeyboardVisible ? 40 : 24, // CHANGE 5: more bottom padding when keyboard open
                  }}
                >
                  <View className="flex-row justify-between items-center mb-4">
                    <Text className="text-2xl font-bold text-gray-800">
                      Add New Variant
                    </Text>
                    <TouchableOpacity onPress={toggleModal}>
                      <Icon name="close" size={24} color="#6b7280" />
                    </TouchableOpacity>
                  </View>

                  {/* Variant Image Section */}
                  <View className="mb-6">
                    <Text className="text-gray-600 mb-2 font-medium">Variant Image</Text>

                    <View className="relative bg-gray-100 rounded-lg overflow-hidden shadow-md mb-3">
                      <Image
                        source={
                          imageUri
                            ? { uri: imageUri }
                            : imageUrl
                            ? { uri: imageUrl }
                            : {
                                uri: 'https://placehold.co/400x300/png?text=Variant+Image',
                              }
                        }
                        className="w-full"
                        style={{ height: 200 }}
                        contentFit="contain"
                        cachePolicy="memory-disk"
                      />
                      <View className="absolute top-2 right-2 flex-row">
                        <TouchableOpacity
                          onPress={pickImage}
                          className="bg-black bg-opacity-50 p-2 rounded-full mr-2"
                        >
                          <Icon name="image" size={20} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => {
                            setImageUri(null);
                            setFileInfo(null);
                          }}
                          className="bg-black bg-opacity-50 p-2 rounded-full"
                        >
                          <Icon name="trash-can" size={20} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View className="mt-2">
                      <Text className="text-gray-600 mb-1">Or use image URL</Text>
                      <View className="flex-row">
                        <TextInput
                          placeholder="https://example.com/image.jpg"
                          value={imageUrl}
                          onChangeText={setImageUrl}
                          className="flex-1 border border-gray-300 rounded-l-lg p-3"
                          keyboardType="url"
                          onFocus={scrollToEnd}
                        />
                        <TouchableOpacity
                          onPress={() => {
                            if (imageUrl) {
                              setImageUri(null);
                              setFileInfo(null);
                            }
                          }}
                          className="bg-blue-500 px-4 rounded-r-lg justify-center"
                        >
                          <Icon name="check" size={20} color="white" />
                        </TouchableOpacity>
                      </View>
                      <Text className="text-xs text-gray-500 mt-1">
                        This will be used as the variant&apos;s main image
                      </Text>
                    </View>
                  </View>

                  {/* Form Fields (old version commented, keeping as in your original) */}
                  {/* ... (unchanged, keeping as comment) ... */}

                  {/* Form Fields (active version) */}
                  <View className="space-y-4">
                    <View>
                      <Text className="text-gray-600 mb-1 font-medium">Variant Name*</Text>
                      <TextInput
                        placeholder="e.g., Black Edition, Large Size"
                        value={formData.variantname?.toString() || ''}
                        onChangeText={(text) => handleInputChange('variantname', text)}
                        className={`border ${
                          errors.variantname ? 'border-red-500' : 'border-gray-300'
                        } rounded-lg p-3`}
                      />
                      {errors?.variantname && (
                        <Text className="text-red-500 text-xs mt-1">
                          {errors?.variantname}
                        </Text>
                      )}
                    </View>

                    <View>
                      <Text className="text-gray-600 mb-1 font-medium">
                        SKU (Stock Keeping Unit)
                      </Text>
                      <TextInput
                        placeholder="e.g., SKU12345"
                        value={formData.sku?.toString() || ''}
                        onChangeText={(text) => handleInputChange('sku', text)}
                        className="border border-gray-300 rounded-lg p-3"
                      />
                    </View>

                    <View className="flex-row space-x-3">
                      <View className="flex-1">
                        <View className="flex-row items-center justify-between mb-1 mr-2">
                          <Text className="text-gray-600 font-medium">Weight</Text>
                          <View className="flex-row bg-gray-100 rounded-lg p-0.5">
                            {['kg', 'g'].map((unit) => (
                              <TouchableOpacity
                                key={unit}
                                activeOpacity={0.85}
                                onPress={() => setWeightUnit(unit)}
                                className={`px-2.5 py-1 rounded-md ${
                                  weightUnit === unit ? 'bg-blue-600' : 'bg-transparent'
                                }`}
                              >
                                <Text
                                  className={`text-xs font-bold ${
                                    weightUnit === unit ? 'text-white' : 'text-gray-600'
                                  }`}
                                >
                                  {unit === 'kg' ? 'Kg' : 'Gram'}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                        <TextInput
                          placeholder={getWeightPlaceholder()}
                          keyboardType="numeric"
                          value={formData.weight?.toString() || ''}
                          onChangeText={(text) =>
                            handleInputChange('weight', normalizeNumericText(text))
                          }
                          className="border border-gray-300 rounded-lg p-3 mr-2"
                        />
                        {weightUnit === 'g' && formData.weight ? (
                          <Text className="text-xs text-gray-500 mt-1">
                            Will be saved as {convertWeightToKg(formData.weight, 'g')} kg
                          </Text>
                        ) : null}
                      </View>
                      <View className="flex-1">
                        <Text className="text-gray-600 mb-1 font-medium">Dimensions</Text>
                        <TextInput
                          placeholder="18x16x8 cm"
                          value={formData.dimensions?.toString() || ''}
                          onChangeText={(text) => handleInputChange('dimensions', text)}
                          className="border border-gray-300 rounded-lg p-3"
                        />
                      </View>
                    </View>

                    <View className="flex-row space-x-3">
                      <View className="flex-1">
                        <Text className="text-gray-600 mb-1 font-medium">
                          Base Price ($)*
                        </Text>
                        <TextInput
                          placeholder="199.99"
                          keyboardType="numeric"
                          value={formData.baseprice?.toString() || ''}
                          onChangeText={(text) => handleInputChange('baseprice', text)}
                          className={`border ${
                            errors.baseprice ? 'border-red-500' : 'border-gray-300'
                          } rounded-lg p-3 mr-2`}
                        />
                        {errors.baseprice && (
                          <Text className="text-red-500 text-xs mt-1">
                            {errors.baseprice}
                          </Text>
                        )}
                      </View>
                      <View className="flex-1">
                        <Text className="text-gray-600 mb-1 font-medium">
                          Selling Price ($)*
                        </Text>
                        <TextInput
                          placeholder="179.99"
                          keyboardType="numeric"
                          value={formData.sellingprice?.toString() || ''}
                          onChangeText={(text) => handleInputChange('sellingprice', text)}
                          className={`border ${
                            errors.sellingprice ? 'border-red-500' : 'border-gray-300'
                          } rounded-lg p-3`}
                        />
                        {errors.sellingprice && (
                          <Text className="text-red-500 text-xs mt-1">
                            {errors.sellingprice}
                          </Text>
                        )}
                      </View>
                    </View>

                    <View className="flex-row space-x-3">
                      <View className="flex-1">
                        <Text className="text-gray-600 mb-1 font-medium">Discount (%)</Text>
                        <TextInput
                          placeholder="10"
                          keyboardType="numeric"
                          value={formData.discountpercentage?.toString() || ''}
                          editable={false}
                          className="border border-gray-300 bg-gray-100 rounded-lg p-3 mr-2"
                          onFocus={scrollToEnd}
                        />
                      </View>
                      <View className="flex-1">
                        <Text className="text-gray-600 mb-1 font-medium">
                          Stock Quantity
                        </Text>
                        <TextInput
                          placeholder="50"
                          keyboardType="numeric"
                          value={formData.stockquantity?.toString() || ''}
                          onChangeText={(text) =>
                            handleInputChange('stockquantity', text)
                          }
                          className="border border-gray-300 rounded-lg p-3"
                          onFocus={scrollToEnd}
                        />
                      </View>
                    </View>
                  </View>

                  {/* Action Buttons */}
                  <View className="flex-row justify-between mt-8 mb-4">
                    <TouchableOpacity
                      onPress={toggleModal}
                      className="flex-1 mr-2 bg-gray-200 py-3 rounded-lg items-center"
                      activeOpacity={0.7}
                    >
                      <Text className="text-gray-800 font-bold">Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleSubmit}
                      className="flex-1 ml-2 bg-blue-600 py-3 rounded-lg items-center"
                      activeOpacity={0.7}
                    >
                      <Text className="text-white font-bold">Add Variant</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

export default AddVariantCard;
