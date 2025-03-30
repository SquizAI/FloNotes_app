import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import TaskList from './TaskList';
import GroceryList from './GroceryList';
import RecipeView from './RecipeView';
import NoteView from './NoteView';

interface ContentTypeDetectorProps {
  content: any;
  title?: string;
  onToggleTask?: (index: number) => void;
  onToggleGroceryItem?: (category: string, index: number) => void;
}

const ContentTypeDetector: React.FC<ContentTypeDetectorProps> = ({ 
  content, 
  title,
  onToggleTask = () => {}, 
  onToggleGroceryItem = () => {} 
}) => {
  // Check if content is null or undefined
  if (!content) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No content to display</Text>
      </View>
    );
  }

  // If content is a string and not JSON, render it as a note
  if (typeof content === 'string') {
    try {
      // Try to parse as JSON first
      JSON.parse(content);
    } catch (e) {
      // If it's not valid JSON, it's likely plain text for a note
      return (
        <View style={styles.container}>
          <NoteView content={content} title={title} />
        </View>
      );
    }
  }

  try {
    // Parse content if it's a string
    const parsedContent = typeof content === 'string' ? JSON.parse(content) : content;
    
    // CASE 1: Task extraction format (has tasks array and intent)
    if (parsedContent.tasks && Array.isArray(parsedContent.tasks) && parsedContent.intent) {
      return (
        <View style={styles.container}>
          <TaskList
            tasks={parsedContent.tasks}
            onToggleTask={onToggleTask}
            showCategories={false}
          />
        </View>
      );
    }
    
    // CASE 2: Categorized tasks format (has tasks and noteGroups)
    if (parsedContent.tasks && Array.isArray(parsedContent.tasks) && 
        parsedContent.noteGroups && Array.isArray(parsedContent.noteGroups)) {
      return (
        <View style={styles.container}>
          <TaskList 
            tasks={parsedContent.tasks}
            noteGroups={parsedContent.noteGroups}
            onToggleTask={onToggleTask}
          />
        </View>
      );
    }
    
    // CASE 3: Grocery list format (has categories object with produce, dairy, etc.)
    if (parsedContent.categories && typeof parsedContent.categories === 'object' &&
        (parsedContent.categories.produce || parsedContent.categories.dairy || 
         parsedContent.categories.pantry)) {
      return (
        <View style={styles.container}>
          <GroceryList 
            data={parsedContent}
            onToggleItem={onToggleGroceryItem}
          />
        </View>
      );
    }
    
    // CASE 4: Recipe format (has title, ingredients, instructions)
    if (parsedContent.title && 
        parsedContent.ingredients && Array.isArray(parsedContent.ingredients) &&
        parsedContent.instructions && Array.isArray(parsedContent.instructions)) {
      return (
        <View style={styles.container}>
          <RecipeView recipe={parsedContent} />
        </View>
      );
    }
    
    // CASE 5: Simple task list (just an array of task objects)
    if (Array.isArray(parsedContent) && 
        parsedContent.length > 0 && 
        parsedContent[0].text !== undefined && 
        parsedContent[0].done !== undefined) {
      return (
        <View style={styles.container}>
          <TaskList 
            tasks={parsedContent}
            onToggleTask={onToggleTask}
          />
        </View>
      );
    }
    
    // CASE 6: Enhanced text content (string with formatting)
    if (typeof parsedContent === 'string' && parsedContent.length > 0) {
      return (
        <View style={styles.container}>
          <NoteView content={parsedContent} title={title} />
        </View>
      );
    }
    
    // CASE 7: Unknown object format, check if it has a 'content' field that's a string
    if (parsedContent.content && typeof parsedContent.content === 'string') {
      return (
        <View style={styles.container}>
          <NoteView 
            content={parsedContent.content} 
            title={parsedContent.title || title} 
          />
        </View>
      );
    }
    
    // CASE 8: Unknown format, just display as pre-formatted text
    return (
      <View style={styles.unknownContainer}>
        <Text style={styles.unknownTitle}>{title || 'Content'}</Text>
        <Text style={styles.unknownText}>
          {typeof parsedContent === 'object' 
            ? JSON.stringify(parsedContent, null, 2)
            : String(parsedContent)
          }
        </Text>
      </View>
    );
  } catch (error) {
    // Handle parsing errors or rendering errors
    console.error('Error in ContentTypeDetector:', error);
    
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>
          Error rendering content: {error.message}
        </Text>
        <Text style={styles.rawContent}>
          {typeof content === 'object' 
            ? JSON.stringify(content, null, 2) 
            : String(content)
          }
        </Text>
      </View>
    );
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorContainer: {
    padding: 16,
    backgroundColor: '#ffebee',
    borderRadius: 8,
    margin: 16,
  },
  errorText: {
    color: '#c62828',
    fontSize: 16,
    marginBottom: 10,
  },
  rawContent: {
    fontFamily: 'monospace',
    fontSize: 14,
    color: '#333',
    padding: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
  },
  unknownContainer: {
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  unknownTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  unknownText: {
    fontFamily: 'monospace',
    fontSize: 14,
    color: '#333',
  },
});

export default ContentTypeDetector; 