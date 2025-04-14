const statusText = document.getElementById("status");
const startBtn = document.getElementById("startBtn");
const muteBtn = document.getElementById("muteBtn");
const stopBtn = document.getElementById("stopBtn");

// Create audio visualizer
const visualizer = document.querySelector('.visualizer');
const BAR_COUNT = 20;
for (let i = 0; i < BAR_COUNT; i++) {
  const bar = document.createElement('div');
  bar.className = 'bar';
  visualizer.appendChild(bar);
}
const bars = visualizer.querySelectorAll('.bar');

// Create two recognition instances - one for English and one for Bengali
const englishRecognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
const bengaliRecognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();

// Set proper language codes
englishRecognition.lang = 'en-US';
bengaliRecognition.lang = 'bn-IN'; // Changed to bn-IN for better Bengali support

// Configure both recognitions
[englishRecognition, bengaliRecognition].forEach(recognition => {
  recognition.interimResults = true;
  recognition.continuous = true;
  recognition.maxAlternatives = 1;
});

let currentRecognition = englishRecognition; // Default to English
let isListening = false;
let voices = [];
let audioContext;
let analyser;
let microphone;
let animationFrame;
let isSpeaking = false;
let speechTimeout = null;

// Get available voices
speechSynthesis.onvoiceschanged = () => {
  voices = speechSynthesis.getVoices();
};

// Initialize audio context for visualization
async function initAudioContext() {
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 256;
  
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    microphone = audioContext.createMediaStreamSource(stream);
    microphone.connect(analyser);
    updateVisualization();
  } catch (err) {
    console.error('Error accessing microphone:', err);
  }
}

function updateVisualization() {
  const dataArray = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(dataArray);
  
  const step = Math.floor(dataArray.length / BAR_COUNT);
  
  bars.forEach((bar, index) => {
    const dataPoint = dataArray[index * step];
    const height = (dataPoint / 255) * 40 + 3;
    bar.style.height = `${height}px`;
  });
  
  animationFrame = requestAnimationFrame(updateVisualization);
}

// Function to switch between languages
function switchLanguage() {
  // Stop current recognition
  if (currentRecognition) {
    currentRecognition.stop();
  }

  // Switch recognition instance
  currentRecognition = (currentRecognition === englishRecognition) ? bengaliRecognition : englishRecognition;
  
  // Update status text and button text
  if (currentRecognition === bengaliRecognition) {
    statusText.innerText = "বাংলায় শুনছি...";
    langBtn.querySelector('span').textContent = "Switch to English";
  } else {
    statusText.innerText = "Listening in English...";
    langBtn.querySelector('span').textContent = "বাংলায় যান";
  }
  
  // Restart recognition if we were listening
  if (isListening && !isSpeaking) {
    setTimeout(() => {
      try {
        currentRecognition.start();
      } catch (error) {
        console.error('Error starting recognition:', error);
        restartRecognition();
      }
    }, 300); // Increased delay for better stability
  }
}

function restartRecognition() {
  try {
    englishRecognition.stop();
    bengaliRecognition.stop();
  } catch (error) {
    console.error('Error stopping recognition:', error);
  }

  if (isListening && !isSpeaking) {
    setTimeout(() => {
      try {
        currentRecognition.start();
      } catch (error) {
        console.error('Error restarting recognition:', error);
      }
    }, 300);
  }
}

// Set up event handlers for both recognitions
[englishRecognition, bengaliRecognition].forEach(recognition => {
  recognition.onstart = function() {
    isListening = true;
    if (!isSpeaking) {
      statusText.innerText = recognition === bengaliRecognition ? "বাংলায় শুনছি..." : "Listening...";
    }
    muteBtn.querySelector('span').textContent = "Stop Speech";
    muteBtn.querySelector('.icon').textContent = "⏹️";
    startBtn.style.display = "none";
    if (!audioContext) initAudioContext();
  };

  recognition.onend = function() {
    if (isListening && !isSpeaking && recognition === currentRecognition) {
      setTimeout(() => {
        if (recognition === currentRecognition && isListening && !isSpeaking) {
          try {
            recognition.start();
          } catch (error) {
            console.error('Error restarting recognition:', error);
          }
        }
      }, 300);
    } else if (!isListening) {
      statusText.innerText = "Click Start to begin listening";
      startBtn.style.display = "flex";
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    }
  };

  recognition.onerror = function(event) {
    console.error('Speech recognition error:', event.error);
    if (event.error === 'not-allowed') {
      statusText.innerText = "Please enable microphone access";
    } else if (event.error === 'no-speech') {
      // Just restart the recognition
      restartRecognition();
    } else {
      statusText.innerText = `Error: ${event.error}`;
      startBtn.style.display = "flex";
    }
  };

  recognition.onresult = function(event) {
    if (isSpeaking) return;
    
    const result = event.results[event.results.length - 1];
    const userText = result[0].transcript;
    
    if (speechTimeout) {
      clearTimeout(speechTimeout);
    }
    
    if (result.isFinal) {
      statusText.innerText = `You: "${userText}"`;
      speechTimeout = setTimeout(() => {
        sendToBot(userText);
      }, 1500); // Reduced delay for better responsiveness
    } else {
      statusText.innerText = `Listening: ${userText}`;
    }
  };
});

startBtn.onclick = function() {
  isListening = true;
  try {
    currentRecognition.start();
  } catch (error) {
    console.error('Error starting recognition:', error);
    setTimeout(() => {
      currentRecognition.start();
    }, 300);
  }
  startBtn.style.display = "none";
};

muteBtn.onclick = function() {
  if (speechSynthesis.speaking) {
    speechSynthesis.cancel();
    isSpeaking = false;
    if (isListening && currentRecognition.state !== 'running') {
      setTimeout(() => {
        try {
          currentRecognition.start();
        } catch (error) {
          console.error('Error starting recognition:', error);
        }
      }, 300);
    }
  }
};

stopBtn.onclick = function() {
  isListening = false;
  try {
    englishRecognition.stop();
    bengaliRecognition.stop();
  } catch (error) {
    console.error('Error stopping recognition:', error);
  }
  speechSynthesis.cancel();
  if (speechTimeout) {
    clearTimeout(speechTimeout);
  }
  statusText.innerText = "Session Ended";
  startBtn.style.display = "flex";
  if (animationFrame) {
    cancelAnimationFrame(animationFrame);
  }
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
};

function sendToBot(text) {
  statusText.innerText = "Processing...";
  
  fetch("https://diaaproject.onrender.com/message", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: text })
  })
  .then(res => {
    if (!res.ok) throw new Error('Network response was not ok');
    return res.json();
  })
  .then(data => {
    speak(data.reply);
  })
  .catch((error) => {
    console.error('Error:', error);
    speak("Sorry, I couldn't process your request at the moment.");
  });
}

function removeEmojis(text) {
  return text
    .replace(/🔇/g, '')
    .replace(/🔊/g, '')
    .replace(/❌/g, '')
    .replace(/[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
}

function speak(text) {
  const cleanText = removeEmojis(text);
  const speech = new SpeechSynthesisUtterance(cleanText);
  
  // Select appropriate voice based on current language
  const preferredVoice = voices.find(voice => {
    if (currentRecognition === bengaliRecognition) {
      return voice.lang.includes('bn') || voice.lang.includes('hi-IN');
    } else {
      return voice.name.includes('female') || 
             voice.name.includes('Samantha') || 
             voice.name.includes('Google US English Female');
    }
  });
  
  if (preferredVoice) {
    speech.voice = preferredVoice;
  }
  
  speech.lang = currentRecognition === bengaliRecognition ? 'bn-IN' : 'en-US';
  speech.rate = currentRecognition === bengaliRecognition ? 0.9 : 1.1; // Slower for Bengali
  speech.pitch = 1.1;
  speech.volume = 1.0;
  
  speech.onstart = () => {
    isSpeaking = true;
    statusText.innerText = `DIAA: "${text}"`;
    currentRecognition.stop();
  };
  
  speech.onend = () => {
    isSpeaking = false;
    setTimeout(() => {
      if (isListening && currentRecognition.state !== 'running') {
        try {
          currentRecognition.start();
        } catch (error) {
          console.error('Error starting recognition:', error);
          restartRecognition();
        }
      }
    }, 1000);
  };

  speechSynthesis.speak(speech);
}

// Add language switch button to HTML
const langBtn = document.createElement('button');
langBtn.id = 'langBtn';
langBtn.innerHTML = `
  <div class="icon">🌐</div>
  <span>বাংলায় কথা বলুন</span>
`;
langBtn.onclick = switchLanguage;
document.querySelector('.controls').appendChild(langBtn);

// Start recognition when page loads
window.addEventListener('load', () => {
  setTimeout(() => {
    try {
      currentRecognition.start();
    } catch (error) {
      console.error('Error starting initial recognition:', error);
      setTimeout(() => {
        currentRecognition.start();
      }, 300);
    }
  }, 1000);
});
