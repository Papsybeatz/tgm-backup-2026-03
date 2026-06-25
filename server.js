// Railway starts the root package with `node server.js`.
// Keep this entrypoint as a thin handoff to the maintained backend server so
// webhook middleware ordering and API routes stay in one place.
require('./backend/server');
