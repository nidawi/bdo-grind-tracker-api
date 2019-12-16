class Grinder {
  /**
   * Creates an instance of Grinder.
   * @param {GrinderInputData} grinderData
   * @memberof Grinder
   */
  constructor (grinderData) {
    this._reportId = grinderData.reportId
    this._class = (this.class = grinderData.class)
    this._APmh = (this.APMainhand = grinderData.APmh)
    this._APawa = (this.APAwakening = grinderData.APawa)
    this._DP = (this.DP = grinderData.DP)
    this._luck = (this.Luck = grinderData.luck)
    this._lootScroll = (this.Lootscroll = grinderData.lootScroll)
    this._arsha = (this.Arsha = grinderData.arsha)
    this._castle = (this.Castle = grinderData.castle)
    this._gmBlessing = (this.GMBlessing = grinderData.gmBlessing)
  }

  set class (value) {
    if (!value) throw new Error('Bad Grinder Class: Value Missing')
    else if (typeof value !== 'string') throw new Error('Bad Grinder Class: Input Type')
    return (this._class = value)
  }
  set APMainhand (value) {
    if (value) {
      if (typeof value !== 'number') throw new Error('Bad Grinder AP Mainhand: Input Type')
      else if (value < 1) throw new Error('Bad Grinder AP Mainhand: Value Too Low (<1)')
      return (this._APmh = value)
    }
  }
  set APAwakening (value) {
    if (value) {
      if (typeof value !== 'number') throw new Error('Bad Grinder AP Awakening: Input Type')
      else if (value < 1) throw new Error('Bad Grinder AP Awakening: Value Too Low (<1)')
      return (this._APawa = value)
    }
  }
  set DP (value) {
    if (value) {
      if (typeof value !== 'number') throw new Error('Bad Grinder DP: Input Type')
      else if (value < 1) throw new Error('Bad Grinder DP: Value Too Low (<1)')
      return (this._DP = value)
    }
  }
  set Luck (value) {
    if (value) {
      if (typeof value !== 'number') throw new Error('Bad Grinder Luck: Input Type')
      else if (value < 0) throw new Error('Bad Grinder Luck: Value Too Low (<0)')
      else if (value > 5) throw new Error('Bad Grinder Luck: Value Too High (>5)')
      return (this._luck = value)
    }
  }
  set Lootscroll (value) {
    if (value !== undefined) {
      if ([true, false, 1, 0].indexOf(value) === -1) throw new Error('Bad Grinder Lootscroll: Input Type | Value')
      return (this._lootScroll = Boolean(value))
    }
  }
  set Arsha (value) {
    if (value !== undefined) {
      if ([true, false, 1, 0].indexOf(value) === -1) throw new Error('Bad Grinder Arsha: Input Type | Value')
      return (this._arsha = Boolean(value))
    }
  }
  set Castle (value) {
    if (value !== undefined) {
      if ([true, false, 1, 0].indexOf(value) === -1) throw new Error('Bad Grinder Castle: Input Type | Value')
      return (this._castle = Boolean(value))
    }
  }
  set GMBlessing (value) {
    if (value !== undefined) {
      if ([true, false, 1, 0].indexOf(value) === -1) throw new Error('Bad Grinder GMBlessing: Input Type | Value')
      return (this._gmBlessing = Boolean(value))
    }
  }

  get gearscore () {
    return ((this._APmh + this._APawa) / 2) + this._DP
  }

  jsonify () {
    return {
      reportId: this._reportId,
      class: this._class,
      APMainhand: this._APmh,
      APAwakening: this._APawa,
      DP: this._DP,
      Luck: this._luck,
      Gearscore: this.gearscore,

      HasLootScroll: Boolean(this._lootScroll),
      HasArshaBuff: Boolean(this._arsha),
      HasCastleBuff: Boolean(this._castle),
      HasGMBlessingBuff: Boolean(this._gmBlessing)
    }
  }
}

module.exports = Grinder

/**
 * @typedef {Object} GrinderInputData
 * @property {number} reportId
 * @property {string} class
 * @property {number} [APmh]
 * @property {number} [APawa]
 * @property {number} [DP]
 * @property {number} [luck]
 * @property {boolean} [lootScroll]
 * @property {boolean} [arsha]
 * @property {boolean} [castle]
 * @property {boolean} [gmBlessing]
 */
