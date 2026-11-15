// Extends app.json. EXPO_BASE_URL lets the web build be served from a sub-path
// (e.g. /app on the landing site): see scripts/build-landing.sh.
module.exports = ({ config }) => ({
  ...config,
  experiments: { ...config.experiments, baseUrl: process.env.EXPO_BASE_URL || undefined },
});
