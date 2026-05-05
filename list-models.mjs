import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const keyMatch = envContent.match(/GEMINI_API_KEY=(.*)/);
const key = keyMatch ? keyMatch[1].trim() : null;

if (!key) {
  console.error("GEMINI_API_KEY not found in .env");
  process.exit(1);
}

async function listModels() {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    const data = await response.json();
    if (data.models) {
      console.log("Available models:");
      data.models.forEach(m => console.log(`- ${m.name.replace('models/', '')} (Methods: ${m.supportedGenerationMethods?.join(', ')})`));
    } else {
      console.log(data);
    }
  } catch (error) {
    console.error("Error fetching models:", error);
  }
}

listModels();
