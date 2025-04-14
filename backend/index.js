import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { SessionsClient } from '@google-cloud/dialogflow-cx';
import path from 'path';
import { fileURLToPath } from 'url';
dotenv.config();
const app = express();
const port = process.env.PORT || 5000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('DIAA backend is running 🚀');
});

const projectId = process.env.GOOGLE_PROJECT_ID;  // Use environment variable
const location = process.env.GOOGLE_LOCATION || 'global';  // default to global
const agentId = process.env.GOOGLE_AGENT_ID;  // Use environment variable
const languageCode = 'en';

const sessionClient = new SessionsClient({
  credentials: JSON.parse(fs.readFileSync('./service-account.json'))
});

app.post('/message', async (req, res) => {
  const { message } = req.body;

  const sessionId = Math.random().toString(36).substring(7);
  const sessionPath = sessionClient.projectLocationAgentSessionPath(
    projectId,
    location,
    agentId,
    sessionId
  );

  const request = {
    session: sessionPath,
    queryInput: {
      text: {
        text: message
      },
      languageCode
    }
  };

  try {
    const [response] = await sessionClient.detectIntent(request);
    const result = response.queryResult.responseMessages[0].text.text[0];
    res.json({ reply: result });
  } catch (err) {
    console.error('Dialogflow error:', err);
    res.status(500).json({ reply: "Something went wrong talking to the bot." });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
