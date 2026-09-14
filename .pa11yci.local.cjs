const config = require('./.pa11yci.local.json');
const baseURL = process.env.SITE_TEST_URL || 'http://127.0.0.1:4321';
module.exports = {
  ...config,
  urls: config.urls.map((url) => baseURL + new URL(url).pathname),
};
