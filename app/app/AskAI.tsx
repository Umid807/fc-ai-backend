import { useState } from "react";
import { View, TextInput, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";

const BACKEND_URL = "https://your-backend.loca.lt/api/ask-ai"; // Replace with your actual LocalTunnel/ngrok URL

const AskAI = () => {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  const askAI = async () => {
    console.log("🔥 BUTTON PRESSED! askAI function triggered."); // ✅ LOG BEFORE FETCH

    if (!question.trim()) {
      setResponse("⚠️ Please enter a question.");
      return;
    }

    setLoading(true);
    setResponse(""); // Clear previous response

    console.log("🟢 DEBUG: Fetch request to:", BACKEND_URL); // ✅ LOG BEFORE FETCH REQUEST

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 🔥 Timeout after 10 seconds

      const res = await fetch(BACKEND_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
        signal: controller.signal, // 🔥 Attach timeout signal
      });

      clearTimeout(timeoutId); // 🔥 Clear timeout if request succeeds

      console.log("🟡 Waiting for response...");
      const data = await res.json();
      console.log("✅ Response received:", data);

      if (data.error) {
        setResponse("❌ Error: " + data.error);
      } else {
        setResponse(data.content || "🤖 AI didn't return a response.");
      }
    } catch (error) {
      if (error.name === "AbortError") {
        console.error("❌ Fetch request timed out.");
        setResponse("❌ Request took too long. Try again.");
      } else {
        console.error("❌ Error fetching AI response:", error.message);
        setResponse("❌ Failed to connect to AI server.");
      }
    }

    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Ask AI Your FC Questions</Text>
      <TextInput
        style={styles.input}
        placeholder="Ask anything..."
        value={question}
        onChangeText={setQuestion}
      />
      <TouchableOpacity 
        style={[styles.askButton, loading && styles.askButtonDisabled]} 
        onPress={() => {
          console.log("🔥 BUTTON PRESSED! Calling askAI...");
          askAI();
        }} 
        disabled={loading}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.askButtonText}>Ask AI</Text>}
      </TouchableOpacity>
      {response ? <Text style={styles.response}>{response}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#1a1a1a",
    flex: 1,
  },
  heading: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
    backgroundColor: "#fff",
    color: "#000",
  },
  askButton: {
    backgroundColor: "#00f",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  askButtonDisabled: {
    backgroundColor: "#555",
  },
  askButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  response: {
    marginTop: 10,
    fontSize: 16,
    color: "#fff",
    fontWeight: "500",
  },
});

export default AskAI;
