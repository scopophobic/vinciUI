// Serverless function for Gemini API integration
// This will be used in Phase 2 when API keys are provided

export default async function handler(req, res) {
  // Set CORS headers for development
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { prompt, imageBase64 } = req.body;
    
    // TODO: Implement when API key is provided
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ 
        message: 'API key not configured. Please set GEMINI_API_KEY environment variable.' 
      });
    }

    if (!prompt) {
      return res.status(400).json({ message: 'Prompt is required' });
    }

    // Gemini API endpoint for image generation
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${apiKey}`;

    // Build the request payload
    const payload = {
      contents: [{
        parts: [
          { text: prompt },
          ...(imageBase64 ? [{ 
            inline_data: { 
              mime_type: "image/png", 
              data: imageBase64 
            } 
          }] : [])
        ]
      }],
      generationConfig: {
        temperature: 0.8,
        candidateCount: 1,
      }
    };

    console.log('Calling Gemini API with payload:', JSON.stringify(payload, null, 2));

    const apiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!apiResponse.ok) {
      const errorData = await apiResponse.text();
      console.error('Gemini API error:', errorData);
      return res.status(apiResponse.status).json({ 
        message: `Gemini API error: ${apiResponse.status}`,
        details: errorData
      });
    }

    const result = await apiResponse.json();
    console.log('Gemini API response:', JSON.stringify(result, null, 2));

    // Extract the generated image data
    const generatedBase64 = result?.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;

    if (!generatedBase64) {
      return res.status(500).json({ 
        message: "No image data in response",
        response: result
      });
    }

    // Return the generated image as a data URL
    res.status(200).json({ 
      image: `data:image/png;base64,${generatedBase64}`,
      success: true
    });

  } catch (error) {
    console.error('Generation error:', error);
    res.status(500).json({ 
      message: error.message || 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

