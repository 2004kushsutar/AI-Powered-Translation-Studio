import { pipeline } from "@xenova/transformers";
import { Pinecone } from "@pinecone-database/pinecone";
import { GoogleGenAI } from "@google/genai";

// --- Configuration ---
// Initialize the latest Google AI SDK
const ai = new GoogleGenAI({
  apiKey: "AIzaSyAtEl74OgAVFLNVczKJ6iphizsB9OYpYjk",
});

// 1. Initialize Transformers Model for local embeddings
let extractor;
let extractorPromise;
const initModel = async () => {
  if (!extractorPromise) {
    extractorPromise = pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  }
  extractor = await extractorPromise;
};

initModel();

const pc = new Pinecone({
  apiKey:
    "pcsk_A9aQi_LWxcEAaC4NiLVvgMAB6YXya4StFvhZKz5tFaTKMmHjMqqT16mhuwmyycoes8C5Z",
});

const index = pc.index(
  "translation-memory",
  "https://translation-memory-m7iybz0.svc.aped-4627-b74a.pinecone.io",
);

// const namespace = index.namespace("en-hi");

// --- Helper: Gemini Translation ---
async function getGeminiTranslation(text, targetLang) {
  try {
    // Using the specific preview model you requested
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: `Translate to language code: ${targetLang}. Return ONLY the translation.\n\nText: ${text}`,
    });

    return response.text.trim();
  } catch (error) {
    console.error("Gemini SDK Error:", error);
    return "Translation error";
  }
}

// --- Helper: Create Embedding ---
async function createEmbedding(text) {
  if (!extractor) {
    await initModel();
  }
  const embedding = await extractor(text, { pooling: "mean", normalize: true });
  return Array.from(embedding.data);
}

// --- Main Controller ---
export const categorizeStrings = async (req, res) => {
  try {
    const { texts, sourceLang = "en", lang = "hi" } = req.body;

    if (!texts || !Array.isArray(texts)) {
      return res
        .status(400)
        .json({ error: "Invalid input. 'texts' must be an array." });
    }

    const results = {
      exact: [],
      fuzzy: [],
      new: [],
    };

    for (const text of texts) {
      // 1. Get Vector
      const queryVector = await createEmbedding(text);

      // 2. Query Pinecone
      const response = await index.namespace(`${sourceLang}-${lang}`).query({
        vector: queryVector,
        topK: 1,
        includeMetadata: true,
      });

      const bestMatch = response.matches?.[0];
      const score = bestMatch ? bestMatch.score : 0;
      const scoreFormatted = Number(score.toFixed(4));

      // 3. Logic & AI Translation
      if (score >= 0.99) {
        // EXACT: No AI call needed, use DB
        results.exact.push({
          text: text,
          score: scoreFormatted,
          translation: bestMatch.metadata?.translation || "N/A",
        });
      } else if (score >= 0.75 && score < 0.99) {
        // FUZZY: Get AI suggestion + DB reference
        const suggestion = await getGeminiTranslation(text, lang);
        results.fuzzy.push({
          text: text,
          score: scoreFormatted,
          matchText: bestMatch.metadata?.text || null,
          existingMatchTranslation: bestMatch.metadata?.translation || null,
          suggested_translation: suggestion,
        });
      } else {
        // NEW: Pure AI translation
        const suggestion = await getGeminiTranslation(text, lang);
        results.new.push({
          text: text,
          score: scoreFormatted,
          suggested_translation: suggestion,
        });
      }
    }

    return res.status(200).json(results);
  } catch (error) {
    console.error("Internal Server Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export default { categorizeStrings };