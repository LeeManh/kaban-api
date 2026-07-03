export interface JwtPayload {
  sub: string; // user id
  email: string;
  rememberMe?: boolean;
  iat?: number;
  exp?: number;
  jti?: string;
}
