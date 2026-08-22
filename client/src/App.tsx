import { useState } from 'react';
import axios from 'axios';
import { 
  TrendingUp, 
  Sparkles, 
  RefreshCw, 
  PlusCircle, 
  Target, 
  Zap, 
  Download, 
  Swords, 
  Bot, 
  CheckCircle2, 
  AlertTriangle,
  Play,
  Globe,
  Radio,
  History
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';

interface BatchResultItem {
  company_name: string;
  url: string;
  pricing_tiers: any[];
  threat_score: number;
  scraped_at: string;
  status: 'success' | 'failed';
}

const LIVE_TARGETS = [
  { name: 'Supabase', url: 'https://supabase.com/pricing' },
  { name: 'Resend', url: 'https://resend.com/pricing' },
  { name: 'Neon', url: 'https://neon.tech/pricing' },
  { name: 'Vercel', url: 'https://vercel.com/pricing' }
];


export default function App() {
  const [targetUrl, setTargetUrl] = useState('https://supabase.com/pricing');
  const [companyName, setCompanyName] = useState('Supabase');
  const [crawlStatus, setCrawlStatus] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'brief' | 'battlecard' | 'wargame'>('brief');
  
  const [report, setReport] = useState<any>(null);
  const [diffData, setDiffData] = useState<any>(null);
  const [currentSnapshot, setCurrentSnapshot] = useState<any>(null);
  const [crawlCount, setCrawlCount] = useState(0);

  // War Game simulator state
  const [counterMove, setCounterMove] = useState('Offer free automated migrations and guarantee 20% lower compute costs');
  const [simLoading, setSimLoading] = useState(false);
  const [simulationResult, setSimulationResult] = useState<any>(null);

  // Multi-target batch crawling state
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const [batchResults, setBatchResults] = useState<BatchResultItem[]>([]);
  const [batchLoading, setBatchLoading] = useState<boolean>(false);
  const [batchProgress, setBatchProgress] = useState<string>('');

  const executeBatchCrawl = async () => {
    if (selectedTargets.length === 0 || selectedTargets.length > 5 || batchLoading || loading) return;

    setBatchLoading(true);
    setBatchResults([]);
    setBatchProgress('');

    const targetsToCrawl = LIVE_TARGETS.filter(t => selectedTargets.includes(t.name));
    const total = targetsToCrawl.length;
    const results: BatchResultItem[] = [];

    for (let i = 0; i < total; i++) {
      const target = targetsToCrawl[i];
      setBatchProgress(`Crawling ${i + 1} of ${total}: ${target.name}...`);

      let success = false;
      let responseData: any = null;

      try {
        const res = await axios.post(`${API_BASE}/api/crawl-live`, {
          url: target.url,
          companyName: target.name
        });
        responseData = res.data;
        success = true;
      } catch (err: any) {
        const status = err.response?.status;
        const errMsg = String(err.message || '').toLowerCase();
        const errDataMsg = String(err.response?.data?.error || '').toLowerCase();
        const isRateLimit = status === 429 || errMsg.includes('429') || errMsg.includes('rate limit') || errDataMsg.includes('rate limit');

        if (isRateLimit) {
          setBatchProgress(`Rate limited on ${target.name}. Retrying in 5s...`);
          await new Promise(r => setTimeout(r, 5000));
          try {
            const retryRes = await axios.post(`${API_BASE}/api/crawl-live`, {
              url: target.url,
              companyName: target.name
            });
            responseData = retryRes.data;
            success = true;
          } catch (retryErr: any) {
            success = false;
          }
        } else {
          success = false;
        }
      }

      if (success && responseData) {
        const item: BatchResultItem = {
          company_name: responseData.current?.company_name || target.name,
          url: responseData.current?.target_url || target.url,
          pricing_tiers: responseData.current?.pricing_tiers || [],
          threat_score: responseData.intelligence?.threat_score ?? 80,
          scraped_at: responseData.current?.scraped_at || new Date().toISOString(),
          status: 'success'
        };
        results.push(item);
        setBatchResults(prev => [...prev, item]);
      } else {
        const item: BatchResultItem = {
          company_name: target.name,
          url: target.url,
          pricing_tiers: [],
          threat_score: 0,
          scraped_at: new Date().toISOString(),
          status: 'failed'
        };
        results.push(item);
        setBatchResults(prev => [...prev, item]);
      }

      if (i < total - 1) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    const succeededCount = results.filter(r => r.status === 'success').length;
    setBatchLoading(false);
    setBatchProgress(`${succeededCount} of ${total} succeeded`);
  };

  const COMPANY_COLORS = ['#38bdf8', '#6366f1', '#34d399', '#f43f5e', '#fbbf24'];

  const parsePriceString = (priceStr: any): number | null => {
    if (!priceStr || typeof priceStr !== 'string') return null;
    const lower = priceStr.toLowerCase();
    if (lower.includes('custom') || lower.includes('contact') || lower.includes('sales')) {
      return null;
    }
    const cleaned = priceStr.replace(/[^0-9.]/g, '');
    if (!cleaned) return null;
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  };

  const successfulResults = batchResults.filter(r => r.status === 'success');
  const failedResults = batchResults.filter(r => r.status === 'failed');

  const threatChartData = successfulResults.map(r => ({
    company_name: r.company_name,
    threat_score: r.threat_score
  }));

  const successfulCompanies = successfulResults.map(r => r.company_name);

  const tierMap: Record<string, Record<string, number>> = {};
  successfulResults.forEach(r => {
    (r.pricing_tiers || []).forEach((t: any) => {
      if (!t || !t.tier_name) return;
      const numPrice = parsePriceString(t.price);
      if (numPrice === null) return;
      if (!tierMap[t.tier_name]) {
        tierMap[t.tier_name] = {};
      }
      tierMap[t.tier_name][r.company_name] = numPrice;
    });
  });

  const pricingChartData = Object.keys(tierMap).map(tierName => ({
    tier_name: tierName,
    ...tierMap[tierName]
  }));

  const API_BASE = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '');

  const executeLiveCrawl = async (urlToCrawl = targetUrl, compName = companyName) => {
    setLoading(true);
    setSimulationResult(null);
    setCrawlStatus('🌐 Fetching live DOM markdown from target URL...');

    try {
      setTimeout(() => setCrawlStatus('🤖 Gemini extracting structured pricing matrix...'), 2000);
      setTimeout(() => setCrawlStatus('⚖️ Computing diff against historical crawl records...'), 4500);

      const res = await axios.post(`${API_BASE}/api/crawl-live`, {
        url: urlToCrawl,
        companyName: compName
      });

      setCurrentSnapshot(res.data.current);
      setDiffData(res.data.diff);
      setReport(res.data.intelligence);
      setCrawlCount(res.data.total_historical_crawls);
    } catch (err: any) {
      alert('Live crawl failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
      setCrawlStatus('');
    }
  };

  const runWarGame = async () => {
    if (!currentSnapshot && !diffData) {
      alert("Please run a live crawl first to ingest pricing data before simulating.");
      return;
    }
    if (!counterMove || !counterMove.trim()) {
      alert("Please enter a strategic counter-move before simulating.");
      return;
    }
    setSimLoading(true);
    try {
      const contextData = diffData || {
        company: currentSnapshot?.company_name || companyName,
        pricing_tiers: currentSnapshot?.pricing_tiers || []
      };
      const res = await axios.post(`${API_BASE}/api/simulate-wargame`, {
        diffData: contextData,
        counterMove: counterMove.trim(),
        companyName: currentSnapshot?.company_name || companyName
      });
      setSimulationResult(res.data.simulation);
    } catch (err: any) {
      alert('War game simulation failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setSimLoading(false);
    }
  };

  const handleDownload = () => {
    if (!report) return;
    const md = `# MarketPulse AI - Live Intelligence Dossier
**Competitor:** ${currentSnapshot?.company_name || companyName}
**Live URL:** ${targetUrl}
**Threat Score:** ${report.threat_score || 80}/100 (${report.threat_level})
**Scraped At:** ${currentSnapshot?.scraped_at || new Date().toISOString()}

## Executive Summary
> "${report.headline}"

### Strategic Intent
${report.strategic_intent}

## Sales Battlecard
**Killer AE Question:**
> "${report.sales_battlecard?.killer_question}"

**Trap Setting:**
${report.sales_battlecard?.trap_setting}
`;
    const blob = new Blob([md], { type: 'text/markdown' });
    const u = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = u;
    a.download = `${(currentSnapshot?.company_name || companyName).toLowerCase()}-live-intel.md`;
    a.click();
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#070b14', color: '#e2e8f0', fontFamily: 'Inter, sans-serif', padding: '28px' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        
        {/* Header */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #1e293b', paddingBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)', padding: '10px', borderRadius: '12px', boxShadow: '0 0 20px rgba(99,102,241,0.4)' }}>
              <TrendingUp size={26} color="#fff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: '800', margin: 0, letterSpacing: '-0.5px' }}>MarketPulse AI</h1>
                <span style={{ fontSize: '10px', background: '#065f46', color: '#34d399', padding: '3px 8px', borderRadius: '10px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Radio size={10} /> LIVE SCRAPING ENGINE
                </span>
              </div>
              <p style={{ fontSize: '13px', color: '#94a3b8', margin: '3px 0 0 0' }}>Real-time Competitor Packaging Intelligence & Automated Battlecard Generator</p>
            </div>
          </div>

          <button 
            onClick={handleDownload}
            disabled={!report}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#1e293b', border: '1px solid #334155', color: '#cbd5e1', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
          >
            <Download size={15} /> Export Dossier
          </button>
        </header>

        {/* Live URL Input Panel */}
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', padding: '20px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
            <label style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>
              Target Real-World SaaS Pricing Page
            </label>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', color: '#64748b' }}>Quick Target:</span>
              {LIVE_TARGETS.map(t => (
                <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <input
                    type="checkbox"
                    checked={selectedTargets.includes(t.name)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedTargets(prev => [...prev, t.name]);
                      } else {
                        setSelectedTargets(prev => prev.filter(name => name !== t.name));
                      }
                    }}
                    style={{ cursor: 'pointer', accentColor: '#38bdf8' }}
                  />
                  <button
                    onClick={() => {
                      setCompanyName(t.name);
                      setTargetUrl(t.url);
                      executeLiveCrawl(t.url, t.name);
                    }}
                    style={{ background: '#1e293b', border: '1px solid #334155', color: '#94a3b8', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}
                  >
                    {t.name}
                  </button>
                </div>
              ))}

              <button
                onClick={executeBatchCrawl}
                disabled={selectedTargets.length === 0 || selectedTargets.length > 5 || batchLoading || loading}
                style={{
                  background: (selectedTargets.length === 0 || selectedTargets.length > 5 || batchLoading || loading) 
                    ? '#1e293b' 
                    : 'linear-gradient(135deg, #0284c7, #0369a1)',
                  color: (selectedTargets.length === 0 || selectedTargets.length > 5 || batchLoading || loading) ? '#64748b' : '#fff',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: (selectedTargets.length === 0 || selectedTargets.length > 5 || batchLoading || loading) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {batchLoading ? <RefreshCw size={13} className="spin" /> : <Play size={13} />}
                Crawl Selected ({selectedTargets.length})
              </button>
            </div>
          </div>

          {selectedTargets.length > 5 && (
            <div style={{ marginBottom: '12px', fontSize: '12px', color: '#ef4444', fontWeight: '600' }}>
              ⚠️ Max 5 targets per batch to stay within free API limits
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2.5fr auto', gap: '12px', alignItems: 'center' }}>
            <input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Company Name"
              style={{ background: '#070b14', border: '1px solid #334155', borderRadius: '8px', padding: '12px 14px', color: '#fff', outline: 'none', fontSize: '14px' }}
            />
            <div style={{ display: 'flex', alignItems: 'center', background: '#070b14', border: '1px solid #334155', borderRadius: '8px', padding: '0 12px' }}>
              <Globe size={16} color="#64748b" />
              <input
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder="https://example.com/pricing"
                style={{ width: '100%', background: 'transparent', border: 'none', padding: '12px 10px', color: '#fff', outline: 'none', fontSize: '14px' }}
              />
            </div>
            <button
              onClick={() => executeLiveCrawl(targetUrl, companyName)}
              disabled={loading || batchLoading}
              style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff', border: 'none', borderRadius: '8px', padding: '12px 22px', fontWeight: '700', cursor: (loading || batchLoading) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}
            >
              {loading ? <RefreshCw size={16} className="spin" /> : <Zap size={16} />}
              {loading ? 'Crawling Live...' : 'Crawl & Analyze'}
            </button>
          </div>

          {crawlStatus && (
            <div style={{ marginTop: '14px', fontSize: '13px', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <RefreshCw size={14} className="spin" /> {crawlStatus}
            </div>
          )}

          {batchProgress && (
            <div style={{ marginTop: '14px', fontSize: '13px', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {batchLoading ? <RefreshCw size={14} className="spin" /> : <CheckCircle2 size={14} color="#34d399" />}
              <span>{batchProgress}</span>
            </div>
          )}
        </div>

        {/* Real Crawl Metadata Info */}
        {currentSnapshot && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#070b14', border: '1px solid #1e293b', borderRadius: '10px', padding: '10px 16px', marginBottom: '20px', fontSize: '12px', color: '#94a3b8' }}>
            <div>
              <strong style={{ color: '#f8fafc' }}>Live Target:</strong> {currentSnapshot.company_name} &bull; <span style={{ color: '#38bdf8' }}>{currentSnapshot.target_url}</span>
            </div>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <History size={13} /> Saved History Crawls: <strong style={{ color: '#f8fafc' }}>{crawlCount}</strong>
              </span>
              <span>Crawled: <strong style={{ color: '#f8fafc' }}>{new Date(currentSnapshot.scraped_at).toLocaleTimeString()}</strong></span>
            </div>
          </div>
        )}

        {/* Competitor Comparison Section */}
        {successfulResults.length >= 2 && (
          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', padding: '24px', marginBottom: '20px' }}>
            <div style={{ marginBottom: '18px' }}>
              <span style={{ fontSize: '11px', fontWeight: '800', letterSpacing: '1px', color: '#38bdf8', textTransform: 'uppercase' }}>MULTI-TARGET BATCH ANALYTICS</span>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#f8fafc', margin: '4px 0 0 0' }}>Competitor Comparison</h2>
              <p style={{ fontSize: '13px', color: '#94a3b8', margin: '2px 0 0 0' }}>
                Side-by-side threat evaluation & pricing tier matrix
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
              {/* Chart 1: Threat Score per company */}
              <div style={{ background: '#070b14', border: '1px solid #1e293b', borderRadius: '12px', padding: '18px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#cbd5e1', marginBottom: '14px' }}>Threat Score by Competitor (0–100)</h3>
                <div style={{ width: '100%', height: '260px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={threatChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="company_name" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                      <YAxis domain={[0, 100]} stroke="#94a3b8" tick={{ fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc', fontSize: '12px' }}
                        itemStyle={{ color: '#38bdf8' }}
                      />
                      <Bar dataKey="threat_score" name="Threat Score" fill="#6366f1" radius={[4, 4, 0, 0]}>
                        {threatChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.threat_score >= 80 ? '#f43f5e' : entry.threat_score >= 60 ? '#f59e0b' : '#38bdf8'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 2: Price per tier per company */}
              <div style={{ background: '#070b14', border: '1px solid #1e293b', borderRadius: '12px', padding: '18px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#cbd5e1', marginBottom: '14px' }}>Pricing per Tier by Competitor ($)</h3>
                <div style={{ width: '100%', height: '260px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={pricingChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="tier_name" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                      <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} unit="$" />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc', fontSize: '12px' }}
                        formatter={(value: any) => [`$${value}`, 'Price']}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                      {successfulCompanies.map((compName, idx) => (
                        <Bar
                          key={compName}
                          dataKey={compName}
                          name={compName}
                          fill={COMPANY_COLORS[idx % COMPANY_COLORS.length]}
                          radius={[4, 4, 0, 0]}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Inline note for failed targets */}
        {failedResults.length > 0 && !batchLoading && (
          <div style={{ marginBottom: '20px', padding: '12px 16px', background: '#1c1917', border: '1px solid #78350f', borderRadius: '10px', fontSize: '13px', color: '#fef08a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={16} color="#f59e0b" style={{ flexShrink: 0 }} />
            <span>
              <strong>Batch Note:</strong> The following target(s) failed during batch crawl: <strong>{failedResults.map(r => r.company_name).join(', ')}</strong>. You can retry them individually using the single-crawl flow above.
            </span>
          </div>
        )}

        {/* Tab Selection */}
        {report && (
          <>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid #1e293b', paddingBottom: '8px' }}>
              <button 
                onClick={() => setActiveTab('brief')}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', background: activeTab === 'brief' ? '#1e293b' : 'transparent', color: activeTab === 'brief' ? '#38bdf8' : '#94a3b8', border: 'none', padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '14px' }}
              >
                <Sparkles size={16} /> Executive Threat Brief
              </button>
              <button 
                onClick={() => setActiveTab('battlecard')}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', background: activeTab === 'battlecard' ? '#1e293b' : 'transparent', color: activeTab === 'battlecard' ? '#38bdf8' : '#94a3b8', border: 'none', padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '14px' }}
              >
                <Swords size={16} /> Sales Battlecard (Deal Weapon)
              </button>
              <button 
                onClick={() => setActiveTab('wargame')}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', background: activeTab === 'wargame' ? '#1e293b' : 'transparent', color: activeTab === 'wargame' ? '#38bdf8' : '#94a3b8', border: 'none', padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '14px' }}
              >
                <Bot size={16} /> War Room Simulator
              </button>
            </div>

            {/* TAB 1: EXECUTIVE BRIEF */}
            {activeTab === 'brief' && (
              <div>
                <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div>
                      <span style={{ fontSize: '11px', fontWeight: '800', letterSpacing: '1px', color: '#6366f1', textTransform: 'uppercase' }}>LIVE PACKAGING ANALYSIS</span>
                      <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#f8fafc', margin: '4px 0 0 0' }}>{report.headline}</h2>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '24px', fontWeight: '900', color: report.threat_level === 'HIGH' ? '#ef4444' : '#10b981' }}>
                        {report.threat_score || 78}<span style={{ fontSize: '14px', color: '#64748b' }}>/100</span>
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8' }}>THREAT SCORE</span>
                    </div>
                  </div>

                  <div style={{ background: '#1e293b', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
                    <p style={{ margin: 0, fontSize: '14px', color: '#cbd5e1', lineHeight: '1.6' }}>
                      <strong style={{ color: '#38bdf8' }}>Strategic Intent:</strong> {report.strategic_intent}
                    </p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div style={{ background: '#070b14', padding: '18px', borderRadius: '12px', border: '1px solid #1e293b' }}>
                      <h3 style={{ fontSize: '13px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Target size={15} color="#60a5fa" /> Executive Takeaways
                      </h3>
                      <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: '#cbd5e1', lineHeight: '1.8' }}>
                        {report.executive_takeaways?.map((item: string, i: number) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>

                    <div style={{ background: '#070b14', padding: '18px', borderRadius: '12px', border: '1px solid #1e293b' }}>
                      <h3 style={{ fontSize: '13px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Zap size={15} color="#34d399" /> Recommended Counter-Strategies
                      </h3>
                      <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: '#cbd5e1', lineHeight: '1.8' }}>
                        {report.counter_strategies?.map((item: string, i: number) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Live Extracted Tiers */}
                <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '14px' }}>Live Extracted Pricing Tiers</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                  {currentSnapshot?.pricing_tiers?.map((curr: any, idx: number) => (
                    <div key={idx} style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '18px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <span style={{ fontSize: '16px', fontWeight: '700' }}>{curr.tier_name}</span>
                        <span style={{ fontSize: '15px', fontWeight: '700', color: '#38bdf8' }}>{curr.price}</span>
                      </div>
                      <div style={{ borderTop: '1px solid #1e293b', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {curr.features?.map((f: string, fIdx: number) => (
                          <div key={fIdx} style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <PlusCircle size={12} color="#34d399" /> {f}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 2: SALES BATTLECARD */}
            {activeTab === 'battlecard' && (
              <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                  <Swords size={22} color="#f43f5e" />
                  <div>
                    <h2 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>AE Deal Weapon & Live Objection Handling</h2>
                    <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>Generated directly from live scraped competitor features</p>
                  </div>
                </div>

                <div style={{ background: '#1c1917', border: '1px solid #78350f', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: '#f59e0b', textTransform: 'uppercase' }}>🔥 The Disqualifying "Kill Question" (Ask prospects):</span>
                  <p style={{ fontSize: '16px', fontWeight: '600', color: '#fef08a', margin: '8px 0 0 0' }}>
                    "{report.sales_battlecard?.killer_question}"
                  </p>
                </div>

                <h3 style={{ fontSize: '14px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '12px' }}>Live Objection Handling</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
                  {report.sales_battlecard?.pitch_objection_handling?.map((item: any, i: number) => (
                    <div key={i} style={{ background: '#070b14', border: '1px solid #1e293b', borderRadius: '10px', padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444', fontSize: '13px', fontWeight: '700', marginBottom: '6px' }}>
                        <AlertTriangle size={14} /> If Prospect says: "{item.prospect_says}"
                      </div>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', color: '#34d399', fontSize: '13px', lineHeight: '1.5', paddingLeft: '20px' }}>
                        <CheckCircle2 size={14} style={{ marginTop: '3px', flexShrink: 0 }} />
                        <span><strong>AE Counter-Reply:</strong> {item.our_rep_reply}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ background: '#1e293b', borderRadius: '10px', padding: '16px' }}>
                  <strong style={{ color: '#a78bfa', fontSize: '13px' }}>🎯 Competitor Trap Setting: </strong>
                  <span style={{ fontSize: '13px', color: '#cbd5e1' }}>{report.sales_battlecard?.trap_setting}</span>
                </div>
              </div>
            )}

            {/* TAB 3: WAR ROOM WHAT-IF SIMULATOR */}
            {activeTab === 'wargame' && (
              <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <Bot size={22} color="#a855f7" />
                  <div>
                    <h2 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>Executive "What-If" Counter-Move Simulator</h2>
                    <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>Simulate market reaction against {currentSnapshot?.company_name || companyName}'s live packaging</p>
                  </div>
                </div>

                {report?.counter_strategies && report.counter_strategies.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
                    <span style={{ fontSize: '11px', color: '#a78bfa', fontWeight: '700', textTransform: 'uppercase' }}>💡 Quick-Fill Suggested Counter-Moves:</span>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {report.counter_strategies.map((strat: string, idx: number) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setCounterMove(strat)}
                          style={{ background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer', textAlign: 'left' }}
                        >
                          + {strat}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', marginBottom: '24px' }}>
                  <input
                    value={counterMove}
                    onChange={(e) => setCounterMove(e.target.value)}
                    placeholder="Enter your strategic counter-move..."
                    style={{ background: '#070b14', border: '1px solid #334155', borderRadius: '8px', padding: '12px 16px', color: '#fff', fontSize: '14px', outline: 'none' }}
                  />
                  <button
                    onClick={runWarGame}
                    disabled={simLoading}
                    style={{ background: 'linear-gradient(135deg, #6366f1, #9333ea)', color: '#fff', border: 'none', borderRadius: '8px', padding: '12px 20px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    {simLoading ? <RefreshCw size={16} className="spin" /> : <Play size={16} />}
                    {simLoading ? 'Simulating...' : 'Simulate Outcome'}
                  </button>
                </div>

                {simulationResult && (
                  <div style={{ background: '#070b14', border: '1px solid #334155', borderRadius: '12px', padding: '20px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '20px' }}>
                      <div style={{ background: '#1e293b', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                        <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700' }}>MARKET SHARE PROJECTION</span>
                        <div style={{ fontSize: '18px', fontWeight: '800', color: '#38bdf8', marginTop: '4px' }}>{simulationResult.market_share_impact}</div>
                      </div>
                      <div style={{ background: '#1e293b', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                        <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700' }}>DEVELOPER SENTIMENT</span>
                        <div style={{ fontSize: '18px', fontWeight: '800', color: '#34d399', marginTop: '4px' }}>{simulationResult.developer_sentiment}</div>
                      </div>
                      <div style={{ background: '#1e293b', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                        <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700' }}>MARGIN RISK</span>
                        <div style={{ fontSize: '18px', fontWeight: '800', color: '#fbbf24', marginTop: '4px' }}>{simulationResult.margin_risk_level}</div>
                      </div>
                    </div>

                    <div style={{ marginBottom: '14px' }}>
                      <strong style={{ color: '#f8fafc', fontSize: '14px' }}>Simulation Verdict:</strong>
                      <p style={{ fontSize: '13px', color: '#cbd5e1', marginTop: '4px', lineHeight: '1.6' }}>{simulationResult.simulation_verdict}</p>
                    </div>

                    <div>
                      <strong style={{ color: '#a78bfa', fontSize: '14px' }}>Projected Competitor 60-Day Counter-Reaction:</strong>
                      <p style={{ fontSize: '13px', color: '#cbd5e1', marginTop: '4px', lineHeight: '1.6' }}>{simulationResult.projected_competitor_response}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}