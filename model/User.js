const bCrypt = require('bcrypt')
const USERNAME_MIN_LENGTH = 2
const USERNAME_MAX_LENGTH = 25
const PASSWORD_MIN_LENGTH = 3

class User {
  /**
   * Creates an instance of User.
   * @param {UserInputData} userData
   * @memberof User
   */
  constructor (userData) {
    // I'd like these parts to be nicer, but I don't have enough time.
    this._username = (this.username = userData.username)
    this._password = (this.password = userData.password)
    this._familyName = (this.familyName = userData.familyName)
    this._region = (this.region = userData.region)
    this._email = (this.email = userData.email)
    this._type = (this.admin = userData.type)
    this._status = (this.banned = userData.status)
  }

  async isPasswordMatch (password) {
    const isMatch = await bCrypt.compare(password, this._password)
    return isMatch
  }

  get exists () {
    return this._username !== undefined && this._password !== undefined
  }

  get username () {
    return this._username
  }
  get admin () {
    return this._type !== 0
  }

  set username (value) {
    if (!value) throw new Error('Bad Username: Missing')
    else if (typeof value !== 'string') throw new Error('Bad User Username: Input Type')
    else if (value.length < USERNAME_MIN_LENGTH) throw new Error('Bad Username: Too Short')
    else if (value.length > USERNAME_MAX_LENGTH) throw new Error('Bad Username: Too Long')

    return (this._username = value)
  }
  set password (value) {
    if (!value) throw new Error('Bad User Password: Missing')
    else if (typeof value !== 'string') throw new Error('Bad User Password: Input Type')
    else if (value.length < PASSWORD_MIN_LENGTH) throw new Error('Bad User Password: Too Short')

    return (this._password = value)
  }
  set familyName (value) {
    return (this._familyName = value)
  }
  set region (value) {
    return (this._region = value)
  }
  set email (value) {
    return (this._email = value)
  }
  set admin (value) {
    switch (typeof value) {
      case 'number':
        this._type = value
        break
      case 'boolean':
        this._type = value ? 1 : 0
        break
    }
    return this._type !== 0
  }
  set banned (value) {
    switch (typeof value) {
      case 'number':
        this._status = value
        break
      case 'boolean':
        this._status = value ? 1 : 0
        break
    }
    return this._status !== 0
  }

  jsonify (fullInfo = false) {
    return {
      username: this._username,
      familyName: fullInfo ? this._familyName : undefined,
      region: this._region,
      email: fullInfo ? this._email : undefined,
      type: fullInfo ? this._type : undefined,
      status: fullInfo ? this._status : undefined
    }
  }
}

module.exports = User

/**
 * @typedef {Object} UserInputData
 * @property {number} id
 * @property {string} username
 * @property {string} password
 * @property {string} [familyName]
 * @property {string} [region]
 * @property {string} [email]
 * @property {number} type
 * @property {number} status
 */
