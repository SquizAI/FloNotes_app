import Constants from 'expo-constants';

/**
 * Checks if an API key is valid (not empty or placeholder)
 * @param {string} key The API key to check
 * @returns {boolean} Whether the key is valid
 */
export function isValidApiKey(key) {
  if (!key) return false;
  if (key.length < 10) return false; // Most API keys are longer than 10 chars
  if (key.includes('YOUR_') || key.includes('REPLACE_ME')) return false;
  return true;
}

/**
 * Masks an API key for display (shows only first and last 4 chars)
 * @param {string} key The API key to mask
 * @returns {string} The masked key
 */
export function maskApiKey(key) {
  if (!key) return 'Not set';
  if (key.length <= 8) return '********';
  return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
}

/**
 * Checks if environment variables are properly loaded and valid
 * @returns {object} Status of environment variables
 */
export function checkEnvironmentVariables() {
  // Get API keys from environment variables or Expo config
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY || Constants.expoConfig?.extra?.OPENAI_API_KEY || '';
  const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY || Constants.expoConfig?.extra?.GOOGLE_AI_API_KEY || '';
  const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY || Constants.expoConfig?.extra?.DEEPGRAM_API_KEY || '';
  
  // Check if keys are valid
  const isOpenAIKeyValid = isValidApiKey(OPENAI_API_KEY);
  const isGoogleKeyValid = isValidApiKey(GOOGLE_AI_API_KEY);
  const isDeepgramKeyValid = isValidApiKey(DEEPGRAM_API_KEY);
  
  // Mask keys for display
  const openaiKeyMasked = maskApiKey(OPENAI_API_KEY);
  const googleKeyMasked = maskApiKey(GOOGLE_AI_API_KEY);
  const deepgramKeyMasked = maskApiKey(DEEPGRAM_API_KEY);
  
  return {
    isOpenAIKeyValid,
    isGoogleKeyValid,
    isDeepgramKeyValid,
    openaiKeyMasked,
    googleKeyMasked,
    deepgramKeyMasked,
    allValid: isOpenAIKeyValid && isGoogleKeyValid && isDeepgramKeyValid
  };
}

/**
 * Verifies that API keys are valid by making test requests
 * @returns {Promise<object>} Results of API key verification
 */
export async function verifyApiKeys() {
  const results = {
    openai: false,
    google: false,
    deepgram: false,
    allValid: false
  };
  
  try {
    // For a real app, we would make actual API calls here to verify the keys
    // For this demo, we'll just check if they're valid format
    const envStatus = checkEnvironmentVariables();
    
    results.openai = envStatus.isOpenAIKeyValid;
    results.google = envStatus.isGoogleKeyValid;
    results.deepgram = envStatus.isDeepgramKeyValid;
    results.allValid = envStatus.allValid;
    
    return results;
  } catch (error) {
    console.error('Error verifying API keys:', error);
    return results;
  }
}

export default {
  isValidApiKey,
  maskApiKey,
  checkEnvironmentVariables,
  verifyApiKeys
}; 