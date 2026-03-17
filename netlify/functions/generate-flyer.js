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

    const response = await client.chat.completions.create({
      model: 'nano-banana-pro',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
    });

    const polishedFlyer = response.choices[0].message.content;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ polishedFlyer }),
    };
  } catch (error) {
    console.error('Error generating flyer:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to generate flyer. Please try again later.' }),
    };
  }
};
