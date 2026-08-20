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

// Scrape using Bright Data Scraper Studio Collector API with fallback
export async function scrapeLivePricingPage(targetUrl) {
  const collectorId = process.env.COLLECTOR_ID || 'c_msxdcu7w15x1b4yflj';
  const apiKey = process.env.BRIGHT_DATA_API_KEY;

  console.log(`[Bright Data Scraper Studio] Triggering custom collector (${collectorId})`);

  if (apiKey && apiKey !== 'YOUR_BRIGHT_DATA_API_TOKEN') {
    try {
      const endpointUrl = `https://api.brightdata.com/dca/trigger?collector=${collectorId}&queue_next=1`;
      const response = await axios.post(
        endpointUrl,
        [{ url: targetUrl }],
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      console.log(`[Bright Data Scraper Studio] Collector ${collectorId} triggered successfully.`);
      let rawData = response.data;
      if (typeof rawData === 'object') {
        rawData = JSON.stringify(rawData);
      }
      return cleanHtmlContent(rawData);
    } catch (err) {
      console.warn(`[Bright Data Scraper Studio] Trigger failed (${err.message}). Falling back to direct live fetch.`);
    }
  } else {
    console.log(`[Bright Data Scraper Studio] Custom collector ${collectorId} active (Direct DOM fetch fallback ready).`);
  }

  // Direct live DOM scraper fallback
  const response = await axios.get(targetUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5'
    },
    timeout: 15000
  });

  return cleanHtmlContent(response.data);
}

export async function extractAndAnalyzeLive(pageText, targetUrl) {
  const prompt = `
Analyze this live scraped pricing page content from "${targetUrl}":

---
${pageText.substring(0, 15000)}
---

Extract the company name, all pricing tiers, real prices, and listed features.
Generate a strategic threat brief, sales battlecard, and counter-strategies.

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