const textInput = document.getElementById("textInput");
const wordCountDisplay = document.getElementById("wordCount");

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

document.getElementById("convertButton").addEventListener("click", async () => {
    const text = textInput.value;
    const voice = document.getElementById("voiceSelect").value;
    const translateTo = document.getElementById("translateSelect").value;

    if (!text.trim()) {
        alert("Please enter some text!");
        return;
    }

    const wordCount = text.trim().split(/\s+/).length;
    if (wordCount > 1000) {
        alert("Please enter below 1000 words.");
        return;
    }

    const spinnerContainer = document.getElementById("spinner-container");
    spinnerContainer.style.display = "flex"; // Show spinner

    try {
        const response = await fetch("/convert", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, voice, translateTo }),
        });

        const result = await response.json();

        if (result.success) {
            const filename = result.filename;

            if (filename) {
                const audioLink = document.getElementById("audioLink");
                audioLink.href = filename;
                audioLink.download = filename.split("/").pop();

                document.getElementById("downloadLink").style.display = "block";

                const audioPlayer = document.getElementById("audioPlayer");
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

