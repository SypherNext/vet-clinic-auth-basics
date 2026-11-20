// One place for error responses, so every route reports problems the same way.

// Throw this from a route to send a specific status code and message.
export class HttpError extends Error {
  constructor(status, title, message) {
    super(message);
    this.status = status;
    this.title = title;
  }
}

export function sendError(req, res, status, title, message) {
  res.status(status).render('message', { title, message, tone: 'error' });
}

export function notFound(req, res) {
  sendError(req, res, 404, 'Page not found', 'There is no page at this address.');
}

// Express calls this when a route throws. Unexpected errors are logged but
// never shown to the visitor, because stack traces leak details.
export function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) return sendError(req, res, err.status, err.title, err.message);
  if (err.type === 'entity.too.large') return sendError(req, res, 413, 'Too large', 'That form was too large.');
  console.error(err);
  sendError(req, res, 500, 'Something went wrong', 'Please try again.');
}
