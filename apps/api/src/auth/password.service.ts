import { Injectable } from '@nestjs/common';
import * as argon2 from '@node-rs/argon2';

@Injectable()
export class PasswordService {
  /**
   * Hashes a plaintext password using Argon2id with OWASP-recommended parameters
   */
  async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, {
      algorithm: argon2.Algorithm.Argon2id,
      memoryCost: 19456, // 19 MiB
      timeCost: 2,       // 2 iterations
      parallelism: 1,    // 1 lane
    });
  }

  /**
   * Verifies a plaintext password against an Argon2id hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  }
}
