import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { analyzeStrategicDiff, simulateWarGameScenario, generateBatchComparison } from './aiService.js';
import { scrapeLivePricingPage, extractAndAnalyzeLive } from './scrapeService.js';
import { computePricingDiff } from './diffEngine.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = process.env.VERCEL ? '/tmp/snapshots.json' : path.join(__dirname, 'snapshots.json');

function getDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    }
  } catch {
    // Fallback for serverless or read errors
  }
  return {};
}

function saveDatabase(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Storage Notice] Read-only or ephemeral environment file write skipped:', err.message);
  }
}

const app = express();
app.use(cors());
app.use(express.json());

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'MarketPulse AI Backend' });
});

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

    let diff = null;
    let firstCrawl = false;

    if (history.length > 0) {
      const previousSnapshot = history[history.length - 1];
      diff = computePricingDiff(previousSnapshot, liveSnapshot);
    } else {
      firstCrawl = true;
    }

    history.push(liveSnapshot);
    db[companyKey] = history;
    saveDatabase(db);

    res.json({
      status: 'success',
      total_historical_crawls: history.length,
      current: liveSnapshot,
      diff: diff,
      first_crawl: firstCrawl,
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

// Batch Comparison Analysis Route
app.post('/api/analyze-batch', async (req, res) => {
  try {
    const { results } = req.body;
    if (!results || !Array.isArray(results) || results.length < 2) {
      return res.status(400).json({ error: 'At least 2 target results are required for batch analysis.' });
    }
    const analysis = await generateBatchComparison(results);
    res.json({ analysis });
  } catch (err) {
    console.error('[Batch Analysis Error]', err.message);
    res.status(500).json({ error: err.message });
  }
});


if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`MarketPulse Real Engine running on http://localhost:${PORT}`));
}

export default app;