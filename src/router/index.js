const { Router } = require('express');
const router = Router();

router.use('/api', require('./api'));
router.use('/', require('./website'));

router.use('*', (req, res) => {
  res.status(404).render('404');
});

module.exports = router;
