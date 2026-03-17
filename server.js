import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'dist')));

// Routes
app.get('/health', (req, res) => res.status(200).send('OK'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.post('/api/generate-flyer', async (req, res) => {
  try {
    const { rawText, yogaStyle, tone, image } = req.body;

    const apiKey = process.env.POE_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'POE_API_KEY is not configured.' });
    }

    const client = new OpenAI({
      apiKey: apiKey,
      baseURL: 'https://api.poe.com/v1',
    });

    const systemPrompt = `You are a professional marketing specialist and yoga instructor assistant. 
Your goal is to turn rough flyer notes into a polished, professional, and inviting yoga flyer.

STRICT RULES:
1. ONLY output the final flyer content. 
2. DO NOT include any "thinking", "reasoning", "steps", or "inner monologue".
3. DO NOT include headers like "**Reviewing the Draft...**" or "**Constructing a Design Prompt...**".
4. If you are an image model, ensure the image you generate represents the flyer perfectly.
5. Provide a clear, catchy title and well-structured details.
6. Use a ${tone || 'peaceful'} and professional tone.
7. Style: ${yogaStyle || 'General Yoga'}.`;

    const userContent = [];
    if (rawText) {
      userContent.push({ type: 'text', text: `POLISH THIS FLYER: ${rawText}` });
    } else {
      userContent.push({ type: 'text', text: `POLISH THE FLYER IN THIS IMAGE.` });
    }

    if (image) {
      userContent.push({
        type: 'image_url',
        image_url: {
          url: image
        }
      });
    }

    const modelsToTry = image 
      ? [
          { id: 'nano-banana-2', vision: true },
          { id: 'gpt-image-1.5', vision: true },
          { id: 'gpt-4o-mini', vision: false }
        ]
      : [
          { id: 'gpt-4o-mini', vision: false },
          { id: 'nano-banana-2', vision: false }
        ];
    
    let polishedFlyer = null;
    let lastError = null;

    for (const modelInfo of modelsToTry) {
        const modelId = modelInfo.id;
        try {
            console.log(`Attempting generation with model: ${modelId}`);
            const filteredContent = modelInfo.vision ? userContent : userContent.filter(c => c.type === 'text');

            const response = await client.chat.completions.create({
              model: modelId,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: filteredContent },
              ],
            }, {
                timeout: 30000 // 30 seconds per model
            });
            
            let content = response.choices[0].message.content;
            if (!content) throw new Error("Empty response from AI");
            
            console.log(`Raw response from ${modelId} (first 100 chars):`, content.substring(0, 100));
            
            try {
                // CLEANING LOGIC
                content = content.replace(/^I'm focused on .*?\./gmi, '');
                content = content.replace(/^I'm now focusing on .*?\./gmi, '');
                content = content.replace(/^I'm presently .*?\./gmi, '');
                content = content.replace(/^I am now .*?\./gmi, '');
                content = content.replace(/^I have .*?\./gmi, '');
                
                const reasoningPattern = /^\*\*([^*]{3,40})\*\*\s*(?:\n|$)/gm;
                content = content.replace(reasoningPattern, '');
                
                polishedFlyer = content.trim();
                console.log(`Successfully cleaned. Length: ${polishedFlyer.length}`);
            } catch (cleanErr) {
                console.error("Cleaning error:", cleanErr);
                polishedFlyer = content.trim(); // Fallback to raw content
            }
            
            break; 
        } catch (err) {
            console.warn(`Model ${modelId} failed:`, err?.error?.message || err?.message);
            lastError = err;
        }
    }

    if (!polishedFlyer) {
        return res.status(500).json({ error: lastError?.message || "Failed to generate flyer content." });
    }
    
    res.json({ polishedFlyer });
  } catch (error) {
    console.error('Error generating flyer:', error);
    res.status(500).json({ error: 'An internal server error occurred.' });
  }
});

// Catch-all for SPA
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const host = '0.0.0.0';
app.listen(port, host, () => {
  console.log(`🚀 Server ready on http://${host}:${port}`);
});
