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
    <div className="min-h-screen bg-paper flex items-center justify-center p-4 sm:p-6 lg:p-10 select-none">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
        {/* Left Hero Panel (desktop split / mobile stacked above) */}
        <div className="lg:col-span-5 card-hard-static bg-ink text-paper p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden">
          {/* Top branding & decorative shapes */}
          <div>
            <div className="flex items-center justify-between gap-3 mb-6">
              <div className="w-12 h-12 rounded-lg bg-primary text-white border-2 border-paper flex items-center justify-center font-display text-2xl font-black shadow-[3px_3px_0_0_#FFF1D6]">
                P
              </div>
              <span className="font-mono text-xs uppercase tracking-wider font-bold px-2.5 py-1 rounded bg-lime text-ink border-2 border-ink shadow-[2px_2px_0_0_#000]">
                STUDENT ONBOARDING
              </span>
            </div>

            <h2 className="font-display font-black text-4xl sm:text-5xl lg:text-6xl text-paper tracking-tight leading-none mb-3">
              ProjectHub
            </h2>
            <p className="font-sans text-base text-paper/85 leading-relaxed max-w-sm">
              Student Project Tracking and Review System
            </p>

            {/* CSS Stripe pattern strip */}
            <div className="h-4 w-full pattern-stripes-marigold border-2 border-paper/40 rounded-sm my-6" />
          </div>

          {/* CSS Decorative geometric shape cluster */}
          <div className="mt-8 pt-6 border-t-2 border-paper/20 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-paper bg-marigold shadow-[2px_2px_0_0_#000] flex items-center justify-center font-mono text-xs font-black text-ink">
              NEW
            </div>
            <div className="font-mono text-xs text-paper/70 uppercase tracking-wider font-bold">
              Join Capstone Teams Instantly
            </div>
          </div>
        </div>

        {/* Right Form Card */}
        <div className="lg:col-span-7 card-hard-static bg-white p-6 sm:p-10 flex flex-col justify-center">
          <div className="mb-6">
            <span className="inline-block font-mono text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 border-2 border-ink shadow-[2px_2px_0_0_#1B1410] rounded-sm mb-2 bg-lime text-ink">
              REGISTRATION
            </span>
            <h1 className="font-display font-black text-3xl sm:text-4xl text-ink tracking-tight">
              Create Student Account
            </h1>
            <p className="font-sans text-sm text-text-secondary mt-1">
              Join ProjectHub to submit capstones and collaborate
            </p>
          </div>

          {apiError && (
            <div
              role="alert"
              className="mb-5 p-3.5 rounded-lg bg-error/10 border-2 border-error text-xs sm:text-sm text-error font-mono font-medium leading-relaxed animate-fade-in"
            >
              {apiError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <Input
              label="Full name"
              type="text"
              autoComplete="name"
              placeholder="e.g. Aarav Patel"
              error={errors.fullName?.message}
              required
              {...register('fullName')}
            />

            <Input
              label="Registration number"
              type="text"
              autoComplete="off"
              placeholder="e.g. RA2111003010001 (optional)"
              error={errors.registrationNumber?.message}
              helperText="University student registration identifier"
              {...register('registrationNumber')}
            />

            <Input
              label="Email address"
              type="email"
              autoComplete="email"
              placeholder="name@example.com"
              error={errors.email?.message}
              required
              {...register('email')}
            />

            <Input
              label="Password"
              type="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              error={errors.password?.message}
              required
              {...register('password')}
            />

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={isSubmitting}
                className="w-full font-bold uppercase tracking-wider text-sm"
              >
                Create Account
              </Button>
            </div>
          </form>

          <div className="mt-6 pt-5 border-t-2 border-ink text-center text-sm font-sans text-text-secondary">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-primary hover:underline font-mono uppercase tracking-wider text-xs">
              Sign in &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
