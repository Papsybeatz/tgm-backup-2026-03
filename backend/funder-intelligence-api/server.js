require('dotenv').config();
const app = require('./app');

const PORT = Number(process.env.FUNDER_INTELLIGENCE_PORT || 4500);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[FUNDER-API] running on port ${PORT}`);
});
