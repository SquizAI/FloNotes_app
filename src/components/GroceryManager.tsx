import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput,
  Modal,
  ScrollView,
  Alert,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import GroceryList, { GroceryItem, GroceryCategories } from './GroceryList';
import { LinearGradient } from 'expo-linear-gradient';

// Storage key for the grocery list
const GROCERY_LIST_STORAGE_KEY = 'ai_notes_grocery_list';

const { width } = Dimensions.get('window');

interface GroceryManagerProps {
  initialItems?: { 
    category: string, 
    items: Array<{name: string, quantity?: string}> 
  }[];
  onListUpdated?: (list: any) => void;
  activeFilter?: string | null;
}

const GroceryManager: React.FC<GroceryManagerProps> = ({ 
  initialItems,
  onListUpdated,
  activeFilter = null
}) => {
  // State for the unified grocery list
  const [groceryData, setGroceryData] = useState<{
    categories: {
      produce: GroceryItem[];
      dairy: GroceryItem[];
      meat: GroceryItem[];
      bakery: GroceryItem[];
      pantry: GroceryItem[];
      other: GroceryItem[];
    }
  }>({
    categories: {
      produce: [],
      dairy: [],
      meat: [],
      bakery: [],
      pantry: [],
      other: []
    }
  });
  
  // Modal visibility state
  const [modalVisible, setModalVisible] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('other');
  
  // Load saved grocery list on mount
  useEffect(() => {
    loadGroceryList();
  }, []);
  
  // Process initialItems when provided
  useEffect(() => {
    if (initialItems && initialItems.length > 0) {
      addItemsFromVoiceOrNote(initialItems);
    }
  }, [initialItems]);
  
  // Load grocery list from AsyncStorage
  const loadGroceryList = async () => {
    try {
      const savedList = await AsyncStorage.getItem(GROCERY_LIST_STORAGE_KEY);
      if (savedList) {
        setGroceryData(JSON.parse(savedList));
      }
    } catch (error) {
      console.error('Error loading grocery list:', error);
    }
  };
  
  // Save grocery list to AsyncStorage
  const saveGroceryList = async (list: typeof groceryData) => {
    try {
      await AsyncStorage.setItem(GROCERY_LIST_STORAGE_KEY, JSON.stringify(list));
      if (onListUpdated) {
        onListUpdated(list);
      }
    } catch (error) {
      console.error('Error saving grocery list:', error);
    }
  };
  
  // Process and add items from voice command or notes
  const addItemsFromVoiceOrNote = (items: { category: string, items: Array<{name: string, quantity?: string}> }[]) => {
    const updatedGroceryData = { ...groceryData };
    
    items.forEach(categoryGroup => {
      const category = categoryGroup.category.toLowerCase();
      // Determine which category to use (produce, dairy, meat, bakery, pantry, or other)
      let targetCategory: keyof typeof groceryData.categories = 'other';
      
      if (category.includes('produce') || category.includes('vegetable') || category.includes('fruit')) {
        targetCategory = 'produce';
      } else if (category.includes('dairy') || category.includes('milk') || category.includes('cheese')) {
        targetCategory = 'dairy';
      } else if (category.includes('meat') || category.includes('protein')) {
        targetCategory = 'meat';
      } else if (category.includes('bakery') || category.includes('bread')) {
        targetCategory = 'bakery';
      } else if (category.includes('pantry') || category.includes('canned')) {
        targetCategory = 'pantry';
      }
      
      // Add items to the appropriate category
      categoryGroup.items.forEach(item => {
        // Check if item already exists in any category
        let itemExists = false;
        
        Object.keys(updatedGroceryData.categories).forEach(cat => {
          const categoryKey = cat as keyof typeof groceryData.categories;
          const existingItemIndex = updatedGroceryData.categories[categoryKey].findIndex(
            existingItem => existingItem.name.toLowerCase() === item.name.toLowerCase()
          );
          
          if (existingItemIndex >= 0) {
            // Update quantity if provided
            if (item.quantity) {
              updatedGroceryData.categories[categoryKey][existingItemIndex].quantity = item.quantity;
            }
            itemExists = true;
          }
        });
        
        // Add new item if it doesn't exist
        if (!itemExists) {
          updatedGroceryData.categories[targetCategory].push({
            name: item.name,
            quantity: item.quantity || '',
            done: false
          });
        }
      });
    });
    
    setGroceryData(updatedGroceryData);
    saveGroceryList(updatedGroceryData);
  };
  
  // Add a single new item manually
  const addNewItem = () => {
    if (!newItemName.trim()) {
      Alert.alert('Error', 'Please enter an item name');
      return;
    }
    
    const updatedGroceryData = { ...groceryData };
    const categoryKey = newItemCategory as keyof typeof groceryData.categories;
    
    updatedGroceryData.categories[categoryKey].push({
      name: newItemName.trim(),
      quantity: newItemQuantity.trim(),
      done: false
    });
    
    setGroceryData(updatedGroceryData);
    saveGroceryList(updatedGroceryData);
    
    // Reset form
    setNewItemName('');
    setNewItemQuantity('');
    setModalVisible(false);
  };
  
  // Toggle item completion status
  const handleToggleItem = (category: string, index: number) => {
    const updatedGroceryData = { ...groceryData };
    const categoryKey = category as keyof typeof groceryData.categories;
    
    updatedGroceryData.categories[categoryKey][index].done = 
      !updatedGroceryData.categories[categoryKey][index].done;
    
    setGroceryData(updatedGroceryData);
    saveGroceryList(updatedGroceryData);
  };
  
  // Clear completed items
  const clearCompletedItems = () => {
    const updatedGroceryData = { ...groceryData };
    
    Object.keys(updatedGroceryData.categories).forEach(category => {
      const categoryKey = category as keyof typeof groceryData.categories;
      updatedGroceryData.categories[categoryKey] = updatedGroceryData.categories[categoryKey].filter(
        item => !item.done
      );
    });
    
    setGroceryData(updatedGroceryData);
    saveGroceryList(updatedGroceryData);
  };
  
  // Count total items in the grocery list
  const totalItems = Object.values(groceryData.categories).reduce(
    (sum, category) => sum + category.length, 0
  );
  
  // Get total completed items
  const completedItems = Object.values(groceryData.categories).reduce(
    (sum, category) => sum + category.filter(item => item.done).length, 0
  );
  
  // Prepare grocery list for Instacart checkout (stub for future integration)
  const prepareForInstacartCheckout = () => {
    // This is a stub for future integration with Instacart
    Alert.alert(
      'Instacart Integration',
      'This feature will allow you to export your grocery list to Instacart for checkout. Coming soon!',
      [
        { text: 'OK', style: 'default' }
      ]
    );
    
    // For future integration, we would format the grocery data for Instacart's API
    const instacartFormatItems = Object.values(groceryData.categories)
      .flat()
      .filter(item => !item.done)
      .map(item => ({
        name: item.name,
        quantity: item.quantity || '1'
      }));
    
    console.log('Items ready for Instacart:', instacartFormatItems);
  };
  
  // Get gradient colors based on category
  const getCategoryGradient = (category: string) => {
    switch(category) {
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
  
  // Filter categories based on activeFilter prop
  const filteredCategories = React.useMemo(() => {
    if (!activeFilter) {
      return Object.keys(groceryData.categories);
    }
    return [activeFilter];
  }, [activeFilter, groceryData.categories]);
  
  // Check if a category has items
  const categoryHasItems = (category: keyof typeof groceryData.categories) => {
    return groceryData.categories[category] && groceryData.categories[category].length > 0;
  };
  
  // Create properly typed filtered data for GroceryList
  const getFilteredGroceryData = (): { categories: GroceryCategories } => {
    if (!activeFilter) {
      return groceryData;
    }
    
    // Create a new categories object with only the filtered category
    const filteredData: GroceryCategories = {
      produce: [],
      dairy: [],
      meat: [],
      bakery: [],
      pantry: [],
      other: []
    };
    
    // Only include the active filter category's items
    if (activeFilter in groceryData.categories) {
      const categoryKey = activeFilter as keyof typeof groceryData.categories;
      filteredData[categoryKey] = [...groceryData.categories[categoryKey]];
    }
    
    return { categories: filteredData };
  };
  
  // Helper function to get proper typed gradient colors
  const getGradientColors = (colors: string[]): [string, string] => {
    return [colors[0], colors[1]];
  };
  
  return (
    <View style={styles.container}>
      {/* Header with actions */}
      <LinearGradient
        colors={getGradientColors(['#252538', '#1E1E24'])}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <Text style={styles.title}>
            {activeFilter 
              ? `${activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)} Items`
              : 'Family Grocery List'}
          </Text>
          <View style={styles.actions}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => setModalVisible(true)}
            >
              <LinearGradient
                colors={['#4F5BD5', '#962FBF']}
                style={styles.actionButtonGradient}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
              >
                <Ionicons name="add" size={24} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={clearCompletedItems}
            >
              <LinearGradient
                colors={['#4F5BD5', '#962FBF']}
                style={styles.actionButtonGradient}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
              >
                <Ionicons name="checkmark-done" size={24} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      
        {/* Progress indicator */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <LinearGradient
              colors={getGradientColors(['#FF2D55', '#4F5BD5'])}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 0}}
              style={[
                styles.progressFill, 
                { width: `${totalItems > 0 ? (completedItems / totalItems) * 100 : 0}%` }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>
            {completedItems}/{totalItems} items
          </Text>
        </View>
      </LinearGradient>
      
      {/* Grocery List */}
      {totalItems > 0 ? (
        <GroceryList
          data={getFilteredGroceryData()}
          onToggleItem={handleToggleItem}
          getCategoryGradient={getCategoryGradient}
        />
      ) : (
        <View style={styles.emptyState}>
          <LinearGradient
            colors={getGradientColors(['rgba(79, 91, 213, 0.2)', 'rgba(150, 47, 191, 0.2)'])}
            style={styles.emptyStateGradient}
          >
            <Ionicons name="basket-outline" size={80} color="#4F5BD5" />
            <Text style={styles.emptyText}>
              {activeFilter 
                ? `No ${activeFilter} items yet`
                : 'Your grocery list is empty'}
            </Text>
            <Text style={styles.emptySubtext}>
              Add items manually or use voice commands
            </Text>
          </LinearGradient>
        </View>
      )}
      
      {/* Checkout button for Instacart integration with fixed gradient */}
      {totalItems > 0 && (
        <View style={styles.checkoutContainer}>
          <TouchableOpacity 
            style={styles.checkoutButton}
            onPress={prepareForInstacartCheckout}
          >
            <LinearGradient
              colors={getGradientColors(['#FF2D55', '#962FBF'])}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 0}}
              style={styles.checkoutGradient}
            >
              <Ionicons name="cart" size={20} color="#fff" />
              <Text style={styles.checkoutText}>
                Checkout with Instacart
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Add item modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <LinearGradient
              colors={getGradientColors(['#252538', '#1A1A22'])}
              style={styles.modalGradient}
            >
              <Text style={styles.modalTitle}>Add Grocery Item</Text>
              
              <TextInput
                style={styles.input}
                placeholder="Item name"
                placeholderTextColor="#6D6D8A"
                value={newItemName}
                onChangeText={setNewItemName}
              />
              
              <TextInput
                style={styles.input}
                placeholder="Quantity (optional)"
                placeholderTextColor="#6D6D8A"
                value={newItemQuantity}
                onChangeText={setNewItemQuantity}
              />
              
              <Text style={styles.label}>Category:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categorySelector}>
                {Object.keys(groceryData.categories).map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.categoryButton,
                      newItemCategory === category && styles.selectedCategory
                    ]}
                    onPress={() => setNewItemCategory(category)}
                  >
                    <LinearGradient
                      colors={newItemCategory === category ? 
                        getGradientColors(getCategoryGradient(category)) : 
                        getGradientColors(['#252538', '#1E1E24'])}
                      style={styles.categoryButtonGradient}
                    >
                      <Text 
                        style={[
                          styles.categoryButtonText,
                          newItemCategory === category && styles.selectedCategoryText
                        ]}
                      >
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.modalButton, styles.addButton]}
                  onPress={addNewItem}
                >
                  <LinearGradient
                    colors={getGradientColors(['#4F5BD5', '#962FBF'])}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 0}}
                    style={styles.addButtonGradient}
                  >
                    <Text style={styles.addButtonText}>Add Item</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121214',
  },
  headerGradient: {
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(79, 91, 213, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  actions: {
    flexDirection: 'row',
  },
  actionButton: {
    marginLeft: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  progressContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#252538',
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: 8,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#b3b3cc',
    textAlign: 'right',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyStateGradient: {
    width: '90%',
    aspectRatio: 1.5,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  emptyText: {
    fontSize: 18,
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
    fontWeight: 'bold',
    textShadowColor: 'rgba(79, 91, 213, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#b3b3cc',
    textAlign: 'center',
    maxWidth: '80%',
  },
  checkoutContainer: {
    padding: 16,
  },
  checkoutButton: {
    overflow: 'hidden',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  checkoutGradient: {
    flexDirection: 'row',
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkoutText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    borderRadius: 20,
    width: '85%',
    maxWidth: 400,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalGradient: {
    padding: 24,
    borderRadius: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#fff',
    textShadowColor: 'rgba(79, 91, 213, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#3A3A4D',
    backgroundColor: '#1A1A22',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    color: '#fff',
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#fff',
  },
  categorySelector: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  categoryButton: {
    marginRight: 8,
    borderRadius: 20,
    overflow: 'hidden',
  },
  categoryButtonGradient: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  selectedCategory: {
    // Styling is based on the gradient colors now
  },
  categoryButtonText: {
    color: '#b3b3cc',
  },
  selectedCategoryText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    overflow: 'hidden',
  },
  cancelButton: {
    backgroundColor: '#252538',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#b3b3cc',
    fontWeight: 'bold',
  },
  addButton: {
    marginLeft: 8,
    overflow: 'hidden',
  },
  addButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default GroceryManager; 