// A route used for testing.

const express = require('express')
const router = express.Router()

// This route accepts the reportCreated webhook. All it does it log it for testing purposes.
router.route('/onreport')
  .post((req, res) => {
    console.log(JSON.stringify(req.body))
    res.sendStatus(204)
  })

module.exports = router
