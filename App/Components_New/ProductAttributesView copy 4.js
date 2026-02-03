import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';

// Icon Components (define only once)
const PencilIcon = ({ size = 20, color = "#2563EB" }) => (
  <Text style={{ fontSize: size, color }}>✏️</Text>
);
const TrashIcon = ({ size = 20, color = "#DC2626" }) => (
  <Text style={{ fontSize: size, color }}>🗑️</Text>
);
const PlusIcon = ({ size = 20, color = "#16A34A" }) => (
  <Text style={{ fontSize: size, color }}>➕</Text>
);
const XMarkIcon = ({ size = 20, color = "#4B5563" }) => (
  <Text style={{ fontSize: size, color }}>✕</Text>
);
const ChevronDownIcon = ({ size = 20, color = "#4B5563" }) => (
  <Text style={{ fontSize: size, color }}>▼</Text>
);
const ChevronUpIcon = ({ size = 20, color = "#4B5563" }) => (
  <Text style={{ fontSize: size, color }}>▲</Text>
);

const EditAttributeModal = ({ visible, attribute, onSave, onClose }) => {
  const [editedValue, setEditedValue] = useState(attribute?.attributevalue || '');

  const handleSave = () => {
    if (editedValue.trim() === '') {
      Alert.alert('Error', 'Attribute value cannot be empty');
      return;
    }
    onSave(attribute.attributeid, editedValue);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View className="flex-1 justify-center items-center bg-black bg-opacity-50">
        <View className="bg-white w-11/12 rounded-xl p-6">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-xl font-bold text-gray-900">Edit Attribute</Text>
            <TouchableOpacity onPress={onClose}>
              <XMarkIcon size={24} />
            </TouchableOpacity>
          </View>

          <Text className="text-gray-600 mb-2 font-medium">Attribute Name</Text>
          <Text className="text-gray-800 mb-4 p-3 bg-gray-100 rounded-lg capitalize">
            {attribute?.attributename.replace(/_/g, ' ')}
          </Text>

          <Text className="text-gray-600 mb-2 font-medium">Value</Text>
          <TextInput
            value={editedValue}
            onChangeText={setEditedValue}
            className="border border-gray-300 rounded-lg p-4 mb-6 text-gray-800"
            placeholder="Enter attribute value"
            multiline
          />

          <View className="flex-row space-x-3">
            <TouchableOpacity 
              onPress={onClose}
              className="flex-1 bg-gray-200 py-4 rounded-lg"
            >
              <Text className="text-gray-800 font-semibold text-center">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={handleSave}
              className="flex-1 bg-blue-600 py-4 rounded-lg"
            >
              <Text className="text-white font-semibold text-center">Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const DeleteConfirmationModal = ({ visible, attribute, onConfirm, onClose }) => {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 justify-center items-center bg-black bg-opacity-50">
        <View className="bg-white w-11/12 max-w-md rounded-xl p-6">
          <Text className="text-xl font-bold text-gray-900 mb-2">Delete Attribute</Text>
          <Text className="text-gray-600 mb-6">
            Are you sure you want to delete the attribute "
            <Text className="font-semibold capitalize">{attribute?.attributename.replace(/_/g, ' ')}</Text>"?
            This action cannot be undone.
          </Text>

          <View className="flex-row space-x-3">
            <TouchableOpacity 
              onPress={onClose}
              className="flex-1 bg-gray-200 py-3 rounded-lg"
            >
              <Text className="text-gray-800 font-semibold text-center">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => onConfirm(attribute.attributeid)}
              className="flex-1 bg-red-600 py-3 rounded-lg"
            >
              <Text className="text-white font-semibold text-center">Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const AttributeRow = ({ attribute, onEdit, onDelete, isVariantAttribute }) => {
  return (
    <View className={`flex-row justify-between items-center p-4 mb-2 rounded-xl ${isVariantAttribute ? 'bg-blue-50 border border-blue-100' : 'bg-gray-50 border border-gray-100'}`}>
      <View className="flex-1">
        <Text className="text-gray-600 font-medium text-sm capitalize mb-1">
          {attribute.attributename.replace(/_/g, ' ')}
        </Text>
        <Text className="text-gray-800 font-normal text-base">
          {attribute.attributevalue}
        </Text>
      </View>
      
      {isVariantAttribute && (
        <View className="flex-row space-x-3">
          <TouchableOpacity 
            onPress={() => onEdit(attribute)}
            className="p-2 bg-white rounded-full shadow-sm border border-gray-200"
          >
            <PencilIcon size={18} />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => onDelete(attribute)}
            className="p-2 bg-white rounded-full shadow-sm border border-gray-200"
          >
            <TrashIcon size={18} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const ExpandableAttributeSection = ({ category, attributes, onEditAttribute, onDeleteAttribute, isVariantSection }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <View className="mb-4 bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <TouchableOpacity
        onPress={() => setIsExpanded(!isExpanded)}
        className="flex-row justify-between items-center"
      >
        <Text className="text-lg font-semibold text-gray-800 capitalize">
          {category.replace(/_/g, ' ')}
        </Text>
        {isExpanded ? (
          <ChevronUpIcon size={20} />
        ) : (
          <ChevronDownIcon size={20} />
        )}
      </TouchableOpacity>

      {isExpanded && (
        <View className="mt-4">
          {attributes.map((attribute, index) => (
            <AttributeRow
              key={attribute.attributeid || index}
              attribute={attribute}
              onEdit={onEditAttribute}
              onDelete={onDeleteAttribute}
              isVariantAttribute={isVariantSection}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const AddAttributeModal = ({ visible, onAdd, onClose }) => {
  const [newAttribute, setNewAttribute] = useState({ name: '', value: '' });

  const handleAdd = () => {
    if (newAttribute.name.trim() === '' || newAttribute.value.trim() === '') {
      Alert.alert('Error', 'Both attribute name and value are required');
      return;
    }
    
    onAdd({
      attributename: newAttribute.name,
      attributevalue: newAttribute.value,
      displayorder: 999
    });
    
    setNewAttribute({ name: '', value: '' });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View className="flex-1 justify-center items-center bg-black bg-opacity-50">
        <View className="bg-white w-11/12 rounded-xl p-6">
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-xl font-bold text-gray-900">Add New Attribute</Text>
            <TouchableOpacity onPress={onClose}>
              <XMarkIcon size={24} />
            </TouchableOpacity>
          </View>

          <View className="space-y-4">
            <View>
              <Text className="text-gray-600 mb-2 font-medium">Attribute Name</Text>
              <TextInput
                placeholder="e.g., color, weight, material"
                value={newAttribute.name}
                onChangeText={(text) => setNewAttribute({ ...newAttribute, name: text })}
                className="border border-gray-300 rounded-lg p-4 text-gray-800"
              />
            </View>

            <View>
              <Text className="text-gray-600 mb-2 font-medium">Attribute Value</Text>
              <TextInput
                placeholder="e.g., Black, 250g, Plastic"
                value={newAttribute.value}
                onChangeText={(text) => setNewAttribute({ ...newAttribute, value: text })}
                className="border border-gray-300 rounded-lg p-4 text-gray-800"
                multiline
              />
            </View>
          </View>

          <View className="flex-row space-x-3 mt-6">
            <TouchableOpacity 
              onPress={onClose}
              className="flex-1 bg-gray-200 py-4 rounded-lg"
            >
              <Text className="text-gray-800 font-semibold text-center">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={handleAdd}
              className="flex-1 bg-green-600 py-4 rounded-lg"
            >
              <Text className="text-white font-semibold text-center">Add Attribute</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const ProductAttributesView = ({ productAttributes, variantAttributes, onUpdateVariantAttribute, onDeleteVariantAttribute, onAddVariantAttribute }) => {
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [selectedAttribute, setSelectedAttribute] = useState(null);

  const combinedAttributes = [...productAttributes, ...variantAttributes].reduce((acc, attr) => {
    const existingIndex = acc.findIndex(a => a.attributename === attr.attributename);
    if (existingIndex === -1) {
      acc.push(attr);
    } else {
      acc[existingIndex] = attr;
    }
    return acc;
  }, []);

  if (combinedAttributes.length === 0) {
    return (
      <View className="bg-white p-6 rounded-xl shadow-sm">
        <Text className="text-xl font-bold text-gray-900 mb-4">Product Specifications</Text>
        <Text className="text-gray-600 text-center py-8">No specifications available</Text>
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

  const variantAttributesGrouped = variantAttributes.reduce((groups, attr) => {
    const category = attr.attributename.split('_')[0] || 'General';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(attr);
    return groups;
  }, {});

  const handleEdit = (attribute) => {
    setSelectedAttribute(attribute);
    setEditModalVisible(true);
  };

  const handleDelete = (attribute) => {
    setSelectedAttribute(attribute);
    setDeleteModalVisible(true);
  };

  const handleSaveEdit = (attributeId, newValue) => {
    onUpdateVariantAttribute(attributeId, newValue);
    setEditModalVisible(false);
    setSelectedAttribute(null);
  };

  const handleConfirmDelete = (attributeId) => {
    onDeleteVariantAttribute(attributeId);
    setDeleteModalVisible(false);
    setSelectedAttribute(null);
  };

  return (
    <View className="bg-white p-5 rounded-xl shadow-sm">
      <Text className="text-2xl font-bold text-gray-900 mb-6">Product Specifications</Text>

      {/* Add Attribute Button */}
      <TouchableOpacity 
        onPress={() => setAddModalVisible(true)}
        className="flex-row items-center justify-center bg-blue-600 py-4 rounded-xl mb-6"
      >
        <PlusIcon size={20} color="#FFFFFF" />
        <Text className="text-white font-semibold ml-2">Add Variant Attribute</Text>
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Variant Attributes Section */}
        {Object.keys(variantAttributesGrouped).length > 0 && (
          <View className="mb-8">
            <Text className="text-lg font-bold text-blue-900 mb-4">Variant Specifications</Text>
            {Object.entries(variantAttributesGrouped).map(([category, attributes]) => (
              <ExpandableAttributeSection
                key={`variant-${category}`}
                category={category}
                attributes={attributes}
                onEditAttribute={handleEdit}
                onDeleteAttribute={handleDelete}
                isVariantSection={true}
              />
            ))}
          </View>
        )}

        {/* Product Attributes Section */}
        <View>
          <Text className="text-lg font-bold text-gray-800 mb-4">Product Specifications</Text>
          {Object.entries(groupedAttributes).map(([category, attributes]) => {
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

      {/* Modals */}
      <EditAttributeModal
        visible={editModalVisible}
        attribute={selectedAttribute}
        onSave={handleSaveEdit}
        onClose={() => setEditModalVisible(false)}
      />

      <DeleteConfirmationModal
        visible={deleteModalVisible}
        attribute={selectedAttribute}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteModalVisible(false)}
      />

      <AddAttributeModal
        visible={addModalVisible}
        onAdd={onAddVariantAttribute}
        onClose={() => setAddModalVisible(false)}
      />
    </View>
  );
};

export default ProductAttributesView;