import React, { useState, useRef, useEffect } from 'react';
import { 
  SafeAreaView, 
  StyleSheet, 
  View, 
  TextInput, 
  TouchableOpacity,
  Text,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ScrollView,
  Modal,
  ActivityIndicator,
  useWindowDimensions,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { extractGroceryList, enhanceGroceryContent, identifyContentType } from '../../lib/ai';
import GroceryManager from '../components/GroceryManager';
import { AudioRecorder } from '../components';
import { GroceryItem } from '../components/GroceryList';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

// Define type for the result from extractGroceryList
interface GroceryListResult {
  categories: {
    produce: GroceryItem[];
    dairy: GroceryItem[];
    meat: GroceryItem[];
    bakery: GroceryItem[];
    pantry: GroceryItem[];
    other: GroceryItem[];
  }
}

// Helper function to get proper typed gradient colors
const getGradientColors = (colors: string[]): [string, string] => {
  return [colors[0], colors[1]];
};

const GroceryScreen: React.FC = () => {
  const { width, height } = useWindowDimensions();
  const isTablet = width > 768;
  
  // Basic state
  const [voiceInput, setVoiceInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  
  // Enhanced content state
  const [enhancedContent, setEnhancedContent] = useState<{
    text: string;
    mealPlan?: string;
    suggestions?: string[];
  } | null>(null);
  
  // Content type identification
  const [contentType, setContentType] = useState<{
    type: string;
    confidence: number;
    reasoning: string;
  } | null>(null);
  
  // Preview modal state
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  
  // Animation values
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  
  // Processed items state
  const [processedGroceryItems, setProcessedGroceryItems] = useState<Array<{
    category: string;
    items: Array<{ name: string; quantity?: string }>;
  }> | null>(null);
  
  // Slide in animation when content changes
  useEffect(() => {
    if (enhancedContent) {
      Animated.sequence([
        Animated.timing(slideAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        slideAnim.setValue(0);
      });
    }
  }, [enhancedContent]);
  
  // Step 1: Analyze and enhance the input
  const analyzeInput = async () => {
    if (!voiceInput.trim()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      // First, identify what type of content this is
      const typeResult = await identifyContentType(voiceInput);
      setContentType({
        type: typeResult.contentType,
        confidence: typeResult.confidence,
        reasoning: typeResult.reasoning
      });
      
      // If it's a grocery list, enhance it
      if (typeResult.contentType === 'grocery_list' || typeResult.contentType === 'recipe') {
        const enhanced = await enhanceGroceryContent(voiceInput);
        setEnhancedContent({
          text: enhanced.enhancedText,
          mealPlan: enhanced.mealPlan,
          suggestions: enhanced.suggestions
        });
        
        // Show the preview modal
        setShowPreviewModal(true);
      } else {
        // Not a grocery list - ask user if they want to continue anyway
        setEnhancedContent({
          text: voiceInput,
        });
        setShowPreviewModal(true);
      }
    } catch (error) {
      console.error('Error analyzing input:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Step 2: Process the enhanced content into structured data
  const processEnhancedContent = async () => {
    if (!enhancedContent) {
      return;
    }
    
    setIsLoading(true);
    setShowPreviewModal(false);
    
    try {
      // Process the enhanced text into a structured grocery list
      const result = await extractGroceryList(enhancedContent.text) as GroceryListResult;
      
      // Format items for the GroceryManager
      const formattedItems = Object.entries(result.categories).map(([category, items]) => ({
        category,
        items: items.map(item => ({
          name: item.name,
          quantity: item.quantity
        }))
      }));
      
      // Update state with the processed items
      setProcessedGroceryItems(formattedItems);
      
      // Reset inputs
      setVoiceInput('');
      setEnhancedContent(null);
    } catch (error) {
      console.error('Error processing content:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle transcription completion from AudioRecorder
  const handleTranscriptionComplete = (transcription: string) => {
    setVoiceInput(transcription);
  };
  
  // Filter options with icons
  const filterOptions = [
    { value: 'produce', label: 'Produce', icon: 'leaf-outline' as const },
    { value: 'dairy', label: 'Dairy', icon: 'water-outline' as const },
    { value: 'meat', label: 'Meat', icon: 'restaurant-outline' as const },
    { value: 'bakery', label: 'Bakery', icon: 'pizza-outline' as const },
    { value: 'pantry', label: 'Pantry', icon: 'file-tray-stacked-outline' as const }
  ];
  
  // Toggle a filter
  const toggleFilter = (filter: string) => {
    if (activeFilter === filter) {
      setActiveFilter(null);
    } else {
      setActiveFilter(filter);
    }
  };
  
  // Close preview modal without processing
  const cancelPreview = () => {
    setShowPreviewModal(false);
    setEnhancedContent(null);
  };
  
  return (
    <LinearGradient
      colors={getGradientColors(['#121214', '#1A1A22'])}
      style={styles.gradientContainer}
    >
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
        >
          {/* Header with filters */}
          <View style={[styles.header, isTablet && styles.tabletHeader]}>
            <Text style={styles.headerTitle}>My Grocery List</Text>
            
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filtersContainer}
            >
              {filterOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.filterChip,
                    activeFilter === option.value && styles.activeFilterChip
                  ]}
                  onPress={() => toggleFilter(option.value)}
                >
                  <LinearGradient
                    colors={getGradientColors(activeFilter === option.value 
                      ? ['#4F5BD5', '#962FBF'] 
                      : ['#252538', '#1E1E24'])}
                    style={styles.filterChipGradient}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 0}}
                  >
                    <Ionicons 
                      name={option.icon} 
                      size={16} 
                      color={activeFilter === option.value ? '#fff' : '#6D6D8A'} 
                    />
                    <Text style={[
                      styles.filterText,
                      activeFilter === option.value && styles.activeFilterText
                    ]}>
                      {option.label}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          
          {/* Main content area - tablet layout */}
          {isTablet ? (
            <View style={styles.tabletLayout}>
              {/* Left side - input */}
              <View style={styles.tabletInputColumn}>
                <View style={styles.bentoContainer}>
                  <LinearGradient
                    colors={getGradientColors(['#252538', '#1E1E24'])}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 1}}
                    style={styles.inputBento}
                  >
                    <Text style={styles.bentoTitle}>Add to Your List</Text>
                    <TextInput
                      style={styles.textInput}
                      value={voiceInput}
                      onChangeText={setVoiceInput}
                      placeholder="Say or type your grocery items..."
                      placeholderTextColor="#6D6D8A"
                      multiline
                    />
                    
                    <View style={styles.inputActions}>
                      <View style={styles.recordButtonContainer}>
                        <AudioRecorder
                          onTranscriptionComplete={handleTranscriptionComplete}
                          isLoading={isLoading}
                          setIsLoading={setIsLoading}
                        />
                      </View>
                      
                      <TouchableOpacity
                        style={[
                          styles.processButton,
                          (!voiceInput.trim() || isLoading) && styles.disabledButton
                        ]}
                        onPress={analyzeInput}
                        disabled={!voiceInput.trim() || isLoading}
                      >
                        <LinearGradient
                          colors={getGradientColors(['#4F5BD5', '#962FBF'])}
                          start={{x: 0, y: 0}}
                          end={{x: 1, y: 0}}
                          style={styles.buttonGradient}
                        >
                          <Ionicons name="sparkles-outline" size={20} color="#fff" />
                          <Text style={styles.processButtonText}>Analyze</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  </LinearGradient>
                </View>
              </View>
              
              {/* Right side - grocery manager */}
              <View style={styles.tabletGroceryColumn}>
                <GroceryManager 
                  initialItems={processedGroceryItems} 
                  activeFilter={activeFilter} 
                />
              </View>
            </View>
          ) : (
            /* Phone layout - stacked */
            <>
              {/* Input area */}
              <View style={styles.bentoContainer}>
                <LinearGradient
                  colors={getGradientColors(['#252538', '#1E1E24'])}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 1}}
                  style={styles.inputBento}
                >
                  <Text style={styles.bentoTitle}>Add to Your List</Text>
                  <TextInput
                    style={styles.textInput}
                    value={voiceInput}
                    onChangeText={setVoiceInput}
                    placeholder="Say or type your grocery items..."
                    placeholderTextColor="#6D6D8A"
                    multiline
                  />
                  
                  <View style={styles.inputActions}>
                    <View style={styles.recordButtonContainer}>
                      <AudioRecorder
                        onTranscriptionComplete={handleTranscriptionComplete}
                        isLoading={isLoading}
                        setIsLoading={setIsLoading}
                      />
                    </View>
                    
                    <TouchableOpacity
                      style={[
                        styles.processButton,
                        (!voiceInput.trim() || isLoading) && styles.disabledButton
                      ]}
                      onPress={analyzeInput}
                      disabled={!voiceInput.trim() || isLoading}
                    >
                      <LinearGradient
                        colors={getGradientColors(['#4F5BD5', '#962FBF'])}
                        start={{x: 0, y: 0}}
                        end={{x: 1, y: 0}}
                        style={styles.buttonGradient}
                      >
                        <Ionicons name="sparkles-outline" size={20} color="#fff" />
                        <Text style={styles.processButtonText}>Analyze</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </LinearGradient>
              </View>
              
              {/* Grocery Manager */}
              <View style={styles.groceryManagerContainer}>
                <GroceryManager 
                  initialItems={processedGroceryItems} 
                  activeFilter={activeFilter}
                />
              </View>
            </>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
      
      {/* Content Preview Modal */}
      <Modal
        visible={showPreviewModal}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelPreview}
      >
        <BlurView 
          intensity={40} 
          tint="dark" 
          style={styles.modalOverlay}
        >
          <View style={[
            styles.modalContent,
            isTablet && styles.tabletModalContent
          ]}>
            <LinearGradient
              colors={getGradientColors(['#252538', '#1A1A22'])}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={styles.modalGradient}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {contentType?.type === 'grocery_list' 
                    ? 'Enhanced Grocery List' 
                    : contentType?.type === 'recipe'
                      ? 'Recipe Ingredients'
                      : 'Content Analysis'}
                </Text>
                
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={cancelPreview}
                >
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
              
              {contentType && contentType.type !== 'grocery_list' && contentType.type !== 'recipe' && (
                <View style={styles.contentTypeWarning}>
                  <Ionicons name="warning-outline" size={24} color="#F7B733" />
                  <Text style={styles.contentTypeWarningText}>
                    This doesn't seem like a grocery list. It appears to be a{' '}
                    <Text style={styles.highlightText}>{contentType.type.replace('_', ' ')}</Text>.
                    Do you still want to proceed?
                  </Text>
                </View>
              )}
              
              <ScrollView style={styles.enhancedContentScrollview}>
                <Text style={styles.enhancedContentText}>
                  {enhancedContent?.text}
                </Text>
                
                {enhancedContent?.mealPlan && (
                  <View style={styles.mealPlanSection}>
                    <Text style={styles.sectionTitle}>Suggested Meal Plan</Text>
                    <View style={styles.mealPlanContainer}>
                      <Text style={styles.mealPlanText}>{enhancedContent.mealPlan}</Text>
                    </View>
                  </View>
                )}
                
                {enhancedContent?.suggestions && enhancedContent.suggestions.length > 0 && (
                  <View style={styles.suggestionsSection}>
                    <Text style={styles.sectionTitle}>Suggested Additions</Text>
                    <View style={styles.suggestionsContainer}>
                      {enhancedContent.suggestions.map((suggestion, index) => (
                        <View key={index} style={styles.suggestionItem}>
                          <Ionicons name="add-circle-outline" size={18} color="#4F5BD5" />
                          <Text style={styles.suggestionText}>{suggestion}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </ScrollView>
              
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={cancelPreview}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={processEnhancedContent}
                >
                  <LinearGradient
                    colors={getGradientColors(['#4F5BD5', '#962FBF'])}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 0}}
                    style={styles.confirmButtonGradient}
                  >
                    <Text style={styles.confirmButtonText}>
                      {isLoading ? 'Processing...' : 'Add to List'}
                    </Text>
                    {!isLoading && <Ionicons name="chevron-forward" size={18} color="#fff" />}
                    {isLoading && <ActivityIndicator size="small" color="#fff" style={{marginLeft: 8}} />}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        </BlurView>
      </Modal>
      
      {/* Loading overlay */}
      {isLoading && !showPreviewModal && (
        <View style={styles.loadingOverlay}>
          <BlurView intensity={40} tint="dark" style={styles.blurContainer}>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4F5BD5" />
              <Text style={styles.loadingText}>Processing your grocery list...</Text>
            </View>
          </BlurView>
        </View>
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradientContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  keyboardAvoidingContainer: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  tabletHeader: {
    paddingHorizontal: 24,
    paddingTop: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    textShadowColor: 'rgba(75, 91, 213, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  filtersContainer: {
    paddingVertical: 8,
    gap: 10,
  },
  filterChip: {
    overflow: 'hidden',
    borderRadius: 20,
  },
  filterChipGradient: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 20,
  },
  activeFilterChip: {
    shadowColor: '#4F5BD5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 4,
  },
  filterText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#6D6D8A',
  },
  activeFilterText: {
    color: '#fff',
    fontWeight: '600',
  },
  tabletLayout: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  tabletInputColumn: {
    width: '40%',
    paddingRight: 16,
  },
  tabletGroceryColumn: {
    flex: 1,
  },
  bentoContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  inputBento: {
    borderRadius: 16,
    overflow: 'hidden',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  bentoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    textShadowColor: 'rgba(75, 91, 213, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  textInput: {
    backgroundColor: '#1A1A22',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#252538',
  },
  inputActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  recordButtonContainer: {
    // Space for recording button
  },
  processButton: {
    borderRadius: 30,
    overflow: 'hidden',
    width: 150,
    height: 50,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    paddingHorizontal: 16,
  },
  disabledButton: {
    opacity: 0.5,
  },
  processButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 16,
  },
  groceryManagerContainer: {
    flex: 1,
    marginTop: 8,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  blurContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  tabletModalContent: {
    width: '60%',
    maxWidth: 700,
  },
  modalGradient: {
    borderRadius: 20,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(75, 91, 213, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  closeButton: {
    padding: 4,
  },
  contentTypeWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(247, 183, 51, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  contentTypeWarningText: {
    color: '#fff',
    marginLeft: 8,
    flex: 1,
    fontSize: 14,
  },
  highlightText: {
    fontWeight: 'bold',
    color: '#F7B733',
  },
  enhancedContentScrollview: {
    maxHeight: 400,
  },
  enhancedContentText: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 24,
    marginBottom: 12,
  },
  mealPlanSection: {
    marginTop: 20,
  },
  mealPlanContainer: {
    backgroundColor: 'rgba(79, 91, 213, 0.1)',
    borderRadius: 12,
    padding: 16,
  },
  mealPlanText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 22,
  },
  suggestionsSection: {
    marginTop: 20,
    marginBottom: 16,
  },
  suggestionsContainer: {
    backgroundColor: 'rgba(150, 47, 191, 0.1)',
    borderRadius: 12,
    padding: 16,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  suggestionText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 14,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'rgba(109, 109, 138, 0.2)',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginRight: 8,
  },
  cancelButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  confirmButton: {
    flex: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  confirmButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingContainer: {
    backgroundColor: 'rgba(26, 26, 34, 0.8)',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 16,
    fontSize: 16,
  },
});

export default GroceryScreen; 