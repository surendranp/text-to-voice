const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { exec } = require("child_process");

const CHUNK_SIZE = 200; // Maximum characters per API call

// Define supported language mappings
const LANGUAGE_MAP = {
    en: "en", // English
    "en-male": "en",
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

/**
 * Translates text to the target language using Google Translate API.
 */
async function translateText(text, targetLanguage) {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLanguage}&dt=t&q=${encodeURIComponent(
        text
    )}`;
    try {
        const response = await axios.get(url);
        const translatedText = response.data[0]
            .map((item) => item[0])
            .join("");
        return translatedText;
    } catch (error) {
        console.error("Translation error:", error.message);
        throw new Error("Failed to translate text.");
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
async function convertTextToSpeech(text, voice = "en", outputDir, pitch = 100, speed = 100) {
    const languageCode = LANGUAGE_MAP[voice];
    if (!languageCode) {
        throw new Error(
            `Unsupported language code: ${voice}. Supported languages are: ${Object.keys(LANGUAGE_MAP).join(", ")}`
        );
    }

    // Adjust pitch and speed for male voice
    if (voice === "en-male") {
        pitch = pitch - 30; // Lower the pitch for a male tone
    }

    const chunks = splitTextIntoChunks(text, CHUNK_SIZE);
    const tempFiles = [];

    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i].trim();
        const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=${languageCode}&client=tw-ob&pitch=${pitch}&speed=${speed}`;

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
            fs.unlinkSync(fileListPath); // Remove temporary file list
            if (error) return reject(error);
            resolve();
        });
    });
}

module.exports = { convertTextToSpeech, translateText };
