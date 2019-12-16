const Report = require('./Report') // eslint-disable-line no-unused-vars
const GrindDrop = require('./GrindDrop') // eslint-disable-line no-unused-vars

class ReportLoot {
  /**
   * Creates an instance of ReportLoot.
   * @param {ReportLootInputData} lootData
   * @param {Report} lootReport
   * @param {GrindDrop} lootItem
   * @memberof ReportLoot
   */
  constructor (lootData, lootReport, lootItem) {
    this._reportId = lootData.reportId
    this._itemId = (this.itemId = lootData.itemId)
    this._amount = (this.amount = lootData.amount)

    this.report = lootReport
    this.item = lootItem
  }

  set itemId (value) {
    if (value === undefined) throw new Error('Bad Loot Item Id: Missing')
    else if (typeof value !== 'number') throw new Error('Bad Loot Item Id: Input Type')
    else return (this._itemId = value)
  }
  set amount (value) {
    if (value === undefined) throw new Error('Bad Loot Amount: Missing')
    else if (typeof value !== 'number') throw new Error('Bad Loot Amount: Input Type')
    else if (value < 1) throw new Error('Bad Loot Amount: Value Too Low (< 1)')
    else return (this._amount = value)
  }

  jsonify () {
    return {
      reportId: this._reportId,
      itemId: this._itemId,

      item: this.item ? this.item.jsonify() : undefined,
      amount: this._amount
    }
  }
}

module.exports = ReportLoot

/**
 * @typedef {Object} ReportLootInputData
 * @property {number} reportId
 * @property {number} itemId
 * @property {number} amount
 */
