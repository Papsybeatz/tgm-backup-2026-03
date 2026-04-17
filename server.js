import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.join(__dirname, 'dist');

const PORT = process.env.PORT || 4000;

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(distPath));

const users = [];
const upgrades = [];

app.post('/api/auth/login', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email required' });
  const user = users.find(u => u.email === email);
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });
  res.json({ email: user.email, tier: user.tier || 'free', token: 'mock-token', message: 'Login successful.' });
});

app.post('/api/upgrade/starter', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email required' });
  upgrades.push({ email, tier: 'starter', date: new Date() });
  res.json({ message: 'Starter upgrade successful.' });
});

// FUNDERS INSIGHT LAYER
const insightsDB = { userDomains: [], sectorTags: [], grantCategories: [], readinessScores: [], matchingSelections: [], draftTitles: [] };

app.post('/api/insights/track', (req, res) => {
  const { email, sector, category, readinessScore, matchedGrant, draftTitle } = req.body;
  if (email && email.includes('@')) insightsDB.userDomains.push({ domain: email.split('@')[1], timestamp: new Date() });
  if (sector) insightsDB.sectorTags.push({ sector, timestamp: new Date() });
  if (category) insightsDB.grantCategories.push({ category, timestamp: new Date() });
  if (readinessScore !== undefined) insightsDB.readinessScores.push({ score: readinessScore, timestamp: new Date() });
  if (matchedGrant) insightsDB.matchingSelections.push({ grant: matchedGrant, timestamp: new Date() });
  if (draftTitle) insightsDB.draftTitles.push({ title: draftTitle, timestamp: new Date() });
  res.json({ success: true, message: 'Insight tracked' });
});

app.get('/api/insights/funders', (req, res) => {
  const { key } = req.query;
  if (key !== 'internal_admin_key') return res.status(403).json({ success: false, message: 'Internal access only' });
  const sectorCounts = {};
  insightsDB.sectorTags.forEach(s => { sectorCounts[s.sector] = (sectorCounts[s.sector] || 0) + 1; });
  const topSectors = Object.entries(sectorCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([s, c]) => ({ sector: s, count: c }));
  const categoryCounts = {};
  insightsDB.grantCategories.forEach(c => { categoryCounts[c.category] = (categoryCounts[c.category] || 0) + 1; });
  const topCategories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([c, co]) => ({ category: c, count: co }));
  const sectorScores = {};
  const sectorCountsForAvg = {};
  insightsDB.readinessScores.forEach((r, i) => {
    const sector = insightsDB.sectorTags[i]?.sector || 'unknown';
    sectorScores[sector] = (sectorScores[sector] || 0) + r.score;
    sectorCountsForAvg[sector] = (sectorCountsForAvg[sector] || 0) + 1;
  });
  const readinessBySector = Object.entries(sectorScores).map(([s, total]) => ({ sector: s, avgScore: Math.round(total / (sectorCountsForAvg[s] || 1)), count: sectorCountsForAvg[s] || 0 })).sort((a, b) => b.avgScore - a.avgScore);
  const grantCounts = {};
  insightsDB.matchingSelections.forEach(m => { grantCounts[m.grant?.agency || 'Unknown'] = (grantCounts[m.grant?.agency || 'Unknown'] || 0) + 1; });
  const topMatchedGrants = Object.entries(grantCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([a, co]) => ({ agency: a, count: co }));
  const wordCounts = {};
  insightsDB.draftTitles.map(t => t.title.toLowerCase().split(/\s+/)).flat().filter(w => w.length > 3 && !['this','that','with','from','grant','proposal'].includes(w)).forEach(w => { wordCounts[w] = (wordCounts[w] || 0) + 1; });
  const emergingThemes = Object.entries(wordCounts).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([t, co]) => ({ theme: t, count: co }));
  const domainCounts = {};
  insightsDB.userDomains.forEach(d => { domainCounts[d.domain] = (domainCounts[d.domain] || 0) + 1; });
  const topDomains = Object.entries(domainCounts).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([d, co]) => ({ domain: d, count: co }));
  res.json({
    success: true,
    insight: {
      generatedAt: new Date().toISOString(),
      totalUsers: insightsDB.userDomains.length,
      totalDrafts: insightsDB.draftTitles.length,
      totalMatches: insightsDB.matchingSelections.length,
      topSectors, topCategories, readinessBySector, topMatchedGrants, emergingThemes, topDomains
    },
    positioning: {
      narrative: "TGM is sitting on sector-wide grant intelligence",
      dataAsset: `${insightsDB.userDomains.length} users, ${insightsDB.draftTitles.length} drafts, ${insightsDB.matchingSelections.length} grant matches`,
      acquisitionTrigger: "Platform + Data Asset + Future Intelligence Engine"
    }
  });
});

app.get('/api/insights/admin', (req, res) => {
  res.json({ success: true, message: 'Funders Insight Dashboard - Access at /api/insights/funders?key=internal_admin_key', metrics: { activeUsers: insightsDB.userDomains.length, sectorsTracked: new Set(insightsDB.sectorTags.map(s => s.sector)).size, categoriesTracked: new Set(insightsDB.grantCategories.map(c => c.category)).size, avgReadiness: insightsDB.readinessScores.length > 0 ? Math.round(insightsDB.readinessScores.reduce((a, b) => a + b.score, 0) / insightsDB.readinessScores.length) : 0 } });
});

// Grants matching (tier-based)
app.get('/api/grants/match', (req, res) => {
  const query = req.query.query || '';
  const tier = req.query.tier || 'free';
  const sampleGrants = [
    { id: 1, name: 'NSF Innovation Grant', agency: 'NSF', amount: 50000, focus: 'technology', eligibility: 'US startups' },
    { id: 2, name: 'NIH R01', agency: 'NIH', amount: 300000, focus: 'health', eligibility: 'US research' },
    { id: 3, name: 'DOE ARPA-E', agency: 'DOE', amount: 250000, focus: 'energy', eligibility: 'US startups' }
  ];
  const filtered = sampleGrants.filter(g => !query || g.name.toLowerCase().includes(query.toLowerCase()) || g.focus.toLowerCase().includes(query.toLowerCase()));
  res.json({ success: true, matches: filtered, count: filtered.length, tier, message: tier === 'free' ? 'Upgrade for unlimited matches' : 'Full matching enabled' });
});

app.post('/api/score', (req, res) => {
  const { text, tier } = req.body;
  if (!text) return res.status(400).json({ success: false, message: 'Text required' });
  const wordCount = text.split(/\s+/).length;
  const sentences = text.split(/[.!?]+/).filter(s => s.trim()).length;
  const completeness = Math.min(100, Math.round((wordCount / 500) * 100));
  const clarity = Math.min(100, Math.round((sentences / Math.max(1, wordCount / 20)) * 100));
  const strength = Math.min(100, Math.round((text.length / 2000) * 100));
  const overall = Math.round((completeness + clarity + strength) / 3);
  let advanced = null;
  if (tier === 'pro' || tier === 'agency_starter' || tier === 'agency_unlimited' || tier === 'lifetime') {
    advanced = { reviewerReadiness: overall > 70 ? 'Ready for review' : 'Needs revision', keywordsDetected: text.toLowerCase().includes('impact') ? ['impact','sustainability','innovation'] : ['innovation'], budgetJustification: text.toLowerCase().includes('budget') ? 'Present' : 'Missing', timelineFeasibility: text.toLowerCase().includes('timeline') ? 'Clear' : 'Add timeline' };
  }
  res.json({ success: true, score: overall, breakdown: { completeness: { score: completeness, label: completeness > 70 ? 'Good' : 'Needs work', feedback: wordCount < 500 ? `Add more content (${wordCount}/500 words)` : 'Good length' }, clarity: { score: clarity, label: clarity > 70 ? 'Good' : 'Needs work', feedback: sentences > 5 ? 'Clear sentence structure' : 'Add more detailed sentences' }, strength: { score: strength, label: strength > 70 ? 'Strong' : 'Weak', feedback: text.length > 1500 ? 'Strong narrative' : 'Expand your grant narrative' } }, tier, advanced, message: `Scoring complete. Overall score: ${overall}/100` });
});

app.post('/api/reviewer-simulation', (req, res) => {
  const { tier } = req.query;
  if (!['pro','agency_starter','agency_unlimited','lifetime'].includes(tier)) return res.status(403).json({ success: false, message: 'Upgrade to Pro for reviewer simulation' });
  const reviewers = [{ name: 'Dr. Reviewer (NIH)', feedback: 'The significance section could be stronger. Consider adding more specific impact metrics.', concerns: ['Impact clarity','Specificity'] }, { name: 'Panel Member (NSF)', feedback: 'Good innovation statement. Timeline appears realistic. Budget justification needs more detail.', concerns: ['Budget','Team qualifications'] }, { name: 'Program Officer', feedback: 'Aligns well with funding priorities. Consider emphasizing broader impacts section.', concerns: ['Broader impacts'] }];
  res.json({ success: true, reviewers, summary: 'Your draft is competitive but could benefit from stronger impact metrics and detailed budget justification.', tier });
});

app.get('/api/analytics', (req, res) => {
  const tier = req.query.tier;
  if (tier === 'starter') return res.json({ success: true, tier, analytics: { draftQualityTrend: [{ month: 'Jan', score: 45 }, { month: 'Feb', score: 52 }, { month: 'Mar', score: 48 }, { month: 'Apr', score: 61 }], totalDrafts: 12, avgScore: 52 }, message: 'Basic analytics: Draft quality trend' });
  res.json({ success: true, tier, analytics: { grantWinRate: { current: 23, trend: '+5%' }, avgScore: { current: 72, trend: '+8%' }, draftQualityTrend: [{ month: 'Jan', score: 45 }, { month: 'Feb', score: 58 }, { month: 'Mar', score: 65 }, { month: 'Apr', score: 72 }], fundingBySource: [{ source: 'NSF', amount: 150000, count: 3 }, { source: 'NIH', amount: 300000, count: 2 }, { source: 'DOE', amount: 250000, count: 1 }], topMatches: 15, submissionsThisMonth: 4, successRate: '23%', totalDrafts: 28, totalFunding: 700000 }, message: 'Advanced analytics: Full dashboard' });
});

// Client folders (Agency Starter/Unlimited)
let clients = [];
app.post('/api/clients', (req, res) => {
  const { name, tier } = req.body;
  if (!['agency_starter','agency_unlimited'].includes(tier)) return res.status(403).json({ success: false, message: 'Agency tier required' });
  if (!name) return res.status(400).json({ success: false, message: 'Client name required' });
  const client = { id: 'client_' + Date.now(), name, createdAt: new Date(), drafts: [] };
  clients.push(client);
  res.json({ success: true, client, message: `Client "${name}" created` });
});
app.get('/api/clients', (req, res) => {
  const { tier } = req.query;
  if (!['agency_starter','agency_unlimited'].includes(tier)) return res.status(403).json({ success: false, message: 'Agency tier required' });
  res.json({ success: true, clients });
});

// Team seats
app.get('/api/team/seats', (req, res) => {
  const { tier } = req.query;
  const seats = { agency_starter: { limit: 3, used: 1, available: 2 }, agency_unlimited: { limit: 'unlimited', used: 5, available: 'unlimited' }, pro: { limit: 1, used: 1, available: 0 } };
  res.json({ success: true, seats: seats[tier] || seats.pro, tier });
});
app.post('/api/team/invite', (req, res) => {
  const { email, tier } = req.body;
  if (!['agency_starter','agency_unlimited'].includes(tier)) return res.status(403).json({ success: false, message: 'Agency tier required' });
  if (!email) return res.status(400).json({ success: false, message: 'Email required' });
  res.json({ success: true, message: `Invitation sent to ${email}`, tier });
});

// Bulk operations (Agency Unlimited)
app.post('/api/bulk/score', (req, res) => {
  const { drafts, tier } = req.body;
  if (tier !== 'agency_unlimited') return res.status(403).json({ success: false, message: 'Agency Unlimited required for bulk scoring' });
  if (!drafts || !Array.isArray(drafts)) return res.status(400).json({ success: false, message: 'Drafts array required' });
  const results = drafts.map((text, i) => ({ id: i + 1, score: Math.floor(Math.random() * 30) + 60, status: 'scored' }));
  res.json({ success: true, results, summary: `Scored ${drafts.length} drafts. Average score: ${Math.round(results.reduce((a, b) => a + b.score, 0) / results.length)}` });
});
app.post('/api/bulk/match', (req, res) => {
  const { tier } = req.query;
  if (tier !== 'agency_unlimited') return res.status(403).json({ success: false, message: 'Agency Unlimited required for bulk matching' });
  const queries = ['health', 'technology', 'energy'];
  let allMatches = [];
  for (const q of queries) { allMatches = allMatches.concat([{ id: allMatches.length + 1, name: 'Match ' + q, agency: 'NIH', focus: q }]); }
  res.json({ success: true, matches: allMatches, count: allMatches.length });
});

// Portfolio analytics
app.get('/api/portfolio/analytics', (req, res) => {
  const { tier } = req.query;
  if (tier !== 'agency_unlimited') return res.status(403).json({ success: false, message: 'Agency Unlimited required' });
  res.json({ success: true, portfolio: { totalClients: 8, activeDrafts: 24, totalSubmissions: 45, successRate: '28%', revenueGenerated: 1250000, topPerformers: [{ client: 'Tech Startup Inc', submissions: 8, successRate: '35%' }, { client: 'Research Lab', submissions: 6, successRate: '40%' }] } });
});

// White-label PDF header
app.get('/api/whitelabel/header', (req, res) => {
  const { brand, tier } = req.query;
  if (!['agency_starter','agency_unlimited'].includes(tier)) return res.status(403).json({ success: false, message: 'Agency tier required' });
  res.json({ success: true, header: { logo: brand ? `${brand} Logo` : 'Grants Master', tagline: brand ? `Prepared by ${brand}` : 'Professional Grant Solutions', website: brand ? `www.${brand.toLowerCase()}.com` : 'www.grantsmaster.com' } });
});

// Catch-all route for SPA (React Router)
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

export default app;

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));