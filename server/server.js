const express = require("express");
const fs = require("fs");
const path = require("path");
const bodyParser = require("body-parser");
const axios = require("axios");
require("dotenv").config();

const { convertTextToSpeech, translateText } = require("./ttsHandler");

const app = express();
const port = process.env.PORT || 3000;

const ELEVEN_LABS_API_KEY = process.env.ELEVEN_LABS_API_KEY;
const ELEVEN_LABS_URL = 'https://api.elevenlabs.io/v1/text-to-speech/';

// Check if API key is loaded correctly
if (!ELEVEN_LABS_API_KEY) {
    console.error("ElevenLabs API key is missing. Please set it in the .env file.");
    process.exit(1); // Exit the app if no API key is found
}

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "../public")));
app.use("/output", express.static(path.join(__dirname, "output"))); // Serve the output directory

// Serve index.html for the root route
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../public", "index.html"));
});

// Endpoint for text-to-speech conversion using Google Translate or custom voice
app.post("/convert", async (req, res) => {
    const { text, voice, translateTo, pitch, speed } = req.body;

    if (!text || !text.trim()) {
        return res.status(400).json({ success: false, message: "Text is required." });
    }

    const outputDir = path.join(__dirname, "output");
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir); // Create the output directory if it doesn't exist
    }

    try {
        let finalText = text;

        if (translateTo) {
            finalText = await translateText(text, translateTo);
        }

        const filename = await convertTextToSpeech(finalText, voice, outputDir, pitch, speed);
        res.json({ success: true, filename: `/output/${filename}` });
    } catch (error) {
        console.error("Error during TTS conversion:", error);
        res.status(500).json({ success: false, message: "Failed to convert text to speech." });
    }
});

// Endpoint for text-to-speech conversion using ElevenLabs API
app.post("/convert-elevenlabs", async (req, res) => {
    const { text, voice, speed = 1, pitch = 0, volume = 1 } = req.body;

    if (!text || !text.trim()) {
        return res.status(400).json({ success: false, message: "Text is required." });
    }

    if (!voice) {
        return res.status(400).json({ success: false, message: "Voice is required." });
    }

    const outputDir = path.join(__dirname, "output");
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir); // Create the output directory if it doesn't exist
    }

    try {
        // Prepare the payload with the voice settings
        const payload = {
            text: text,
            voice_settings: {
                stability: 0.5,
                similarity_boost: 0.5,
                // Add custom adjustments for speed, pitch, and volume
                rate: speed, // Adjust speed (rate)
                pitch: pitch, // Adjust pitch
                volume: volume // Adjust volume
            }
        };

        const headers = {
            "xi-api-key": ELEVEN_LABS_API_KEY,
            "Content-Type": "application/json",
        };

        const apiUrl = `${ELEVEN_LABS_URL}${voice}`;
        const response = await axios.post(apiUrl, payload, { headers, responseType: 'arraybuffer' });

        const filename = `audio_${Date.now()}.mp3`;
        const filePath = path.join(outputDir, filename);

        // Write the audio file to disk (response is expected to be an arraybuffer)
        fs.writeFile(filePath, response.data, (err) => {
            if (err) {
                console.error("Error saving the audio file:", err);
                return res.status(500).json({ success: false, message: "Failed to save audio file." });
            }
            res.json({ success: true, filename: `/output/${filename}` });
        });
    } catch (error) {
        console.error("Error during Eleven Labs TTS conversion:", error.message || error);
        res.status(500).json({ success: false, message: "Failed to convert text to speech using Eleven Labs." });
    }
});



// Start the server
app.listen(port, () => {
    console.log(`Server is running on porthttp://localhost:${port}`);
});
