require('dotenv').config();
console.log("🔑 OpenAI API Key:", process.env.OPENAI_API_KEY ? "Loaded ✅" : "Not Loaded ❌");
console.log("🔑 DeepL API Key:", process.env.DEEPL_API_KEY ? "Loaded ✅" : "Not Loaded ❌");

const express = require("express");
const cors = require("cors");
const axios = require("axios");
const admin = require("firebase-admin");
const OpenAI = require("openai");

// 🔥 Initialize Firebase
const adminKeyBuffer = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_JSON_BASE64, 'base64');
const serviceAccount = JSON.parse(adminKeyBuffer.toString('utf-8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 5000;

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Embedding function (we still compute and store embeddings for future use)
async function getEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: text,
    });
    console.log("Embedding API response:", response.data);
    if (
      response.data &&
      response.data.data &&
      Array.isArray(response.data.data) &&
      response.data.data.length > 0
    ) {
      return response.data.data[0].embedding;
    } else {
      throw new Error("Unexpected embedding API response structure.");
    }
  } catch (error) {
    console.error(
      "❌ Embedding API Error:",
      error.response ? error.response.data : error.message
    );
    return null;
  }
}

app.post("/api/ask-ai", async (req, res) => {
  try {
    // Retrieve request data: use 'question' if available, otherwise 'prompt'
    const userMessage = req.body.question || req.body.prompt;
    const isVIP = req.body.isVIP || false;

    if (!userMessage) {
      return res.status(400).json({ error: "Question or prompt is required" });
    }

    console.log("Received user message:", userMessage);
    console.log("Is VIP:", isVIP);

    // (Optional) Compute and store embedding for the question for future use
    const normalizedQuestion = userMessage.toLowerCase().trim();
    const newQuestionEmbedding = await getEmbedding(normalizedQuestion);

    // --- Step 1: Fetch a new answer from OpenAI ---
    console.log("📩 Sending request to OpenAI...");
    const modifiedMessage = `

Question: "${userMessage}"`;

    const requestData = {
      model: "gpt-4o", // Updated model name
      messages: [
        {
          role: "system",
          content:
            "You are an expert FIFA coach and EA FC25 strategist. " +
            "Your tone should be friendly yet professional, guiding a serious gamer. " +
            "Limit responses to exactly 100 words to keep them focused and complete."
        },
        { role: "user", content: modifiedMessage }
      ],
      max_tokens: 800,
      temperature: 0.8,
      top_p: 0.9
    };

    console.log("Request data being sent to OpenAI:", JSON.stringify(requestData, null, 2));

    const openaiResponse = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      requestData,
      {
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY.trim()}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ OpenAI Response:", openaiResponse.data);
    const answer = openaiResponse.data.choices[0].message.content;


    // --- Step 3: Store the new AI response in Firestore ---
    const docRef = db.collection("ai_answers").doc(userMessage);
    await docRef.set({
      question: userMessage,
      answer: answer,
      embedding: newQuestionEmbedding,
      createdAt: admin.firestore.Timestamp.now(),
    });
    console.log("✅ AI response successfully stored in Firestore!");

    res.json({
      answer: answer,
      tokens_used: openaiResponse.data.usage.total_tokens,
    });
  } catch (error) {
    const detailedError = error.response ? error.response.data : error.message;
    console.error("❌ Error in /api/ask-ai:", detailedError);
    res.status(500).json({
      error: "Failed to get response from AI",
      details: detailedError,
    });
  }
});

// ================================================================
// NEW: DeepL Translation Endpoint
// ================================================================
app.post("/api/translate", async (req, res) => {
  try {
    const { text, targetLanguage, sourceLanguage = 'EN' } = req.body;
    
    // Input validation
    if (!text || !targetLanguage) {
      return res.status(400).json({ 
        error: "Text and target language are required" 
      });
    }

    if (text.length > 5000) {
      return res.status(400).json({ 
        error: "Text too long (max 5000 characters)" 
      });
    }

    console.log("🌐 Translation request:", { 
      textLength: text.length, 
      targetLanguage, 
      sourceLanguage 
    });

    // Call DeepL API
    const response = await axios.post(
      'https://api-free.deepl.com/v2/translate', 
      new URLSearchParams({
        text: text,
        target_lang: targetLanguage,
        source_lang: sourceLanguage,
        preserve_formatting: '1',
        formality: 'default'
      }), 
      {
        headers: {
          'Authorization': `DeepL-Auth-Key ${process.env.DEEPL_API_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'FC25Locker/1.0',
        },
        timeout: 10000 // 10 second timeout
      }
    );

    console.log("✅ DeepL Response received");

    if (!response.data.translations || !response.data.translations[0]) {
      throw new Error("Invalid translation response format");
    }

    const translatedText = response.data.translations[0].text;

    // Log success
    console.log("✅ Translation completed successfully");

    res.json({
      translatedText: translatedText,
      sourceLanguage: response.data.translations[0].detected_source_language || sourceLanguage,
      usage: {
        character_count: response.data.translations[0].text.length
      }
    });

  } catch (error) {
    console.error("❌ Translation error:", error.response ? error.response.data : error.message);
    
    // Handle specific DeepL errors
    let errorMessage = "Translation failed";
    let statusCode = 500;

    if (error.response) {
      switch (error.response.status) {
        case 400:
          errorMessage = "Invalid translation request";
          statusCode = 400;
          break;
        case 403:
          errorMessage = "Translation service authentication failed";
          statusCode = 403;
          break;
        case 429:
          errorMessage = "Translation rate limit exceeded";
          statusCode = 429;
          break;
        case 456:
          errorMessage = "Translation quota exceeded";
          statusCode = 456;
          break;
        default:
          errorMessage = `Translation service error (${error.response.status})`;
          statusCode = error.response.status;
      }
    } else if (error.code === 'ECONNABORTED') {
      errorMessage = "Translation request timed out";
      statusCode = 408;
    }

    res.status(statusCode).json({
      error: errorMessage,
      details: error.response ? error.response.data : error.message,
    });
  }
});

app.listen(PORT, () => console.log(`🔥 Server running on port ${PORT}`));