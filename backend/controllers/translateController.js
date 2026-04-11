import { pipeline } from "@xenova/transformers";
import { Pinecone } from "@pinecone-database/pinecone";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import crypto from "crypto"; // Native Node.js module for UUIDs
// 1. Schema for Gemini Structured Output

const translationSchema = z.array(z.string()).describe(
  "Array of translated strings matching input order"
);

// 2. Initialize Clients (Use Environment Variables!)
const ai = new GoogleGenAI({ apiKey: "AIzaSyDHnMR3C-yH_f0mqn3DaFR0lnb9Teg3T1g" });
const pc = new Pinecone({
  apiKey:
    "pcsk_A9aQi_LWxcEAaC4NiLVvgMAB6YXya4StFvhZKz5tFaTKMmHjMqqT16mhuwmyycoes8C5Z",
});

const index = pc.index(
  "translation-memory",
);

let extractor;
const initModel = async () => {
  if (!extractor) {
    extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  }
};

async function createEmbedding(text) {
  await initModel(); // Ensure model is loaded
  const embedding = await extractor(text, { pooling: "mean", normalize: true });
  return Array.from(embedding.data);
}

export const categorizeStrings = async (req, res) => {
  try {
    const { texts, sourceLang = "en", lang = "hi", glossary = [] } = req.body;

    // Auto-map UI human strings back to short codes for Pinecone Namespace logic
    const langMap = { english: "en", hindi: "hi", spanish: "es", french: "fr", german: "de", italian: "it", portuguese: "pt", russian: "ru" };
    const nsSource = langMap[sourceLang.toLowerCase()] || sourceLang;
    const nsTarget = langMap[lang.toLowerCase()] || lang;
    const namespace = `${nsSource}-${nsTarget}`;
    const results = { exact: [], fuzzy: [], new: [] };
    const needsTranslation = [];

    // 1. Parallel Search (Same as before)
    await Promise.all(
      texts.map(async (text) => {
        const queryVector = await createEmbedding(text);
        const response = await index.namespace(namespace).query({
          vector: queryVector,
          topK: 1,
          includeMetadata: true,
        });

        const bestMatch = response.matches?.[0];
        const score = bestMatch ? Number(bestMatch.score.toFixed(4)) : 0;

        if (score >= 0.99) {
          results.exact.push({
            text,
            score,
            translation: bestMatch.metadata?.translation || "N/A",
          });
        } else {
          needsTranslation.push({
            text,
            vector: queryVector, // Store vector here to reuse it for upserting later
            score,
            type: score >= 0.75 ? "fuzzy" : "new",
            matchText: bestMatch?.metadata?.text || null,
            existingMatchTranslation: bestMatch?.metadata?.translation || null,
          });
        }
      }),
    );

    // 2. Batch Call to Gemini
    if (needsTranslation.length > 0) {
      const textsToTranslate = needsTranslation.map((item) => item.text);

      let glossaryInstruction = "";
      if (glossary && glossary.length > 0) {
        glossaryInstruction = `\nCRITICAL GLOSSARY CONSTRAINTS: You must enforce the following translated terminology strictly:\n`;
        glossaryInstruction += glossary.map(g => `- Base term '${g.term}' MUST translate exactly as '${g.translation}'`).join('\n');
      }

      const prompt = `Translate this array of strings into language code "${lang}". Maintain order.${glossaryInstruction}\nInput: ${JSON.stringify(textsToTranslate)}`;

      const aiResponse = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: zodToJsonSchema(translationSchema),
        },
      });

      const translations = translationSchema.parse(
        JSON.parse(aiResponse.text),
      );

      // 3. Prepare records for Pinecone Upsert
      const upsertRecords = [];

      needsTranslation.forEach((item, index) => {
        const suggestion = translations[index] || "Translation missing";

        // Add to response results
        if (item.type === "fuzzy") {
          results.fuzzy.push({
            text: item.text,
            score: item.score,
            matchText: item.matchText,
            existingMatchTranslation: item.existingMatchTranslation,
            suggested_translation: suggestion,
          });
        } else {
          results.new.push({
            text: item.text,
            score: item.score,
            suggested_translation: suggestion,
          });
        }

        // Prepare Pinecone record
        upsertRecords.push({
          id: crypto.randomUUID(), // Generate unique ID
          values: item.vector, // The embedding we generated in Step 1
          metadata: {
            text: item.text,
            translation: suggestion,
          },
        });
      });

      // 4. Upsert new translations back to Pinecone for future use
      if (upsertRecords.length > 0) {
        // Fallback structure for Pinecone SDK v1/v2 compatibility
        await index.namespace(namespace).upsert({ records: upsertRecords });
      }
    }

    return res.status(200).json(results);
  } catch (error) {
    console.error("Batch Translation & Upsert Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export default { categorizeStrings };