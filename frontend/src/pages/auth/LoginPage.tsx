import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { ApiError } from '../../lib/api';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setApiError(null);
    try {
      await login(data);
      navigate('/overview');
    } catch (err: any) {
      if (err instanceof ApiError) {
        if (err.code === 'UNAUTHENTICATED') {
          setApiError('Invalid email or password. Please check your credentials and try again.');
        } else if (err.code === 'RATE_LIMITED') {
          setApiError('Too many login attempts. Please wait a few moments and try again.');
        } else {
          setApiError(err.message || 'Unable to sign in. Please try again.');
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
          Sign in to ProjectHub
        </h1>
        <p className="font-sans text-sm text-text-secondary mt-1.5">
          Student Project Tracking and Review System
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
              label="Email address"
              type="email"
              autoComplete="email"
              placeholder="name@demo.projecthub.test"
              error={errors.email?.message}
              required
              {...register('email')}
            />

            <Input
              label="Password"
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              error={errors.password?.message}
              required
              {...register('password')}
            />

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={isSubmitting}
                className="w-full"
              >
                Sign In
              </Button>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-divider text-center text-xs text-text-secondary">
            <span>Don&apos;t have an account? </span>
            <Link
              to="/register"
              className="text-primary font-medium hover:underline transition-colors"
            >
              Register as Student
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
