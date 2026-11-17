const production = require('./.lighthouserc.cjs');
const { urls } = require('./.pa11yci.local.cjs');
const [site, ...budgets] = production.ci.assert.assertMatrix;
module.exports = {
  ci: {
    ...production.ci,
    collect: { ...production.ci.collect, url: urls },
    assert: {
      assertMatrix: [
        { ...site, assertions: { ...site.assertions, 'is-on-https': 'off' } },
        ...budgets,
      ],
    },
    upload: { target: 'filesystem', outputDir: '.lighthouseci/reports' },
  },
};
