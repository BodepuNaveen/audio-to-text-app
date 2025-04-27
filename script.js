async function transcribeAudio() {
  const fileInput = document.getElementById('audioFile');
  const file = fileInput.files[0];
  if (!file) {
    alert('Please select an audio file!');
    return;
  }

  const apiKey = 'a1b381ccd87f469b9ea60f78b02ece0c'; // AssemblyAI API Key

  document.getElementById('outputText').value = "⏳ Please wait... transcribing and summarizing the call...";

  const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
    method: 'POST',
    headers: { 'authorization': apiKey },
    body: file
  });

  const uploadData = await uploadResponse.json();
  const audioUrl = uploadData.upload_url;

  const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
    method: 'POST',
    headers: {
      'authorization': apiKey,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      audio_url: audioUrl,
      speaker_labels: true
    })
  });

  const transcriptData = await transcriptResponse.json();
  const transcriptId = transcriptData.id;

  let completed = false;
  let fullTranscript = "";

  while (!completed) {
    console.log("Checking transcription status...");
    const checkResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
      headers: { 'authorization': apiKey }
    });
    const checkData = await checkResponse.json();

    console.log("Transcription status:", checkData.status);

    if (checkData.status === 'completed') {
      completed = true;

      if (checkData.words) {
        let conversation = "";
        let speakerMapping = {}; // Track speaker mapping
        let speakerCount = 0;
        let currentSpeaker = "";

        checkData.words.forEach(wordInfo => {
          if (wordInfo.speaker !== currentSpeaker) {
            currentSpeaker = wordInfo.speaker;

            if (!(currentSpeaker in speakerMapping)) {
              speakerMapping[currentSpeaker] = speakerCount === 0 ? "Agent" : "Customer";
              speakerCount++;
            }
            conversation += `\n${speakerMapping[currentSpeaker]}: `;
          }
          conversation += wordInfo.text + " ";
        });

        fullTranscript = conversation;
      } else {
        fullTranscript = checkData.text;
      }

      document.getElementById('outputText').value = fullTranscript + "\n\n--- CALL SUMMARY ---\nLoading summary...";

      summarizeConversation(fullTranscript);

    } else if (checkData.status === 'failed') {
      alert('Transcription failed!');
      document.getElementById('outputText').value = "❌ Transcription failed. Please try again.";
      return;
    } else {
      await new Promise(resolve => setTimeout(resolve, 3000)); // wait 3 seconds
    }
  }
}

// 🔥 Summarize using your own Proxy Server (NO CORS issues)
async function summarizeConversation(text) {
  console.log("Sending text to Proxy Summarizer...");

  const response = await fetch('https://summarise-sooty.vercel.app/api/summarize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ text: text })
  });

  const data = await response.json();
  console.log("Summary Data:", data);

  let summaryText = "Summary not available.";

  if (data && data.summary) {
    summaryText = data.summary.trim();
  } else if (data.error) {
    summaryText = "Error from summarizer: " + data.error;
  }

  const oldText = document.getElementById('outputText').value.split("\n\n--- CALL SUMMARY ---")[0];
  document.getElementById('outputText').value = oldText + "\n\n--- CALL SUMMARY ---\n" + summaryText;
}

function downloadText() {
  const text = document.getElementById('outputText').value;
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "transcription_summary.txt";
  link.click();
}

