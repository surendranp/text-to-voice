const fs = require("fs");
const fetch = require("node-fetch");

async function generateVoice(text, voice, translateTo, pitch, speed, accent) {
    const apiKey = process.env.ELEVEN_LABS_API_KEY;
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voice}`;

    const requestBody = {
        text,
        voice_settings: {
            pitch: parseFloat(pitch),
            speed: parseFloat(speed),
        },
        accent,
    };

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
        throw new Error("Failed to generate voice.");
    }

    const buffer = await response.buffer();
    const filePath = `./output/${Date.now()}_output.mp3`;
    fs.writeFileSync(filePath, buffer);

    return filePath;
}

module.exports = { generateVoice };
