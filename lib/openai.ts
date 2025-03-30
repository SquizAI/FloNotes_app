import OpenAI from 'openai';
import Constants from 'expo-constants';

// Get API key from environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || Constants.expoConfig?.extra?.OPENAI_API_KEY || '';

// Initialize the OpenAI client
export const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Only use this in development - in production, use server-side API calls
}); 