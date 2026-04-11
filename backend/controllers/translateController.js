import { pipeline } from "@xenova/transformers";
import { Pinecone } from "@pinecone-database/pinecone";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import crypto from "crypto";

const translationSchema = z.array(z.string()).describe(
  "Array of translated strings matching input order"
);

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });
const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
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
  await initModel();
  const embedding = await extractor(text, { pooling: "mean", normalize: true });
  return Array.from(embedding.data);
}

export const categorizeStrings = async (req, res) => {
  try {
    const { texts, sourceLang = "en", lang = "hi", glossary = [] } = req.body;


    const langMap = { english: "en", hindi: "hi", spanish: "es", french: "fr", german: "de", italian: "it", portuguese: "pt", russian: "ru" };
    const nsSource = langMap[sourceLang.toLowerCase()] || sourceLang;
    const nsTarget = langMap[lang.toLowerCase()] || lang;
    const namespace = `${nsSource}-${nsTarget}`;
    const results = { exact: [], fuzzy: [], new: [] };
    const needsTranslation = [];


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
            vector: queryVector,
            score,
            type: score >= 0.75 ? "fuzzy" : "new",
            matchText: bestMatch?.metadata?.text || null,
            existingMatchTranslation: bestMatch?.metadata?.translation || null,
          });
        }
      }),
    );


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


      const upsertRecords = [];

      needsTranslation.forEach((item, index) => {
        const suggestion = translations[index] || "Translation missing";

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


        upsertRecords.push({
          id: crypto.randomUUID(),
          values: item.vector,
          metadata: {
            text: item.text,
            translation: suggestion,
          },
        });
      });

      if (upsertRecords.length > 0) {
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