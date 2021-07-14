interface Error {
  status: number;
  error: string;
  message: string;
}

export const NoContent: Error = {
  status: 404,
  error: 'Bad Request',
  message: 'All types have been disabled'
}
export const BadRequest: Error = {
  status: 400,
  error: 'Bad Request',
  message: 'Bad type provided'
}
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

export const JokeNotFound: Error = {
  status: 404,
  error: 'Not found',
  message: 'Joke not found'
}
