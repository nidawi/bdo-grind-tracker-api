// Express plugins and their configurations live here.

const helmet = require('helmet')
const RateLimit = require('express-rate-limit')
const HTTPErrors = require('../lib/HTTPErrors')

module.exports = {
  helmetConfig: helmet({}), // We use all defaults for helmet (such as hide x-powered-by)
  postPatchLimiter: new RateLimit({
    windowMs: 1000 * 5 * 1, // 5 seconds
    max: 10, // Max 10 requests per 5 seconds.
    delayMs: 0,
    delayAfter: 0,
    handler: function (req, res, next) { return next(new HTTPErrors.TooManyRequestsError('Too Many Requests')) }
  }),
  getLimiter: new RateLimit({
    windowMs: 1000 * 5 * 1, // 5 second
    max: 20,
    delayMs: 0,
    delayAfter: 0,
    handler: function (req, res, next) { return next(new HTTPErrors.TooManyRequestsError('Too Many Requests')) }
  })
}
