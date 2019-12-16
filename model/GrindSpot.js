class GrindSpot {
  /**
   * Creates an instance of GrindSpot.
   * @param {GrindSpotInputData} spotData
   * @memberof GrindSpot
   */
  constructor (spotData) {
    this._id = spotData.id
    this._name = spotData.name
  }

  jsonify () {
    return {
      id: this._id,
      name: this._name
    }
  }
}

module.exports = GrindSpot

/**
 * @typedef {Object} GrindSpotInputData
 * @property {number} id
 * @property {string} name
 */
