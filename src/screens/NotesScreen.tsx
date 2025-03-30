import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  SafeAreaView,
  FlatList,
  Share,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Dimensions,
} from 'react-native';
import { extractTasksFromText, categorizeTasksAndSuggestNotes, enhanceTranscribedText } from '../../lib/ai';
import AudioRecorder from '../components/AudioRecorder';
import { Ionicons } from '@expo/vector-icons';

// Icons would go here in a real app
const CATEGORY_ICONS: {[key: string]: string} = {
  'grocery': '🛒',
  'recipe': '🍳',
  'shopping': '🛍️',
  'work': '💼',
  'home': '🏠',
  'health': '❤️',
  'fitness': '💪',
  'personal': '👤',
  'general': '📝',
};

// Food categories for organizing shopping lists
const FOOD_CATEGORIES = [
  'produce', 'dairy', 'meat', 'seafood', 'frozen', 'pantry', 
  'bakery', 'beverages', 'snacks', 'spices', 'other'
];

// Get screen dimensions
const { width, height } = Dimensions.get('window');
const isTablet = width >= 768; // Basic check for tablet size

export default function NotesScreen() {
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [notes, setNotes] = useState<Array<{
    id: string;
    title: string;
    category: string;
    tasks: Array<{text: string; done: boolean; category: string}>;
    isRecipe?: boolean;
    recipeDetails?: {
      ingredients: string[];
      instructions: string[];
      prepTime?: string;
      cookTime?: string;
      servings?: number;
    };
  }>>([]);

  // Maintain a unified grocery list
  const [unifiedGroceryList, setUnifiedGroceryList] = useState<{
    [category: string]: Array<{text: string; done: boolean; recipeSource?: string}>;
  }>({});

  // Track if input is expanded
  const [isInputExpanded, setIsInputExpanded] = useState(false);

  // Update unified grocery list whenever notes change
  useEffect(() => {
    buildUnifiedGroceryList();
  }, [notes]);

  // Build a unified grocery list from all recipes and shopping notes
  const buildUnifiedGroceryList = useCallback(() => {
    const groceryItems: {[category: string]: Array<{text: string; done: boolean; recipeSource?: string}>} = {};
    
    // Initialize categories
    FOOD_CATEGORIES.forEach(category => {
      groceryItems[category] = [];
    });

    // Extract grocery items from recipes
    notes.forEach(note => {
      if (note.isRecipe && note.recipeDetails?.ingredients) {
        note.recipeDetails.ingredients.forEach(ingredient => {
          // Determine most likely food category based on ingredient name
          const category = categorizeFoodItem(ingredient);
          
          // Add to the unified list if not already there
          if (!groceryItems[category].some(item => item.text.toLowerCase() === ingredient.toLowerCase())) {
            groceryItems[category].push({
              text: ingredient,
              done: false,
              recipeSource: note.title
            });
          }
        });
      }
      
      // Also add items from dedicated grocery/shopping lists
      if (note.category.toLowerCase() === 'grocery' || note.category.toLowerCase() === 'shopping') {
        note.tasks.forEach(task => {
          // Determine food category for each shopping item
          const category = categorizeFoodItem(task.text);
          
          // Add to unified list if not already there
          if (!groceryItems[category].some(item => item.text.toLowerCase() === task.text.toLowerCase())) {
            groceryItems[category].push({
              text: task.text,
              done: task.done
            });
          }
        });
      }
    });
    
    // Only keep categories with items
    const filledCategories: {[category: string]: Array<{text: string; done: boolean; recipeSource?: string}>} = {};
    
    Object.keys(groceryItems).forEach(category => {
      if (groceryItems[category].length > 0) {
        filledCategories[category] = groceryItems[category];
      }
    });
    
    setUnifiedGroceryList(filledCategories);
  }, [notes]);

  // Simple food categorization logic
  const categorizeFoodItem = (item: string): string => {
    const lowerItem = item.toLowerCase();
    
    // Basic categorization based on keywords
    if (lowerItem.includes('milk') || lowerItem.includes('cheese') || lowerItem.includes('yogurt') || lowerItem.includes('cream')) {
      return 'dairy';
    } else if (lowerItem.includes('apple') || lowerItem.includes('banana') || lowerItem.includes('vegetable') || lowerItem.includes('lettuce') || lowerItem.includes('tomato') || lowerItem.includes('onion')) {
      return 'produce';
    } else if (lowerItem.includes('chicken') || lowerItem.includes('beef') || lowerItem.includes('pork')) {
      return 'meat';
    } else if (lowerItem.includes('fish') || lowerItem.includes('shrimp') || lowerItem.includes('salmon')) {
      return 'seafood';
    } else if (lowerItem.includes('ice') || lowerItem.includes('frozen')) {
      return 'frozen';
    } else if (lowerItem.includes('bread') || lowerItem.includes('bagel') || lowerItem.includes('muffin')) {
      return 'bakery';
    } else if (lowerItem.includes('salt') || lowerItem.includes('pepper') || lowerItem.includes('spice') || lowerItem.includes('herb')) {
      return 'spices';
    } else if (lowerItem.includes('soda') || lowerItem.includes('juice') || lowerItem.includes('water') || lowerItem.includes('drink')) {
      return 'beverages';
    } else if (lowerItem.includes('chip') || lowerItem.includes('cookie') || lowerItem.includes('cracker')) {
      return 'snacks';
    } else if (lowerItem.includes('flour') || lowerItem.includes('sugar') || lowerItem.includes('rice') || lowerItem.includes('pasta') || lowerItem.includes('can')) {
      return 'pantry';
    }
    
    // Default to other
    return 'other';
  };

  // Share the grocery list
  const shareGroceryList = async () => {
    try {
      // Format grocery list for sharing
      let message = "📝 My Grocery List:\n\n";
      
      Object.keys(unifiedGroceryList).forEach(category => {
        if (unifiedGroceryList[category].length > 0) {
          // Add category header
          message += `📌 ${category.toUpperCase()}:\n`;
          
          // Add items
          unifiedGroceryList[category].forEach(item => {
            message += `${item.done ? '✅' : '⬜'} ${item.text}\n`;
            if (item.recipeSource) {
              message += `   (for ${item.recipeSource})\n`;
            }
          });
          
          message += '\n';
        }
      });
      
      await Share.share({
        message: message,
        title: 'My Grocery List'
      });
    } catch (error) {
      console.error('Error sharing grocery list:', error);
      Alert.alert('Error', 'Failed to share grocery list');
    }
  };

  // Detect if the text might be a recipe request
  const isRecipeRequest = (text: string): boolean => {
    const lowerText = text.toLowerCase();
    return (
      lowerText.includes('recipe') ||
      lowerText.includes('cook') ||
      lowerText.includes('bake') ||
      lowerText.includes('how to make')
    );
  };

  // Generate recipe details from text
  const generateRecipeDetails = async (text: string, title: string) => {
    try {
      setIsLoading(true);
      
      const completion = await categorizeTasksAndSuggestNotes(`Recipe for ${text}`);
      
      // Create a recipe object
      let recipeDetails = {
        ingredients: [] as string[],
        instructions: [] as string[],
        prepTime: '30 mins',
        cookTime: '45 mins',
        servings: 4
      };
      
      // Extract information from completion
      if (completion.tasks && completion.tasks.length > 0) {
        // Identify ingredients and instructions
        const ingredientTasks = completion.tasks.filter(task => 
          !task.text.toLowerCase().includes('preheat') && 
          !task.text.toLowerCase().includes('mix') &&
          !task.text.toLowerCase().includes('stir') &&
          !task.text.toLowerCase().includes('cook') &&
          !task.text.toLowerCase().includes('bake')
        );
        
        const instructionTasks = completion.tasks.filter(task => 
          task.text.toLowerCase().includes('preheat') || 
          task.text.toLowerCase().includes('mix') ||
          task.text.toLowerCase().includes('stir') ||
          task.text.toLowerCase().includes('cook') ||
          task.text.toLowerCase().includes('bake')
        );
        
        recipeDetails.ingredients = ingredientTasks.map(task => task.text);
        recipeDetails.instructions = instructionTasks.map(task => task.text);
        
        // If we couldn't identify instructions, use all tasks as ingredients
        if (recipeDetails.instructions.length === 0) {
          recipeDetails.ingredients = completion.tasks.map(task => task.text);
          recipeDetails.instructions = ['Cook according to your preferred method.'];
        }
      }
      
      return recipeDetails;
    } catch (error) {
      console.error('Error generating recipe details:', error);
      Alert.alert('Error', 'Failed to generate recipe details');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Extract grocery items from text
  const extractGroceryItems = async (text: string) => {
    try {
      setIsLoading(true);
      
      // Use the AI to extract grocery items
      const completion = await extractTasksFromText(text);
      
      if (completion.tasks && completion.tasks.length > 0) {
        // Create a new note for the grocery list
        const newNote = {
          id: `note-${Date.now()}`,
          title: 'Grocery List',
          category: 'grocery',
          tasks: completion.tasks.map(task => ({
            ...task,
            category: 'grocery'
          }))
        };
        
        setNotes(prevNotes => [newNote, ...prevNotes]);
        setInputText('');
      }
    } catch (error) {
      console.error('Error extracting grocery items:', error);
      Alert.alert('Error', 'Failed to process grocery list');
    } finally {
      setIsLoading(false);
    }
  };

  // Process dictation result
  const handleDictationResult = async (text: string) => {
    if (!text) return;
    
    try {
      // Enhance the transcribed text
      const enhancedText = await enhanceTranscribedText(text);
      
      // Set the enhanced text in the input field
      setInputText(enhancedText);
      
      // Expand the input field to show the transcribed text
      setIsInputExpanded(true);
    } catch (error) {
      console.error('Error processing dictation:', error);
      // Still set the original text if enhancement fails
      setInputText(text);
      setIsInputExpanded(true);
    }
  };

  // Handle extracting tasks from inputText
  const handleExtractTasks = async () => {
    if (!inputText.trim()) {
      Alert.alert('Empty Input', 'Please enter some text to extract tasks from.');
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Check if this might be a recipe request
      if (isRecipeRequest(inputText)) {
        // Extract recipe title from the text
        const titleMatch = inputText.match(/recipe for ([\w\s]+)/i) || 
                          inputText.match(/how to (make|cook|bake) ([\w\s]+)/i);
        
        let recipeTitle = 'Recipe';
        if (titleMatch) {
          recipeTitle = titleMatch[1] || titleMatch[2] || 'Recipe';
          // Capitalize first letter
          recipeTitle = recipeTitle.charAt(0).toUpperCase() + recipeTitle.slice(1);
        }
        
        // Generate recipe details
        const recipeDetails = await generateRecipeDetails(inputText, recipeTitle);
        
        if (recipeDetails) {
          // Create a new recipe note
          const newRecipe = {
            id: `recipe-${Date.now()}`,
            title: recipeTitle,
            category: 'recipe',
            tasks: [],
            isRecipe: true,
            recipeDetails
          };
          
          setNotes(prevNotes => [newRecipe, ...prevNotes]);
          setInputText('');
        }
      } 
      // Check if this is a grocery list
      else if (inputText.toLowerCase().includes('grocery') || 
               inputText.toLowerCase().includes('shopping') || 
               inputText.toLowerCase().includes('buy')) {
        await extractGroceryItems(inputText);
      }
      // Otherwise, try to categorize tasks
      else {
        await processCategorizedTasks();
      }
    } catch (error) {
      console.error('Error processing input:', error);
      Alert.alert('Error', 'Failed to process input');
    } finally {
      setIsLoading(false);
      setIsInputExpanded(false);
    }
  };

  // Process categorized tasks from input text
  const processCategorizedTasks = async () => {
    try {
      // Get categorized tasks
      const completion = await categorizeTasksAndSuggestNotes(inputText);
      
      if (completion && completion.noteGroups && completion.noteGroups.length > 0) {
        // Create notes based on suggested groupings
        const newNotes = completion.noteGroups.map(group => {
          const groupTasks = group.taskIndices.map(index => completion.tasks[index]);
          
          return {
            id: `note-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            title: group.title,
            category: group.category,
            tasks: groupTasks
          };
        });
        
        setNotes(prevNotes => [...newNotes, ...prevNotes]);
        setInputText('');
      }
    } catch (error) {
      console.error('Error categorizing tasks:', error);
      Alert.alert('Error', 'Failed to categorize tasks');
    }
  };

  // Toggle a task's done status
  const toggleTaskDone = (noteId: string, taskIndex: number) => {
    setNotes(prevNotes => 
      prevNotes.map(note => {
        if (note.id === noteId) {
          const updatedTasks = [...note.tasks];
          updatedTasks[taskIndex] = {
            ...updatedTasks[taskIndex],
            done: !updatedTasks[taskIndex].done
          };
          
          return {
            ...note,
            tasks: updatedTasks
          };
        }
        return note;
      })
    );
  };

  // Toggle a grocery item's done status
  const toggleGroceryItemDone = (category: string, index: number) => {
    setUnifiedGroceryList(prevList => {
      const updatedCategory = [...prevList[category]];
      updatedCategory[index] = {
        ...updatedCategory[index],
        done: !updatedCategory[index].done
      };
      
      return {
        ...prevList,
        [category]: updatedCategory
      };
    });
  };

  // Get an icon for a task category
  const getTaskIcon = (task: {text: string, category: string}) => {
    return CATEGORY_ICONS[task.category.toLowerCase()] || '📝';
  };

  // Render a recipe card
  const renderRecipeCard = ({ item }: { item: any }) => {
    if (!item.isRecipe || !item.recipeDetails) {
      return null;
    }
    
    const { recipeDetails } = item;
    
    return (
      <View style={styles.recipeCard}>
        <View style={styles.recipeHeader}>
          <Text style={styles.recipeTitle}>{item.title}</Text>
          <Text style={styles.recipeCategory}>
            {CATEGORY_ICONS[item.category.toLowerCase()] || '📝'} {item.category}
          </Text>
        </View>
        
        <View style={styles.recipeMetadata}>
          <View style={styles.recipeMetaItem}>
            <Text style={styles.recipeMetaLabel}>Prep Time</Text>
            <Text style={styles.recipeMetaValue}>{recipeDetails.prepTime || '30 mins'}</Text>
          </View>
          <View style={styles.recipeMetaItem}>
            <Text style={styles.recipeMetaLabel}>Cook Time</Text>
            <Text style={styles.recipeMetaValue}>{recipeDetails.cookTime || '45 mins'}</Text>
          </View>
          <View style={styles.recipeMetaItem}>
            <Text style={styles.recipeMetaLabel}>Servings</Text>
            <Text style={styles.recipeMetaValue}>{recipeDetails.servings || 4}</Text>
          </View>
        </View>
        
        <View style={styles.recipeSection}>
          <Text style={styles.recipeSectionTitle}>Ingredients</Text>
          {recipeDetails.ingredients.map((ingredient, index) => (
            <Text key={`ingredient-${index}`} style={styles.recipeIngredient}>
              • {ingredient}
            </Text>
          ))}
        </View>
        
        <View style={styles.recipeSection}>
          <Text style={styles.recipeSectionTitle}>Instructions</Text>
          {recipeDetails.instructions.map((instruction, index) => (
            <View key={`instruction-${index}`} style={styles.recipeInstructionContainer}>
              <Text style={styles.recipeInstructionNumber}>{index + 1}</Text>
              <Text style={styles.recipeInstruction}>{instruction}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  // Render a standard note card
  const renderNoteCard = ({ item }: { item: any }) => (
    <View style={styles.noteCard}>
      <View style={styles.noteHeader}>
        <Text style={styles.noteTitle}>{item.title}</Text>
        <Text style={styles.noteCategory}>
          {CATEGORY_ICONS[item.category.toLowerCase()] || '📝'} {item.category}
        </Text>
      </View>
      
      {item.tasks.map((task: any, index: number) => (
        <TouchableOpacity 
          key={`task-${index}`}
          style={styles.taskItem}
          onPress={() => toggleTaskDone(item.id, index)}
        >
          <View style={[styles.taskCheckbox, task.done && styles.taskCheckboxChecked]}>
            {task.done && <View style={styles.taskCheckboxInner} />}
          </View>
          <Text style={[styles.taskText, task.done && styles.taskTextDone]}>
            {task.text}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // Render the unified grocery list card
  const renderGroceryListCard = () => {
    // Count total items and completed items
    let totalItems = 0;
    let completedItems = 0;
    
    Object.keys(unifiedGroceryList).forEach(category => {
      totalItems += unifiedGroceryList[category].length;
      completedItems += unifiedGroceryList[category].filter(item => item.done).length;
    });
    
    const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
    
    return (
      <View style={styles.groceryListCard}>
        <View style={styles.groceryListHeader}>
          <Text style={styles.groceryListTitle}>
            🛒 Grocery List {totalItems > 0 && `(${completedItems}/${totalItems})`}
          </Text>
          
          <TouchableOpacity 
            style={styles.shareButton}
            onPress={shareGroceryList}
          >
            <Text style={styles.shareButtonText}>Share</Text>
          </TouchableOpacity>
        </View>
        
        {/* Progress bar */}
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: `${progress}%` }]} />
        </View>
        
        {Object.keys(unifiedGroceryList).map(category => (
          <View key={category} style={styles.groceryCategory}>
            <Text style={styles.groceryCategoryTitle}>
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </Text>
            
            {unifiedGroceryList[category].map((item, index) => (
              <TouchableOpacity 
                key={`${category}-item-${index}`}
                style={styles.groceryItem}
                onPress={() => toggleGroceryItemDone(category, index)}
              >
                <View style={[styles.taskCheckbox, item.done && styles.taskCheckboxChecked]}>
                  {item.done && <View style={styles.taskCheckboxInner} />}
                </View>
                
                <View style={styles.groceryItemContent}>
                  <Text style={[styles.groceryItemText, item.done && styles.taskTextDone]}>
                    {item.text}
                  </Text>
                  
                  {item.recipeSource && (
                    <Text style={styles.groceryItemSource}>
                      For: {item.recipeSource}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>
    );
  };

  // Render all notes in a list
  const renderNotesList = () => {
    return notes.map(item => (
      <React.Fragment key={item.id}>
        {item.isRecipe ? renderRecipeCard({ item }) : renderNoteCard({ item })}
      </React.Fragment>
    ));
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.headerText}>AI Notes</Text>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingContainer}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={true}
          bounces={true}
        >
          <View style={styles.card}>
            <TextInput
              style={[styles.input, isInputExpanded && styles.inputExpanded]}
              placeholder="Enter notes, tasks, recipes, or shopping lists..."
              value={inputText}
              onChangeText={setInputText}
              multiline
              numberOfLines={isInputExpanded ? 8 : 4}
              placeholderTextColor="#888"
              onFocus={() => setIsInputExpanded(true)}
            />

            <View style={styles.inputActions}>
              <AudioRecorder 
                onTranscriptionComplete={handleDictationResult}
                isLoading={isLoading}
                setIsLoading={setIsLoading}
              />

              <TouchableOpacity 
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleExtractTasks}
                disabled={isLoading || !inputText.trim()}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.buttonText}>Extract Tasks</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {Object.keys(unifiedGroceryList).length > 0 && renderGroceryListCard()}

          {notes.length > 0 ? (
            <View style={styles.notesContainer}>
              {renderNotesList()}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={60} color="#AAA" />
              <Text style={styles.emptyStateText}>
                No notes yet
              </Text>
              <Text style={styles.emptyStateSubtext}>
                Try dictating your notes or type them in the field above
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#4F5BD5',
    padding: 16,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  headerText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  keyboardAvoidingContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 40, // Add padding at the bottom to ensure content is scrollable past the keyboard
  },
  card: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    backgroundColor: '#fafafa',
  },
  inputExpanded: {
    minHeight: 150,
  },
  inputActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#4F5BD5',
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#a0a0a0',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  notesContainer: {
    padding: 16,
    paddingTop: 0,
  },
  // Recipe card styles
  recipeCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  recipeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  recipeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
    flex: 1,
  },
  recipeCategory: {
    fontSize: 12,
    color: '#4F5BD5',
    backgroundColor: '#EEF0FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
    fontWeight: 'bold',
  },
  recipeMetadata: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  recipeMetaItem: {
    flex: 1,
    alignItems: 'center',
  },
  recipeMetaLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  recipeMetaValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  recipeSection: {
    marginBottom: 16,
  },
  recipeSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  recipeIngredient: {
    fontSize: 14,
    color: '#333',
    paddingVertical: 4,
    paddingLeft: 4,
  },
  recipeInstructionContainer: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingRight: 8,
  },
  recipeInstructionNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4F5BD5',
    color: 'white',
    textAlign: 'center',
    lineHeight: 24,
    marginRight: 8,
    fontSize: 12,
    fontWeight: 'bold',
  },
  recipeInstruction: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    lineHeight: 20,
  },
  // Regular note card styles
  noteCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  noteTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  noteCategory: {
    fontSize: 14,
    color: '#4F5BD5',
    backgroundColor: '#EEF0FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  taskCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#4F5BD5',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskCheckboxChecked: {
    backgroundColor: '#4F5BD5',
  },
  taskCheckboxInner: {
    width: 10,
    height: 10,
    backgroundColor: 'white',
    borderRadius: 2,
  },
  taskText: {
    fontSize: 16,
    flex: 1,
    color: '#333',
  },
  taskTextDone: {
    textDecorationLine: 'line-through',
    color: '#888',
  },
  // Grocery list styles
  groceryListCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    marginTop: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  groceryListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  groceryListTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#eee',
    borderRadius: 4,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  shareButton: {
    backgroundColor: '#4F5BD5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  shareButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  groceryCategory: {
    marginBottom: 12,
  },
  groceryCategoryTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 4,
    paddingBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  groceryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  groceryItemContent: {
    flex: 1,
  },
  groceryItemText: {
    fontSize: 14,
    color: '#333',
  },
  groceryItemSource: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  // Empty state styles
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#555',
    textAlign: 'center',
    marginVertical: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
}); 