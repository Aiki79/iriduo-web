// Extends app.json. Only used to build the web version served by the backend at /api/web
// (EXPO_WEB_BASE=/api/web); without the variable the config is exactly app.json.
module.exports = ({ config }) =>
  process.env.EXPO_WEB_BASE ? { ...config, experiments: { ...config.experiments, baseUrl: process.env.EXPO_WEB_BASE } } : config;
