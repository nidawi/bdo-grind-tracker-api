const User = require('./User') //eslint-disable-line

const validTypes = [
  'reportCreated'
]

class Webhook {
  /**
   * Creates an instance of Webhook.
   * @param {WebhookInputData} webhookData
   * @param {User} [webhookOwner]
   * @memberof Webhook
   */
  constructor (webhookData, webhookOwner) {
    this._id = webhookData.id
    this._owner = (this.Owner = webhookData.owner)
    this._eventType = (this.EventType = webhookData.eventType)
    this._eventTarget = (this.EventTarget = webhookData.eventTarget)
    this._secret = (this.Secret = webhookData.secret)

    this.owner = webhookOwner
  }

  set Secret (value) {
    if (value) {
      if (typeof value !== 'string') throw new Error('Bad Webhook Secret: Invalid Type')
      else return (this._secret = value)
    }
  }
  get Secret () {
    return this._secret
  }

  set Owner (value) {
    if (!value) throw new Error('Bad Webhook Owner: Missing')
    else if (typeof value !== 'string') throw new Error('Bad Webhook Owner: Invalid Type')
    else return (this._owner = value)
  }
  get Owner () {
    return this._owner
  }

  set EventType (value) {
    if (!value) throw new Error('Bad Webhook Type: Missing')
    else if (typeof value !== 'string') throw new Error('Bad Webhook Type: Invalid Type')
    else if (validTypes.indexOf(value) === -1) throw new Error('Bad Webhook Type: Invalid Value')
    else return (this._eventType = value)
  }
  get EventType () {
    return this._eventType
  }

  set EventTarget (value) {
    if (!value) throw new Error('Bad Webhook Target: Missing')
    else if (typeof value !== 'string') throw new Error('Bad Webhook Target: Invalid Type')
    else if (!isURL(value)) throw new Error('Bad Webhook Target: Is Not Valid URL')
    else return (this._eventTarget = value)
  }
  get EventTarget () {
    return this._eventTarget
  }

  jsonify () {
    return {
      id: this._id,
      ownerId: this._owner,
      eventType: this._eventType,
      eventTarget: this._eventTarget,
      secret: undefined,

      owner: this.owner ? this.owner.jsonify(true) : undefined // Fullinfo always true as this is only available to admins and to hook owner.
    }
  }
}

const isURL = (text, strict = false) => {
  // This is a mediocre attempt at verifying a URL
  // It won't match all possible URLs, but I suppose it will match most common ones anyway
  return new RegExp(
    '^localhost:\\d{2,5}|' + // Local host
    '^\\d{3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d|' + // Ipv4
    (strict) ? '^(https?:\\/{2}\\w+\\..+)' : '^((\\w|-)*(:\\/{2})?)\\w+\\..+' // Normal domain
  ).test(text)
}

module.exports = Webhook

/**
 * @typedef {Object} WebhookInputData
 * @property {number} id
 * @property {string} owner
 * @property {string} eventType
 * @property {string} eventTarget
 * @property {string} secret
 */
