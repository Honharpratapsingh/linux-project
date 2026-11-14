import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthService } from '../services/authService';
import { generateCsrfToken } from '../utils/crypto';
import { unauthenticated } from '../utils/errors';

const registerSchema = z
  .object({
    fullName: z.string().trim().min(2).max(100),
    email: z.string().trim().email(),
    password: z.string().min(8).max(72),
    registrationNumber: z.string().trim().min(1).max(30).optional(),
  })
  .strict();

const loginSchema = z
  .object({
    email: z.string().trim().email(),
    password: z.string().min(1).max(72),
  })
  .strict();

const updateProfileSchema = z
  .object({
    fullName: z.string().trim().min(2).max(100),
  })
  .strict();

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(72),
    newPassword: z.string().min(8).max(72),
  })
  .strict();

function regenerateSessionAsync(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

function saveSessionAsync(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.save((err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

export class AuthController {
  constructor(private authService: AuthService) {}

  getCsrf = (req: Request, res: Response): void => {
    if (!req.session.csrfToken) {
      req.session.csrfToken = generateCsrfToken();
    }
    res.json({ csrfToken: req.session.csrfToken });
  };

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = registerSchema.parse(req.body);
      const user = await this.authService.register(body);

      // Regenerate session upon registration
      await regenerateSessionAsync(req);
      const newCsrf = generateCsrfToken();
      req.session.userId = user.id;
      req.session.csrfToken = newCsrf;
      await saveSessionAsync(req);

      res.status(201).json({
        user,
        csrfToken: newCsrf,
      });
    } catch (err) {
      next(err);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = loginSchema.parse(req.body);
      const user = await this.authService.login(body.email, body.password);

      // Regenerate session upon login
      await regenerateSessionAsync(req);
      const newCsrf = generateCsrfToken();
      req.session.userId = user.id;
      req.session.csrfToken = newCsrf;
      await saveSessionAsync(req);

      res.status(200).json({
        user,
        csrfToken: newCsrf,
      });
    } catch (err) {
      next(err);
    }
  };

  logout = (req: Request, res: Response, next: NextFunction): void => {
    req.session.destroy((err) => {
      if (err) return next(err);
      res.clearCookie('projecthub.sid');
      res.status(204).send();
    });
  };

  getMe = (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(unauthenticated('Not authenticated'));
    }
    res.status(200).json({ user: req.user });
  };

  updateProfile = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        return next(unauthenticated('Not authenticated'));
      }
      const body = updateProfileSchema.parse(req.body);
      const updated = await this.authService.updateProfile(req.user.id, body.fullName);
      res.status(200).json({ user: updated });
    } catch (err) {
      next(err);
    }
  };

  changePassword = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        return next(unauthenticated('Not authenticated'));
      }
      const body = changePasswordSchema.parse(req.body);
      const currentSid = req.session.id;

      await this.authService.changePassword(
        req.user.id,
        body.currentPassword,
        body.newPassword,
        currentSid
      );

      // Regenerate current session and assign new CSRF token
      await regenerateSessionAsync(req);
      const newCsrf = generateCsrfToken();
      req.session.userId = req.user.id;
      req.session.csrfToken = newCsrf;
      await saveSessionAsync(req);

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  getFaculty = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const items = await this.authService.getFacultyList();
      res.status(200).json({ items });
    } catch (err) {
      next(err);
    }
  };

  searchStudents = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        return next(unauthenticated('Not authenticated'));
      }
      const email = typeof req.query.email === 'string' ? req.query.email.trim() : '';
      if (!email) {
        res.status(200).json({ items: [] });
        return;
      }
      const items = await this.authService.searchStudent(email, req.user.id);
      res.status(200).json({ items });
    } catch (err) {
      next(err);
    }
  };
}
