import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "./config";

export interface JwtPayload {
  userId: string;
  email: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: JwtPayload): string {
  const options = { expiresIn: config.jwtExpiresIn } as jwt.SignOptions;
  return jwt.sign(payload, config.jwtSecret, options);
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, config.jwtSecret) as JwtPayload;
}
