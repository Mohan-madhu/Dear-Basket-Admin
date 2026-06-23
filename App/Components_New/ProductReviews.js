import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';

const StarRating = ({ rating, size = 16, showEmpty = true }) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 !== 0;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <View className="flex-row items-center">
      {[...Array(fullStars)].map((_, i) => (
        <Text key={`full-${i}`} className="text-amber-400" style={{ fontSize: size }}>★</Text>
      ))}
      {hasHalfStar && (
        <Text className="text-amber-400" style={{ fontSize: size }}>⯨</Text>
      )}
      {showEmpty && [...Array(emptyStars)].map((_, i) => (
        <Text key={`empty-${i}`} className="text-gray-300" style={{ fontSize: size }}>★</Text>
      ))}
    </View>
  );
};

const ReviewCard = ({ review }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <View className="bg-white p-4 rounded-lg shadow-sm mb-3 border border-gray-100">
      {/* Review Header */}
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-1">
          <Text className="font-bold text-gray-900 text-base">{review.username}</Text>
          <View className="flex-row items-center mt-1">
            <StarRating rating={review.rating} size={14} />
            <Text className="text-gray-500 text-xs ml-2">
              {new Date(review.reviewDate).toLocaleDateString()}
            </Text>
          </View>
        </View>
        {review.isVerifiedPurchase && (
          <View className="bg-green-100 px-2 py-1 rounded-full">
            <Text className="text-green-800 text-xs font-medium">Verified Purchase</Text>
          </View>
        )}
      </View>

      {/* Review Title */}
      {review.reviewTitle && (
        <Text className="font-semibold text-gray-800 text-sm mb-1">
          {review.reviewTitle}
        </Text>
      )}

      {/* Review Text */}
      <Text 
        className={`text-gray-700 text-sm ${expanded ? '' : 'line-clamp-3'}`}
        numberOfLines={expanded ? undefined : 3}
      >
        {review.reviewText}
      </Text>

      {review.reviewText.length > 150 && (
        <TouchableOpacity onPress={() => setExpanded(!expanded)}>
          <Text className="text-blue-600 text-xs font-medium mt-1">
            {expanded ? 'Read less' : 'Read more'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Review Images if any */}
      {review.images && review.images.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3">
          {review.images.map((image, index) => (
            <Image
              key={index}
              source={{ uri: image }}
              className="w-16 h-16 rounded-md mr-2"
              style={{ width: 64, height: 64, borderRadius: 6, marginRight: 8 }}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ))}
        </ScrollView>
      )}

      {/* Helpful Votes */}
      {/* <View className="flex-row justify-between items-center mt-3 pt-3 border-t border-gray-100">
        <Text className="text-gray-500 text-xs">
          {review.helpfulVotes} people found this helpful
        </Text>
        <TouchableOpacity>
          <Text className="text-blue-600 text-xs font-medium">Helpful</Text>
        </TouchableOpacity>
      </View> */}
    </View>
  );
};

const ProductReviews = ({ reviews, averageRating, totalReviews }) => {
  const [sortBy, setSortBy] = useState('recent');
  const [filterRating, setFilterRating] = useState(0);

  // Filter and sort reviews
  const filteredReviews = reviews
    .filter(review => filterRating === 0 || Math.floor(review.rating) === filterRating)
    .sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return new Date(b.reviewDate) - new Date(a.reviewDate);
        case 'helpful':
          return b.helpfulVotes - a.helpfulVotes;
        case 'rating_high':
          return b.rating - a.rating;
        case 'rating_low':
          return a.rating - b.rating;
        default:
          return 0;
      }
    });

  const ratingDistribution = [5, 4, 3, 2, 1].map(stars => ({
    stars,
    count: reviews.filter(r => Math.floor(r.rating) === stars).length,
    percentage: (reviews.filter(r => Math.floor(r.rating) === stars).length / reviews.length) * 100
  }));

  return (
    <View className="bg-white p-4 mt-4 rounded-lg shadow-sm">
      <Text className="text-2xl font-bold text-gray-900 mb-4">Customer Reviews</Text>

      {/* Rating Summary */}
      <View className="flex-row items-start mb-6">
        <View className="items-center mr-6">
          <Text className="text-4xl font-bold text-gray-900">{averageRating.toFixed(1)}</Text>
          <StarRating rating={averageRating} size={20} />
          <Text className="text-gray-600 text-sm mt-1">{totalReviews} reviews</Text>
        </View>

        {/* Rating Distribution */}
        <View className="flex-1">
          {ratingDistribution.map(({ stars, count, percentage }) => (
            <TouchableOpacity 
              key={stars}
              className="flex-row items-center mb-1"
              onPress={() => setFilterRating(filterRating === stars ? 0 : stars)}
            >
              <Text className="text-gray-600 text-sm w-6">{stars}★</Text>
              <View className="flex-1 bg-gray-200 rounded-full h-2 mx-2">
                <View 
                  className="bg-amber-400 h-2 rounded-full" 
                  style={{ width: `${percentage}%` }}
                />
              </View>
              <Text className="text-gray-600 text-sm w-10 text-right">{count}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Filter and Sort Controls */}
      <View className="flex-row justify-between mb-4">
        <View className="flex-row space-x-2">
          <TouchableOpacity 
            className={`px-3 py-1 rounded-full ${filterRating === 0 ? 'bg-blue-100' : 'bg-gray-100'}`}
            onPress={() => setFilterRating(0)}
          >
            <Text className={`text-xs ${filterRating === 0 ? 'text-blue-700 font-medium' : 'text-gray-600'}`}>
              All Reviews
            </Text>
          </TouchableOpacity>
          {[5, 4, 3].map(rating => (
            <TouchableOpacity 
              key={rating}
              className={`px-3 py-1 rounded-full ${filterRating === rating ? 'bg-amber-100' : 'bg-gray-100'}`}
              onPress={() => setFilterRating(filterRating === rating ? 0 : rating)}
            >
              <Text className={`text-xs ${filterRating === rating ? 'text-amber-700 font-medium' : 'text-gray-600'}`}>
                {rating}★
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View className="bg-gray-100 rounded-md px-3 py-1">
          <Text className="text-gray-600 text-xs">Sort: {sortBy.replace('_', ' ')}</Text>
        </View>
      </View>

      {/* Reviews List */}
      <ScrollView showsVerticalScrollIndicator={false}>
        {filteredReviews.map((review, index) => (
          <ReviewCard key={index} review={review} />
        ))}
        
        {filteredReviews.length === 0 && (
          <View className="bg-gray-50 p-6 rounded-lg items-center">
            <Text className="text-gray-500 text-center">
              No reviews found for the selected filter.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Load More Button */}
      {/* {filteredReviews.length > 0 && (
        <TouchableOpacity className="bg-gray-100 p-3 rounded-lg mt-4 items-center">
          <Text className="text-blue-600 font-medium">Load More Reviews</Text>
        </TouchableOpacity>
      )} */}
    </View>
  );
};

export default ProductReviews;
