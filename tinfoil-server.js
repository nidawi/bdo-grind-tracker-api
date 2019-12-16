const PersistenceDAO = require('./model/PersistenceDAO')
const APIController = require('./controller/APIController')
const Environment = require('./environment')

// Assign our ENV
process.env = Object.assign(Environment, process.env)

const port = process.env.PORT || 3333 // Random ports.

// Create database connection
require('./config/database')
  .connect()
  .then(conn => {
    console.log(`Database Connection established: ${conn.state}`)

    // Create persistence wrapper
    const database = new PersistenceDAO(conn)
    // Create the controller
    APIController.setConnection(database)

    console.log('Persistence & Controllers have been set up.')
  })
  .catch(err => {
    console.log(`Failed to connect to the database. ${err.message} Server will now exit.`)
    process.exit(1)
  })

// Start the actual server.
require('./config/server').createServer()
  .listen(port, () => {
    console.log('Server started on port ' + port)
    console.log('Press Ctrl-C to terminate...')
  })
