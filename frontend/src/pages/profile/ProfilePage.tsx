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
      <div className="bg-surface border border-border rounded-xl p-6 sm:p-7 shadow-xs">
        <h3 className="font-serif text-lg font-semibold text-text mb-4 flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" /> Role & Account Information
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans">
          <div className="p-3 rounded-lg bg-sidebar border border-border/60">
            <span className="text-text-muted flex items-center gap-1.5 mb-1">
              <Mail className="w-3.5 h-3.5" /> Email Address (Read-only)
            </span>
            <span className="font-medium text-sm text-text block truncate">
              {user.email}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-sidebar border border-border/60">
            <span className="text-text-muted flex items-center gap-1.5 mb-1">
              <Shield className="w-3.5 h-3.5" /> Account Role (Read-only)
            </span>
            <span className="font-semibold text-sm text-primary uppercase block">
              {user.role}
            </span>
          </div>

          {user.registrationNumber && (
            <div className="p-3 rounded-lg bg-sidebar border border-border/60">
              <span className="text-text-muted block mb-1">
                Registration Number
              </span>
              <span className="font-medium text-sm text-text block">
                {user.registrationNumber}
              </span>
            </div>
          )}

          <div className="p-3 rounded-lg bg-sidebar border border-border/60">
            <span className="text-text-muted block mb-1">Member Since</span>
            <span className="font-medium text-sm text-text block">
              {formatDate(user.createdAt)}
            </span>
          </div>
        </div>
      </div>

      {/* Change Name Form */}
      <div className="bg-surface border border-border rounded-xl p-6 sm:p-7 shadow-xs">
        <h3 className="font-serif text-lg font-semibold text-text mb-1 flex items-center gap-2">
          <UserIcon className="w-4 h-4 text-text-muted" /> Update Profile Name
        </h3>
        <p className="font-sans text-xs text-text-secondary mb-4">
          Your full name appears on all created projects, milestone reviews, and team listings.
        </p>

        {nameError && (
          <div className="mb-4 p-2.5 rounded bg-error/10 text-xs text-error font-sans">
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
      <div className="bg-surface border border-border rounded-xl p-6 sm:p-7 shadow-xs">
        <h3 className="font-serif text-lg font-semibold text-text mb-1 flex items-center gap-2">
          <Lock className="w-4 h-4 text-text-muted" /> Change Password
        </h3>
        <p className="font-sans text-xs text-text-secondary mb-4">
          Updating your password will immediately terminate all your other active sessions while keeping your current session active.
        </p>

        {passwordError && (
          <div className="mb-4 p-2.5 rounded bg-error/10 text-xs text-error font-sans">
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
              icon={<Lock className="w-4 h-4" />}
            >
              Update Password
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
