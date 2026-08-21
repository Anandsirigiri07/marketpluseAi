import axios from 'axios';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Clean HTML to extracted DOM text
function cleanHtmlContent(html) {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ')
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Scrape using Bright Data Scraper Studio Collector API exclusively (no fallback)
export async function scrapeLivePricingPage(targetUrl, companyName) {
  const collectorId = process.env.COLLECTOR_ID;
  const apiKey = process.env.BRIGHT_DATA_API_KEY;

  if (!apiKey || apiKey === 'YOUR_BRIGHT_DATA_API_TOKEN' || !collectorId || collectorId === 'YOUR_COLLECTOR_ID') {
    throw new Error('BRIGHT_DATA_API_KEY/COLLECTOR_ID not configured — cannot scrape without Scraper Studio.');
  }

  let derivedName = companyName;
  if (!derivedName) {
    try {
      const hostname = new URL(targetUrl).hostname.replace(/^www\./, '');
      derivedName = hostname.split('.')[0];
      derivedName = derivedName.charAt(0).toUpperCase() + derivedName.slice(1);
    } catch {
      derivedName = 'Competitor';
    }
  }

  console.log(`[BRIGHT DATA EXCLUSIVE] Triggering Collector: ${collectorId}`);

  const endpointUrl = `https://api.brightdata.com/dca/trigger?collector=${collectorId}&queue_next=1`;
  const response = await axios.post(
    endpointUrl,
    [{ url: targetUrl, company_name: derivedName }],
    {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    }
  );

  console.log(`[BRIGHT DATA SUCCESS] Status: ${response.status}`);
  let rawData = response.data;
  if (typeof rawData === 'object') {
    rawData = JSON.stringify(rawData);
  }
  return cleanHtmlContent(rawData);
}

export async function extractAndAnalyzeLive(pageText, targetUrl) {
  const prompt = `
Analyze this live scraped pricing page content from "${targetUrl}":

---
${pageText.substring(0, 15000)}
---

Extract the company name, all pricing tiers, real prices, and listed features.
Generate a strategic threat brief, sales battlecard, and counter-strategies.

CRITICAL EXTRACTION RULES FOR CONSISTENCY:
- Always format recurring monthly prices in the exact pattern "$X/mo" (e.g., "$0/mo", "$25/mo", "$599/mo") consistently.
- Phrase each feature bullet exactly as it appears in the visible page text as closely as possible, without paraphrasing or rewording, so that repeated crawls of an unchanged page produce matching text.

Respond strictly in JSON matching this schema:
{
  "company_name": "Company Name",
  "pricing_tiers": [
    {
      "tier_name": "Tier Name",
      "price": "$0/mo, $25/mo, Custom, etc.",
      "features": ["Feature 1", "Feature 2", "Feature 3"]
    }
  ],
  "intelligence": {
    "headline": "1-sentence strategic summary of their packaging posture",
    "threat_level": "HIGH",
    "threat_score": 85,
    "strategic_intent": "Strategic intent behind this pricing model",
    "executive_takeaways": [
      "Product takeaway",
      "Sales/GTM takeaway",
      "Market defensibility takeaway"
    ],
    "counter_strategies": [
      "Actionable counter-move 1",
      "Actionable counter-move 2"
    ],
    "sales_battlecard": {
      "killer_question": "One disqualifying question sales reps ask prospects",
      "pitch_objection_handling": [
        {
          "prospect_says": "Common prospect objection",
          "our_rep_reply": "High-impact counter response"
        }
      ],
      "trap_setting": "How to trap this competitor in sales calls"
    }
  }
}
`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.6-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      temperature: 0.1
    }
  });

  return JSON.parse(response.text);
}