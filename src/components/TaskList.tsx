import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface Task {
  text: string;
  done: boolean;
  category?: string;
  id?: string;
}

export interface TaskGroup {
  title: string;
  category: string;
  taskIndices: number[];
}

interface TaskListProps {
  tasks: Task[];
  noteGroups?: TaskGroup[];
  onToggleTask: (index: number) => void;
  showCategories?: boolean;
}

const TaskList: React.FC<TaskListProps> = ({ 
  tasks, 
  noteGroups, 
  onToggleTask, 
  showCategories = true 
}) => {
  // Return null if no tasks
  if (!tasks || tasks.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="document-text-outline" size={48} color="#ccc" />
        <Text style={styles.emptyText}>No tasks yet</Text>
      </View>
    );
  }

  // If we have note groups, render tasks grouped by them
  if (noteGroups && noteGroups.length > 0 && showCategories) {
    return (
      <ScrollView style={styles.container}>
        {noteGroups.map((group, groupIndex) => (
          <View key={`group-${groupIndex}`} style={styles.groupContainer}>
            <Text style={styles.groupTitle}>{group.title}</Text>
            {group.taskIndices.map((taskIndex) => {
              const task = tasks[taskIndex];
              if (!task) return null;
              
              return (
                <TaskItem 
                  key={`task-${taskIndex}`} 
                  task={task} 
                  onToggle={() => onToggleTask(taskIndex)} 
                />
              );
            })}
          </View>
        ))}
        
        {/* Render tasks that aren't in any group */}
        {tasks.filter((_, index) => 
          !noteGroups.some(group => group.taskIndices.includes(index))
        ).length > 0 && (
          <View style={styles.groupContainer}>
            <Text style={styles.groupTitle}>Other Tasks</Text>
            {tasks.map((task, index) => {
              if (noteGroups.some(group => group.taskIndices.includes(index))) {
                return null;
              }
              return (
                <TaskItem 
                  key={`other-task-${index}`} 
                  task={task} 
                  onToggle={() => onToggleTask(index)} 
                />
              );
            })}
          </View>
        )}
      </ScrollView>
    );
  }

  // Render tasks by category if they have categories
  if (showCategories && tasks.some(task => task.category)) {
    // Group tasks by category
    const categorized: { [key: string]: Task[] } = {};
    
    tasks.forEach((task, index) => {
      const category = task.category || 'Other';
      if (!categorized[category]) {
        categorized[category] = [];
      }
      categorized[category].push({
        ...task,
        id: index.toString() // Store original index as id
      });
    });
    
    return (
      <ScrollView style={styles.container}>
        {Object.entries(categorized).map(([category, categoryTasks]) => (
          <View key={`category-${category}`} style={styles.groupContainer}>
            <Text style={styles.groupTitle}>{category}</Text>
            {categoryTasks.map((task) => (
              <TaskItem 
                key={`cat-task-${task.id}`} 
                task={task} 
                onToggle={() => onToggleTask(parseInt(task.id || '0'))} 
              />
            ))}
          </View>
        ))}
      </ScrollView>
    );
  }

  // Render flat list of tasks
  return (
    <ScrollView style={styles.container}>
      <View style={styles.flatListContainer}>
        {tasks.map((task, index) => (
          <TaskItem 
            key={`flat-task-${index}`} 
            task={task} 
            onToggle={() => onToggleTask(index)} 
          />
        ))}
      </View>
    </ScrollView>
  );
};

// Task item component for reuse
const TaskItem: React.FC<{ 
  task: Task; 
  onToggle: () => void;
}> = ({ task, onToggle }) => {
  return (
    <View style={styles.taskItem}>
      <TouchableOpacity 
        style={styles.checkbox}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <Ionicons 
          name={task.done ? 'checkbox' : 'square-outline'} 
          size={22} 
          color={task.done ? '#4F5BD5' : '#7c7c7c'} 
        />
      </TouchableOpacity>
      <Text style={[
        styles.taskText,
        task.done && styles.taskTextCompleted,
      ]}>
        {task.text}
      </Text>
      {task.category && (
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{task.category}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: '#999',
  },
  flatListContainer: {
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
  groupContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    margin: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  groupTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    color: '#333',
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  checkbox: {
    marginRight: 12,
  },
  taskText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  taskTextCompleted: {
    textDecorationLine: 'line-through',
    color: '#aaa',
  },
  categoryBadge: {
    backgroundColor: '#e8eaf6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  categoryText: {
    fontSize: 12,
    color: '#4F5BD5',
  }
});

export default TaskList; 