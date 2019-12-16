const mysql = require('mysql') //eslint-disable-line
const bcrypt = require('bcrypt')
const itemdb = require('../lib/itemdb')

const StatisticalQuery = require('./StatisticalQuery') //eslint-disable-line
const GrindSpot = require('./GrindSpot')
const GrindDrop = require('./GrindDrop')
const User = require('./User')
const Grinder = require('./Grinder')
const Report = require('./Report')
const ReportLoot = require('./ReportLoot')
const Webhook = require('./Webhook')

const CLASSES_IDENTIFIER = 'classes'
const GRINDSPOTS_IDENTIFIER = 'grindspots'
const LOOT_IDENTIFIER = 'loot'

const MAX_REPORTS_PER_QUERY = 20

/**
 * This is the interface for the database.
 * The default implementation is based on async-adjusted mysql.
 * It can be exchanged provided the same functions are available.
 * @todo LOOK INTO PREPARED STATEMENTS FOR SECURITY
 * @todo LOOK INTO CACHING RESULTS FOR FASTER PROCESSING
 * @todo LOOK INTO VERIFICATIONS AND ERROR MANAGEMENT
 * @class PersistenceDAO
 */
class PersistenceDAO {
  /**
   * @param {mysql.Pool} dbConnectionPool
   * @module PersistenceDAO
   */
  constructor (dbConnectionPool) {
    /**
     * @todo Remake this into a Connection Pool for constant connection.
     * @type {mysql.Pool}
    */
    this.connectionPool = dbConnectionPool

    /**
     * Whether the DAO should automatically cache results (where appropriate). Default: true
     * @type {boolean}
     */
    this.enableCaching = true

    /**
    * This DAO's cache.
    */
    this._cache = new Map()

    /**
     * Self-imposed History.
     */
    this._history = {
      /**
       * @type {number}
       */
      latestReportId: undefined
    }
  }

  /**
   * @param {string} name
   * @returns {boolean}
   * @memberof PersistenceDAO
   */
  async isUserCreated (name) {
    const query = (await this._executePreparedQuery(`
      select
        exists (
          select
            *
          from
            users
          where
            username=?
        ) AS userExists
    `, [name]))[0]

    return query.userExists === 1
  }
  /**
   * Returns true if item exists.
   * @param {number} itemId
   * @returns {boolean}
   * @memberof PersistenceDAO
   */
  async isItemRegistered (itemId) {
    // select exists (select itemId from grinddrops where itemId=44266) as itemExists;
    const query = (await this._executePreparedQuery(`
      select
        exists (
          select
            itemId
          from
            grinddrops
          where
            itemId=?
        ) AS itemExists
    `, [itemId]))[0]

    return query.itemExists === 1
  }
  /**
   * Returns true if the report exists.
   * @param {number} reportId
   * @returns {boolean}
   * @memberof PersistenceDAO
   */
  async isReportCreated (reportId) {
    const query = (await this._executePreparedQuery(`
      select
        exists (
          select
            *
          from
            reports
          where
            id=?
        ) AS reportExists
    `, [reportId]))[0]

    return query.reportExists === 1
  }
  /**
   * @param {string} className
   * @returns {boolean}
   * @memberof PersistenceDAO
   */
  async isClassRegistered (className) {
    return (await this.getClasses())
      .indexOf(className) > -1
  }
  async isGrindspotRegistered (idOrName) {
    return (await this.getGrindSpots())
      .some(a => a._id === idOrName || a._name === idOrName)
  }

  /**
   * This is intended to be a restricted access point.
   * @param {string} name
   * @returns {User}
   * @memberof PersistenceDAO
   */
  async getUser (name) {
    const query = (await this._executeQuery(`
      select
        *
      from
        users
      where
        users.username = '${name}'
    `))[0]

    if (query) return new User(query)
  }
  /**
   * @returns {User[]}
   * @memberof PersistenceDAO
   */
  async getUsers () {
    const query = await this._executeQuery(`
      select
        *
      from
        users
    `)

    return query.map(a => new User(a))
  }
  /**
   * Returns true if successful.
   * @param {User} user
   * @returns {boolean}
   * @memberof PersistenceDAO
   */
  async createUser (user) {
    const statement = `
      insert into
        users (username, password, familyName, region, email)
      values
        (?, ?, ?, ?, ?)
    `
    const result = await this._executePreparedQuery(statement, [
      user._username,
      await bcrypt.hash(user._password, await bcrypt.genSalt(10), null),
      user._familyName,
      user._region,
      user._email
    ])

    return result.constructor.name === 'OkPacket' && result.affectedRows === 1
  }
  /**
   * @param {User} user
   * @param {User} newUser
   * @returns {boolean}
   * @memberof PersistenceDAO
   */
  async updateUser (user, newUser) {
    const statement = `
    UPDATE
      users
    SET
      familyName=?,
      region=?,
      email=?
    WHERE
      username=?
    `

    const updateResult = await this._executePreparedQuery(statement, [
      newUser._familyName,
      newUser._region,
      newUser._email,
      user._username
    ])
    return updateResult.constructor.name === 'OkPacket' && updateResult.affectedRows === 1
  }
  /**
   * @param {User} user
   * @returns {boolean}
   * @memberof PersistenceDAO
   */
  async deleteUser (user) {
    // We need to fix relations for reports.
    const updateReportsStatement = `
    UPDATE
      reports
    SET
      ownerId=NULL
    WHERE
      ownerId=?
    `

    const updateResult = await this._executePreparedQuery(updateReportsStatement, [user._username])
    if (updateResult.constructor.name === 'OkPacket') {
      const deleteUserStatement = `
      DELETE FROM
        users
      WHERE
        username=?
      `

      const deleteResult = await this._executePreparedQuery(deleteUserStatement, [user._username])
      return deleteResult.constructor.name === 'OkPacket' && deleteResult.affectedRows === 1
    }
  }

  /**
   * @param {ReportFilters} filters
   * @param {StatisticalQuery} queries
   * @returns {Report[]}
   * @memberof PersistenceDAO
   */
  async getReports (filters, queries) {
    const repFilters = _convertReportFiltersToSQL(filters)
    const repQuery = _convertStatisticalQueryToSQL(queries)

    // Cannot cache those, at least not right now. Could cache and force an update when necessary, but no time for that.
    const reports = await Promise.all((await this._executePreparedQuery(`
    select * from reports
      inner join (select id as spotId, name as spotName from grindspots) as grindspots on reports.spotId = grindspots.spotId
      inner join (select reportId as grinderId, class, APmh, APawa, DP, luck, lootScroll, arsha, castle, gmBlessing from report_grinders) as grinders on grinders.grinderId = reports.id
      left join (select username, password, familyName, region, email, type, status from users) as users on reports.ownerId = users.username
      ${repFilters.sqlSelection}
      ${repQuery.sqlSelection}
      limit ${MAX_REPORTS_PER_QUERY}
    `, [...repFilters.sqlValues, ...repQuery.sqlValues]))
      .map(async a => {
        return new Report(
          a,
          new GrindSpot({
            id: a.spotId,
            name: a.spotName
          }),
          new Grinder({
            reportId: a.grinderId,
            class: a.class,
            APmh: a.APmh,
            APawa: a.APawa,
            DP: a.DP,
            luck: a.luck,
            lootScroll: a.lootScroll,
            arsha: a.arsha,
            castle: a.castle,
            gmBlessing: a.gmBlessing
          }),
          a.ownerId ? new User(a) : undefined,
          await this.getReportLoot(a.id)
        )
      }))
    return reports
  }
  /**
   * @param {number} id
   * @memberof PersistenceDAO
   */
  async getReport (id) {
    const report = (await this._executePreparedQuery(`
    select * from reports
      inner join (select id as spotId, name as spotName from grindspots) as grindspots on reports.spotId = grindspots.spotId
      inner join (select reportId as grinderId, class, APmh, APawa, DP, luck, lootScroll, arsha, castle, gmBlessing from report_grinders) as grinders on grinders.grinderId = reports.id
      left join (select username, password, familyName, region, email, type, status from users) as users on reports.ownerId = users.username
    where reports.id=?
    `, [id]))[0]

    if (report) {
      return new Report(
        report,
        new GrindSpot({
          id: report.spotId,
          name: report.spotName
        }),
        new Grinder({
          id: report.grinderId,
          class: report.class,
          APmh: report.APmh,
          APawa: report.APawa,
          DP: report.DP,
          luck: report.luck,
          lootScroll: report.lootScroll,
          arsha: report.arsha,
          castle: report.castle,
          gmBlessing: report.gmBlessing
        }),
        report.ownerId ? new User(report) : undefined,
        await this.getReportLoot(report.id)
      )
    }
  }
  /**
   * @param {number} reportId
   * @returns {ReportLoot[]}
   * @memberof PersistenceDAO
   */
  async getReportLoot (reportId) {
    if (!this.enableCaching || !this._cache.has(LOOT_IDENTIFIER)) await this.getLoot()

    const query = (await this._executePreparedQuery(`
      select *, (select spotId from reports where id=?) as reportSpotId from report_drops where reportId=?`, [reportId, reportId]))
      .map(a => new ReportLoot(
        a,
        undefined,
        this._getCachedItem(a.itemId, a.reportSpotId)
      ))

    return query
  }
  /**
   * Creates the provided report. Returns the Id of the created report if successful.
   * @param {Report} report
   * @returns {number} The Id of the created report.
   * @todo This could be nicer.
   * @memberof PersistenceDAO
   */
  async createReport (report) {
    await this._validateReport(report)

    return new Promise((resolve, reject) => {
      this.connectionPool.getConnection((err, conn) => {
        if (err) return reject(err)

        conn.beginTransaction(async err2 => {
          if (err2) return reject(err2)

          try {
            // And then, create the actual report
            const reportResult = await this._executePreparedQuery(`
            insert into
              reports (spotId, ownerId, duration, origin)
            values (?, ?, ?, ?)
            `, [
              report._spotId,
              report._ownerId,
              report._duration,
              report._origin
            ], conn)

            // Then, we need to create the grinder from the provided grinder profile.
            await this._executePreparedQuery(`
              insert into
                report_grinders (reportId, class, APmh, APawa, DP, luck, lootScroll, arsha, castle, gmBlessing)
              values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              reportResult.insertId,
              report.grinder._class,
              report.grinder._APmh,
              report.grinder._APawa,
              report.grinder._DP,
              report.grinder._luck,
              Number(report.grinder._lootScroll),
              Number(report.grinder._arsha),
              Number(report.grinder._castle),
              Number(report.grinder._gmBlessing)
            ], conn)

            // Update History
            this._history.latestReportId = reportResult.insertId

            // Create All Report Loot
            await Promise.all(report.loot.map(async a => {
              await this._executePreparedQuery(`
              insert into
                report_drops (reportId, itemId, amount)
              values (?, ?, ?)
              `, [
                reportResult.insertId,
                a._itemId,
                a._amount
              ], conn)
            }))
          } catch (_err) {
            return reject(_err)
          }
        })

        conn.commit(err3 => {
          if (err3) return reject(err3)
          else {
            conn.release()
            resolve(this._history.latestReportId)
          }
        })
      })
    })
  }
  /**
   * @param {Report} report
   * @param {Report} newReport
   * @param {ReportLoot[]} deletedLoot
   * @returns
   * @memberof PersistenceDAO
   */
  async updateReport (report, newReport, deletedLoot) {
    // Because I am running out of time, I will have to cheat this one.
    await this._validateReport(newReport)

    // Update the actual Report
    const statement = `
    UPDATE
      reports
    SET
      ownerId=?,
      duration=?
    WHERE
      id=?
    `

    const updateResult = await this._executePreparedQuery(statement, [
      newReport._ownerId,
      newReport._duration,
      report._id
    ])

    if (updateResult.constructor.name === 'OkPacket' && updateResult.affectedRows === 1) {
      // Update the grinder
      await this._updateGrinder(report._id, newReport.grinder)

      // Update the loot
      await this.updateLoot(report._id, newReport.loot
        .map(a => new ReportLoot({
          reportId: report._id,
          itemId: a._itemId,
          amount: a._amount
        })), deletedLoot)
    }
  }
  /**
   * Deletes the given report.
   * @param {Report} report
   * @memberof PersistenceDAO
   */
  async deleteReport (report) {
    const statement = `
    DELETE FROM
      reports
    WHERE
      id=?
    `

    const deleteResult = await this._executePreparedQuery(statement, [report._id])
    return deleteResult.constructor.name === 'OkPacket' && deleteResult.affectedRows === 1
  }

  /**
   * d
   * @returns {string[]}
   * @memberof PersistenceDAO
   */
  async getClasses () {
    // This should be cached, in accordance to a RESTFUL API.
    if (this.enableCaching && this._cache.has(CLASSES_IDENTIFIER)) {
      return this._cache.get(CLASSES_IDENTIFIER)
    }

    const query = (await this._executeQuery('select name from classes'))
      .map(a => a.name)

    if (this.enableCaching) {
      this._cache.set(CLASSES_IDENTIFIER, query)
    }

    return query
  }

  /**
   * @param {number|string} idOrName
   * @returns {GrindSpot}
   * @memberof PersistenceDAO
   */
  async getGrindSpot (idOrName) {
    // We should cache the grindspots anyway.
    const spotList = await this.getGrindSpots()
    return spotList.find(a => a._id === parseInt(idOrName) || a._name === idOrName)
  }
  /**
   * Fetches a list of grind spots from the database.
   * @returns {GrindSpot[]} A list of grind spots.
   * @memberof PersistenceDAO
   */
  async getGrindSpots () {
    // This should be cached, in accordance to a RESTFUL API.
    if (this.enableCaching && this._cache.has(GRINDSPOTS_IDENTIFIER)) {
      return this._cache.get(GRINDSPOTS_IDENTIFIER)
    }

    const query = (await this._executeQuery(`select id, name from grindspots`))
      .map(a => new GrindSpot(a))

    if (this.enableCaching) {
      this._cache.set(GRINDSPOTS_IDENTIFIER, query)
    }

    return query
  }

  /**
   * @param {string|number} [spot]
   * @returns {GrindDrop[]}
   * @memberof PersistenceDAO
   */
  async getLoot (spot) {
    if (this.enableCaching && this._cache.has(LOOT_IDENTIFIER)) {
      return !spot
        ? this._cache.get(LOOT_IDENTIFIER)
        : this._cache.get(LOOT_IDENTIFIER)
          .filter(a => a.spot._name === spot || a.spot._id === parseInt(spot))
    }

    try {
      const query = await this._executePreparedQuery(`
      select
        grindspots.id as spotId, grindspots.name as spotName, grinddrops.itemId, grinddrops.value
      from
        grindspots
      inner join
        grinddrops on grinddrops.spotId = grindspots.id
      ${spot ? `where grindspots.name=? OR grindspots.id=?` : ''}
    `, [spot, spot])

      const items = await Promise.all(query.map(async a => {
        return new GrindDrop(
          a,
          await itemdb.getItemInfo(a.itemId),
          new GrindSpot({
            id: a.spotId,
            name: a.spotName
          })
        )
      }))

      if (this.enableCaching && !spot) {
        this._cache.set(LOOT_IDENTIFIER, items)
      }

      return items
    } catch (err) {
      if (err.message === 'ITEM_DB_ERR') throw err
    }
  }
  /**
  * @param {number} id
  * @returns {GrindDrop}
  */
  async getLootItem (id) {
    if (this.enableCaching && this._cache.has(LOOT_IDENTIFIER)) {
      return this._cache.get(LOOT_IDENTIFIER)
        .find(a => a._itemId === parseInt(id))
    }

    const item = (await this._executePreparedQuery(`
    select
      grindspots.id as spotId, grindspots.name as spotName, grinddrops.itemId, grinddrops.value
    from
      grindspots
    inner join
      grinddrops on grinddrops.spotId = grindspots.id
    where itemId=?
    `, [id]))[0]

    if (item) {
      return new GrindDrop(
        item,
        await itemdb.getItemInfo(item.itemId),
        new GrindSpot({
          id: item.spotId,
          name: item.spotName
        })
      )
    }
  }
  /**
   * @param {ReportLoot} loot
   * @memberof PersistenceDAO
   */
  async createLoot (loot) {
    const statement = `
      insert into
        report_drops (reportId, itemId, amount)
      values (?, ?, ?)
    `

    const result = await this._executePreparedQuery(statement, [loot._reportId, loot._itemId, loot._amount])
    return result.constructor.name === 'OkPacket' && result.affectedRows === 1
  }
  /**
   * @param {ReportLoot[]} loot
   * @memberof PersistenceDAO
   */
  addLoot (loot) {
    if (!loot || loot.length < 1) return

    const statement = `
    insert into
      report_drops (reportId, itemId, amount)
    values (?, ?, ?)
    `

    return new Promise((resolve, reject) => {
      this.connectionPool.getConnection((err, conn) => {
        if (err) return reject(err)

        conn.beginTransaction(async err2 => {
          if (err2) return reject(err2)
          try {
            // Delete all the loot.
            await Promise.all(loot.map(a => {
              this._executePreparedQuery(statement, [
                a._reportId,
                a._itemId,
                a._amount
              ], conn)
            }))
          } catch (_err) { return reject(_err) }
        })

        conn.commit(err3 => {
          if (err3) return reject(err3)
          else {
            conn.release()
            resolve(true)
          }
        })
      })
    })
  }
  /**
   * @param {number} reportId
   * @param {ReportLoot[]} loot
   * @param {ReportLoot[]} deletedLoot
   * @memberof PersistenceDAO
   */
  async updateLoot (reportId, loot, deletedLoot) {
    // This is intended to make a complete update of all loot associated to a report.
    const reportLoot = await this.getReportLoot(reportId)
    const lootToAdd = loot.filter(a => !(reportLoot.find(b => b._itemId === a._itemId)))
    const lootToUpdate = loot.filter(a => reportLoot.find(b => b._itemId === a._itemId))

    await this.addLoot(lootToAdd)
    await this._updateLoot(lootToUpdate)
    if (deletedLoot) {
      console.log(deletedLoot)
      await this.deleteLoot(deletedLoot)
    }
  }
  /**
   * @param {ReportLoot[]} loot
   * @returns
   * @memberof PersistenceDAO
   */
  _updateLoot (loot) {
    if (!loot || loot.length < 1) return

    // You can only change amount, not itemId.
    const statement = `
    UPDATE
      report_drops
    SET
      amount=?
    WHERE
      reportId=?
      AND
      itemId=?
    `

    return new Promise((resolve, reject) => {
      this.connectionPool.getConnection((err, conn) => {
        if (err) return reject(err)

        conn.beginTransaction(async err2 => {
          if (err2) return reject(err2)

          try {
            // Delete all the loot.
            await Promise.all(loot.map(a => {
              this._executePreparedQuery(statement, [
                a._amount,
                a._reportId,
                a._itemId
              ], conn)
            }))
          } catch (_err) { return reject(_err) }
        })

        conn.commit(err3 => {
          if (err3) return reject(err3)
          else {
            conn.release()
            resolve(true)
          }
        })
      })
    })
  }
  /**
   * @param {ReportLoot[]} loot
   * @memberof PersistenceDAO
   */
  deleteLoot (loot) {
    if (!loot || loot.length < 1) return

    const statement = `
    DELETE FROM
      report_drops
    WHERE
      reportId=? AND itemId=?
    `

    return new Promise((resolve, reject) => {
      this.connectionPool.getConnection((err, conn) => {
        if (err) return reject(err)

        conn.beginTransaction(async err2 => {
          if (err2) return reject(err2)

          try {
            // Delete all the loot.
            await Promise.all(loot.map(a => {
              this._executePreparedQuery(statement, [
                a._reportId,
                a._itemId
              ], conn)
            }))
          } catch (_err) { return reject(_err) }
        })

        conn.commit(err3 => {
          if (err3) return reject(err3)
          else {
            conn.release()
            resolve(true)
          }
        })
      })
    })
  }

  /**
   * @param {WebhookFilters} [filters]
   * @returns {Webhook[]}
   * @memberof PersistenceDAO
   */
  async getWebhooks (filters) {
    const mysqlSelections = _convertWebhookFiltersToSQL(filters)
    const query = (await this._executePreparedQuery(`
      select
        *
      from webhooks
      inner join
        (select username, password, familyName, region, email, type, status from users)
      as users on webhooks.owner = users.username
      ${mysqlSelections.sqlSelection}`, mysqlSelections.sqlValues))
      .map(a => new Webhook(
        a,
        new User(a)
      ))

    return query
  }
  /**
   * @param {number} id
   * @returns {Webhook}
   * @memberof PersistenceDAO
   */
  async getWebhook (id) {
    const query = (await this._executePreparedQuery(`
      select
        *
      from webhooks
        inner join
          (select username, password, familyName, region, email, type, status from users)
      as users on webhooks.owner = users.username
      where webhooks.id=?
      `, [id]))[0]

    if (query) {
      return new Webhook(
        query,
        new User(query)
      )
    }
  }
  /**
   * Creates the given webhook.
   * @param {Webhook} webhook
   * @returns {number}
   * @memberof PersistenceDAO
   */
  async createWebhook (webhook) {
    const statement = `
    insert into
      webhooks (owner, eventType, eventTarget, secret)
    values (?, ?, ?, ?)
    `

    const webhookResult = await this._executePreparedQuery(statement, [webhook._owner, webhook._eventType, webhook._eventTarget, webhook._secret])
    if (webhookResult.constructor.name === 'OkPacket' && webhookResult.affectedRows === 1) {
      return webhookResult.insertId
    }
  }
  /**
   * @param {Webhook} oldWebhook
   * @param {Webhook} newWebhook
   * @returns {boolean}
   * @memberof PersistenceDAO
   */
  async updateWebhook (oldWebhook, newWebhook) {
    const statement = `
    UPDATE
      webhooks
    SET
      eventType=?,
      eventTarget=?,
      secret=?
    WHERE
      id=?
    `

    const updateResult = await this._executePreparedQuery(statement, [newWebhook._eventType, newWebhook._eventTarget, newWebhook._secret, oldWebhook._id])
    return updateResult.constructor.name === 'OkPacket' && updateResult.affectedRows === 1
  }
  /**
   * @param {Webhook} webhook
   * @returns {boolean}
   * @memberof PersistenceDAO
   */
  async deleteWebhook (webhook) {
    const statement = `
    DELETE FROM
      webhooks
    WHERE
      id=?
    `

    const deleteResult = await this._executePreparedQuery(statement, [webhook._id])
    return deleteResult.constructor.name === 'OkPacket' && deleteResult.affectedRows === 1
  }

  /**
   * @param {number} itemId
   * @param {number} [spotId]
   * @memberof PersistenceDAO
   */
  _getCachedItem (itemId, spotId) {
    return this._cache.get(LOOT_IDENTIFIER)
      .find(a => a._itemId === itemId && (!spotId || a._spotId === spotId))
  }
  /**
   * @param {Report} report
   * @memberof PersistenceDAO
   */
  async _validateReport (report) {
    // Check Spot Exists
    if (!report._spotId || (report._spotId && !(await this.isGrindspotRegistered(report._spotId)))) {
      throw new Error('Bad Report Data: Grindspot Does Not Exist')
    }

    // Check Owner Exists
    if (report._ownerId && !(await this.isUserCreated(report._ownerId))) {
      throw new Error('Bad Report Data: Owner Does Not Exist')
    }

    // Check Class Exists
    const validClasses = await this.getClasses()
    if (validClasses.indexOf(report.grinder._class) < 0) {
      throw new Error('Bad Report Data: Class is Invalid')
    }

    // Check Loot Count
    if (!report.loot || !Array.isArray(report.loot) || report.loot.length < 1) {
      throw new Error('Bad Report Data: Loot Must Be Array With At Least One Entry')
    }

    // Check Loot Items
    const validItems = await this.getLoot(report.spot._name)
    if (!report.loot.every(a => (validItems.map(b => b._itemId)).indexOf(a._itemId) > -1)) {
      console.log(`Items {${report.loot.map(a => a._itemId).join(',')}} - one or more do not exist in {${validItems.map(a => a._itemId).join(',')}}`)
      throw new Error(`Bad Report Data: Loot Item Not In Spot Loot Table`)
    }
  }
  /**
   * @param {number} reportId
   * @param {Grinder} grinder
   * @memberof PersistenceDAO
   */
  async _updateGrinder (reportId, grinder) {
    const updateGrinderStatement = `
    UPDATE
      report_grinders
    SET
      class=?,
      APmh=?,
      APawa=?,
      DP=?,
      luck=?,
      lootScroll=?,
      arsha=?,
      castle=?,
      gmBlessing=?
    WHERE
      reportId=?
    `

    const updateResult = await this._executePreparedQuery(updateGrinderStatement, [
      grinder._class,
      grinder._APmh,
      grinder._APawa,
      grinder._DP,
      grinder._luck,
      Number(grinder._lootScroll),
      Number(grinder._arsha),
      Number(grinder._castle),
      Number(grinder._gmBlessing),
      reportId
    ])

    const updateSuccessful = (updateResult.constructor.name === 'OkPacket' && updateResult.affectedRows === 1)
    if (!updateSuccessful) {
      console.log(`Possible conflict in Grinder Update procedure.
      ResultPacket: ${updateResult.constructor.name}
      AffectedRows: ${updateResult.affectedRows}
      `)
    }
    return updateSuccessful
  }

  /**
   * Does not do any escaping. Unsafe.
   * @see _executePreparedQuery
   * @param {string} query The query to execute.
   * @param {mysql.PoolConnection} [conn]
   * @returns {Promise<any>}
   * @memberof PersistenceDAO
   */
  _executeQuery (query, conn) {
    // mysql callbacks remade into promises
    return new Promise((resolve, reject) => {
      (conn || this.connectionPool).query(query, (err, results) => {
        if (err) reject(err)
        else resolve(results)
      })
    })
  }
  /**
   * Uses native MySQL escaping to protect against fishy user input.
   * @param {string} query The query to execute where each value is represented by a ?.
   * @param {*[]} values The values to insert, in order.
   * @param {mysql.PoolConnection} [conn]
   * @example _executePreparedQuery('select * from orders where id=? and destination=?', [25, 'Santa Monica'])
   * @todo Add support for non-array value.
   * @returns {Promise<any>}
   * @memberof PersistenceDAO
   */
  _executePreparedQuery (query, values, conn) {
    // Strictly speaking, this is not a "prepared query", but the mysql module automatically escapes all values. Good enough for me.
    if (!values || values.length < 1) {
      return this._executeQuery(query)
    }

    return new Promise((resolve, reject) => {
      (conn || this.connectionPool).query(query, values, (err, results) => {
        if (err) reject(err)
        else resolve(results)
      })
    })
  }
}

/**
 * @param {StatisticalQuery} query
 */
const _convertStatisticalQueryToSQL = query => {
  const sqlSelections = []
  const sqlValues = []

  if (query) {
    if (query._spotId !== undefined) {
      sqlSelections.push(`(reports.spotId = ? OR spotName = ?)`)
      sqlValues.push(query._spotId)
      sqlValues.push(query._spotId)
    }
    if (query._class !== undefined) {
      sqlSelections.push(`(class = ?)`)
      sqlValues.push(query._class)
    }
    if (query._duration !== undefined) {
      sqlSelections.push(`(duration = ?)`)
      sqlValues.push(query._duration)
    }
    if (query._APawa !== undefined) {
      sqlSelections.push(`(APawa = ?)`)
      sqlValues.push(query._APawa)
    }
  }

  return {
    sqlSelection: sqlSelections.length > 0
      ? `WHERE ${sqlSelections.join(' AND ')}`
      : '',
    sqlValues: sqlValues
  }
}

/**
 * @param {WebhookFilters} filters
 */
const _convertWebhookFiltersToSQL = filters => {
  const sqlSelections = []
  const sqlValues = []

  if (filters) {
    if (filters.eventType && typeof filters.eventType === 'string') {
      sqlSelections.push('webhooks.eventType=?')
      sqlValues.push(filters.eventType)
    }
    if (filters.owner && typeof filters.owner === 'string') {
      sqlSelections.push('webhooks.owner=?')
      sqlValues.push(filters.owner)
    }
  }

  return {
    sqlSelection: sqlSelections.length > 0
      ? `WHERE ${sqlSelections.join(' AND ')}`
      : '',
    sqlValues: sqlValues.length > 0
      ? sqlValues
      : undefined
  }
}

/**
 * @param {ReportFilters} filters
 */
const _convertReportFiltersToSQL = filters => {
  // This is incomplete. FYI.
  const sqlSelections = []
  const sqlValues = []

  if (filters) {
    if (filters.lastReportId && ((filters.lastReportId = parseInt(filters.lastReportId)) > 0)) {
      sqlSelections.push(`(reports.id > ?)`)
      sqlValues.push(filters.lastReportId)
    }
    if (filters.spot && ['string', 'number'].indexOf(typeof filters.spot) > -1) {
      sqlSelections.push(`(reports.spotId = ? OR spotName = ?)`)
      sqlValues.push(filters.spot)
      sqlValues.push(filters.spot)
    }
    if (filters.owner && typeof filters.owner === 'string') {
      sqlSelections.push(`(reports.ownerId = ?)`)
      sqlValues.push(filters.owner)
    }
    if (filters.class && typeof filters.class === 'string') {
      sqlSelections.push(`(class = ?)`)
      sqlValues.push(filters.class)
    }
  }

  return {
    sqlSelection: sqlSelections.length > 0
      ? `WHERE ${sqlSelections.join(' AND ')}`
      : '',
    sqlValues: sqlValues
  }
}

/**
 * @typedef {Object} WebhookFilters
 * @property {string} [owner]
 * @property {string} [eventType]
 */

/**
 * Filters used for reports.
 * @typedef {Object} ReportFilters
 * @property {number} [lastReportId] The last Report Id (where selection begins).
 * @property {string} [owner]
 * @property {number|string} [spot] The Id or Name of the spot to select.
 * @property {string} [class] The name of the class to select.
 * @property {number} [mainhandAP] The mainhand AP to select.
 * @property {number} [awakeningAP] The awakening AP to select.
 * @property {number} [DP] The DP to select.
 * @property {number} [luck]
 * @property {boolean} [lootScroll]
 * @property {boolean} [arsha]
 * @property {boolean} [castle]
 * @property {boolean} [gmBlessing]
 * @property {number} [duration] The duration to select.
 * @property {number[]} [lootItems] The loot to select.
 */

module.exports = PersistenceDAO
