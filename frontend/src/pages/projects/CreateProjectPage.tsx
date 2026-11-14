import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';
import { useApi } from '../../lib/useApi';
import { ProjectDetail, DirectoryUser } from '../../types/api';
import { PageHeader } from '../../components/common/PageHeader';
import { Breadcrumbs } from '../../components/common/Breadcrumbs';
import { Input } from '../../components/common/Input';
import { Textarea } from '../../components/common/Textarea';
import { Select } from '../../components/common/Select';
import { Button } from '../../components/common/Button';
import { LoadingState } from '../../components/common/LoadingState';
import { useToast } from '../../components/common/Toast';

const createProjectSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Project title must be at least 3 characters')
    .max(120, 'Project title cannot exceed 120 characters'),
  description: z
    .string()
    .max(5000, 'Description cannot exceed 5000 characters')
    .default(''),
  guideId: z.string().min(1, 'Please select a faculty guide'),
});

type CreateProjectFormData = z.infer<typeof createProjectSchema>;

export default function CreateProjectPage() {
  const navigate = useNavigate();
  const { success } = useToast();
  const [apiError, setApiError] = useState<string | null>(null);

  // Load faculty list for guide selection
  const { data: facultyData, loading: loadingFaculty } = useApi<{ items: DirectoryUser[] }>(
    () => api.get<{ items: DirectoryUser[] }>('/faculty'),
    []
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateProjectFormData>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      title: '',
      description: '',
      guideId: '',
    },
  });

  const onSubmit = async (data: CreateProjectFormData) => {
    setApiError(null);
    try {
      const created = await api.post<ProjectDetail>('/projects', {
        title: data.title,
        description: data.description,
        guideId: data.guideId,
      });
      success('Project created successfully!');
      navigate(`/projects/${created.id}`);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setApiError(err.message || 'Failed to create project');
      } else {
        setApiError('A connection error occurred. Please try again.');
      }
    }
  };

  const facultyOptions =
    facultyData?.items.map((f) => ({
      value: f.id,
      label: `${f.fullName} (${f.email})`,
    })) || [];

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader
        title="Create New Project"
        description="Propose your capstone project, summarize its scope, and assign a faculty guide."
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'My Projects', href: '/projects' },
              { label: 'Create Project' },
            ]}
          />
        }
      />

      <div className="bg-surface border border-border rounded-xl p-6 sm:p-8 shadow-xs">
        {apiError && (
          <div
            role="alert"
            className="mb-5 p-3 rounded-md bg-error/10 border border-error/20 text-xs sm:text-sm text-error font-sans leading-relaxed animate-fade-in"
          >
            {apiError}
          </div>
        )}

        {loadingFaculty ? (
          <LoadingState message="Loading faculty directory..." />
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <Input
              label="Project Title"
              placeholder="e.g. Autonomous Drone Navigation System"
              helperText="Brief, descriptive title (3-120 characters)"
              error={errors.title?.message}
              required
              {...register('title')}
            />

            <Select
              label="Faculty Guide"
              placeholder="Select assigned faculty guide..."
              options={facultyOptions}
              error={errors.guideId?.message}
              required
              {...register('guideId')}
            />

            <Textarea
              label="Project Scope & Description"
              rows={5}
              placeholder="Detail the objectives, research background, hardware/software stack, and expected deliverables..."
              helperText="Optional detailed proposal (max 5000 characters)"
              error={errors.description?.message}
              {...register('description')}
            />

            <div className="pt-3 border-t border-divider flex items-center justify-end gap-3">
              <Button
                variant="outline"
                size="md"
                type="button"
                onClick={() => navigate('/projects')}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                type="submit"
                loading={isSubmitting}
              >
                Create Capstone Project
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
