#!/bin/bash

# Colors for better readability
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "🔍 Verifying environment setup..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}ERROR: .env file is missing!${NC}"
    echo -e "Please create a .env file with the following content:"
    echo -e "OPENAI_API_KEY=your-actual-openai-api-key"
    echo -e "GOOGLE_AI_API_KEY=your-actual-google-ai-api-key"
    echo -e "DEEPGRAM_API_KEY=your-actual-deepgram-api-key"
    exit 1
fi

echo -e "${GREEN}✓ .env file exists${NC}"

# Check if API keys are set properly
if grep -q "sk-your-actual-openai-api-key" .env; then
    echo -e "${YELLOW}⚠️  Warning: OpenAI API key is still using the placeholder value${NC}"
    echo -e "Please replace the placeholder with your actual OpenAI API key in the .env file"
else
    # Check if the OpenAI key seems valid
    if grep -q "OPENAI_API_KEY=sk-" .env; then
        echo -e "${GREEN}✓ OpenAI API key seems to be set properly${NC}"
    else
        echo -e "${YELLOW}⚠️  Warning: OpenAI API key may not be valid${NC}"
        echo -e "OpenAI API keys should start with 'sk-'"
    fi
fi

echo -e "\n${GREEN}==============================================${NC}"
echo -e "${YELLOW}IMPORTANT: NEVER commit the .env file to Git${NC}"
echo -e "${GREEN}==============================================${NC}\n"

echo "Environment verification complete."
