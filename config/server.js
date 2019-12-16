// Server config for express and its modules.

const express = require('express')
const bodyParser = require('body-parser')
const plugins = require('./plugins')
const http = require('http')
const HTTPErrors = require('../lib/HTTPErrors')
const apiConfig = require('./apiconfig')

const app = express()
const server = http.createServer(app)

/**
 * Set-up for express.
 */
const createApp = () => {
  // By default, responses are in JSON. Only supported content-type as of now.
  app.use((req, res, next) => {
    res
      .type(apiConfig.contentType)
      .set('X-Content-Type-Options', apiConfig.contentTypeOptions) // No sniffing please
      .set('Cache-Control', apiConfig.cachePrivate) // By default, we don't want to cache responses as they can change at any moment.

    next()
  })

  // Parse Stuff
  app.use(bodyParser.urlencoded({ extended: true }))
  app.use(bodyParser.json())

  // Use our little plugins.
  app.use(plugins.helmetConfig)

  // Apply rate limits
  app.get('*', plugins.getLimiter)
  app.post('*', plugins.postPatchLimiter)
  app.patch('*', plugins.postPatchLimiter)

  // Create routes
  app.use('/', require('../routes/api'))
  app.use('/tests', require('../routes/tests'))

  // Invalid route / Error
  app.use((req, res, next) => next(new HTTPErrors.NotFoundError()))
  app.use((err, req, res, next) => translateError(err, req, res))

  return app
}

const translateError = (err, req, res) => {
  // Errors use a special envelope.
  const outputEnvelope = {
    code: 500,
    message: 'An unknown error has occured. Please try again later.',
    links: [
      { rel: 'self', method: req.method, href: req.originalUrl }
    ]
  }

  if (err instanceof HTTPErrors.GenericApplicationError || err instanceof SyntaxError) {
    switch (true) {
      case err instanceof SyntaxError:
        outputEnvelope.code = err.statusCode
        outputEnvelope.message = 'Invalid JSON provided. Please check your input and try again.'
        break
      case err instanceof HTTPErrors.NotFoundError:
        outputEnvelope.code = err.code
        outputEnvelope.message = err.message || 'Resource Could Not Be Found'
        break
      default:
        outputEnvelope.code = err.code || 500
        outputEnvelope.message = err.message || `Error ${err.code || 500} - ${err.constructor.name}`
    }
  }

  console.log(err)
  res.status(outputEnvelope.code).send(JSON.stringify(outputEnvelope))
}

/**
 * Set-up for server
*/
const createServer = () => {
  createApp()
  return server
}

module.exports = {
  createServer: createServer,
  refs: {
    server: server,
    app: app
  }
}
