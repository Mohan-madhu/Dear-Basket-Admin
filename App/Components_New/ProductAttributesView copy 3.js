import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
//mport { ChevronDownIcon, ChevronUpIcon, PencilIcon, TrashIcon, PlusIcon } from 'react-native-heroicons/outline';

// Simple icon replacements if you don't have heroicons
const PencilIcon = () => <Text className="text-blue-600 text-lg">✏️</Text>;
const TrashIcon = () => <Text className="text-red-600 text-lg">🗑️</Text>;
const PlusIcon = () => <Text className="text-green-600 text-lg">➕</Text>;
const ChevronDownIcon = () => <Text className="text-gray-600 text-lg">▼</Text>;
const ChevronUpIcon = () => <Text className="text-gray-600 text-lg">▲</Text>;

const AttributeRow = ({ attribute, onUpdate, onDelete, isVariantAttribute }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedValue, setEditedValue] = useState(attribute.attributevalue);

  const handleSave = () => {
    if (editedValue.trim() === '') {
      Alert.alert('Error', 'Attribute value cannot be empty');
      return;
    }
    onUpdate(attribute.attributeid, editedValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedValue(attribute.attributevalue);
    setIsEditing(false);
  };

  const confirmDelete = () => {
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to delete "${attribute.attributename}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete(attribute.attributeid) }
      ]
    );
  };

  return (
    <View className={`flex-row justify-between items-center py-3 ${isVariantAttribute ? 'bg-blue-50' : 'bg-gray-50'} rounded px-3 mb-2`}>
      <Text className="text-gray-600 font-medium flex-1 capitalize">
        {attribute.attributename.replace(/_/g, ' ')}
      </Text>

      {isEditing ? (
        <View className="flex-row items-center flex-1">
          <TextInput
            value={editedValue}
            onChangeText={setEditedValue}
            className="flex-1 border border-gray-300 rounded px-2 py-1 mr-2"
            autoFocus
          />
          <TouchableOpacity onPress={handleSave} className="mr-2">
            <Text className="text-green-600 font-bold">✓</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleCancel}>
            <Text className="text-red-600 font-bold">✗</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View className="flex-row items-center flex-1">
          <Text className="text-gray-800 font-normal flex-1 text-right mr-2">
            {attribute.attributevalue}
          </Text>
          {isVariantAttribute && (
            <View className="flex-row space-x-2">
              <TouchableOpacity onPress={() => setIsEditing(true)}>
                <PencilIcon size={16} color="#2563EB" />
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmDelete}>
                <TrashIcon size={16} color="#DC2626" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const ExpandableAttributeSection = ({ category, attributes, onUpdateAttribute, onDeleteAttribute, isVariantSection }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <View className="mb-4 border border-gray-200 rounded-lg p-3">
      <TouchableOpacity
        onPress={() => setIsExpanded(!isExpanded)}
        className="flex-row justify-between items-center py-2"
      >
        <Text className="text-lg font-semibold text-gray-800 capitalize">
          {category.replace(/_/g, ' ')}
        </Text>
        {isExpanded ? (
          <ChevronUpIcon size={20} color="#4B5563" />
        ) : (
          <ChevronDownIcon size={20} color="#4B5563" />
        )}
      </TouchableOpacity>

      {isExpanded && (
        <View className="mt-3">
          {attributes.map((attribute, index) => (
            <AttributeRow
              key={attribute.attributeid || index}
              attribute={attribute}
              onUpdate={onUpdateAttribute}
              onDelete={onDeleteAttribute}
              isVariantAttribute={isVariantSection}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const ProductAttributesView = ({ productAttributes, variantAttributes, onUpdateVariantAttribute, onDeleteVariantAttribute, onAddVariantAttribute }) => {
  const [newAttribute, setNewAttribute] = useState({ name: '', value: '' });
  const [showAddForm, setShowAddForm] = useState(false);

  const combinedAttributes = [...productAttributes, ...variantAttributes].reduce((acc, attr) => {
    const existingIndex = acc.findIndex(a => a.attributename === attr.attributename);
    if (existingIndex === -1) {
      acc.push(attr);
    } else {
      acc[existingIndex] = attr;
    }
    return acc;
  }, []);



  const handleUpdateVariantAttribute = (attributeId, newValue) => {
    console.log('Update attribute:', attributeId, newValue);
    // Call your API to update the attribute
  };

  const handleDeleteVariantAttribute = (attributeId) => {
    console.log('Delete attribute:', attributeId);
    // Call your API to delete the attribute
  };

  const handleAddVariantAttribute = (newAttribute) => {
    console.log('Add new attribute:', newAttribute);
    // Call your API to add the attribute
  };





  if (combinedAttributes.length === 0) {
    return (
      <View className="bg-white p-5 mt-1 rounded-lg shadow-sm">
        <Text className="text-xl font-bold text-gray-900 mb-4">Product Specifications</Text>
        <Text className="text-gray-600">No specifications available</Text>
      </View>
    );
  }

  const sortedAttributes = combinedAttributes.sort((a, b) =>
    (a.displayorder || 999) - (b.displayorder || 999)
  );

  const groupedAttributes = sortedAttributes.reduce((groups, attr) => {
    const category = attr.attributename.split('_')[0] || 'General';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(attr);
    return groups;
  }, {});

  // Separate variant attributes for editing
  const variantAttributesGrouped = variantAttributes.reduce((groups, attr) => {
    const category = attr.attributename.split('_')[0] || 'General';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(attr);
    return groups;
  }, {});

  const handleAddAttribute = () => {
    if (newAttribute.name.trim() === '' || newAttribute.value.trim() === '') {
      Alert.alert('Error', 'Both attribute name and value are required');
      return;
    }

    onAddVariantAttribute({
      attributename: newAttribute.name,
      attributevalue: newAttribute.value,
      displayorder: Object.keys(variantAttributesGrouped).length + 1
    });

    setNewAttribute({ name: '', value: '' });
    setShowAddForm(false);
  };

  return (
    <View className="bg-white p-5 mt-1 rounded-lg shadow-sm">
      <Text className="text-xl font-bold text-gray-900 mb-4">Product Specifications</Text>

      {/* Add New Attribute Form */}
      {showAddForm && (
        <View className="bg-blue-50 p-4 rounded-lg mb-4 border border-blue-200">
          <Text className="font-semibold text-blue-900 mb-2">Add New Attribute</Text>
          <TextInput
            placeholder="Attribute Name (e.g., color, weight)"
            value={newAttribute.name}
            onChangeText={(text) => setNewAttribute({ ...newAttribute, name: text })}
            className="border border-gray-300 rounded px-3 py-2 mb-2 bg-white"
          />
          <TextInput
            placeholder="Attribute Value"
            value={newAttribute.value}
            onChangeText={(text) => setNewAttribute({ ...newAttribute, value: text })}
            className="border border-gray-300 rounded px-3 py-2 mb-3 bg-white"
          />
          <View className="flex-row space-x-2">
            <TouchableOpacity onPress={handleAddAttribute} className="bg-green-600 px-4 py-2 rounded flex-1">
              <Text className="text-white text-center font-semibold">Add</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowAddForm(false)} className="bg-gray-500 px-4 py-2 rounded flex-1">
              <Text className="text-white text-center font-semibold">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Variant Attributes (Editable) */}
        {Object.keys(variantAttributesGrouped).length > 0 && (
          <View className="mb-6">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-lg font-bold text-blue-900">Variant Specifications</Text>
              <TouchableOpacity onPress={() => setShowAddForm(!showAddForm)} className="flex-row items-center">
                <PlusIcon size={18} color="#16A34A" />
                <Text className="text-green-600 ml-1 font-medium">Add</Text>
              </TouchableOpacity>
            </View>
            {Object.entries(variantAttributesGrouped).map(([category, attributes]) => (
              <ExpandableAttributeSection
                key={`variant-${category}`}
                category={category}
                attributes={attributes}
                onUpdateAttribute={onUpdateVariantAttribute}
                onDeleteAttribute={onDeleteVariantAttribute}
                isVariantSection={true}
              />
            ))}
          </View>
        )}

        {/* Product Attributes (Read-only) */}
        <View className="mb-4">
          <Text className="text-lg font-bold text-gray-800 mb-3">Product Specifications</Text>
          {Object.entries(groupedAttributes).map(([category, attributes]) => {
            // Filter out variant attributes from product attributes display
            const productAttrs = attributes.filter(attr =>
              !variantAttributes.some(vAttr => vAttr.attributename === attr.attributename)
            );

            if (productAttrs.length === 0) return null;

            return (
              <ExpandableAttributeSection
                key={`product-${category}`}
                category={category}
                attributes={productAttrs}
                isVariantSection={false}
              />
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};

export default ProductAttributesView;