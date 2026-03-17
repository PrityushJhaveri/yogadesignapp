import OpenAI from 'openai';

async function test() {
    const client = new OpenAI({
      apiKey: 'C0CZJ6kdNd9fRWaJP1wiMefMGd_Zsge38axkhB1oJvg',
      baseURL: 'https://api.poe.com/v1',
    });

    try {
        console.log("Sending request...");
        const response = await client.chat.completions.create({
          model: 'nano-banana-2',
          messages: [
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: [
                { type: 'text', text: 'Hello, testing vision model format' }
            ] },
          ],
        });
        console.log("Response:", response.choices[0].message.content);
    } catch(err) {
        console.error("API Error:");
        console.error(err);
    }
}
test();
