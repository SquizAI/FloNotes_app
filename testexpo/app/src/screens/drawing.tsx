import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  PanResponder,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

// Simple drawing component without Skia
export default function DrawingScreen() {
  const [color, setColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(5);
  
  // Colors for the palette
  const colors = [
    '#000000', // Black
    '#FF0000', // Red
    '#00FF00', // Green
    '#0000FF', // Blue
    '#FFFF00', // Yellow
    '#FF00FF', // Magenta
    '#00FFFF', // Cyan
    '#FFFFFF', // White
  ];
  
  // Stroke widths for selection
  const strokeWidths = [2, 5, 10, 15, 20];

  const clearCanvas = () => {
    Alert.alert('Canvas cleared', 'The canvas would be cleared in a full implementation.');
  };

  const undoLastStroke = () => {
    Alert.alert('Undo', 'The last stroke would be undone in a full implementation.');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <View style={styles.header}>
        <Text style={styles.title}>Drawing App</Text>
      </View>
      
      <View style={styles.canvasContainer}>
        <View style={styles.canvas}>
          <Text style={styles.canvasText}>
            Drawing canvas would be here in a full implementation.
          </Text>
        </View>
      </View>

      <View style={styles.colorPalette}>
        {colors.map((c, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.colorButton,
              { backgroundColor: c },
              color === c && styles.selectedColor,
            ]}
            onPress={() => setColor(c)}
          />
        ))}
      </View>

      <View style={styles.strokeWidthPalette}>
        {strokeWidths.map((w, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.strokeButton,
              { borderColor: '#000000' },
              strokeWidth === w && { backgroundColor: '#0066CC' },
            ]}
            onPress={() => setStrokeWidth(w)}
          >
            <View
              style={[
                styles.strokeSample,
                {
                  backgroundColor: '#000000',
                  height: w,
                },
              ]}
            />
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#0066CC' }]}
          onPress={undoLastStroke}
        >
          <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>Undo</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#FF9900' }]}
          onPress={clearCanvas}
        >
          <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>Clear</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingTop: 10,
    paddingBottom: 10,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
  },
  canvasContainer: {
    aspectRatio: 1,
    width: '90%',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
    marginHorizontal: 20,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#DDDDDD',
  },
  canvas: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  canvasText: {
    color: '#999999',
    textAlign: 'center',
    padding: 20,
  },
  colorPalette: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginVertical: 10,
  },
  colorButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    margin: 5,
  },
  selectedColor: {
    borderWidth: 2,
    borderColor: '#000',
  },
  strokeWidthPalette: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 10,
  },
  strokeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    margin: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  strokeSample: {
    width: '70%',
    borderRadius: 5,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 10,
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
    marginHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontWeight: 'bold',
  },
}); 