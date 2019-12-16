const request = require('request-promise-native')
const crypto = require('crypto')
const base64url = require('base64url').default

const _encoding = 'utf-8'

const _encode = data => base64url.encode(JSON.stringify(data), _encoding)
const _createSignature = (data, secret) => {
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(_encode(data))
  return base64url.encode(hmac.digest(), _encoding)
}

/**
 * Sends a POST to the provided url with the provided data. Returns the statusCode of the request.
 * Creates a signature of the body if secret is provided.
 * @param {string} url
 * @param {*} data
 * @param {string} secret
 * @returns {number}
 */
module.exports.sendPOST = async (url, data, secret) => {
  const bodyEnvelope = {
    source: process.env.home,
    time: new Date().toISOString(),
    data: data,
    signature: secret ? _createSignature(data, secret) : undefined
  }
  const postConfig = {
    uri: url,
    method: 'POST',
    resolveWithFullResponse: true,
    simple: false,
    body: bodyEnvelope,
    json: true,
    headers: {
      'User-Agent': 'Tinfoil-Academy'
    }
  }

  const response = await request(postConfig)
  return response.statusCode
}
