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

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Check if dist exists
const distPath = path.join(__dirname, 'dist');
console.log('--- DIAGNOSTICS ---');
console.log('Current directory:', __dirname);
console.log('Files in current directory:', fs.readdirSync(__dirname));
console.log('PORT env:', process.env.PORT);

if (!fs.existsSync(distPath)) {
  console.warn('WARNING: dist folder NOT found at', distPath);
} else {
  console.log('SUCCESS: dist folder found at', distPath);
  console.log('Files in dist:', fs.readdirSync(distPath));
}
console.log('-------------------');

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
Your goal is to take rough, half-done flyer notes (and optionally an image of a flyer draft) and turn them into a polished, professional, and inviting yoga flyer content.

Guidelines:
- Maintain a ${tone || 'peaceful'} and professional tone.
- Style should be appropriate for ${yogaStyle || 'General Yoga'}.
- Structure the output clearly with:
  1. A Catchy Title
  2. A Short Inviting Description
  3. Key Details (Date, Time, Location, What to Bring)
  4. A clear Call to Action
- Use emojis sparingly and tastefully.`;

    const userContent = [];
    if (rawText) {
      userContent.push({ type: 'text', text: `Here are my rough notes for the flyer: ${rawText}` });
    } else {
      userContent.push({ type: 'text', text: `Here is my rough flyer. Please polish it.` });
    }

    if (image) {
      userContent.push({
        type: 'image_url',
        image_url: {
          url: image
        }
      });
    }

    const modelsToTry = [
      { id: 'nano-banana-2', vision: true },
      { id: 'gpt-image-1.5', vision: true },
      { id: 'gpt-4o-mini', vision: false }
    ];
    
    let polishedFlyer = null;
    let lastError = null;

    // On Railway, we don't have the 10s Netlify limit, so we can be more generous.
    // However, we still want a good UX, so we'll use a 60s total timeout for the entire request.
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
                timeout: 55000 // 55 seconds per model attempt, total capped by express if needed
            });
            polishedFlyer = response.choices[0].message.content;
            console.log(`Successfully generated with model: ${modelId}`);
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

// Handle SPA routing
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});


const host = '0.0.0.0';
app.listen(port, host, () => {
  console.log(`🚀 Server ready on http://${host}:${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
