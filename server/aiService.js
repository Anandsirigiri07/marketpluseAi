import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function analyzeStrategicDiff(diffData, competitorName) {
  const prompt = `
Analyze these competitor pricing and packaging details for ${competitorName}:

${JSON.stringify(diffData, null, 2)}

Provide an executive strategic brief strictly in JSON matching this schema:
{
  "headline": "Punchy 1-sentence strategic summary",
  "threat_level": "HIGH",
  "threat_score": 85,
  "vulnerability_area": "Pricing Elasticity / Developer Trust / Support Unbundling",
  "strategic_intent": "Deep analysis of why this move was made and unit economic drivers",
  "executive_takeaways": [
    "Product Management Takeaway",
    "Sales & GTM Takeaway",
    "Market Defensibility Takeaway"
  ],
  "counter_strategies": [
    "Counter-move 1 with tactical rollout",
    "Counter-move 2 with tactical rollout"
  ],
  "sales_battlecard": {
    "killer_question": "One disqualifying question sales reps should ask prospects evaluating them",
    "pitch_objection_handling": [
      {
        "prospect_says": "Common objection prospect will raise",
        "our_rep_reply": "High-impact counter-response"
      }
    ],
    "trap_setting": "How to box this competitor into their weakness"
  }
}
`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.6-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      temperature: 0.2
    }
  });

  return JSON.parse(response.text);
}

export async function simulateWarGameScenario(competitorDiff, counterMove, competitorName) {
  const prompt = `
Competitor: ${competitorName}
Pricing Context: ${JSON.stringify(competitorDiff, null, 2)}
Proposed Counter-Move: "${counterMove}"

Forecast the strategic outcome strictly in JSON matching this schema:
{
  "market_share_impact": "+4.8% acquisition",
  "developer_sentiment": "FAVORABLE",
  "margin_risk_level": "MODERATE",
  "simulation_verdict": "2 concise sentences evaluating user adoption and margin viability.",
  "projected_competitor_response": "1 concise sentence predicting competitor 60-day reaction."
}
`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.6-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      temperature: 0.2
    }
  });

  return JSON.parse(response.text);
}