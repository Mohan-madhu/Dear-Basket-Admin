import React from 'react';
import { View, Text, ScrollView } from 'react-native';

const ProductAttributesView = ({ productAttributes, variantAttributes }) => {
  // Combine and prioritize attributes (variant attributes override product attributes with same name)
  const combinedAttributes = [...productAttributes, ...variantAttributes].reduce((acc, attr) => {
    const existingIndex = acc.findIndex(a => a.attributename === attr.attributename);
    if (existingIndex === -1) {
      acc.push(attr);
    } else {
      // Variant attributes override product attributes
      acc[existingIndex] = attr;
    }
    return acc;
  }, []);

  // Sort by display order
  const sortedAttributes = combinedAttributes.sort((a, b) => 
    (a.displayorder || 999) - (b.displayorder || 999)
  );

  // Group attributes by category if they have a naming pattern
  const groupedAttributes = sortedAttributes.reduce((groups, attr) => {
    const category = attr.attributename.split('_')[0] || 'General';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(attr);
    return groups;
  }, {});

  return (
    <View className="bg-white p-4 mt-4 rounded-lg shadow-sm">
      <Text className="text-xl font-bold text-gray-900 mb-4">Specifications</Text>
      
      <ScrollView showsVerticalScrollIndicator={false}>
        {Object.entries(groupedAttributes).map(([category, attributes]) => (
          <View key={category} className="mb-6">
            <Text className="text-lg font-semibold text-gray-800 mb-3 capitalize">
              {category.replace(/_/g, ' ')}
            </Text>
            
            <View className="bg-gray-50 rounded-lg p-3">
              {attributes.map((attribute, index) => (
                <View 
                  key={index} 
                  className={`flex-row justify-between py-3 ${index < attributes.length - 1 ? 'border-b border-gray-200' : ''}`}
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
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

export default ProductAttributesView;