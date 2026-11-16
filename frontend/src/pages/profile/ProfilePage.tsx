import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User as UserIcon, Lock, Shield, Mail, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';
import { api, ApiError } from '../../lib/api';
import { User } from '../../types/api';
import { PageHeader } from '../../components/common/PageHeader';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { useToast } from '../../components/common/Toast';
import { formatDate } from '../../lib/dates';

const nameSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name cannot exceed 100 characters'),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters long')
    .max(72, 'New password cannot exceed 72 characters'),
});

type NameFormData = z.infer<typeof nameSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const { success } = useToast();

  const [nameError, setNameError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Form for changing full name
  const {
    register: registerName,
    handleSubmit: handleSubmitName,
    formState: { errors: nameErrors, isSubmitting: submittingName },
  } = useForm<NameFormData>({
    resolver: zodResolver(nameSchema),
    values: {
      fullName: user?.fullName || '',
    },
  });

  // Form for changing password
  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    reset: resetPasswordForm,
    formState: { errors: passErrors, isSubmitting: submittingPassword },
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
    },
  });

  const onUpdateName = async (data: NameFormData) => {
    setNameError(null);
    try {
      await api.patch<{ user: User }>('/profile', { fullName: data.fullName });
      await refreshUser();
      success('Name updated successfully');
    } catch (err: any) {
      if (err instanceof ApiError) {
        setNameError(err.message || 'Failed to update name');
      } else {
        setNameError('Connection error occurred');
      }
    }
  };

  const onUpdatePassword = async (data: PasswordFormData) => {
    setPasswordError(null);
    try {
      await api.post('/profile/password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      success('Password changed successfully. Your session remains active.');
      resetPasswordForm();
    } catch (err: any) {
      if (err instanceof ApiError) {
        if (err.code === 'RATE_LIMITED') {
          setPasswordError('Too many password change attempts. Please wait a few moments.');
        } else if (err.code === 'UNAUTHENTICATED') {
          setPasswordError('Current password is incorrect. Please try again.');
        } else {
          setPasswordError(err.message || 'Failed to change password');
        }
      } else {
        setPasswordError('Connection error occurred');
      }
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <PageHeader
        title="Account Profile"
        description="View your role credentials and manage your account details and password."
      />

      {/* Account Info (Read-only email & role) */}
      <div className="card-hard-static bg-white p-6 sm:p-7">
        <span className="inline-block font-mono text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 border-2 border-ink shadow-[2px_2px_0_0_#1B1410] rounded-sm mb-3 bg-violet-tint text-ink">
          ACCOUNT CREDENTIALS
        </span>
        <h3 className="font-display font-bold text-xl text-ink mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary stroke-[2.5]" /> Role & Account Information
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans">
          <div className="p-3.5 rounded-[10px] bg-paper border-2 border-ink shadow-[2px_2px_0_0_#1B1410]">
            <span className="text-text-muted font-mono uppercase tracking-wider text-[11px] font-bold flex items-center gap-1.5 mb-1">
              <Mail className="w-3.5 h-3.5 text-ink" /> Email Address (Read-only)
            </span>
            <span className="font-bold text-sm text-ink block truncate">
              {user.email}
            </span>
          </div>

          <div className="p-3.5 rounded-[10px] bg-paper border-2 border-ink shadow-[2px_2px_0_0_#1B1410]">
            <span className="text-text-muted font-mono uppercase tracking-wider text-[11px] font-bold flex items-center gap-1.5 mb-1">
              <Shield className="w-3.5 h-3.5 text-ink" /> Account Role (Read-only)
            </span>
            <span className="font-display font-black text-sm text-primary uppercase block">
              {user.role}
            </span>
          </div>

          {user.registrationNumber && (
            <div className="p-3.5 rounded-[10px] bg-paper border-2 border-ink shadow-[2px_2px_0_0_#1B1410]">
              <span className="text-text-muted font-mono uppercase tracking-wider text-[11px] font-bold block mb-1">
                Registration Number
              </span>
              <span className="font-mono font-bold text-sm text-ink block">
                {user.registrationNumber}
              </span>
            </div>
          )}

          <div className="p-3.5 rounded-[10px] bg-paper border-2 border-ink shadow-[2px_2px_0_0_#1B1410]">
            <span className="text-text-muted font-mono uppercase tracking-wider text-[11px] font-bold block mb-1">
              Member Since
            </span>
            <span className="font-mono font-bold text-sm text-ink block">
              {formatDate(user.createdAt)}
            </span>
          </div>
        </div>
      </div>

      {/* Change Name Form */}
      <div className="card-hard-static bg-white p-6 sm:p-7">
        <span className="inline-block font-mono text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 border-2 border-ink shadow-[2px_2px_0_0_#1B1410] rounded-sm mb-3 bg-marigold text-ink">
          PROFILE SETTINGS
        </span>
        <h3 className="font-display font-bold text-xl text-ink mb-1 flex items-center gap-2">
          <UserIcon className="w-5 h-5 text-text-muted stroke-[2.5]" /> Update Profile Name
        </h3>
        <p className="font-sans text-xs text-text-secondary mb-4">
          Your full name appears on all created projects, milestone reviews, and team listings.
        </p>

        {nameError && (
          <div className="mb-4 p-3 rounded-lg bg-error/10 border-2 border-error text-xs font-mono font-bold text-error">
            {nameError}
          </div>
        )}

        <form onSubmit={handleSubmitName(onUpdateName)} className="space-y-4" noValidate>
          <Input
            label="Full Name"
            placeholder="e.g. Diya Rao"
            error={nameErrors.fullName?.message}
            required
            {...registerName('fullName')}
          />

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={submittingName}
              icon={<CheckCircle2 className="w-4 h-4" />}
            >
              Save Name
            </Button>
          </div>
        </form>
      </div>

      {/* Change Password Form */}
      <div className="card-hard-static bg-white p-6 sm:p-7">
        <span className="inline-block font-mono text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 border-2 border-ink shadow-[2px_2px_0_0_#1B1410] rounded-sm mb-3 bg-coral text-ink">
          SECURITY SETTINGS
        </span>
        <h3 className="font-display font-bold text-xl text-ink mb-1 flex items-center gap-2">
          <Lock className="w-5 h-5 text-text-muted stroke-[2.5]" /> Change Password
        </h3>
        <p className="font-sans text-xs text-text-secondary mb-4 leading-relaxed">
          Updating your password will immediately terminate all your other active sessions while keeping your current session active.
        </p>

        {passwordError && (
          <div className="mb-4 p-3 rounded-lg bg-error/10 border-2 border-error text-xs font-mono font-bold text-error">
            {passwordError}
          </div>
        )}

        <form onSubmit={handleSubmitPassword(onUpdatePassword)} className="space-y-4" noValidate>
          <Input
            label="Current Password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter current password"
            error={passErrors.currentPassword?.message}
            required
            {...registerPassword('currentPassword')}
          />

          <Input
            label="New Password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            helperText="Must be between 8 and 72 characters long"
            error={passErrors.newPassword?.message}
            required
            {...registerPassword('newPassword')}
          />

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={submittingPassword}
              icon={<CheckCircle2 className="w-4 h-4" />}
            >
              Update Password
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
