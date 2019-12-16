const GrindSpot = require('./GrindSpot') // eslint-disable-line no-unused-vars
const Grinder = require('./Grinder') // eslint-disable-line no-unused-vars
const User = require('./User') // eslint-disable-line no-unused-vars
const ReportLoot = require('./ReportLoot') // eslint-disable-line no-unused-vars

class Report {
  /**
   * Creates an instance of Report.
   * @param {ReportInputData} reportData
   * @param {GrindSpot} [reportSpot]
   * @param {Grinder} [reportGrinder]
   * @param {User} [reportOwner]
   * @param {ReportLoot[]} [reportLoot]
   * @memberof Report
   */
  constructor (reportData, reportSpot, reportGrinder, reportOwner, reportLoot) {
    this._id = reportData.id
    this._spotId = (this.spotId = reportData.spotId)
    this._ownerId = (this.ownerId = reportData.ownerId)
    this._duration = (this.duration = reportData.duration)
    this._origin = reportData.origin
    this._flagged = reportData.flagged
    this._createdAt = reportData.createdat
    this._updatedAt = reportData.updatedat

    this.spot = reportSpot
    this.grinder = reportGrinder
    this.owner = reportOwner
    this._loot = (this.loot = reportLoot)
  }

  set loot (value) {
    if (!value) throw new Error('Bad Report Loot: Missing')
    else if (!Array.isArray(value)) throw new Error('Bad Report Loot: Input Type')
    else if (value.length < 1) throw new Error(`Bad Report Loot: Length`)
    else if (!value.every(a => a instanceof ReportLoot)) throw new Error('Bad Report Loot: Input Type')
    else return (this._loot = value)
  }
  get loot () {
    return this._loot
  }

  set spotId (value) {
    if (!value) throw new Error('Bad Report Spot Id: Missing')
    else if (typeof value !== 'number') throw new Error('Bad Report Spot Id: Input Type')
    return (this._spotId = value)
  }
  set ownerId (value) {
    if (value) {
      if (typeof value !== 'string') throw new Error('Bad Report Owner Id: Input Type')
      return (this._ownerId = value)
    }
  }
  set duration (value) {
    if (!value) throw new Error('Bad Report Duration: Missing')
    else if (typeof value !== 'number') throw new Error('Bad Report Duration: Input Type')
    else if (value < 1) throw new Error('Bad Report Duration: Value Too Low (< 1)')
    return (this._duration = value)
  }

  jsonify () {
    return {
      id: this._id,
      spotId: this._spotId,
      ownerId: this._ownerId,

      duration: this._duration,

      origin: this._origin,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,

      spot: this.spot ? this.spot.jsonify() : undefined,
      grinder: this.grinder ? this.grinder.jsonify() : undefined,
      owner: this.owner ? this.owner.jsonify() : undefined,
      loot: this.loot ? this.loot.map(l => l.jsonify()) : undefined
    }
  }
}

module.exports = Report

/**
 * @typedef {Object} ReportInputData
 * @property {number} id
 * @property {number} spotId
 * @property {string} [ownerId]
 * @property {number} duration
 * @property {string} [origin]
 * @property {boolean} [flagged]
 * @property {Date} [createdAt]
 * @property {Date} [updatedAt]
 */
