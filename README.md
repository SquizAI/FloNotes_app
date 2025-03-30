# AI Notes App

A powerful note-taking application with AI-powered features including:

- Voice dictation with automatic transcription
- Smart task extraction and categorization
- Recipe parsing and organization
- Unified grocery list management
- Intelligent text enhancement

## Features

### Voice Dictation
Record your thoughts and have them automatically transcribed and enhanced using AI.

### Smart Task Extraction
The app automatically identifies tasks in your notes and organizes them into appropriate categories.

### Recipe Management
Enter recipe ideas or instructions, and the app will parse them into structured recipes with ingredients and steps.

### Grocery List
All ingredients from recipes and shopping items are automatically organized into a unified grocery list by category.

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn
- Expo CLI

### Installation

1. Clone the repository
```
git clone https://github.com/yourusername/ai-notes.git
cd ai-notes
```

2. Install dependencies
```
npm install
```

3. Set up API keys
Create a `.env` file in the root directory with the following:
```
OPENAI_API_KEY=your_openai_api_key
GOOGLE_AI_API_KEY=your_google_ai_api_key
DEEPGRAM_API_KEY=your_deepgram_api_key
```

4. Start the development server
```
npm start
```

## Technologies Used

- React Native
- Expo
- OpenAI API
- Google AI API
- Deepgram API for speech-to-text

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Environment Setup

This project uses environment variables for API keys. The `.env` file in the root directory contains placeholders for these keys.

**IMPORTANT: DO NOT DELETE OR COMMIT THE .env FILE**

When setting up the project:
1. Keep the existing `.env` file structure
2. Replace the placeholder values with your actual API keys
3. The `.env` file is already in `.gitignore` to prevent accidental commits 