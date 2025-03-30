import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

interface NoteViewProps {
  content: string;
  title?: string;
}

const NoteView: React.FC<NoteViewProps> = ({ content, title }) => {
  if (!content) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No content to display</Text>
      </View>
    );
  }

  // Process content to separate paragraphs and lists
  const processContent = (text: string) => {
    const paragraphs = text.split('\n\n');
    
    return paragraphs.map((paragraph, index) => {
      // Check if paragraph is a bullet list
      if (paragraph.includes('\n- ') || paragraph.startsWith('- ')) {
        const listItems = paragraph.split('\n');
        
        return (
          <View key={`p-${index}`} style={styles.listContainer}>
            {listItems.map((item, itemIndex) => {
              if (item.trim().startsWith('- ')) {
                const content = item.trim().substring(2);
                return (
                  <View key={`item-${itemIndex}`} style={styles.listItem}>
                    <Text style={styles.bullet}>•</Text>
                    <Text style={styles.listItemText}>{content}</Text>
                  </View>
                );
              }
              
              // Non-bullet items rendered as regular text
              if (item.trim()) {
                return (
                  <Text key={`text-${itemIndex}`} style={styles.paragraph}>
                    {item}
                  </Text>
                );
              }
              
              return null;
            })}
          </View>
        );
      }
      
      // Check if paragraph is numbered list
      if (paragraph.match(/^\d+\.\s/) || paragraph.includes('\n1. ')) {
        const listItems = paragraph.split('\n');
        
        return (
          <View key={`p-${index}`} style={styles.listContainer}>
            {listItems.map((item, itemIndex) => {
              const match = item.match(/^(\d+)\.\s(.*)$/);
              if (match) {
                const [, number, content] = match;
                return (
                  <View key={`num-${itemIndex}`} style={styles.numberedItem}>
                    <Text style={styles.numberedBullet}>{number}.</Text>
                    <Text style={styles.listItemText}>{content}</Text>
                  </View>
                );
              }
              
              // Non-numbered items rendered as regular text
              if (item.trim()) {
                return (
                  <Text key={`text-${itemIndex}`} style={styles.paragraph}>
                    {item}
                  </Text>
                );
              }
              
              return null;
            })}
          </View>
        );
      }
      
      // Check if paragraph is a heading (starts with # or ##)
      if (paragraph.startsWith('# ')) {
        return (
          <Text key={`h1-${index}`} style={styles.heading1}>
            {paragraph.substring(2)}
          </Text>
        );
      }
      
      if (paragraph.startsWith('## ')) {
        return (
          <Text key={`h2-${index}`} style={styles.heading2}>
            {paragraph.substring(3)}
          </Text>
        );
      }
      
      // Regular paragraph
      return (
        <Text key={`p-${index}`} style={styles.paragraph}>
          {paragraph}
        </Text>
      );
    });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.contentContainer}>
        {title && <Text style={styles.title}>{title}</Text>}
        {processContent(content)}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  contentContainer: {
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  heading1: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginVertical: 12,
  },
  heading2: {
    fontSize: 20,
    fontWeight: '600',
    color: '#444',
    marginVertical: 10,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 24,
    color: '#444',
    marginBottom: 16,
  },
  listContainer: {
    marginBottom: 16,
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingLeft: 8,
    alignItems: 'flex-start',
  },
  numberedItem: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingLeft: 8,
    alignItems: 'flex-start',
  },
  bullet: {
    fontSize: 16,
    marginRight: 8,
    color: '#4F5BD5',
    lineHeight: 24,
  },
  numberedBullet: {
    fontSize: 16,
    marginRight: 8,
    fontWeight: '600',
    color: '#4F5BD5',
    width: 20,
    textAlign: 'right',
    lineHeight: 24,
  },
  listItemText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#444',
    flex: 1,
  },
});

export default NoteView; 