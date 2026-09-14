const production = require('./.lighthouserc.cjs');
const { urls } = require('./.pa11yci.local.cjs');
module.exports = {
  ci: {
    ...production.ci,
    collect: { ...production.ci.collect, url: urls },
    assert: {
      ...production.ci.assert,
      assertions: { ...production.ci.assert.assertions, 'is-on-https': 'off' },
    },
    upload: { target: 'filesystem', outputDir: '.lighthouseci/reports' },
  },
};
