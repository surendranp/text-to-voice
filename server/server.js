const express = require("express");
const fs = require("fs");
const path = require("path");
const bodyParser = require("body-parser");
const { convertTextToSpeech, translateText } = require("./ttsHandler");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "../public")));
app.use("/output", express.static(path.join(__dirname, "output"))); // Serve the output directory

// Serve index.html for the root route
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../public", "index.html"));
});

// Endpoint for text-to-speech conversion
app.post("/convert", async (req, res) => {
    const { text, voice, translateTo } = req.body;

    if (!text || !text.trim()) {
        return res.status(400).json({ success: false, message: "Text is required." });
    }

    const outputDir = path.join(__dirname, "output");
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir); // Create the output directory if it doesn't exist
    }

    try {
        let finalText = text;

        // Translate the text if a translation language is provided
        if (translateTo) {
            finalText = await translateText(text, translateTo);
        }

        const filename = await convertTextToSpeech(finalText, voice, outputDir);
        res.json({ success: true, filename: `/output/${filename}` });
    } catch (error) {
        console.error("Error during TTS conversion:", error);
        res.status(500).json({ success: false, message: "Failed to convert text to speech." });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
