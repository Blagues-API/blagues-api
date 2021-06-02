module.exports = {
  extends: ['stylelint-config-standard', 'stylelint-config-prettier'],
  // add your custom config here
  // https://stylelint.io/user-guide/configuration
  rules: {
    'color-hex-length': 'long',
    'block-no-empty': [
      true,
      {
        severity: 'warning',
      },
    ],
  },
};
