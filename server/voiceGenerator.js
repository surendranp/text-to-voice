const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { API_KEY } = process.env;  // Ensure your API key is set correctly in the .env

// Function to generate audio with pitch and speed adjustments
async function generateAudioWithSettings(text, voice, pitch, speed, outputDir) {
    const url = 'https://api.elevenlabs.io/v1/text-to-speech';  // Update with the actual endpoint URL if needed

    try {
        // Send the request to Eleven Labs TTS API
        const response = await axios.post(url, {
            text: text,
            voice: voice,
            params: {
                pitch: pitch || 1.0,   // Default to 1.0 if no pitch is provided
                speed: speed || 1.0,    // Default to 1.0 if no speed is provided
            }
        }, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            },
            responseType: 'arraybuffer'  // To handle binary audio data
        });

        // Save the audio file to the output directory
        const audioBuffer = response.data;
        const filePath = path.join(outputDir, `${Date.now()}.mp3`);
        fs.writeFileSync(filePath, audioBuffer);

        return filePath;  // Return the path of the generated audio file

    } catch (error) {
        console.error("Error generating audio with Eleven Labs API:", error);
        throw error;
    }
}

module.exports = { generateAudioWithSettings };
