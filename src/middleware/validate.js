const ValidationError = require('../errors/ValidationError');

// Equivalent of the @Valid / MethodArgumentNotValidException flow: runs a Zod
// schema against req.body and turns failures into a field -> message map,
// exactly like GlobalExceptionHandler.handleValidation in the Java app.
function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const errors = {};
      for (const issue of result.error.issues) {
        const field = issue.path.join('.') || 'request';
        if (!errors[field]) errors[field] = issue.message;
      }
      return next(new ValidationError(errors));
    }

    req.body = result.data;
    return next();
  };
}

module.exports = { validateBody };
