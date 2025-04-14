const statusText = document.getElementById("status");

const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.lang = 'en-US';
recognition.interimResults = false;

recognition.onresult = function(event) {
  const userText = event.results[0][0].transcript;
  statusText.innerText = `You: "${userText}"`;
  sendToBot(userText);
};

recognition.onend = () => recognition.start();
recognition.start();

document.getElementById("muteBtn").onclick = () => speechSynthesis.cancel();
document.getElementById("stopBtn").onclick = () => {
  recognition.stop();
  statusText.innerText = "Session Ended";
};

function sendToBot(text) {
  fetch("https://diaaproject.onrender.com/message", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: text })
  })
  .then(res => res.json())
  .then(data => {
    speak(data.reply);
  })
  .catch(() => {
    speak("Sorry, the bot is offline.");
  });
}

function speak(text) {
  const speech = new SpeechSynthesisUtterance(text);
  speech.lang = 'en-US';
  speechSynthesis.speak(speech);
  statusText.innerText = `Bot: "${text}"`;
}
