import fs from 'fs';
import path from 'path';

function extractKey() {
  const envPath = path.resolve('.env.production.local');
  if (!fs.existsSync(envPath)) {
    console.error('Error: .env.production.local does not exist!');
    process.exit(1);
  }

  const content = fs.readFileSync(envPath, 'utf-8');
  // Match FIREBASE_ADMIN_KEY="<json>" or similar
  const match = content.match(/FIREBASE_ADMIN_KEY\s*=\s*["']?(\{[\s\S]+?\})["']?\s*(?:\r?\n|$)/);
  if (!match) {
    console.error('Error: FIREBASE_ADMIN_KEY not found or not in expected JSON format in .env.production.local');
    process.exit(1);
  }

  const jsonString = match[1];
  try {
    const parsed = JSON.parse(jsonString);
    const outputPath = path.resolve('service-account-key.json');
    fs.writeFileSync(outputPath, JSON.stringify(parsed, null, 2), 'utf-8');
    console.log(`Successfully extracted Firebase Admin service account key to: ${outputPath}`);
  } catch (err) {
    console.error('Error parsing FIREBASE_ADMIN_KEY JSON:', err.message);
    process.exit(1);
  }
}

extractKey();
