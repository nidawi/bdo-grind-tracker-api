class StatisticalQuery {
  /**
   * Creates an instance of StatisticalQuery.
   * @param {QueryInputData} queryData
   * @memberof StatisticalQuery
   */
  constructor (queryData) {
    // This only supports those parameters currently.
    this._spotId = (this.spotId = queryData.spotId)
    this._class = (this.class = queryData.class)
    this._duration = (this.duration = queryData.duration)
    this._APawa = (this.APawa = queryData.APawa)
  }

  set spotId (value) {
    // Mandatory
    if (value === undefined) throw new Error('Bad Query SpotId: Missing')
    else if (['string', 'number'].indexOf(typeof value) < 0) throw new Error('Bad Query SpotId: Input Type')
    return (this._spotId = value)
  }
  set class (value) {
    // Optional
    if (value !== undefined) {
      if (typeof value !== 'string') throw new Error('Bad Query Class: Input Type')
      else return (this._class = value)
    }
  }
  set duration (value) {
    // Optional
    if (value !== undefined) {
      if (typeof value !== 'number') throw new Error('Bad Query Duration: Input Type')
      else if (value < 1) throw new Error('Bad Query Duration: Too Low (<1)')
      return (this._duration = value)
    }
  }
  set APawa (value) {
    // Optional
    if (value !== undefined) {
      if (typeof value !== 'number') throw new Error('Bad Query Awakening AP: Input Type')
      else if (value < 1) throw new Error('Bad Query Awakening AP: Too Low (<1)')
      return (this._APawa = value)
    }
  }
}

module.exports = StatisticalQuery

/**
 * @typedef {Object} QueryInputData
 * @property {number} spotId
 * @property {string} [class]
 * @property {number} [duration]
 * @property {number} [APawa]
 */
