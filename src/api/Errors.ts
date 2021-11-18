interface Error {
  status: number;
  error: string;
  message: string;
}

export const BadRequest: Error = {
  status: 400,
  error: 'Bad Request',
  message: 'Bad type provided'
};
export const BadEmptyPayloadRequest = (key: string): Error => {
  return {
    status: 400,
    error: 'Bad Request',
    message: `Missing "${key}" element in request body`
  };
};
export const BadKeyPayloadRequest = (key: string): Error => {
  return {
    status: 400,
    error: 'Bad Request',
    message: `The element "${key}" is not a valid key`
  };
};
export const BadlengthPayloadRequest = (key: string): Error => {
  return {
    status: 400,
    error: 'Bad Request',
    message: `The length of "${key}" cannot exceed 180 characters`
  };
};
export const BadTypePayloadRequest = (key: string): Error => {
  return {
    status: 400,
    error: 'Bad Request',
    message: `The Joke type "${key}" is not valid type`
  };
};
export const MissingKey: Error = {
  status: 400,
  error: 'Bad Request',
  message: 'Key is missing'
};
export const NoContent: Error = {
  status: 404,
  error: 'Bad Request',
  message: 'All types have been disabled'
};
export const AuthHeaderMissing: Error = {
  status: 401,
  error: 'Unauthorized',
  message: 'Authorization header is required'
};

export const AuthHeaderBadFormat: Error = {
  status: 401,
  error: 'Unauthorized',
  message: 'Authorization header value must follow the Bearer <token> format'
};

export const AuthHeaderInvalidToken: Error = {
  status: 401,
  error: 'Unauthorized',
  message: 'Invalid Token submitted'
};

export const JokeNotFound: Error = {
  status: 404,
  error: 'Not found',
  message: 'Joke not found'
};
