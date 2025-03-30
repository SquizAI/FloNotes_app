import React, { useState, useCallback, useMemo, memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Keyboard, Platform, Dimensions, Animated, AccessibilityInfo } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Define interface for grocery item
export interface GroceryItem {
  name: string;
  quantity?: string;
  done: boolean;
  id?: string; // Optional unique ID for more efficient rendering
}

// Define interface for categories
export interface GroceryCategories {
  produce: GroceryItem[];
  dairy: GroceryItem[];
  meat: GroceryItem[];
  bakery: GroceryItem[];
  pantry: GroceryItem[];
  other: GroceryItem[];
}

// Props for the component
interface GroceryListProps {
  data: {
    categories: GroceryCategories;
  };
  onToggleItem: (category: string, index: number) => void;
  getCategoryGradient?: (category: string) => string[];
}

const GroceryList: React.FC<GroceryListProps> = ({ data, onToggleItem, getCategoryGradient }) => {
  // Track which items are being pressed for feedback
  const [pressedItem, setPressedItem] = useState<{category: string, index: number} | null>(null);
  
  // Get device dimensions for responsive design
  const { width: screenWidth } = Dimensions.get('window');
  
  // Animation value for item interactions
  const [fadeAnim] = useState(() => new Animated.Value(1));

  // Handle item press with visual feedback
  // Enhanced item press handler with haptic feedback for iOS
  const handleItemPress = useCallback((category: string, index: number) => {
    setPressedItem({ category, index });
    // Provide subtle animation feedback
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0.7,
        duration: 80,
        useNativeDriver: true
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 110,
        useNativeDriver: true
      })
    ]).start();
    
    // Dismiss keyboard if it's open
    Keyboard.dismiss();
    // Toggle the item
    onToggleItem(category, index);
    // Reset pressed state after animation time
    setTimeout(() => setPressedItem(null), 150);
  }, [onToggleItem, fadeAnim]);
  // Helper function to get icon for each category
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'produce':
        return 'leaf-outline';
      case 'dairy':
        return 'water-outline';
      case 'meat':
        return 'restaurant-outline';
      case 'bakery':
        return 'pizza-outline';
      case 'pantry':
        return 'file-tray-stacked-outline';
      case 'other':
        return 'apps-outline';
      default:
        return 'list-outline';
    }
  };

  // Get default gradient colors if no getCategoryGradient prop
  const getDefaultGradient = (category: string): [string, string] => {
    switch (category) {
      case 'produce':
        return ['#20BA9C', '#1A9E85'];
      case 'dairy':
        return ['#4F5BD5', '#3A46B0'];
      case 'meat':
        return ['#F0427C', '#D5366B'];
      case 'bakery':
        return ['#F7B733', '#E5A72D'];
      case 'pantry':
        return ['#962FBF', '#7E28A1'];
      default:
        return ['#646C8F', '#4E5575'];
    }
  };

  // Format category name for display
  const formatCategoryName = (category: string) => {
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  // Render a category if it has items - memoized for performance
  const renderCategory = useCallback((category: string, items: GroceryItem[]) => {
    if (!items || items.length === 0) return null;

    // Get the gradient colors, either from props or default
    const gradientColors = getCategoryGradient ? 
      getCategoryGradient(category) as [string, string] : 
      getDefaultGradient(category);

    return (
      <View style={styles.categoryContainer} key={category}>
        <LinearGradient 
          colors={gradientColors}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 0}}
          style={styles.categoryGradient}
        >
          <View style={styles.categoryHeader}>
            <Ionicons name={getCategoryIcon(category)} size={24} color="#fff" />
            <Text style={styles.categoryTitle}>{formatCategoryName(category)}</Text>
          </View>
          {items.map((item, index) => (
            // Apply increased hit targets for each item on iPhone
            <View key={`${category}-${index}`} style={styles.itemRow}>
              <Animated.View style={{ opacity: pressedItem?.category === category && pressedItem?.index === index ? fadeAnim : 1 }}>
                <TouchableOpacity 
                  style={[styles.checkbox, pressedItem?.category === category && pressedItem?.index === index && styles.itemPressed]}
                  onPress={() => handleItemPress(category, index)}
                  activeOpacity={0.7}
                  accessible={true}
                  accessibilityLabel={`${item.name} ${item.quantity || ''} ${item.done ? 'checked' : 'unchecked'}`}
                  accessibilityHint="Double tap to toggle completion status"
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: item.done }}
                >
                <Ionicons 
                  name={item.done ? 'checkbox' : 'square-outline'} 
                  size={22} 
                  color={item.done ? '#fff' : 'rgba(255, 255, 255, 0.7)'} 
                />
                </TouchableOpacity>
              </Animated.View>
              <View style={styles.itemContent}>
                <Text style={[
                  styles.itemName,
                  item.done && styles.itemCompleted
                ]}>
                  {item.name}
                </Text>
                {item.quantity && (
                  <Text style={styles.quantity}>{item.quantity}</Text>
                )}
              </View>
            </View>
          ))}
        </LinearGradient>
      </View>
    );
  }, [getCategoryGradient, handleItemPress, pressedItem, fadeAnim]);

  // Memoize the list to prevent unnecessary re-renders and optimize scrolling performance
  const memoizedList = useMemo(() => {
    return Object.entries(data.categories).map(([category, items]) => 
      renderCategory(category, items)
    );
  }, [data.categories, renderCategory]);
  
  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={true}
      bounces={true}
      alwaysBounceVertical={true}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      decelerationRate={Platform.OS === 'ios' ? "normal" : 0.985}
      scrollEventThrottle={16}
      snapToAlignment="start"
      overScrollMode="always"
      removeClippedSubviews={Platform.OS === 'ios'} // Improves memory usage on iOS
      contentInsetAdjustmentBehavior="automatic"
      contentInset={Platform.OS === 'ios' ? { bottom: 40 } : undefined} // iOS-specific bottom inset
      accessibilityLabel="Grocery list with categories"
    >
      <View style={styles.listContainer}>
        {memoizedList}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    // Add more iPhone-friendly styles
    ...(Platform.OS === 'ios' ? {
      marginTop: 4,
      paddingHorizontal: 2, // Slight padding to avoid edge-to-edge on iPhone
    } : {}),
  },
  scrollContent: {
    flexGrow: 1,
    // Enhanced iPhone scrolling behavior
    ...(Platform.OS === 'ios' ? {
      paddingBottom: 60, // Extra padding at bottom for better scrolling experience
      minHeight: '100%', // Ensure content is always scrollable
    } : {}),
  },
  listContainer: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16, // Extra bottom padding on iOS for better scrolling experience
  },
  categoryContainer: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
    ...(Platform.OS === 'ios' ? {
      // iOS-specific shadow improvements
      shadowColor: 'rgba(0,0,0,0.3)',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
    } : {}),
  },
  categoryGradient: {
    padding: 16,
    borderRadius: 16,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.15)',
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Platform.OS === 'ios' ? 12 : 8, // Larger touch targets on iOS
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 6,
  },
  itemPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  checkbox: {
    marginRight: 12,
    padding: 4, // Increase touch target size
  },
  itemContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemName: {
    fontSize: 16,
    color: '#fff',
    flex: 1,
  },
  itemCompleted: {
    textDecorationLine: 'line-through',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  quantity: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginLeft: 8,
    fontWeight: '500',
  },
});

export default GroceryList; 