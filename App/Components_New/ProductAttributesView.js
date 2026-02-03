import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { ChevronDownIcon, ChevronUpIcon } from 'react-native-heroicons/outline';

const ExpandableAttributeSection = ({ category, attributes }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <View className="mb-4">
      <TouchableOpacity
        onPress={() => setIsExpanded(!isExpanded)}
        className="flex-row justify-between items-center py-3"
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
        <View className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          {attributes.map((attribute, index) => (
            <View
              key={index}
              className={`flex-row justify-between py-2 ${index < attributes.length - 1 ? 'border-b border-gray-200' : ''}`}
            >
              <Text className="text-gray-600 font-medium flex-1 capitalize">
                {attribute.attributename.replace(/_/g, ' ').replace(`${category}_`, '')}
              </Text>
              <Text className="text-gray-800 font-normal flex-1 text-right">
                {attribute.attributevalue}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const ProductAttributesView = ({ productAttributes, variantAttributes }) => {
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

  return (
    <View className="bg-white p-5 mt-1 rounded-lg shadow-sm">
      <Text className="text-xl font-bold text-gray-900 mb-4">Product Specifications</Text>

      <ScrollView showsVerticalScrollIndicator={false}>
        {Object.entries(groupedAttributes).map(([category, attributes]) => (
          <ExpandableAttributeSection
            key={category}
            category={category}
            attributes={attributes}
          />
        ))}
      </ScrollView>
    </View>
  );
};

export default ProductAttributesView;