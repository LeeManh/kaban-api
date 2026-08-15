export interface JwtPayload {
  sub: string; // user id
  email: string;
  tokenVersion: number;
  rememberMe?: boolean;
  iat?: number;
  exp?: number;
  jti?: string;
}
