interface Error {
  status: number;
  error: string;
  message: string;
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
