class GenericApplicationError extends Error {
  constructor (message, code) {
    super(message)
    this.code = code
  }
}

module.exports = {
  GenericApplicationError: GenericApplicationError,
  InternalError: class InternalError extends GenericApplicationError {
    constructor (message) {
      super(message, 500)
    }
  },
  ServiceUnavailable: class ServiceUnavailableError extends GenericApplicationError {
    constructor (message) {
      super(message, 503)
    }
  },
  NotImplemented: class NotImplementedError extends GenericApplicationError {
    constructor (message) {
      super(message, 501)
    }
  },
  PreconditionFailed: class PreconditionFailedError extends GenericApplicationError {
    constructor (message) {
      super(message, 412)
    }
  },
  BadRequestError: class BadRequestError extends GenericApplicationError {
    constructor (message) {
      super(message, 400)
    }
  },
  NotFoundError: class NotFoundError extends GenericApplicationError {
    constructor (message) {
      super(message, 404)
    }
  },
  ForbiddenError: class ForbiddenError extends GenericApplicationError {
    constructor (message) {
      super(message, 403)
    }
  },
  UnauthorizedError: class UnauthorizedError extends GenericApplicationError {
    constructor (message) {
      super(message, 401)
    }
  },
  TooManyRequestsError: class TooManyRequestsError extends GenericApplicationError {
    constructor (message) {
      super(message, 429)
    }
  },
  MethodNotAllowed: class MethodNotAllowedError extends GenericApplicationError {
    constructor (message) {
      super(message, 405)
    }
  },
  Unacceptable: class UnacceptableError extends GenericApplicationError {
    constructor (message) {
      super(message, 406)
    }
  }
}
