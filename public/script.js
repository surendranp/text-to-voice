document.addEventListener("DOMContentLoaded", () => {
    const speedInput = document.getElementById("speed");
    const pitchInput = document.getElementById("pitch");
    const volumeInput = document.getElementById("volume");
    const speedValue = document.getElementById("speedValue");
    const pitchValue = document.getElementById("pitchValue");
    const volumeValue = document.getElementById("volumeValue");
    const textInput = document.getElementById("textInput");
    const wordCountDisplay = document.getElementById("wordCount");
    const voiceSelect = document.getElementById("voiceSelect");
    const elevenLabsVoiceSelect = document.getElementById("elevenLabsVoiceSelect");
    const spinnerContainer = document.getElementById("spinner-container");
    const convertButton = document.getElementById("convertButton");
    const audioPlayer = document.getElementById("audioPlayer");
    const downloadLink = document.getElementById("downloadLink");
    const audioLink = document.getElementById("audioLink");
    const translateSelect = document.getElementById("translateSelect");

    // Update displayed values for speed, pitch, and volume
    speedInput.addEventListener("input", () => {
        speedValue.textContent = speedInput.value;
    });

    pitchInput.addEventListener("input", () => {
        pitchValue.textContent = pitchInput.value;
    });

    volumeInput.addEventListener("input", () => {
        volumeValue.textContent = volumeInput.value;
    });

    // Function to calculate and update word count
    const updateWordCount = () => {
        const text = textInput.value.trim();
        const wordCount = text ? text.split(/\s+/).length : 0;
        wordCountDisplay.textContent = `Word Count: ${wordCount}`;
    };

    // Update word count on input and paste events
    textInput.addEventListener("input", updateWordCount);
    textInput.addEventListener("paste", () => {
        setTimeout(updateWordCount, 0); // Delay to ensure pasted content is included
    });

    // Function to toggle dropdown visibility for voice selection
    const toggleVoiceDropdowns = () => {
        if (voiceSelect.value) {
            elevenLabsVoiceSelect.style.display = "none"; // Hide ElevenLabs dropdown
        } else if (elevenLabsVoiceSelect.value) {
            voiceSelect.style.display = "none"; // Hide Google TTS dropdown
        } else {
            // Show both if neither has a selected value
            voiceSelect.style.display = "block";
            elevenLabsVoiceSelect.style.display = "block";
        }
    };

    // Add event listeners to both dropdowns
    voiceSelect.addEventListener("change", toggleVoiceDropdowns);
    elevenLabsVoiceSelect.addEventListener("change", toggleVoiceDropdowns);

    convertButton.addEventListener("click", async () => {
        const text = textInput.value.trim();
        const voice = voiceSelect.value;
        const speed = speedInput.value;  // Get the latest speed value
        const pitch = pitchInput.value;  // Get the latest pitch value
        const volume = volumeInput.value; // Get the latest volume value
        const translateTo = translateSelect.value;
        const elevenLabsVoice = elevenLabsVoiceSelect.value;

        if (!text) {
            alert("Please enter text to convert.");
            return;
        }

        // Check word count limit
        const wordCount = text.split(/\s+/).length;
        if (wordCount > 1000) {
            alert("Please enter less than 1000 words.");
            return;
        }

        spinnerContainer.style.display = "flex"; // Show spinner

        try {
            let response;
            if (elevenLabsVoice) {
                response = await fetch("/convert-elevenlabs", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ text, voice: elevenLabsVoice, speed, pitch, volume }),
                });
            } else {
                response = await fetch("/convert", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ text, voice, translateTo, speed, pitch, volume }),
                });
            }

            const result = await response.json();

            if (result.success) {
                const filename = result.filename;

                if (filename) {
                    audioLink.href = filename;
                    audioLink.download = filename.split("/").pop();

                    downloadLink.style.display = "block";

                    audioPlayer.src = filename;
                    audioPlayer.style.display = "block";
                    audioPlayer.play();
                } else {
                    alert("Failed to retrieve the filename.");
                }
            } else {
                alert("Failed to convert text to speech. Please try again.");
            }
        } catch (error) {
            console.error(error);
            alert("An error occurred. Please try again.");
        } finally {
            spinnerContainer.style.display = "none"; // Hide spinner
        }
    });
});
