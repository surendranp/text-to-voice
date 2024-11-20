const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { exec } = require("child_process");

const CHUNK_SIZE = 200; // Maximum characters per chunk

const LANGUAGE_MAP = {
    en: "en",
    es: "es",
    fr: "fr",
    hi: "hi",
    ta: "ta",
    te: "te",
    kn: "kn",
    gu: "gu",
    bn: "bn",
    ml: "ml",
    mr: "mr",
};

/**
 * Split long text into chunks of manageable size.
 */
function splitTextIntoChunks(text, size) {
    const chunks = [];
    for (let i = 0; i < text.length; i += size) {
        chunks.push(text.slice(i, i + size));
    }
    return chunks;
}

/**
 * Convert text to speech and save as an MP3 file.
 */
async function convertTextToSpeech(text, voice = "en", outputDir) {
    const languageCode = LANGUAGE_MAP[voice];
    if (!languageCode) {
        throw new Error(`Unsupported language: ${voice}`);
    }

    const chunks = splitTextIntoChunks(text, CHUNK_SIZE);
    const tempFiles = [];

    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(
            chunk
        )}&tl=${languageCode}&client=tw-ob`;

        try {
            const response = await axios.get(url, { responseType: "stream" });
            const tempFile = path.join(outputDir, `temp_${Date.now()}_${i}.mp3`);
            const writer = fs.createWriteStream(tempFile);

            await new Promise((resolve, reject) => {
                response.data.pipe(writer);
                writer.on("finish", resolve);
                writer.on("error", reject);
            });

            tempFiles.push(tempFile);
        } catch (error) {
            console.error(`Failed to fetch chunk ${i + 1}: ${error.message}`);
            throw error;
        }
    }

    const outputFilename = `audio_${Date.now()}.mp3`;
    const outputFilePath = path.join(outputDir, outputFilename);

    await mergeAudioFiles(tempFiles, outputFilePath);
    tempFiles.forEach((file) => fs.unlinkSync(file)); // Cleanup temp files

    return outputFilename;
}

/**
 * Merge multiple audio files into one using FFmpeg.
 */
function mergeAudioFiles(inputFiles, outputFile) {
    return new Promise((resolve, reject) => {
        const fileListPath = path.join(__dirname, "filelist.txt");
        fs.writeFileSync(
            fileListPath,
            inputFiles.map((file) => `file '${file}'`).join("\n")
        );

        const command = `ffmpeg -f concat -safe 0 -i ${fileListPath} -c copy ${outputFile}`;
        exec(command, (error, stdout, stderr) => {
            fs.unlinkSync(fileListPath);
            if (error) {
                console.error("FFmpeg error:", stderr);
                return reject(new Error("Failed to merge audio files."));
            }
            resolve();
        });
    });
}

module.exports = { convertTextToSpeech };
