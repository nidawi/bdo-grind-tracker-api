// API endpoint
// Should probably split these up into their own files.
// I tried to follow https://github.com/OWASP/CheatSheetSeries/blob/master/cheatsheets/REST_Security_Cheat_Sheet.md to the best of my ability.
const APIController = require('../controller/APIController')

const express = require('express')
const router = express.Router()

const constructHATEOAS = (rel, method, url) => {
  return {
    rel: rel,
    method: method,
    href: url
  }
}
const constructURI = path => {
  return `${process.env.home}/${path}`
}

const apiConfig = require('../config/apiconfig')

const apiPaths = [
  constructHATEOAS('home', 'GET', '/'),
  constructHATEOAS('token', 'POST', '/token'),
  constructHATEOAS('webhooks', 'GET', '/hooks/{id}'),
  constructHATEOAS('users', 'GET', '/users/{id}'),
  constructHATEOAS('reports', 'GET', '/reports/{id}'),
  constructHATEOAS('grindspots', 'GET', '/grindspots/{id}'),
  constructHATEOAS('classes', 'GET', '/classes'),
  constructHATEOAS('loot', 'GET', '/loot/{id}'),
  constructHATEOAS('statistics', 'GET', '/statistics')
]

router.route('*')
  .all(async (req, res, next) => {
    try {
      // Verify request here.
      await APIController.authorizeRequest(req, apiConfig)

      // Continue
      next()
    } catch (err) { next(err) }
  })

router.route('*')
  .all(async (req, res, next) => {
    // If a JWT is provided, parse it here. If it isn't valid, access is restricted.
    // This means that even if you request an open resource with an invalid jwt, you will be denied.
    // This is kind of an ethical issue. "We reserve the right not to serve you should you lie to us."
    try {
      if (!req.headers.authorization || (req.headers.authorization && (req.jwt = APIController.verifyToken(req.headers.authorization)))) next()
    } catch (err) { next(err) }
  })

router.route('/')
  .get((req, res) => {
    sendResponse('Welcome to the Tinfoil Academy public API!', req, res
      .set('Cache-Control', apiConfig.cachePublicLong))
  })

router.route('/token')
  .get(async (req, res, next) => {
    try {
      const result = await APIController.whoAmI(req.jwt)
      sendResponse(result, req, res)
    } catch (err) { next(err) }
  })
  .post(async (req, res, next) => {
    // If a user requests a JWT for use in the future. Default expiration time is 1 hour later.
    // Providing a valid admin token, it should be possible to get a token with higher expiration.
    try {
      const token = await APIController.authorizeToken(req.body.username, req.body.password)
      sendResponse(token, req, res)
    } catch (err) { next(err) }
  })

router.route('/classes')
  .get(async (req, res, next) => {
    const classes = await APIController.getClassesList()
    sendResponse(classes, req, res
      .set('Cache-Control', apiConfig.cachePublicShort))
  })

router.route('/hooks')
  .get(async (req, res, next) => {
    // This route is only available to authenticated admins.
    try {
      const webhooks = await APIController.getWebhooks(req.query, req.jwt)
      _addWebhookHATEOAS(webhooks, req)

      sendResponse(webhooks, req, res.status(200))
    } catch (err) { next(err) }
  })
  .post(async (req, res, next) => {
    // If a user wants to register a webhook, they must be registered and provide the necessary information.
    try {
      const hookResult = await APIController.registerWebhook(req.body, req.jwt)
      // Upon success, send a 201 with a location header of the newly created hook resource.
      sendResponse('Hook creation successful.', req, res
        .location(constructURI(`${req.originalUrl}/${hookResult}`))
        .status(201))
    } catch (err) { next(err) }
  })
router.route('/hooks/:id')
  .get(async (req, res, next) => {
    // Admins and hook owners (through token) can view hook information.
    try {
      const hookResult = await APIController.getWebhook(req.params.id, req.jwt)
      _addWebhookHATEOAS([hookResult], req)

      sendResponse(hookResult, req, res)
    } catch (err) { next(err) }
  })
  .patch(async (req, res, next) => {
    // Admins and hook owners (through token) can update hooks.
    try {
      await APIController.updateWebhook(req.params.id, req.body, req.jwt)
      sendResponse('Webhook updated successfully.', req, res
        .location(req.originalUrl))
    } catch (err) { next(err) }
  })
  .delete(async (req, res, next) => {
    // Admins and hook owners (through token) can delete hooks.
    try {
      await APIController.deleteWebhook(req.params.id, req.jwt)
      sendResponse('Webhook deleted successful.', req, res)
    } catch (err) { next(err) }
  })

router.route('/grindspots')
  .get(async (req, res, next) => {
    // Get all grindspots. Public Endpoint.
    try {
      const spots = await APIController.getGrindSpots()
      _addGrindspotHATEOAS(spots, req)

      sendResponse(spots, req, res
        .set('Cache-Control', apiConfig.cachePublicShort))
    } catch (err) { next(err) }
  })
router.route('/grindspots/:id')
  .get(async (req, res, next) => {
    // Get grindspot with id. Public Endpoint.
    try {
      const spot = await APIController.getGrindspot(req.params.id)
      _addGrindspotHATEOAS([spot], req)

      sendResponse(spot, req, res
        .set('Cache-Control', apiConfig.cachePublicShort))
    } catch (err) { next(err) }
  })
router.route('/grindspots/:id/loot')
  .get(async (req, res, next) => {
    // Get grindspot loot. Public Endpoint.
    try {
      const loot = await APIController.getLootList(req.params.id)
      _addDropHATEOAS(loot, req)

      sendResponse(loot, req, res
        .set('Cache-Control', apiConfig.cachePublicShort))
    } catch (err) { next(err) }
  })
router.route('/loot')
  .get(async (req, res, next) => {
    try {
      const loot = await APIController.getLootList()
      _addDropHATEOAS(loot, req)

      sendResponse(loot, req, res
        .set('Cache-Control', apiConfig.cachePublicShort))
    } catch (err) { next(err) }
  })
router.route('/loot/:id')
  .get(async (req, res, next) => {
    // Get a specific item using its Id.
    try {
      const drop = await APIController.getLootItem(req.params.id)
      _addDropHATEOAS([drop], req)

      sendResponse(drop, req, res
        .set('Cache-Control', apiConfig.cachePublicShort))
    } catch (err) { next(err) }
  })

router.route('/users')
  .get(async (req, res, next) => {
    // This route is only available to authenticated admins.
    try {
      const users = await APIController.getUsers(req.jwt)
      _addUserHATEOAS(users, req)

      sendResponse(users, req, res)
    } catch (err) { next(err) }
  })
  .post(async (req, res, next) => {
    // Create a new user. Public.
    try {
      await APIController.createUser(req.body)
      // Upon success, send a 201 with a Location-header of the newly created user resource.
      sendResponse('User creation successful.', req, res
        .location(constructURI(`users/${req.body.username}`))
        .status(201))
    } catch (err) { next(err) }
  })
router.route('/users/:name')
  .get(async (req, res, next) => {
    // Here, only admins & the user themselves get all the information.
    // Others get only "public" information. See User.js for specifications.
    try {
      const user = await APIController.getUser(req.params.name, req.jwt)
      _addUserHATEOAS([user], req)

      sendResponse(user, req, res)
    } catch (err) { next(err) }
  })
  .patch(async (req, res, next) => {
    // Admins and the user themselves can update users.
    try {
      await APIController.updateUser(req.params.name, req.body, req.jwt)
      sendResponse('User updated successfully.', req, res
        .location(req.originalUrl))
    } catch (err) { next(err) }
  })
  .delete(async (req, res, next) => {
    // Admins and the user themselves can delete users.
    try {
      await APIController.deleteUser(req.params.name, req.jwt)
      sendResponse('User deleted successfully.', req, res)
    } catch (err) { next(err) }
  })

router.route('/reports')
  .get(async (req, res, next) => {
    // Get all reports. Since these will grow quickly (probably), we will need pagination.
    // Pagination is in the form of a query-parameter. "lastReportId"
    try {
      const reports = await APIController.getReports(req.query)
      _addReportHATEOAS(reports, req)

      sendResponse(reports, req, res)
    } catch (err) { next(err) }
  })
  .post(async (req, res, next) => {
    try {
      // Try creating the report. Return the URL of the created resource in the Location header.
      const reportId = await APIController.createReport(req.body, req.jwt)

      sendResponse('Report creation successful.', req, res
        .location(constructURI(`reports/${reportId}`))
        .status(201)
      )
    } catch (err) { next(err) }
  })
router.route('/reports/:reportId')
  .get(async (req, res, next) => {
    // Get a specific report. Anyone.
    try {
      const report = await APIController.getReport(req.params.reportId)
      _addReportHATEOAS([report], req)

      sendResponse(report, req, res)
    } catch (err) { next(err) }
  })
  .patch(async (req, res, next) => {
    // Update a specific report. Only Admin / Owner.
    try {
      await APIController.updateReport(req.params.reportId, req.body, req.jwt)
      sendResponse('Report updated successfully.', req, res
        .location(req.originalUrl))
    } catch (err) { next(err) }
  })
  .delete(async (req, res, next) => {
    // Delete a specific report. Only Admin / Owner.
    try {
      await APIController.deleteReport(req.params.reportId, req.jwt)
      sendResponse('Report deleted successfully.', req, res)
    } catch (err) { next(err) }
  })
router.route('/reports/:reportId/loot')
  .get(async (req, res, next) => {
    // Get all loot belonging to a specific report.
    try {
      const reportLoot = await APIController.getReportLoot(req.params.reportId)
      _addLootHATEOAS(reportLoot, req)

      sendResponse(reportLoot, req, res)
    } catch (err) { next(err) }
  })

router.route('/statistics')
  .get(async (req, res, next) => {
    // The route for questions
    // example: if I am CLASS_X with Y_AP and I grind for Z hours at spot B, what can I expect?
    try {
      const statisticsResult = await APIController.calculateStatistics(req.body)
      _addStatisticsResultHATEOAS(statisticsResult)

      sendResponse(statisticsResult, req, res)
    } catch (err) { next(err) }
  })

const _addStatisticsResultHATEOAS = (stats, req) => {
  stats.loot.forEach(l => {
    l.links = [
      constructHATEOAS('self', 'GET', `/loot/${l.itemId}`)
    ]
  })
}
const _addWebhookHATEOAS = (webhooks, req) => {
  webhooks.forEach(wh => {
    const whPath = !(RegExp(/.*\/\d+/).test(req.originalUrl)) ? `/${wh.id}` : ''
    wh.links = [
      constructHATEOAS('self', req.method, `${req.originalUrl}${whPath}`),
      constructHATEOAS('update', 'PATCH', `${req.originalUrl}${whPath}`),
      constructHATEOAS('delete', 'DELETE', `${req.originalUrl}${whPath}`)
    ]
  })
}
const _addGrindspotHATEOAS = (grindspots, req) => {
  grindspots.forEach(gs => {
    const gsPath = !(RegExp(/.*\/\d+/).test(req.originalUrl)) ? `/${gs.id}` : ''
    gs.links = [
      constructHATEOAS('self', req.method, `${req.originalUrl}${gsPath}`),
      constructHATEOAS('loot', 'GET', `${req.originalUrl}${gsPath}/loot`)
    ]
  })
}
const _addLootHATEOAS = (loot, req) => {
  loot.forEach(l => {
    l.links = [
      constructHATEOAS('self', 'GET', `/loot/${l.itemId}`),
      constructHATEOAS('report', 'GET', `/reports/${l.reportId}`)
    ]
  })
}
const _addDropHATEOAS = (drops, req) => {
  drops.forEach(d => {
    d.links = [
      constructHATEOAS('self', 'GET', `/loot/${d.itemId}`),
      constructHATEOAS('spot', 'GET', `/grindspots/${d.spotId}`)
    ]
  })
}
const _addUserHATEOAS = (users, req) => {
  users.forEach(u => {
    const usrPath = !(RegExp(/.*\/\d+/).test(req.originalUrl)) ? `/${u.username}` : ''
    u.links = [
      constructHATEOAS('self', req.method, `${req.originalUrl}${usrPath}`)
    ]
  })
}
const _addReportHATEOAS = (reports, req) => {
  reports.forEach(r => {
    const rPath = !(RegExp(/.*\/\d+/).test(req.originalUrl)) ? `/${r.id}` : ''
    r.links = [
      constructHATEOAS('self', req.method, `${req.originalUrl}${rPath}`),
      constructHATEOAS('loot', 'GET', `${req.originalUrl}${rPath}/loot`),
      constructHATEOAS('spot', 'GET', `/grindspots/${r.spotId}`)
    ]
  })
}

const sendResponse = (data, req, res) => {
  res.send(JSON.stringify({
    data: data,
    links: [{
      rel: 'self',
      method: req.method,
      href: req.originalUrl
    }, ...apiPaths]
  }))
}

module.exports = router
