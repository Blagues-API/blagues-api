module.exports = {
  extends: [
    'stylelint-config-standard-scss',
    'stylelint-config-recommended-vue',
    'stylelint-config-property-sort-order-smacss',
    'stylelint-config-prettier',
  ],
  // add your custom config here
  // https://stylelint.io/user-guide/configuration
  rules: {
    'no-descending-specificity': null,
    'color-hex-length': 'long',
    'at-rule-no-unknown': null,
    'block-no-empty': [
      true,
      {
        severity: 'warning'
      }
    ]
  }
};
