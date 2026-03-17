import OpenAI from 'openai';

export const handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { rawText, yogaStyle, tone, image } = JSON.parse(event.body);

    const apiKey = process.env.POE_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'POE_API_KEY is not configured in environment variables.' }),
      };
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
      { id: 'gpt-4o-mini', vision: false } // Ultra-fast text safety valve
    ];
    
    let polishedFlyer = null;
    let lastError = null;

    const start = Date.now();
    for (const modelInfo of modelsToTry) {
        const modelId = modelInfo.id;
        const elapsed = Date.now() - start;
        const remainingBudget = 9500 - elapsed; // 9.5s total budget
        
        if (remainingBudget < 500) break; 

        // Vision models get up to 7s/2s, text-only gets 1s max
        const currentTimeout = modelId === 'nano-banana-2' ? Math.min(7000, remainingBudget) : 
                              modelId === 'gpt-image-1.5' ? Math.min(2000, remainingBudget) : 
                              remainingBudget;

        try {
            console.log(`Attempting generation with model: ${modelId} (${currentTimeout}ms timeout)`);
            
            // Filter out image for non-vision models to save payload/processing time
            const filteredContent = modelInfo.vision ? userContent : userContent.filter(c => c.type === 'text');

            const response = await client.chat.completions.create({
              model: modelId,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: filteredContent },
              ],
            }, {
                timeout: currentTimeout
            });
            polishedFlyer = response.choices[0].message.content;
            console.log(`Successfully generated with model: ${modelId}`);
            break; 
        } catch (err) {
            console.warn(`Model ${modelId} failed or timed out:`, err?.error?.message || err?.message);
            lastError = err;
        }
    }
    const duration = Date.now() - start;
    console.log(`Generation completed in ${duration}ms`);

    if (!polishedFlyer) {
        throw lastError || new Error("The AI models are taking too long to respond. Please try again with simpler notes or without a photo.");
    }
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ polishedFlyer }),
    };
  } catch (error) {
    console.error('Error generating flyer:', error);
    
    // Check if it's a Poe API error (like rate limit/high demand)
    const errorMessage = error?.error?.message || error?.message || 'Failed to generate flyer. Please try again later.';
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: `All AI models are currently overwhelmed: ${errorMessage}` }),
    };
  }
};
