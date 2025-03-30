import Constants from 'expo-constants';

/**
 * Utility function to check if environment variables are correctly loaded
 * @returns Object with status of environment variables
 */
export function checkEnvironmentVariables() {
  const openaiKey = process.env.OPENAI_API_KEY || Constants.expoConfig?.extra?.OPENAI_API_KEY || '';
  const googleKey = process.env.GOOGLE_AI_API_KEY || Constants.expoConfig?.extra?.GOOGLE_AI_API_KEY || '';
  const deepgramKey = process.env.DEEPGRAM_API_KEY || Constants.expoConfig?.extra?.DEEPGRAM_API_KEY || '';
  
  const isOpenAIKeyValid = openaiKey && openaiKey !== 'your_openai_api_key_here' && openaiKey.length > 10;
  const isGoogleKeyValid = googleKey && googleKey !== 'your_google_ai_api_key_here' && googleKey.length > 10;
  const isDeepgramKeyValid = deepgramKey && deepgramKey !== 'your_deepgram_api_key_here' && deepgramKey.length > 10;
  
  return {
    isOpenAIKeyValid,
    isGoogleKeyValid,
    isDeepgramKeyValid,
    openaiKeyMasked: isOpenAIKeyValid ? `${openaiKey.substring(0, 5)}...${openaiKey.substring(openaiKey.length - 5)}` : 'Invalid',
    googleKeyMasked: isGoogleKeyValid ? `${googleKey.substring(0, 5)}...${googleKey.substring(googleKey.length - 5)}` : 'Invalid',
    deepgramKeyMasked: isDeepgramKeyValid ? `${deepgramKey.substring(0, 5)}...${deepgramKey.substring(deepgramKey.length - 5)}` : 'Invalid',
    allValid: isOpenAIKeyValid && isGoogleKeyValid && isDeepgramKeyValid
  };
}

/**
 * Check if API keys are loaded correctly and log the result
 * Good to call during app startup
 */
export function verifyApiKeys() {
  const envStatus = checkEnvironmentVariables();
  
  if (envStatus.allValid) {
    console.log('API keys loaded successfully');
    return true;
  } else {
    console.error('Missing or invalid API keys:', {
      OpenAI: envStatus.isOpenAIKeyValid ? 'Valid' : 'Invalid/Missing',
      GoogleAI: envStatus.isGoogleKeyValid ? 'Valid' : 'Invalid/Missing',
      Deepgram: envStatus.isDeepgramKeyValid ? 'Valid' : 'Invalid/Missing'
    });
    return false;
  }
} 