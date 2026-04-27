module.exports = {
  default: {
    requireModule: ['ts-node/register'],
    require: [
      'testsupport/**/*.ts',
      'step_definitions/**/*.ts',
    ],
    paths: ['features/**/*.feature'],
    format: ['progress-bar', 'html:reports/cucumber-report.html'],
    formatOptions: { snippetInterface: 'async-await' },
    publishQuiet: true,
  },
};
