import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { OPENAI_API_KEY, GOOGLE_AI_API_KEY, DEEPGRAM_API_KEY } from '@env';

// Create OpenAI client with API key
// Note: For production, the API key should be stored in environment variables
export const openai = new OpenAI({
  dangerouslyAllowBrowser: true,
  apiKey: OPENAI_API_KEY || '',
});

// Initialize Google Generative AI with Gemini 1.5 Flash model
const genAI = new GoogleGenerativeAI(GOOGLE_AI_API_KEY || '');
const geminiModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

// Deepgram API key for speech-to-text
const DEEPGRAM_KEY = DEEPGRAM_API_KEY || '';

/**
 * Extracts tasks from text and determines if it should be a new note or appended
 * Using GPT-4o for improved accuracy and efficiency
 */
export async function extractTasksFromText(text: string) {
  try {
    // First, determine if this should be a new note or added to an existing one
    const intentCompletion = await openai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'Analyze the text and determine if it should be a new note or added to an existing note. Return JSON with "action": "new" or "append", and "reason" explaining why.',
        },
        { role: 'user', content: text },
      ],
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
    });

    const intent = JSON.parse(intentCompletion.choices[0].message.content!);

    // Extract tasks regardless of intent
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'Extract tasks from the following text and return them as a JSON array of tasks with "text" and "done" properties.',
        },
        { role: 'user', content: text },
      ],
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(completion.choices[0].message.content!);
    return {
      tasks: result.tasks || [],
      intent: intent.action,
      reason: intent.reason,
    };
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
      messages: [
        {
          role: 'system',
          content: `Analyze the following text and:
          1. Extract tasks and categorize them (e.g., "work", "personal", "shopping", etc.)
          2. Suggest logical groupings for these tasks into note sections
          3. Return a JSON object with:
             - "tasks": array of objects with "text", "done" (boolean), and "category" properties
             - "noteGroups": array of suggested note groupings with "title", "category", and "taskIndices" (indices of tasks in the tasks array)
             - "reasoning": brief explanation of your categorization`,
        },
        { role: 'user', content: text },
      ],
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(completion.choices[0].message.content!);
    return {
      tasks: result.tasks || [],
      noteGroups: result.noteGroups || [],
      reasoning: result.reasoning || '',
    };
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
    // Convert blob to array buffer
    const arrayBuffer = await audioBlob.arrayBuffer();
    
    // Format for Deepgram API
    const formData = new FormData();
    formData.append('audio', new Blob([arrayBuffer]));
    
    // Make API request to Deepgram
    const response = await fetch('https://api.deepgram.com/v1/listen?model=nova-2', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${DEEPGRAM_KEY}`,
      },
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error(`Transcription failed: ${response.status}`);
    }
    
    const data = await response.json();
    return data.results.channels[0].alternatives[0].transcript || '';
  } catch (error) {
    console.error('Error transcribing audio:', error);
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
      messages: [
        {
          role: 'system',
          content: 'Extract key technical terms, names, and specific jargon from the following notes. Return only a JSON array of strings - no explanation needed.',
        },
        { role: 'user', content: combinedNotes },
      ],
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
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
      messages: [
        {
          role: 'system',
          content: `You are a specialized transcription correction system. Correct the following transcription, paying special attention to the key terms provided. Make sure these terms are properly recognized and spelled correctly if they appear in the audio.
          
          Key terms: ${keyTerms.join(', ')}`,
        },
        { role: 'user', content: basicTranscript },
      ],
      model: 'gpt-4o',
    });
    
    return completion.choices[0].message.content || basicTranscript;
  } catch (error) {
    console.error('Error transcribing audio with key terms:', error);
    return await transcribeAudio(audioBlob); // Fall back to basic transcription
  }
}

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
    
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `Based on the following tasks, suggest 2-3 additional tasks for each category that would complement the user's objectives. Return a JSON object where keys are categories and values are arrays of new task objects with "text" and "done" (always false) properties.
          
          Available categories: ${categories.join(', ')}
          
          Existing tasks:
          ${formattedTasks}`,
        },
      ],
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
    });
    
    const result = JSON.parse(completion.choices[0].message.content!);
    
    // Ensure all returned categories are valid
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
      messages: [
        {
          role: 'system',
          content: `You are a specialized assistant that improves transcribed speech. Enhance the following transcription by:
          
          1. Fixing grammatical errors and run-on sentences
          2. Adding proper punctuation and formatting
          3. Organizing into paragraphs where appropriate
          4. Identifying and highlighting key points with bullet points
          5. Preserving all original meaning and information
          
          Return only the enhanced text without explanation.`,
        },
        { role: 'user', content: text },
      ],
      model: 'gpt-4o',
    });
    
    return completion.choices[0].message.content || text;
  } catch (error) {
    console.error('Error enhancing transcribed text:', error);
    return text; // Return original text if enhancement fails
  }
} 