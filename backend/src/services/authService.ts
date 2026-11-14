import bcrypt from 'bcrypt';
import { AppConfig } from '../config/env';
import { UserRepository, mapUserRow } from '../repositories/userRepository';
import { User, UserRef } from '../types';
import {
  emailTaken,
  unauthenticated,
  validationError,
  notFound,
} from '../utils/errors';

export class AuthService {
  private dummyHash: string;

  constructor(
    private userRepo: UserRepository,
    private config: AppConfig
  ) {
    // Generate a valid bcrypt hash with configured rounds for timing-safe dummy comparisons
    const rounds = config?.BCRYPT_ROUNDS || 12;
    this.dummyHash = bcrypt.hashSync('dummy-password-timing-safe', rounds);
  }

  async register(params: {
    fullName: string;
    email: string;
    password: string;
    registrationNumber?: string | null;
  }): Promise<User> {
    const existing = await this.userRepo.findByEmail(params.email);
    if (existing) {
      throw emailTaken('Email is already registered');
    }

    const passwordHash = await bcrypt.hash(params.password, this.config.BCRYPT_ROUNDS);

    return this.userRepo.createStudent({
      fullName: params.fullName,
      email: params.email,
      passwordHash,
      registrationNumber: params.registrationNumber,
    });
  }

  async login(email: string, password: string): Promise<User> {
    const userRow = await this.userRepo.findByEmail(email);

    if (!userRow) {
      // Run dummy comparison to mitigate timing attacks on username enumeration
      await bcrypt.compare(password, this.dummyHash);
      throw unauthenticated('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(password, userRow.password_hash);
    if (!isMatch) {
      throw unauthenticated('Invalid email or password');
    }

    return mapUserRow(userRow);
  }

  async updateProfile(userId: string, fullName: string): Promise<User> {
    const updated = await this.userRepo.updateFullName(userId, fullName);
    if (!updated) {
      throw notFound('User not found');
    }
    return updated;
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    currentSid: string
  ): Promise<void> {
    const userRow = await this.userRepo.findById(userId);
    if (!userRow) {
      throw notFound('User not found');
    }

    const isMatch = await bcrypt.compare(currentPassword, userRow.password_hash);
    if (!isMatch) {
      throw validationError('Incorrect current password');
    }

    const newHash = await bcrypt.hash(newPassword, this.config.BCRYPT_ROUNDS);
    await this.userRepo.updatePasswordHash(userId, newHash);
    await this.userRepo.deleteOtherSessions(userId, currentSid);
  }

  async getFacultyList(): Promise<(UserRef & { email: string })[]> {
    return this.userRepo.findFaculty();
  }

  async searchStudent(
    email: string,
    excludeUserId: string
  ): Promise<(UserRef & { email: string })[]> {
    return this.userRepo.searchStudentByEmail(email, excludeUserId);
  }
}
