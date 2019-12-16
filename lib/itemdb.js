const request = require('request-promise-native')

/**
 * Caches items so that we do not do unnecessary GET requests.
 * We can be quite confident in that items will NOT change and if they do...
 * Well, that's an issue for then, isn't it?
 * @type {Map<number, BDOItemEntry>}
 */
const ItemCache = new Map()

/**
 * Asyncronously fetches information regarding the provided item from an external item database.
 * @param {string} itemId The id of the item to fetch.
 * @returns {BDOItemEntry}
 * @async
 * @copyright Database service provided free-of-charge by https://database.desertcore.com/.
 * @todo Consider own implementation of this in the future.
 */
const getItemInfo = async itemId => {
  // Check the cache
  if (ItemCache.has(itemId)) {
    return ItemCache.get(itemId)
  }

  // Set up fetch options.
  const fetchOptions = {
    uri: `https://database.desertcore.com/item.php?id=${itemId}`,
    method: 'GET',
    resolveWithFullResponse: true,
    simple: false,
    headers: {
      'User-Agent': 'Tinfoil-Academy'
    }
  }

  try {
    const response = await request(fetchOptions)

    // The response is returned as an object with relevant data.
    if ([200, 304].indexOf(response.statusCode) > -1) {
      const data = JSON.parse(response.body)
      if (data.code === 200) {
        const itemInfo = convertItemInfoResponse(data.data)
        ItemCache.set(itemId, itemInfo)
        return itemInfo
      }
    }
    throw new Error('ITEM_DB_ERR')
  } catch (error) {
    throw new Error('ITEM_DB_ERR')
  }
}

/**
 *
 * @param {*} data
 */
const convertItemInfoResponse = data => {
  return Object.assign(data, {
    grade: itemGradeToString(parseInt(data.grade))
  })
}

/**
 * Converts a given Item Grade Id into its string equivalent.
 * @param {0|1|2|3|4} gradeNum The item grade id.
 */
const itemGradeToString = gradeNum => {
  switch (gradeNum) {
    case 0:
      return 'white'
    case 1:
      return 'green'
    case 2:
      return 'blue'
    case 3:
      return 'gold'
    case 4:
      return 'orange'
    default:
      return 'unknown'
  }
}

/**
 * @typedef {Object} BDOItemEntry
 * @property {string} id
 * @property {string} name
 * @property {white|green|blue|gold|orange} grade
 * @property {string} icon
 * @property {string} url
 */

module.exports.getItemInfo = getItemInfo
