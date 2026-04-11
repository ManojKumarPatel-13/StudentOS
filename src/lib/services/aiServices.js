/*
========================================
AI SERVICE (Gemini + Firebase Integration)
========================================

Purpose:
This file connects the Gemini API (AI response generation)
with Firebase (database storage).

Flow:
1. Receive user's question from backend/API
2. Send question to Gemini API
3. Get AI-generated response
4. Store question + response in Firebase
5. Return response back to backend/UI

NOTE:
- Gemini API logic is in gemini.js
- Firebase config is in firebase.js
- This file acts as a bridge between both

IMPORTANT:
- Gemini API key must NOT be exposed to frontend
- Always call Gemini from backend only

TODO:
- Complete Gemini integration (askGemini function)
- Add error handling improvements
- Add user ID for storing personalized chats
- Add timestamp formatting if needed

========================================
*/