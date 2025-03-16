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
} from 'react-native';
import { extractTasksFromText, categorizeTasksAndSuggestNotes, openai } from '../../lib/ai';

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
              done: task.done,
            });
          }
        });
      }
    });
    
    // Remove empty categories
    Object.keys(groceryItems).forEach(category => {
      if (groceryItems[category].length === 0) {
        delete groceryItems[category];
      }
    });
    
    setUnifiedGroceryList(groceryItems);
  }, [notes]);

  // Categorize a food item into the appropriate grocery section
  const categorizeFoodItem = (item: string): string => {
    item = item.toLowerCase();
    
    // Very basic categorization - in a real app, this would use a more sophisticated approach
    if (item.includes('fruit') || item.includes('vegetable') || 
        item.includes('lettuce') || item.includes('tomato') || 
        item.includes('onion') || item.includes('potato')) {
      return 'produce';
    } else if (item.includes('milk') || item.includes('cheese') || 
              item.includes('yogurt') || item.includes('butter') || 
              item.includes('cream')) {
      return 'dairy';
    } else if (item.includes('chicken') || item.includes('beef') || 
              item.includes('pork') || item.includes('turkey')) {
      return 'meat';
    } else if (item.includes('fish') || item.includes('shrimp') || 
              item.includes('salmon') || item.includes('tuna')) {
      return 'seafood';
    } else if (item.includes('frozen') || item.includes('ice cream')) {
      return 'frozen';
    } else if (item.includes('flour') || item.includes('sugar') || 
              item.includes('oil') || item.includes('pasta') || 
              item.includes('can') || item.includes('sauce')) {
      return 'pantry';
    } else if (item.includes('bread') || item.includes('bagel') || 
              item.includes('muffin') || item.includes('bakery')) {
      return 'bakery';
    } else if (item.includes('juice') || item.includes('soda') || 
              item.includes('water') || item.includes('coffee') || 
              item.includes('tea')) {
      return 'beverages';
    } else if (item.includes('chip') || item.includes('cookie') || 
              item.includes('crackers') || item.includes('nuts')) {
      return 'snacks';
    } else if (item.includes('spice') || item.includes('herb') || 
              item.includes('salt') || item.includes('pepper') || 
              item.includes('seasoning')) {
      return 'spices';
    }
    
    return 'other';
  };

  // Share unified grocery list
  const shareGroceryList = async () => {
    let message = "Shopping List:\n\n";
    
    Object.keys(unifiedGroceryList).forEach(category => {
      if (unifiedGroceryList[category].length > 0) {
        message += `${category.toUpperCase()}:\n`;
        
        unifiedGroceryList[category].forEach(item => {
          message += `- ${item.text}${item.recipeSource ? ` (for ${item.recipeSource})` : ''}\n`;
        });
        
        message += '\n';
      }
    });
    
    try {
      await Share.share({
        message,
        title: 'My Shopping List'
      });
    } catch (error) {
      console.error('Error sharing grocery list:', error);
      Alert.alert('Error', 'Failed to share grocery list');
    }
  };

  // Detect if text is likely a recipe request
  const isRecipeRequest = (text: string): boolean => {
    const lowerText = text.toLowerCase();
    return lowerText.includes('recipe') || 
           lowerText.includes('how to make') || 
           lowerText.includes('how do i make') || 
           lowerText.includes('ingredients for') ||
           (lowerText.includes('make') && lowerText.includes('cook'));
  };

  // Generate a detailed recipe if needed
  const generateRecipeDetails = async (text: string, title: string) => {
    try {
      console.log('Generating recipe details...');
      const completion = await openai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: `Create a detailed recipe based on the user's request. Return a JSON object with the following structure:
{
  "title": "Recipe title",
  "ingredients": ["ingredient 1", "ingredient 2", ...],
  "instructions": ["step 1", "step 2", ...],
  "prepTime": "preparation time (e.g., 15 minutes)",
  "cookTime": "cooking time (e.g., 30 minutes)",
  "servings": number of servings
}

Ensure that ingredients are listed as individual items with quantities, and steps are detailed and clear.`
          },
          { role: 'user', content: text }
        ],
        model: 'gpt-4o',
        response_format: { type: 'json_object' },
      });

      return JSON.parse(completion.choices[0].message.content!);
    } catch (error) {
      console.error('Error generating recipe details:', error);
      return {
        title,
        ingredients: [],
        instructions: ['Failed to generate recipe instructions'],
        prepTime: 'Unknown',
        cookTime: 'Unknown',
        servings: 0
      };
    }
  };

  // Extract grocery items from text
  const extractGroceryItems = async (text: string) => {
    try {
      const completion = await openai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: `Extract grocery items from the text and return a JSON array of strings, each containing one grocery item with its quantity. Only include actual grocery items, not tasks or other content.`
          },
          { role: 'user', content: text }
        ],
        model: 'gpt-4o',
        response_format: { type: 'json_object' },
      });

      return JSON.parse(completion.choices[0].message.content!).items || [];
    } catch (error) {
      console.error('Error extracting grocery items:', error);
      return [];
    }
  };

  // Enhanced task extraction with recipe and grocery detection
  const handleExtractTasks = async () => {
    if (!inputText.trim()) {
      Alert.alert('Empty Input', 'Please enter some text to extract tasks.');
      return;
    }

    setIsLoading(true);
    try {
      // Check if this is a recipe request
      if (isRecipeRequest(inputText)) {
        // Generate recipe details
        const recipeDetails = await generateRecipeDetails(inputText, "Recipe");
        
        // Create a recipe note
        const recipeNote = {
          id: Math.random().toString(),
          title: recipeDetails.title || "Recipe",
          category: "recipe",
          tasks: [], // Recipe doesn't use regular tasks
          isRecipe: true,
          recipeDetails
        };
        
        setNotes([...notes, recipeNote]);
        
        // Also create a grocery note with ingredients
        if (recipeDetails.ingredients && recipeDetails.ingredients.length > 0) {
          const groceryNote = {
            id: Math.random().toString(),
            title: `Ingredients for ${recipeDetails.title}`,
            category: "grocery",
            tasks: recipeDetails.ingredients.map(ingredient => ({
              text: ingredient,
              done: false,
              category: "grocery"
            }))
          };
          
          setNotes(prevNotes => [...prevNotes, groceryNote]);
        }
        
        setInputText('');
      } else {
        // Check if this is specifically a grocery list
        if (inputText.toLowerCase().includes('grocery') || 
            inputText.toLowerCase().includes('shopping list') || 
            inputText.toLowerCase().includes('buy at store')) {
          
          // Extract grocery items
          const groceryItems = await extractGroceryItems(inputText);
          
          if (groceryItems && groceryItems.length > 0) {
            const groceryNote = {
              id: Math.random().toString(),
              title: "Shopping List",
              category: "grocery",
              tasks: groceryItems.map(item => ({
                text: item,
                done: false,
                category: "grocery"
              }))
            };
            
            setNotes([...notes, groceryNote]);
            setInputText('');
          } else {
            // Fall back to regular categorization
            await processCategorizedTasks();
          }
        } else {
          // Regular task processing
          await processCategorizedTasks();
        }
      }
    } catch (error) {
      console.error('Error in task extraction:', error);
      
      // Fallback to basic extraction
      try {
        console.log('Falling back to basic extraction...');
        const basicResult = await extractTasksFromText(inputText);
        
        if (basicResult && basicResult.tasks) {
          const newNote = {
            id: Math.random().toString(),
            title: 'Tasks',
            category: 'general',
            tasks: basicResult.tasks.map((task: any) => ({
              ...task,
              category: 'general'
            }))
          };
          
          setNotes([...notes, newNote]);
          setInputText('');
        }
      } catch (fallbackError) {
        Alert.alert(
          'Extraction Error',
          'There was a problem extracting tasks. Please check your API key or try again later.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Process text with the categorization function
  const processCategorizedTasks = async () => {
    const result = await categorizeTasksAndSuggestNotes(inputText);
    
    if (result && result.tasks && result.noteGroups) {
      // Create notes from the note groups suggested by AI
      const newNotes = result.noteGroups.map(group => {
        // Get tasks for this group
        const noteTasks = group.taskIndices.map(index => result.tasks[index]);
        
        return {
          id: Math.random().toString(),
          title: group.title,
          category: group.category,
          tasks: noteTasks
        };
      });
      
      setNotes([...notes, ...newNotes]);
      setInputText('');
    }
  };

  // Toggle task completion
  const toggleTaskDone = (noteId: string, taskIndex: number) => {
    setNotes(notes.map(note => {
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
    }));
  };

  // Toggle grocery item completion
  const toggleGroceryItemDone = (category: string, index: number) => {
    setUnifiedGroceryList(prev => {
      const updated = {...prev};
      
      if (updated[category] && updated[category][index]) {
        updated[category] = [...updated[category]];
        updated[category][index] = {
          ...updated[category][index],
          done: !updated[category][index].done
        };
      }
      
      return updated;
    });
  };

  // Get icon based on category
  const getTaskIcon = (task: {text: string, category: string}) => {
    return CATEGORY_ICONS[task.category.toLowerCase()] || CATEGORY_ICONS.general;
  };

  // Render a recipe card
  const renderRecipeCard = ({ item }: { item: any }) => {
    if (!item.isRecipe || !item.recipeDetails) {
      return renderNoteCard({ item });
    }
    
    return (
      <View style={styles.recipeCard}>
        <View style={styles.recipeHeader}>
          <Text style={styles.recipeTitle}>{item.title}</Text>
          <Text style={styles.recipeCategory}>RECIPE</Text>
        </View>
        
        <View style={styles.recipeMetadata}>
          <View style={styles.recipeMetaItem}>
            <Text style={styles.recipeMetaLabel}>Prep Time</Text>
            <Text style={styles.recipeMetaValue}>{item.recipeDetails.prepTime}</Text>
          </View>
          <View style={styles.recipeMetaItem}>
            <Text style={styles.recipeMetaLabel}>Cook Time</Text>
            <Text style={styles.recipeMetaValue}>{item.recipeDetails.cookTime}</Text>
          </View>
          <View style={styles.recipeMetaItem}>
            <Text style={styles.recipeMetaLabel}>Servings</Text>
            <Text style={styles.recipeMetaValue}>{item.recipeDetails.servings}</Text>
          </View>
        </View>
        
        <View style={styles.recipeSection}>
          <Text style={styles.recipeSectionTitle}>Ingredients</Text>
          {item.recipeDetails.ingredients.map((ingredient: string, index: number) => (
            <Text key={index} style={styles.recipeIngredient}>• {ingredient}</Text>
          ))}
        </View>
        
        <View style={styles.recipeSection}>
          <Text style={styles.recipeSectionTitle}>Instructions</Text>
          {item.recipeDetails.instructions.map((instruction: string, index: number) => (
            <View key={index} style={styles.recipeInstructionContainer}>
              <Text style={styles.recipeInstructionNumber}>{index + 1}</Text>
              <Text style={styles.recipeInstruction}>{instruction}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  // Render a regular note card
  const renderNoteCard = ({ item }: { item: any }) => (
    <View style={styles.noteCard}>
      <View style={styles.noteHeader}>
        <Text style={styles.noteTitle}>
          {CATEGORY_ICONS[item.category.toLowerCase()] || CATEGORY_ICONS.general} {item.title}
        </Text>
        <Text style={styles.noteCategory}>{item.category}</Text>
      </View>
      
      {item.tasks.map((task: any, index: number) => (
        <TouchableOpacity
          key={index}
          style={styles.taskItem}
          onPress={() => toggleTaskDone(item.id, index)}
        >
          <View style={[styles.taskCheckbox, task.done && styles.taskCheckboxChecked]}>
            {task.done && <View style={styles.taskCheckboxInner} />}
          </View>
          <Text style={[styles.taskText, task.done && styles.taskTextDone]}>
            {getTaskIcon(task)} {task.text}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // Render the unified grocery list card
  const renderGroceryListCard = () => {
    if (Object.keys(unifiedGroceryList).length === 0) return null;
    
    return (
      <View style={styles.groceryListCard}>
        <View style={styles.groceryListHeader}>
          <Text style={styles.groceryListTitle}>
            {CATEGORY_ICONS.grocery} Unified Shopping List
          </Text>
          <TouchableOpacity 
            style={styles.shareButton}
            onPress={shareGroceryList}
          >
            <Text style={styles.shareButtonText}>Share</Text>
          </TouchableOpacity>
        </View>
        
        {Object.keys(unifiedGroceryList).map(category => (
          <View key={category} style={styles.groceryCategory}>
            <Text style={styles.groceryCategoryTitle}>
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </Text>
            
            {unifiedGroceryList[category].map((item, index) => (
              <TouchableOpacity
                key={index}
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

  // Render item for FlatList
  const renderItem = ({ item }: { item: any }) => {
    if (item.isRecipe) {
      return renderRecipeCard({ item });
    } else {
      return renderNoteCard({ item });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>AI Notes</Text>
      </View>

      <View style={styles.card}>
        <TextInput
          style={styles.input}
          placeholder="Enter notes, tasks, recipes, or shopping lists..."
          value={inputText}
          onChangeText={setInputText}
          multiline
          numberOfLines={6}
          placeholderTextColor="#888"
        />

        <TouchableOpacity 
          style={styles.button}
          onPress={handleExtractTasks}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Extract Tasks</Text>
          )}
        </TouchableOpacity>
      </View>

      {Object.keys(unifiedGroceryList).length > 0 && renderGroceryListCard()}

      {notes.length > 0 ? (
        <FlatList
          data={notes}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          style={styles.notesList}
          contentContainerStyle={styles.notesListContent}
        />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            Enter some text above to extract tasks and create notes.
          </Text>
          <Text style={styles.emptyStateSubtext}>
            Try recipes, shopping lists, work tasks, or home to-dos.
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#4F5BD5',
    padding: 16,
    alignItems: 'center',
  },
  headerText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 12,
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#4F5BD5',
    borderRadius: 4,
    padding: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  notesList: {
    flex: 1,
  },
  notesListContent: {
    padding: 16,
    paddingTop: 0,
  },
  // Recipe card styles
  recipeCard: {
    backgroundColor: 'white',
    borderRadius: 8,
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
    borderRadius: 8,
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
  },
  taskTextDone: {
    textDecorationLine: 'line-through',
    color: '#888',
  },
  // Grocery list styles
  groceryListCard: {
    backgroundColor: 'white',
    borderRadius: 8,
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#555',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
}); 