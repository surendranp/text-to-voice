const express = require("express");
const fs = require("fs");
const path = require("path");
const bodyParser = require("body-parser");
const { convertTextToSpeech } = require("./ttsHandler");

const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "../public")));

// Serve the output directory for downloading files
app.use("/output", express.static(path.join(__dirname, "output")));

// Serve TTS.html when accessing the root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, "../public", "TTS.html"));  // Serve TTS.html
});

// Endpoint to handle TTS conversion
app.post("/convert", async (req, res) => {
    const { text, voice } = req.body;

    if (!text) {
        return res.status(400).json({ success: false, message: "Text is required" });
    }

    const outputDir = path.join(__dirname, "output");
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir); // Create output directory if it doesn't exist
    }

    try {
        // Convert the text to speech and get the filename
        const filename = await convertTextToSpeech(text, voice, outputDir);

        // Respond with the filename for the download link
        res.json({ success: true, filename: `/output/${filename}` });
    } catch (error) {
        console.error("Error during text-to-speech conversion:", error);
        res.status(500).json({ success: false, message: "Failed to convert text to speech" });
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
