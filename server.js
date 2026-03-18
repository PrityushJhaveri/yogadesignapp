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
Your primary goal is to generate a visual, professional, and inviting yoga flyer.

STRICT RULES:
1. YOU MUST GENERATE A VISUAL IMAGE OF THE FLYER.
2. The image should include all relevant details: Catchy Title, Schedule, Location, and Call to Action.
3. OUTPUT ONLY the markdown image link (e.g., ![Flyer](https://url)) and a short description.
4. DO NOT include "thinking", "reasoning", or "steps".
5. Style: ${yogaStyle || 'General Yoga'}. Tone: ${tone || 'peaceful'}.`;

    const userContent = [];
    if (rawText) {
      userContent.push({ type: 'text', text: `CREATE A VISUAL FLYER IMAGE FOR THIS: ${rawText}` });
    } else {
      userContent.push({ type: 'text', text: `ENHANCE AND GENERATE A FINAL VISUAL FLYER BASED ON THIS IMAGE.` });
    }

    if (image) {
      userContent.push({
        type: 'image_url',
        image_url: {
          url: image
        }
      });
    }

    // Use only nano-banana-2 as requested
    const modelsToTry = [
      { id: 'nano-banana-2', vision: true }
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
                timeout: 30000 // 30 seconds for the single attempt
            });
            
            let content = response.choices[0].message.content;
            if (!content) throw new Error("Empty response from AI");
            
            console.log(`Raw response from ${modelId} (first 100 chars):`, content.substring(0, 100));
            
            try {
                // CLEANING LOGIC (Defensive)
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
                polishedFlyer = content.trim(); 
            }
            
            break; 
        } catch (err) {
            console.warn(`Model ${modelId} failed:`, err?.error?.message || err?.message);
            lastError = err;
            // If the first model times out, we likely don't have time for a second one on Railway.
            // But we'll try one more if it's a fast model.
        }
    }

    if (!polishedFlyer) {
        return res.status(500).json({ error: lastError?.message || "Generation timed out. Please try again." });
    }
    
    res.json({ polishedFlyer });
  } catch (error) {
    console.error('Error in /api/generate-flyer:', error);
    res.status(500).json({ error: 'Server error. Please check POE_API_KEY and try again.' });
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
