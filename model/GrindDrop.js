const GrindSpot = require('./GrindSpot') // eslint-disable-line no-unused-vars

class GrindDrops {
  /**
   * Creates an instance of GrindDrops.
   * @param {GrinddropInputData} dropData
   * @param {BDOItemEntry} [itemData]
   * @param {GrindSpot} [dropSpot]
   * @memberof GrindDrops
   */
  constructor (dropData, itemData, dropSpot) {
    this._spotId = dropData.spotId
    this._itemId = dropData.itemId
    this._value = dropData.value

    this._name = itemData.name
    this._grade = itemData.grade
    this._icon = itemData.icon
    this._url = itemData.url

    this.spot = dropSpot
  }

  jsonify () {
    return {
      spotId: this._spotId,
      itemId: this._itemId,

      name: this._name,
      value: this._value,
      grade: this._grade,
      icon: this._icon,
      url: this._url,

      spot: this.spot ? this.spot.jsonify() : undefined
    }
  }
}

module.exports = GrindDrops

/**
 * @typedef {Object} GrinddropInputData
 * @property {number} spotId
 * @property {number} itemId
 * @property {number} value
 */

/**
 * @typedef {Object} BDOItemEntry
 * @property {string} id
 * @property {string} name
 * @property {white|green|blue|gold|orange} grade
 * @property {string} icon
 * @property {string} url
 */
