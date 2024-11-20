const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { exec } = require("child_process");

const CHUNK_SIZE = 200; // Maximum characters per API call

// Define supported language mappings
const LANGUAGE_MAP = {
    en: "en", // English
    es: "es", // Spanish
    fr: "fr", // French
    hi: "hi", // Hindi
    ta: "ta", // Tamil
    te: "te", // Telugu
    kn: "kn", // Kannada
    gu: "gu", // Gujarati
    bn: "bn", // Bengali
    ml: "ml", // Malayalam
    mr: "mr", // Marathi
};

// Google Translate API key (you need to have a Google API key for translation)
const GOOGLE_TRANSLATE_API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY;

// Function to translate text to the selected language
async function translateText(text, targetLanguage) {
    try {
        const response = await axios.post(
            `https://translation.googleapis.com/language/translate/v2`,
            {
                q: text,
                target: targetLanguage,
                key: GOOGLE_TRANSLATE_API_KEY
            }
        );
        return response.data.data.translations[0].translatedText;
    } catch (error) {
        console.error("Error during translation:", error.message);
        throw new Error("Translation failed.");
    }
}

/**
 * Splits a long text into valid-sized chunks for the API.
 */
function splitTextIntoChunks(text, size) {
    const chunks = [];
    for (let i = 0; i < text.length; i += size) {
        chunks.push(text.slice(i, i + size));
    }
    return chunks;
}

/**
 * Converts text to speech and saves it as an MP3 file.
 */
async function convertTextToSpeech(text, voice = "en", outputDir, shouldTranslate = false, targetLanguage = null) {
    // If translation is required
    if (shouldTranslate && targetLanguage) {
        text = await translateText(text, targetLanguage);
    }

    const languageCode = LANGUAGE_MAP[voice];
    if (!languageCode) {
        throw new Error(
            `Unsupported language code: ${voice}. Supported languages are: ${Object.keys(
                LANGUAGE_MAP
            ).join(", ")}`
        );
    }

    const chunks = splitTextIntoChunks(text, CHUNK_SIZE);
    const tempFiles = [];

    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i].trim();
        const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(
            chunk
        )}&tl=${languageCode}&client=tw-ob`;

        try {
            const response = await axios({
                method: "GET",
                url,
                responseType: "stream",
            });

            const tempFilename = `temp_${Date.now()}_${i}.mp3`;
            const tempFilepath = path.join(outputDir, tempFilename);

            await new Promise((resolve, reject) => {
                const writer = fs.createWriteStream(tempFilepath);
                response.data.pipe(writer);
                writer.on("finish", resolve);
                writer.on("error", reject);
            });

            tempFiles.push(tempFilepath);
        } catch (error) {
            console.error(`Failed to fetch chunk ${i + 1}:`, error.message);
            throw new Error(`Error with chunk ${i + 1}: ${error.message}`);
        }
    }

    const outputFilename = `audio_${Date.now()}.mp3`;
    const outputFilepath = path.join(outputDir, outputFilename);

    await mergeAudioFiles(tempFiles, outputFilepath);

    tempFiles.forEach((file) => fs.unlinkSync(file));

    return outputFilename;
}

/**
 * Merges multiple audio files into a single MP3 file using FFmpeg.
 */
function mergeAudioFiles(inputFiles, outputFile) {
    return new Promise((resolve, reject) => {
        const fileListPath = path.join(__dirname, "filelist.txt");
        fs.writeFileSync(
            fileListPath,
            inputFiles.map((file) => `file '${file}'`).join("\n")
        );

        const ffmpegCommand = `ffmpeg -f concat -safe 0 -i ${fileListPath} -c copy ${outputFile}`;
        exec(ffmpegCommand, (error) => {
            fs.unlinkSync(fileListPath);
            if (error) return reject(error);
            resolve();
        });
    });
}

module.exports = { convertTextToSpeech };
