import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { analyzeStrategicDiff, simulateWarGameScenario } from './aiService.js';
import { scrapeLivePricingPage, extractAndAnalyzeLive } from './scrapeService.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'snapshots.json');

if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({}), 'utf-8');
}

function getDatabase() {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function saveDatabase(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

const app = express();
app.use(cors());
app.use(express.json());

// Live Crawl Route
app.post('/api/crawl-live', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'A valid target URL is required.' });

  try {
    console.log(`[Real Crawl] Scraping live pricing from: ${url}`);
    const rawMarkdown = await scrapeLivePricingPage(url);

    console.log(`[Gemini Engine] Analyzing real scraped DOM content...`);
    const result = await extractAndAnalyzeLive(rawMarkdown, url);

    const liveSnapshot = {
      company_name: result.company_name,
      pricing_tiers: result.pricing_tiers,
      scraped_at: new Date().toISOString(),
      target_url: url
    };

    const db = getDatabase();
    const companyKey = (liveSnapshot.company_name || 'competitor').toLowerCase().trim();
    const history = db[companyKey] || [];
    history.push(liveSnapshot);
    db[companyKey] = history;
    saveDatabase(db);

    res.json({
      status: 'success',
      total_historical_crawls: history.length,
      current: liveSnapshot,
      diff: { company: liveSnapshot.company_name, pricing_tiers: liveSnapshot.pricing_tiers },
      intelligence: result.intelligence
    });
  } catch (err) {
    console.error('[Crawl Error]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// War Game Simulation Route
app.post('/api/simulate-wargame', async (req, res) => {
  try {
    const { diffData, counterMove, companyName } = req.body;
    const simulation = await simulateWarGameScenario(diffData, counterMove, companyName);
    res.json({ simulation });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`MarketPulse Real Engine running on http://localhost:${PORT}`));