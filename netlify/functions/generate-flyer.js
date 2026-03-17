import OpenAI from 'openai';

export const handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { rawText, yogaStyle, tone } = JSON.parse(event.body);

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
Your goal is to take rough, half-done flyer notes and turn them into a polished, professional, and inviting yoga flyer content.

Guidelines:
- Maintain a ${tone || 'peaceful'} and professional tone.
- Style should be appropriate for ${yogaStyle || 'General Yoga'}.
- Structure the output clearly with:
  1. A Catchy Title
  2. A Short Inviting Description
  3. Key Details (Date, Time, Location, What to Bring)
  4. A clear Call to Action (e.g., "Register at link in bio")
- Use emojis sparingly and tastefully to add a modern touch.
- Keep the language inclusive and welcoming.`;

    const response = await client.chat.completions.create({
      model: 'nano-banana-pro',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Here are my rough notes for the flyer: ${rawText}` },
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
