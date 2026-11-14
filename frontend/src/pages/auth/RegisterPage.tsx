import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { ApiError } from '../../lib/api';

const registerSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name cannot exceed 100 characters'),
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(72, 'Password cannot exceed 72 characters'),
  registrationNumber: z
    .string()
    .trim()
    .max(30, 'Registration number cannot exceed 30 characters')
    .optional(),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const { register: registerAuth } = useAuth();
  const navigate = useNavigate();
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      registrationNumber: '',
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setApiError(null);
    try {
      await registerAuth({
        fullName: data.fullName,
        email: data.email,
        password: data.password,
        registrationNumber: data.registrationNumber || undefined,
      });
      navigate('/overview');
    } catch (err: any) {
      if (err instanceof ApiError) {
        if (err.code === 'EMAIL_TAKEN') {
          setApiError('An account with this email address already exists. Please sign in or use another email.');
        } else if (err.code === 'RATE_LIMITED') {
          setApiError('Too many registration attempts. Please wait a few moments and try again.');
        } else if (err.code === 'VALIDATION_ERROR') {
          setApiError('Please verify all fields meet the requirements.');
        } else {
          setApiError(err.message || 'Unable to register. Please try again.');
        }
      } else {
        setApiError('A connection error occurred. Please try again.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-12 h-12 rounded-xl bg-primary text-surface flex items-center justify-center font-serif text-2xl font-semibold shadow-xs mx-auto mb-3">
          P
        </div>
        <h1 className="font-serif text-3xl font-semibold text-text tracking-tight">
          Create Student Account
        </h1>
        <p className="font-sans text-sm text-text-secondary mt-1.5">
          Join ProjectHub to submit capstones and collaborate
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-surface py-8 px-6 sm:px-8 border border-border rounded-xl shadow-xs">
          {apiError && (
            <div
              role="alert"
              className="mb-5 p-3 rounded-md bg-error/10 border border-error/20 text-xs sm:text-sm text-error font-sans leading-relaxed animate-fade-in"
            >
              {apiError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <Input
              label="Full Name"
              type="text"
              autoComplete="name"
              placeholder="e.g. Diya Rao"
              error={errors.fullName?.message}
              required
              {...register('fullName')}
            />

            <Input
              label="Email address"
              type="email"
              autoComplete="email"
              placeholder="e.g. rao@demo.projecthub.test"
              error={errors.email?.message}
              required
              {...register('email')}
            />

            <Input
              label="Password"
              type="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              helperText="Must be between 8 and 72 characters"
              error={errors.password?.message}
              required
              {...register('password')}
            />

            <Input
              label="Registration Number (Optional)"
              type="text"
              placeholder="e.g. RA211100301002"
              error={errors.registrationNumber?.message}
              {...register('registrationNumber')}
            />

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={isSubmitting}
                className="w-full"
              >
                Create Account
              </Button>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-divider text-center text-xs text-text-secondary">
            <span>Already have an account? </span>
            <Link
              to="/login"
              className="text-primary font-medium hover:underline transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
