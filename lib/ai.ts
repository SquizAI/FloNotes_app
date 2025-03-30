import { OpenAI } from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Constants from 'expo-constants';
import { Alert, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

// Debug helpers to diagnose API key issues
const logAPIKeyStatus = (keyName: string, key: string | undefined) => {
  if (!key) {
    console.warn(`⚠️ ${keyName} is missing or empty`);
    return;
  }
  
  // Only log first few characters for security
  const sanitizedKey = key.substring(0, 10) + '...[truncated]';
  console.log(`✅ ${keyName} is set: ${sanitizedKey}`);
};

// IMPORTANT: API keys handling with fallbacks
// Get API keys from environment variables with multiple fallback options
// In React Native, Constants.expoConfig.extra is the most reliable source
const OPENAI_API_KEY = 
  (Constants.expoConfig?.extra?.OPENAI_API_KEY as string) || 
  process.env.OPENAI_API_KEY || 
  '';

const GOOGLE_AI_API_KEY = 
  (Constants.expoConfig?.extra?.GOOGLE_AI_API_KEY as string) || 
  process.env.GOOGLE_AI_API_KEY || 
  '';

const DEEPGRAM_API_KEY = 
  (Constants.expoConfig?.extra?.DEEPGRAM_API_KEY as string) || 
  process.env.DEEPGRAM_API_KEY || 
  '';

// Validate API keys - if missing, show a meaningful warning
const validateAPIKeys = () => {
  console.log("Validating API keys...");
  
  // Log status of each key for debugging
  logAPIKeyStatus('OPENAI_API_KEY', OPENAI_API_KEY);
  logAPIKeyStatus('GOOGLE_AI_API_KEY', GOOGLE_AI_API_KEY);
  logAPIKeyStatus('DEEPGRAM_API_KEY', DEEPGRAM_API_KEY);
  
  if (!OPENAI_API_KEY || OPENAI_API_KEY.includes('your-actual-openai-api-key')) {
    console.warn('⚠️ OpenAI API key is missing. Features requiring OpenAI will not work.');
    console.log('Constants.expoConfig?.extra:', JSON.stringify(Constants.expoConfig?.extra, null, 2));
    if (Platform.OS !== 'web') {
      Alert.alert('API Key Missing', 'OpenAI API key is not configured. Please add it to your .env file.');
    }
    return false;
  }
  
  return true;
};

// Create OpenAI client with API key
// Note: For production, the API key should be stored in environment variables
export const openai = new OpenAI({
  dangerouslyAllowBrowser: true,
  apiKey: OPENAI_API_KEY,
});

// Initialize Google Generative AI with Gemini 1.5 Flash model
const genAI = new GoogleGenerativeAI(GOOGLE_AI_API_KEY);
const geminiModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

// Deepgram API key for speech-to-text
const DEEPGRAM_KEY = DEEPGRAM_API_KEY;

// Validate keys on module load
validateAPIKeys();

// Define schema for task extraction
const taskExtractionSchema = {
  name: "task_extraction",
  schema: {
    type: "object",
    properties: {
      tasks: {
        type: "array",
        items: {
          type: "object",
          properties: {
            text: { type: "string" },
            done: { type: "boolean" }
          },
          required: ["text", "done"],
          additionalProperties: false
        }
      },
      intent: {
        type: "string",
        enum: ["new", "append"]
      },
      reason: { type: "string" }
    },
    required: ["tasks", "intent", "reason"],
    additionalProperties: false
  },
  strict: true
};

// Define schema for note categorization
const categorizeTasksSchema = {
  name: "categorize_tasks",
  schema: {
    type: "object",
    properties: {
      tasks: {
        type: "array",
        items: {
          type: "object",
          properties: {
            text: { type: "string" },
            done: { type: "boolean" },
            category: { type: "string" }
          },
          required: ["text", "done", "category"],
          additionalProperties: false
        }
      },
      noteGroups: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            category: { type: "string" },
            taskIndices: {
              type: "array",
              items: { type: "integer" }
            }
          },
          required: ["title", "category", "taskIndices"],
          additionalProperties: false
        }
      },
      reasoning: { type: "string" }
    },
    required: ["tasks", "noteGroups", "reasoning"],
    additionalProperties: false
  },
  strict: true
};

// Define schema for grocery list
const groceryListSchema = {
  name: "grocery_list",
  schema: {
    type: "object",
    properties: {
      categories: {
        type: "object",
        properties: {
          produce: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                quantity: { type: "string" },
                done: { type: "boolean" }
              },
              required: ["name", "quantity", "done"],
              additionalProperties: false
            }
          },
          dairy: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                quantity: { type: "string" },
                done: { type: "boolean" }
              },
              required: ["name", "quantity", "done"],
              additionalProperties: false
            }
          },
          meat: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                quantity: { type: "string" },
                done: { type: "boolean" }
              },
              required: ["name", "quantity", "done"],
              additionalProperties: false
            }
          },
          bakery: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                quantity: { type: "string" },
                done: { type: "boolean" }
              },
              required: ["name", "quantity", "done"],
              additionalProperties: false
            }
          },
          pantry: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                quantity: { type: "string" },
                done: { type: "boolean" }
              },
              required: ["name", "quantity", "done"],
              additionalProperties: false
            }
          },
          other: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                quantity: { type: "string" },
                done: { type: "boolean" }
              },
              required: ["name", "quantity", "done"],
              additionalProperties: false
            }
          }
        },
        additionalProperties: false,
        required: ["produce", "dairy", "meat", "bakery", "pantry", "other"]
      }
    },
    required: ["categories"],
    additionalProperties: false
  },
  strict: true
};

// Define schema for recipe details
const recipeDetailsSchema = {
  name: "recipe_details",
  schema: {
    type: "object",
    properties: {
      title: { type: "string" },
      ingredients: {
        type: "array",
        items: { type: "string" }
      },
      instructions: {
        type: "array",
        items: { type: "string" }
      },
      prepTime: { type: "string" },
      cookTime: { type: "string" },
      servings: { type: "integer" }
    },
    required: ["title", "ingredients", "instructions", "prepTime", "cookTime", "servings"],
    additionalProperties: false
  },
  strict: true
};

/**
 * Extracts tasks from text and determines if it should be a new note or appended
 * Using GPT-4o for improved accuracy and efficiency with structured output
 */
export async function extractTasksFromText(text: string) {
  try {
    // Use GPT-4o with structured output
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-2024-08-06",
      messages: [
        {
          role: 'system',
          content: 'Analyze the text and determine if it should be a new note or added to an existing note. Extract tasks from the text and return them in the specified JSON format.'
        },
        { role: 'user', content: text }
      ],
      response_format: {
        type: "json_schema",
        json_schema: taskExtractionSchema
      }
    });

    // Parse the JSON response
    const result = JSON.parse(completion.choices[0].message.content);
    return result;
  } catch (error) {
    console.error('Error extracting tasks:', error);
    return { tasks: [], intent: 'new', reason: 'Error processing text' };
  }
}

/**
 * Categorizes tasks and suggests note groupings
 * @param text The input text containing tasks and potential notes
 */
export async function categorizeTasksAndSuggestNotes(text: string): Promise<{
  tasks: Array<{ text: string; done: boolean; category: string; id?: string }>;
  noteGroups: Array<{ title: string; category: string; taskIndices: number[] }>;
  reasoning: string;
}> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-2024-08-06",
      messages: [
        {
          role: 'system',
          content: `Analyze the following text and:
          1. Extract tasks and categorize them (e.g., "work", "personal", "shopping", etc.)
          2. Suggest logical groupings for these tasks into note sections
          3. Return a structured JSON response matching the specified schema.`
        },
        { role: 'user', content: text }
      ],
      response_format: {
        type: "json_schema",
        json_schema: categorizeTasksSchema
      }
    });

    // Parse the JSON response
    const result = JSON.parse(completion.choices[0].message.content);
    return result;
  } catch (error) {
    console.error('Error categorizing tasks:', error);
    return {
      tasks: [],
      noteGroups: [],
      reasoning: 'Error processing text',
    };
  }
}

/**
 * Identifies the type of content in the text (grocery list, task list, recipe, etc.)
 * @param text The input text to analyze
 * @returns An object with content type and confidence level
 */
export async function identifyContentType(text: string): Promise<{
  contentType: 'grocery_list' | 'task_list' | 'recipe' | 'note' | 'project' | 'unknown';
  confidence: number;
  reasoning: string;
}> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini-2024-07-18",
      messages: [
        {
          role: 'system',
          content: `You are an AI assistant that identifies the type of content in text. Analyze the provided text and determine if it's:
          - A grocery list (contains food items to buy)
          - A task list (contains action items or to-dos)
          - A recipe (contains cooking instructions and ingredients)
          - A project (contains multiple related tasks with goals)
          - A general note (general information that doesn't fit other categories)
          Return your analysis with a confidence score (0-1) and brief reasoning.`
        },
        { role: 'user', content: text }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(completion.choices[0].message.content);
    return {
      contentType: result.contentType || 'unknown',
      confidence: result.confidence || 0,
      reasoning: result.reasoning || ''
    };
  } catch (error) {
    console.error('Error identifying content type:', error);
    return {
      contentType: 'unknown',
      confidence: 0,
      reasoning: 'Error during content type identification'
    };
  }
}

/**
 * Enhances grocery content before structured parsing
 * @param text The input text to enhance
 * @returns Enhanced text with more details for grocery items
 */
export async function enhanceGroceryContent(text: string): Promise<{
  enhancedText: string;
  mealPlan?: string;
  suggestions?: string[];
}> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-2024-05-13", // Using full model for better enhancement
      messages: [
        {
          role: 'system',
          content: `You are a grocery list assistant. Your job is to enhance the user's grocery request by:
          
          1. Adding specific quantities if missing (e.g., "2 lb ground beef" instead of just "ground beef")
          2. Organizing items into logical groups
          3. Suggesting additional items that might be needed based on the context
          4. If the text implies meal planning, include a brief meal plan outline
          
          Return the enhanced text that could later be parsed into a structured grocery list.`
        },
        { role: 'user', content: text }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(completion.choices[0].message.content);
    return {
      enhancedText: result.enhancedText || text,
      mealPlan: result.mealPlan,
      suggestions: result.suggestions
    };
  } catch (error) {
    console.error('Error enhancing grocery content:', error);
    return {
      enhancedText: text
    };
  }
}

/**
 * Extract grocery items from text and organize them by category
 * @param text The input text containing grocery items
 */
export async function extractGroceryList(text: string) {
  try {
    console.log('Extracting grocery list from:', text.substring(0, 50) + '...');
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini-2024-07-18", // Using mini model for simpler task
      messages: [
        {
          role: 'system',
          content: `You are a grocery list organizer. Analyze the text and extract grocery items, organizing them by category (produce, dairy, meat, bakery, pantry, other). 
          
          For each item, include:
          - name (required)
          - quantity (required - use "1" if not specified)
          - done: false (all items start as not done)
          
          Return a structured grocery list with items categorized.`
        },
        { role: 'user', content: text }
      ],
      response_format: {
        type: "json_schema",
        json_schema: groceryListSchema
      }
    });

    // Parse the JSON response
    const result = JSON.parse(completion.choices[0].message.content);
    console.log('Successfully extracted grocery list');
    return result;
  } catch (error) {
    console.error('Error extracting grocery list:', error);
    // Return a valid empty list that matches the schema
    return {
      categories: {
        produce: [],
        dairy: [],
        meat: [],
        bakery: [],
        pantry: [],
        other: []
      }
    };
  }
}

/**
 * Generates recipe details from text
 * @param text The input text describing a recipe request
 * @param title The title of the recipe
 */
export async function generateRecipeDetails(text: string, title: string) {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-2024-08-06",
      messages: [
        {
          role: 'system',
          content: `You are a recipe generator. Create a detailed recipe based on the user's request for "${title}". Include ingredients, step-by-step instructions, prep time, cook time, and servings.`
        },
        { role: 'user', content: text }
      ],
      response_format: {
        type: "json_schema",
        json_schema: recipeDetailsSchema
      }
    });

    // Parse the JSON response
    const result = JSON.parse(completion.choices[0].message.content);
    return result;
  } catch (error) {
    console.error('Error generating recipe details:', error);
    return {
      title: title || 'Recipe',
      ingredients: [],
      instructions: [],
      prepTime: '30 mins',
      cookTime: '45 mins',
      servings: 4
    };
  }
}

/**
 * Generates a project summary from a collection of notes
 * @param notes Array of note contents to summarize
 */
export async function generateProjectSummary(notes: string[]) {
  try {
    const combinedNotes = notes.join('\n\n---\n\n');
    
    const response = await geminiModel.generateContent(`
      Please analyze these notes and generate a comprehensive project summary:
      
      ${combinedNotes}
      
      Include key themes, action items, and insights. Format your response with clear headings and bullet points.
    `);
    
    return response.response.text();
  } catch (error) {
    console.error('Error generating project summary:', error);
    return 'Could not generate project summary. Please try again later.';
  }
}

/**
 * Transcribes audio to text using Deepgram
 * @param audioBlob Audio data blob to transcribe
 */
export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  try {
    // Safety check for the audioBlob
    if (!audioBlob || typeof audioBlob !== 'object') {
      console.error('Invalid audio blob received:', audioBlob);
      throw new Error('Invalid audio data received');
    }
    
    console.log('Starting transcription with blob size:', audioBlob.size, 'and type:', audioBlob.type);
    
    // Convert blob to array buffer
    let arrayBuffer;
    try {
      arrayBuffer = await audioBlob.arrayBuffer();
      console.log('Successfully converted blob to array buffer of size:', arrayBuffer.byteLength);
    } catch (error) {
      console.error('Error converting blob to array buffer:', error);
      throw new Error('Failed to process audio data');
    }
    
    // Make API request to Deepgram - using raw ArrayBuffer which is what they prefer
    try {
      const response = await fetch('https://api.deepgram.com/v1/listen?model=nova-2&detect_language=true&mimetype=audio/m4a', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${DEEPGRAM_KEY}`,
          'Content-Type': 'audio/m4a'
        },
        body: arrayBuffer, // Send the raw ArrayBuffer
      });
      
      console.log('Deepgram API response status:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Deepgram API error:', errorText);
        throw new Error(`Transcription failed: ${response.status} - ${errorText || response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Deepgram API response structure:', Object.keys(data));
      console.log('Response has results:', !!data.results);
      
      if (!data || !data.results || !data.results.channels || 
          !data.results.channels[0] || !data.results.channels[0].alternatives || 
          !data.results.channels[0].alternatives[0]) {
        console.error('Unexpected response format from Deepgram:', JSON.stringify(data));
        throw new Error('Invalid response from transcription service');
      }
      
      return data.results.channels[0].alternatives[0].transcript || '';
    } catch (fetchError) {
      console.error('Error making API request to Deepgram:', fetchError);
      throw fetchError;
    }
  } catch (error) {
    console.error('Error transcribing audio:', error);
    return '';
  }
}

/**
 * Alternative implementation that transcribes audio using URI directly
 * This is often the most reliable method in React Native
 * @param audioUri URI of the audio file to transcribe
 */
export async function transcribeAudioUri(audioUri: string): Promise<string> {
  try {
    // Safety check for the URI
    if (!audioUri || typeof audioUri !== 'string') {
      console.error('Invalid audio URI received');
      throw new Error('Invalid audio URI');
    }
    
    console.log('Starting transcription with direct URI approach:', audioUri);
    
    // Test API key validity
    if (!DEEPGRAM_KEY || DEEPGRAM_KEY.length < 10) {
      console.error('Invalid Deepgram API key');
      throw new Error('Invalid Deepgram API key');
    }
    
    // Get file info
    const fileInfo = await FileSystem.getInfoAsync(audioUri);
    console.log('File info for direct URI method:', JSON.stringify(fileInfo));
    
    if (!fileInfo.exists) {
      throw new Error('Audio file does not exist');
    }
    
    // Read the file as binary
    const fileContent = await FileSystem.readAsStringAsync(audioUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    // Create FormData for upload
    const formData = new FormData();
    
    // Create a file to append to FormData
    const fileUriParts = audioUri.split('/');
    const fileName = fileUriParts[fileUriParts.length - 1];
    
    // Create file object
    const fileObj = {
      uri: audioUri,
      name: fileName,
      type: 'audio/m4a',
    };
    
    // @ts-ignore - FormData append has issues with TypeScript but works at runtime
    formData.append('audio', fileObj);
    
    console.log('Sending request to Deepgram with FormData');
    
    const response = await fetch('https://api.deepgram.com/v1/listen?model=nova-2&detect_language=true', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${DEEPGRAM_KEY}`,
        'Content-Type': 'multipart/form-data',
      },
      body: formData,
    });
    
    console.log('Deepgram API URI method response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Deepgram API error (URI method):', errorText);
      throw new Error(`Transcription failed: ${response.status} - ${errorText || response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Deepgram API response from URI method:', Object.keys(data));
    
    if (!data?.results?.channels?.[0]?.alternatives?.[0]?.transcript) {
      console.error('Invalid response format (URI method):', JSON.stringify(data));
      throw new Error('Invalid response from transcription service');
    }
    
    return data.results.channels[0].alternatives[0].transcript || '';
  } catch (error) {
    console.error('Error transcribing audio with URI method:', error);
    return '';
  }
}

/**
 * Extracts key terms from a collection of notes
 * @param notes Array of note contents to analyze
 */
export async function extractKeyTerms(notes: string[]): Promise<string[]> {
  try {
    const combinedNotes = notes.join('\n\n');
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini-2024-07-18", // Using mini model for simpler task
      messages: [
        {
          role: 'system',
          content: 'Extract key technical terms, names, and specific jargon from the following notes. Return only a JSON array of strings - no explanation needed.'
        },
        { role: 'user', content: combinedNotes }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(completion.choices[0].message.content!);
    return result.terms || [];
  } catch (error) {
    console.error('Error extracting key terms:', error);
    return [];
  }
}

/**
 * Transcribes audio with context from key terms for better accuracy
 * @param audioBlob Audio data blob to transcribe
 * @param keyTerms Array of key terms to help with transcription accuracy
 */
export async function transcribeAudioWithKeyTerms(audioBlob: Blob, keyTerms: string[]): Promise<string> {
  try {
    // First get basic transcription
    const basicTranscript = await transcribeAudio(audioBlob);
    
    // Then enhance with key terms
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-2024-08-06",
      messages: [
        {
          role: 'system',
          content: `You are a specialized transcription correction system. Correct the following transcription, paying special attention to the key terms provided. Make sure these terms are properly recognized and spelled correctly if they appear in the audio.
          
          Key terms: ${keyTerms.join(', ')}`
        },
        { role: 'user', content: basicTranscript }
      ]
    });
    
    return completion.choices[0].message.content || basicTranscript;
  } catch (error) {
    console.error('Error transcribing audio with key terms:', error);
    return await transcribeAudio(audioBlob); // Fall back to basic transcription
  }
}

// Define schema for task suggestions
const suggestTasksSchema = {
  name: "task_suggestions",
  schema: {
    type: "object",
    properties: {},
    required: [],
    additionalProperties: true // We dynamically create this schema based on categories
  },
  strict: true
};

/**
 * Suggests additional tasks based on existing tasks and categories
 * @param existingTasks Array of existing tasks with their categories
 * @param categories Array of valid categories to use for suggestions
 */
export async function suggestTasks(
  existingTasks: Array<{ text: string; category: string }>,
  categories: string[]
): Promise<{ [category: string]: Array<{ text: string; done: boolean }> }> {
  try {
    // Format existing tasks for the API
    const formattedTasks = existingTasks.map(t => `- ${t.text} [${t.category}]`).join('\n');
    
    // Dynamically build schema based on categories
    const schema = {
      ...suggestTasksSchema,
      schema: {
        type: "object",
        properties: {},
        required: categories,
        additionalProperties: false
      }
    };
    
    // Add each category to the schema
    for (const category of categories) {
      schema.schema.properties[category] = {
        type: "array",
        items: {
          type: "object",
          properties: {
            text: { type: "string" },
            done: { type: "boolean" }
          },
          required: ["text", "done"],
          additionalProperties: false
        }
      };
    }
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-2024-08-06",
      messages: [
        {
          role: 'system',
          content: `Based on the following tasks, suggest 2-3 additional tasks for each category that would complement the user's objectives. Return a JSON object where keys are categories and values are arrays of new task objects with "text" and "done" properties.
          
          Available categories: ${categories.join(', ')}
          
          Existing tasks:
          ${formattedTasks}`
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: schema
      }
    });
    
    // Parse the JSON response
    const result = JSON.parse(completion.choices[0].message.content);
    
    // Validate all returned categories exist in our list
    const suggestions: { [category: string]: Array<{ text: string; done: boolean }> } = {};
    
    for (const category of categories) {
      if (result[category]) {
        suggestions[category] = result[category];
      } else {
        suggestions[category] = [];
      }
    }
    
    return suggestions;
  } catch (error) {
    console.error('Error suggesting tasks:', error);
    
    // Return empty suggestions for each category on error
    const emptySuggestions: { [category: string]: Array<{ text: string; done: boolean }> } = {};
    categories.forEach(category => {
      emptySuggestions[category] = [];
    });
    
    return emptySuggestions;
  }
}

/**
 * Enhances transcribed text with better formatting and structure
 * @param text The raw transcribed text to enhance
 */
export async function enhanceTranscribedText(text: string): Promise<string> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-2024-08-06",
      messages: [
        {
          role: 'system',
          content: `You are a specialized assistant that improves transcribed speech. Enhance the following transcription by:
          
          1. Fixing grammatical errors and run-on sentences
          2. Adding proper punctuation and formatting
          3. Organizing into paragraphs where appropriate
          4. Identifying and highlighting key points with bullet points
          5. Preserving all original meaning and information
          
          Return only the enhanced text without explanation.`
        },
        { role: 'user', content: text }
      ]
    });

    return completion.choices[0].message.content || text;
  } catch (error) {
    console.error('Error enhancing transcribed text:', error);
    return text; // Return original text if enhancement fails
  }
}

/**
 * Returns the initialized OpenAI client
 */
export function getOpenAI(): OpenAI | null {
  return openai || null;
}

export default {
  extractTasksFromText,
  categorizeTasksAndSuggestNotes,
  extractGroceryList,
  generateRecipeDetails,
  transcribeAudio,
  transcribeAudioUri,
  extractKeyTerms,
  transcribeAudioWithKeyTerms,
  suggestTasks,
  enhanceTranscribedText,
  generateProjectSummary,
  getOpenAI
}; 