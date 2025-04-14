require('dotenv').config();
console.log("🔑 OpenAI API Key:", process.env.OPENAI_API_KEY ? "Loaded ✅" : "Not Loaded ❌");

const express = require("express");
const cors = require("cors");
const axios = require("axios");
const admin = require("firebase-admin");
const OpenAI = require("openai");

// 🔥 Initialize Firebase
const serviceAccount = require("./fc25assistant-firebase-adminsdk-fbsvc-5f82046f38.json");
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

    // --- Step 2: If VIP, generate TTS audio ---
    let audio_url = null;
    if (isVIP) {
      try {
        console.log("🔹 Generating TTS audio for VIP...");
        const ttsRequestData = {
          model: "tts-1",
          input: answer,
          voice: "alloy"
        };

        const ttsResponse = await axios.post(
          "https://api.openai.com/v1/audio/speech",
          ttsRequestData,
          {
            headers: {
              "Authorization": `Bearer ${process.env.OPENAI_API_KEY.trim()}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (ttsResponse.data && ttsResponse.data.audio_url) {
          audio_url = ttsResponse.data.audio_url;
          console.log("✅ TTS Audio URL:", audio_url);
        } else {
          console.error("❌ No audio URL returned from OpenAI TTS API");
        }
      } catch (ttsError) {
        console.error("❌ TTS API Error:", ttsError.response ? ttsError.response.data : ttsError.message);
      }
    }

    // --- Step 3: Store the new AI response in Firestore ---
    const docRef = db.collection("ai_answers").doc(userMessage);
    await docRef.set({
      question: userMessage,
      answer: answer,
      audio_url: audio_url || null,
      embedding: newQuestionEmbedding,
      createdAt: admin.firestore.Timestamp.now(),
    });
    console.log("✅ AI response successfully stored in Firestore!");

    res.json({
      answer: answer,
      tokens_used: openaiResponse.data.usage.total_tokens,
      audio_url: audio_url,
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

app.listen(PORT, () => console.log(`🔥 Server running on port ${PORT}`));
