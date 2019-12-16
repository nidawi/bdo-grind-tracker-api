const mysql = require('mysql')

/**
 * @returns {Promise<mysql.Pool>}
 */
const connectToDatabase = () => {
  return new Promise((resolve, reject) => {
    const connectionPool = mysql.createPool({
      host: process.env.database.host,
      user: process.env.database.user,
      password: process.env.database.password,
      database: process.env.database.database
    })

    return resolve(connectionPool)
  })
}

module.exports = {
  connect: connectToDatabase
}
