const PersistenceDAO = require('../model/PersistenceDAO') // eslint-disable-line
const jwt = require('../lib/jwt')
const HTTPErrors = require('../lib/HTTPErrors')
const HTTPMessage = require('../lib/HTTPMessage')

const StatisticalQuery = require('../model/StatisticalQuery')
const User = require('../model/User')
const Grinder = require('../model/Grinder')
const Report = require('../model/Report')
const ReportLoot = require('../model/ReportLoot')
const Webhook = require('../model/Webhook')

const apiStorage = {
  /**
   * @type {PersistenceDAO}
   */
  dbDAO: null
}

const setConnection = dbDao => {
  apiStorage.dbDAO = dbDao
}

const isValidClass = async className => {
  const classes = await apiStorage.dbDAO.getClasses()
  return classes.indexOf(className) > -1
}
const isUserCreated = async name => {
  const result = await apiStorage.dbDAO.isUserCreated(name)
  return result
}

const authorizeUser = async (username, password) => {
  if (!username) throw new HTTPErrors.GenericApplicationError('Bad User Authorization: No Username', 400)
  else if (typeof username !== 'string') throw new HTTPErrors.GenericApplicationError('Bad User Authorization: Wrong Username Type', 400)
  if (!password) throw new HTTPErrors.GenericApplicationError('Bad User Authorization: No Password', 400)
  else if (typeof password !== 'string') throw new HTTPErrors.GenericApplicationError('Bad User Authorization: Wrong Password Type', 400)

  const user = await apiStorage.dbDAO.getUser(username)
  if (!user || !(await user.isPasswordMatch(password))) throw new HTTPErrors.GenericApplicationError('Bad User Authorization: Bad Credentials', 401)

  return user
}
const authorizeToken = async (username, password) => {
  // Create a JWT for the user.
  const user = await authorizeUser(username, password)
  const payload = {
    username: user.username,
    admin: user.admin
  }
  return jwt.sign(payload)
}
const authorizeRequest = async (req, config) => {
  // Verify Method
  if (['GET', 'POST', 'PATCH', 'DELETE'].indexOf(req.method) < 0) throw new HTTPErrors.MethodNotAllowed('Bad Method: Not Allowed')
  // Verify Content-Type
  if (!(config.acceptedContentTypes.some(a => req.headers['accept'].indexOf(a) > -1))) throw new HTTPErrors.Unacceptable('Expected Content Type: Unacceptable')
  // Verify Content Type
  if ((['POST', 'PATCH'].indexOf(req.method) > -1) && (req.headers['content-type'] !== config.contentType)) throw new HTTPErrors.Unacceptable('Bad Content Type: Unacceptable')
}
const whoAmI = async jwt => {
  if (!jwt) throw new HTTPErrors.BadRequestError('No JWT Provided')
  else {
    return jwt.username
  }
}

const getGrindSpots = async () => {
  const spots = (await apiStorage.dbDAO.getGrindSpots())
    .map(gs => gs.jsonify())

  return spots
}
const getGrindspot = async id => {
  const spot = await apiStorage.dbDAO.getGrindSpot(id)

  if (spot) {
    return spot.jsonify()
  } else throw new HTTPErrors.NotFoundError('Grindspot Does Not Exist')
}
const getLootList = async spot => {
  const loot = (await apiStorage.dbDAO.getLoot(spot))
    .map(a => a.jsonify())

  return loot
}
const getLootItem = async id => {
  const item = await apiStorage.dbDAO.getLootItem(id)

  if (item) {
    return item.jsonify()
  } else throw new HTTPErrors.NotFoundError('Loot Item Does Not Exist')
}

const getUsers = async jwt => {
  // Deal with each jwt-related issue.
  await _verifyAdmin(jwt)

  const users = await apiStorage.dbDAO.getUsers()
  return users.map(a => a.jsonify(true))
}
const createUser = async userData => {
  // Check if user exists already
  if (await isUserCreated(userData.username)) throw new HTTPErrors.BadRequestError('User already exists')

  // Create a user object representing the user to create.
  try {
    const userObj = new User(userData)
    await apiStorage.dbDAO.createUser(userObj)
  } catch (err) {
    throw new HTTPErrors.BadRequestError(err.message)
  }
}
const getUser = async (name, jwt) => {
  const user = await apiStorage.dbDAO.getUser(name)
  if (user) return user.jsonify((jwt && (jwt.admin || jwt.username === user._username)))
  else throw new HTTPErrors.NotFoundError('The Requested User Does Not Exist')
}
const updateUser = async (name, userdata, jwt) => {
  // We want to update the user.
  const user = await apiStorage.dbDAO.getUser(name)
  if (user) {
    await _verifySpecificUserOrAdmin(jwt, user._username)
    try {
      await apiStorage.dbDAO.updateUser(user, new User({
        username: jwt.username,
        password: 'placeholder',
        familyName: userdata.familyName || user._familyName,
        region: userdata.region || user._region,
        email: userdata.email || user._email
      }))
    } catch (err) {
      throw new HTTPErrors.BadRequestError(err.message)
    }
  } else throw new HTTPErrors.NotFoundError('User Does Not Exist')
}
const deleteUser = async (name, jwt) => {
  const user = await apiStorage.dbDAO.getUser(name)
  if (user) {
    await _verifySpecificUserOrAdmin(jwt, user._username)
    await apiStorage.dbDAO.deleteUser(user)
  } else {
    throw new HTTPErrors.NotFoundError('User Does Not Exist')
  }
}

const getReports = async filter => {
  // Get reports & return a jsonified response.
  try {
    const reports = (await apiStorage.dbDAO.getReports(filter))
      .map(r => r.jsonify())
    return reports
  } catch (err) {
    if (err.message === 'ITEM_DB_ERR') throw new HTTPErrors.InternalError('An internal error occurred. Please try again later.')
    else return []
  }
}
const getReport = async id => {
  const report = await apiStorage.dbDAO.getReport(id)
  if (report) return report.jsonify()
  else throw new HTTPErrors.NotFoundError('Report Does Not Exist')
}
const createReport = async (reportData, jwt) => {
  // Load Additional Info
  const data = await _constructReportData(reportData, jwt)

  try {
    const report = new Report(
      data.reportData,
      data.reportSpot,
      new Grinder(reportData.grinder),
      data.reportOwner,
      data.reportLoot
    )

    const reportId = await apiStorage.dbDAO.createReport(report)

    // Report has been created. Notify subscribers.
    _notifySubscribers('reportCreated', apiStorage.dbDAO.getReport(reportId))

    return reportId
  } catch (err) {
    throw new HTTPErrors.BadRequestError(err.message)
  }
}
const updateReport = async (id, reportData, jwt) => {
  if (!reportData || Object.getOwnPropertyNames(reportData).length < 1) throw new HTTPErrors.BadRequestError('Bad Report Update: No Changes')

  const oldReport = await apiStorage.dbDAO.getReport(id)
  if (oldReport) {
    try {
      await _verifySpecificUserOrAdmin(jwt, oldReport._ownerId)

      const data = await _constructReportData(Object.assign(reportData, { _reportId: id }), jwt, true)

      // Spot cannot be updated, in that case: delete report and make a new one.
      const newReport = new Report({
        spotId: oldReport._spotId,
        ownerId: data.reportOwner ? data.reportOwner._username : oldReport._ownerId,
        duration: data.reportData.duration || oldReport._duration
      },
      oldReport.spot,
      reportData.grinder ? new Grinder({
        class: reportData.grinder.class || oldReport.grinder._class,
        APmh: reportData.grinder.APmh || oldReport.grinder._APmh,
        APawa: reportData.grinder.APawa || oldReport.grinder._APawa,
        DP: reportData.grinder.DP || oldReport.grinder._DP,
        luck: reportData.grinder.luck || oldReport.grinder._luck,
        lootScroll: (reportData.grinder.lootScroll !== undefined) ? reportData.grinder.lootScroll : oldReport.grinder._lootScroll,
        arsha: (reportData.grinder.arsha !== undefined) ? reportData.grinder.arsha : oldReport.grinder._arsha,
        castle: (reportData.grinder.castle !== undefined) ? reportData.grinder.castle : oldReport.grinder._castle,
        gmBlessing: (reportData.grinder.gmBlessing !== undefined) ? reportData.grinder.gmBlessing : oldReport.grinder._gmBlessing
      }) : oldReport.grinder,
      data.reportOwner || oldReport.owner,
      data.reportLoot || oldReport.loot
      )

      await apiStorage.dbDAO.updateReport(oldReport, newReport, data.reportDeletedLoot)
    } catch (err) {
      throw new HTTPErrors.BadRequestError(err.message)
    }
  } else {
    throw new HTTPErrors.NotFoundError('Report Does Not Exist')
  }
}
const deleteReport = async (id, jwt) => {
  const report = await apiStorage.dbDAO.getReport(id)
  if (report) {
    await _verifySpecificUserOrAdmin(jwt, report._ownerId)
    await apiStorage.dbDAO.deleteReport(report)
  } else throw new HTTPErrors.NotFoundError('Report Does Not Exist')
}
const getReportLoot = async id => {
  const loot = (await apiStorage.dbDAO.getReportLoot(id))
    .map(r => r.jsonify())
  return loot
}

const getClassesList = async () => {
  const classes = await apiStorage.dbDAO.getClasses()
  return classes
}

const calculateStatistics = async request => {
  // No jwt or anything is needed for this.
  try {
    const query = await apiStorage.dbDAO.getReports(undefined, new StatisticalQuery(request))
    if (query && query.length > 1) {
      try {
        return {
          reports: query.length,
          averageDuration: parseFloat(((query.reduce((a, b) => a + b._duration, 0)) / query.length).toFixed(1)),
          averageGearscore: parseFloat(((query.reduce((a, b) => a + b.grinder.gearscore || 0, 0)) / query.length).toFixed(1)),
          averageBuffs: {
            luck: parseFloat(((query.reduce((a, b) => a + b.grinder._luck || 0, 0)) / query.length).toFixed(1)),
            lootScroll: parseFloat(((query.filter(a => Boolean(a.grinder._lootScroll) === true).length) / query.length).toFixed(2)),
            arsha: parseFloat(((query.filter(a => Boolean(a.grinder._arsha) === true).length) / query.length).toFixed(2)),
            castle: parseFloat(((query.filter(a => Boolean(a.grinder._castle) === true).length) / query.length).toFixed(2)),
            gmBlessing: parseFloat(((query.filter(a => Boolean(a.grinder._gmBlessing) === true).length) / query.length.toFixed(2)))
          },
          loot: _calculateLootAverage(query)
        }
      } catch (err) {
        throw new HTTPErrors.InternalError('Statistical Calculation Failed. Please try again.')
      }
    } else {
      throw new HTTPErrors.BadRequestError('Bad Query: No Meaningful Statistics')
    }
  } catch (err) {
    throw new HTTPErrors.BadRequestError(err.message)
  }
}
/**
 * @param {Report[]} reports
 */
const _calculateLootAverage = reports => {
  const lootMap = new Map()
  reports.reduce((a, b) => [...a, ...b.loot], [])
    .forEach(a => {
      if (lootMap.has(a._itemId)) lootMap.set(a._itemId, lootMap.get(a._itemId) + a._amount)
      else lootMap.set(a._itemId, a._amount)
    })
  return Array.from(lootMap.entries()).map(a => { return { itemId: a[0], total: a[1], average: (a[1] / reports.length) } })
}

// Webhook Functionality
const registerWebhook = async (hookRequest, jwt) => {
  // For safety's sake, verify the user.
  await _verifyUser(jwt)
  try {
    const webhookResult = await apiStorage.dbDAO.createWebhook(new Webhook({
      owner: jwt.username,
      eventType: hookRequest.event,
      eventTarget: hookRequest.target,
      secret: hookRequest.secret
    }))
    return webhookResult
  } catch (err) {
    throw new HTTPErrors.BadRequestError(err.message)
  }
}
const getWebhooks = async (filter, jwt) => {
  // Only available to admins.
  await _verifyAdmin(jwt)

  const webhooks = (await apiStorage.dbDAO.getWebhooks(filter))
    .map(wh => wh.jsonify())

  return webhooks
}
const getWebhook = async (id, jwt) => {
  // Only available to Admins or Hook owner.
  const webhook = await apiStorage.dbDAO.getWebhook(id)
  if (webhook) {
    await _verifySpecificUserOrAdmin(jwt, webhook.owner)
    return webhook.jsonify()
  } else {
    throw new HTTPErrors.NotFoundError('Requested Webhook Does Not Exist')
  }
}
const updateWebhook = async (id, newHook, jwt) => {
  // Only available to Admins or Hook owner.
  const webhook = await apiStorage.dbDAO.getWebhook(id)
  if (webhook) {
    await _verifySpecificUserOrAdmin(jwt, webhook._owner)
    try {
      await apiStorage.dbDAO.updateWebhook(webhook, new Webhook({
        owner: jwt.username,
        eventType: newHook.event || webhook._eventType,
        eventTarget: newHook.target || webhook._eventTarget,
        secret: newHook.secret || webhook._secret
      }))
    } catch (err) {
      throw new HTTPErrors.BadRequestError(err.message)
    }
  } else {
    throw new HTTPErrors.NotFoundError('Webhook Does Not Exist')
  }
}
const deleteWebhook = async (id, jwt) => {
  // Only available to Admins or Hook owner.
  const webhook = await apiStorage.dbDAO.getWebhook(id)
  if (webhook) {
    await _verifySpecificUserOrAdmin(jwt, webhook._owner)
    await apiStorage.dbDAO.deleteWebhook(webhook)
  } else {
    throw new HTTPErrors.NotFoundError('Webhook Does Not Exist')
  }
}
// End of Webook Functionality

const verifyToken = authorization => {
  if (!authorization || typeof authorization !== 'string') throw new HTTPErrors.BadRequestError('Bad Authentication: Token Missing')
  else if (authorization.indexOf('Bearer') === -1) throw new HTTPErrors.BadRequestError('Bad Authentication: Wrong Method')

  const token = authorization.replace(/Bearer /, '')
  const payload = jwt.verify(token)
  if (!payload) throw new HTTPErrors.UnauthorizedError('Bad Authentication: Invalid Token')

  return payload
}
const _verifyUser = async jwt => {
  if (!jwt) throw new HTTPErrors.UnauthorizedError('Unauthorized: No Token Provided')
  else {
    const user = await apiStorage.dbDAO.getUser(jwt.username)
    if (!user) throw new HTTPErrors.UnauthorizedError('Unauthorized: Invalid User')
    else return true
  }
}
const _verifyAdmin = async jwt => {
  if (await _verifyUser(jwt)) {
    if (!jwt.admin) throw new HTTPErrors.ForbiddenError('Forbidden: Inadequate Permissions')
    else return true
  }
}
const _verifySpecificUserOrAdmin = async (jwt, username) => {
  if (await _verifyUser(jwt)) {
    if (jwt.admin || jwt.username === username) return true
    else throw new HTTPErrors.ForbiddenError('Forbidden: Inadequate Permissions')
  }
}

/**
 * Notifies all subscribers of the event (users who registered webhooks for that particular event).
 * @param {string} event
 * @param {Promise<any>} data
 */
const _notifySubscribers = (event, data) => {
  // We want this to execute AFTER the primary request has been finished.
  setTimeout(async () => {
    // We need verifications here
    try {
      const subscribers = await apiStorage.dbDAO.getWebhooks(event)
      const subbedData = (await data).jsonify()
      await Promise.all(subscribers.map(a => HTTPMessage.sendPOST(a._eventTarget, subbedData, a._secret)))
    } catch (err) {
      console.log(`Subscriber notification failed for event '${event}': ${err.message}`)
    }
  }, 0)
}

const _constructReportData = async (reportData, jwt, isUpdate = false) => {
  // Load Additional Info
  const data = {
    reportSpot: reportData.spot,
    reportLoot: reportData.loot,
    reportDeletedLoot: reportData.deletedLoot, // This only applies to updates
    reportOwner: undefined,
    reportData: undefined
  }

  // Verify Spot
  if (!isUpdate && data.reportSpot) {
    if (!(data.reportSpot = await apiStorage.dbDAO.getGrindSpot(data.reportSpot))) {
      throw new HTTPErrors.BadRequestError('Bad Report Data: Grindspot Does Not Exist')
    }
  } else if (!isUpdate) throw new HTTPErrors.BadRequestError('Bad Report Data: Grindspot Missing')

  // Only way to add an owner (legitimately, that is) is by making the request using a valid JWT.
  if (reportData.owner && jwt) {
    const repOwner = await apiStorage.dbDAO.getUser(reportData.owner)
    if (repOwner) {
      try {
        await _verifySpecificUserOrAdmin(jwt, reportData.owner)
        data.reportOwner = repOwner
      } catch (err) {
        throw new HTTPErrors.ForbiddenError('Bad Report Data: Owner Forbidden')
      }
    } else {
      throw new HTTPErrors.BadRequestError('Bad Report Data: Owner Does Not Exist')
    }
  }

  // Verify Loot
  if (data.reportLoot) {
    try {
      data.reportLoot = data.reportLoot.map(a => new ReportLoot({
        reportId: reportData._reportId,
        itemId: a.itemId,
        amount: a.amount
      }))
    } catch (err) {
      throw new HTTPErrors.BadRequestError('Bad Report Data: One or More Loot Items Faulty')
    }
  } else if (!isUpdate) throw new HTTPErrors.BadRequestError('Bad Report Data: Loot Missing')

  if (data.reportDeletedLoot) {
    try {
      data.reportDeletedLoot = data.reportDeletedLoot.map(a => new ReportLoot({
        reportId: reportData._reportId,
        itemId: a.itemId,
        amount: 1 // filler
      }))
    } catch (err) {
      throw new HTTPErrors.BadRequestError('Bad Report Data: One or More Loot-to-delete Items Faulty')
    }
  }

  data.reportData = Object.assign({
    grinderId: 12345, // placeholder
    ownerId: data.reportOwner ? data.reportOwner._username : undefined, // translate
    spotId: data.reportSpot ? data.reportSpot._id : undefined // translate
  }, reportData)

  return data
}

module.exports = {
  setConnection: setConnection,
  isValidClass: isValidClass,
  isUserCreated: isUserCreated,

  authorizeUser: authorizeUser,
  authorizeToken: authorizeToken,
  authorizeRequest: authorizeRequest,
  whoAmI: whoAmI,

  verifyToken: verifyToken,
  calculateStatistics: calculateStatistics,

  registerWebhook: registerWebhook,
  getWebhooks: getWebhooks,
  getWebhook: getWebhook,
  updateWebhook: updateWebhook,
  deleteWebhook: deleteWebhook,

  getUser: getUser,
  getUsers: getUsers,
  updateUser: updateUser,
  deleteUser: deleteUser,

  getReport: getReport,
  getReports: getReports,
  createReport: createReport,
  updateReport: updateReport,
  deleteReport: deleteReport,

  getReportLoot: getReportLoot,
  createUser: createUser,
  getLootList: getLootList,
  getLootItem: getLootItem,
  getClassesList: getClassesList,
  getGrindSpots: getGrindSpots,
  getGrindspot: getGrindspot
}
