require('dotenv').config();
const app = require('./app');

// Railway injects PORT automatically. FUNDER_INTELLIGENCE_PORT is the local override.
const PORT = Number(process.env.PORT || process.env.FUNDER_INTELLIGENCE_PORT || 4500);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[FUNDER-API] Funder Intelligence API running on port ${PORT}`);
  console.log(`[FUNDER-API] Health: GET /health`);
  console.log(`[FUNDER-API] Register: POST /funder/register`);
});
