import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { PlusCircle, SlidersHorizontal, RotateCcw } from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';
import { api } from '../../lib/api';
import { ProjectSummary, ListResponse } from '../../types/api';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { SearchField } from '../../components/common/SearchField';
import { Select } from '../../components/common/Select';
import { FilterBar } from '../../components/common/FilterBar';
import { Pagination } from '../../components/common/Pagination';
import { LoadingState } from '../../components/common/LoadingState';
import { ErrorState } from '../../components/common/ErrorState';
import { EmptyState } from '../../components/common/EmptyState';
import { ProjectTable } from '../../components/project/ProjectTable';

export default function ProjectsListPage() {
  const { user } = useAuth();
  const isFaculty = user?.role === 'FACULTY';
  const [searchParams, setSearchParams] = useSearchParams();

  // URL state
  const search = searchParams.get('search') || '';
  const guide = searchParams.get('guide') || '';
  const status = searchParams.get('status') || '';
  const sort = searchParams.get('sort') || 'updatedAt';
  const order = searchParams.get('order') || 'desc';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = 15;

  const [searchInput, setSearchInput] = useState(search);
  const [guideInput, setGuideInput] = useState(guide);

  const [data, setData] = useState<ListResponse<ProjectSummary> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sync inputs with URL params
  useEffect(() => {
    setSearchInput(search);
    setGuideInput(guide);
  }, [search, guide]);

  const updateParam = useCallback(
    (key: string, val: string | null) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (val && val.trim()) {
            next.set(key, val.trim());
          } else {
            next.delete(key);
          }
          if (key !== 'page') {
            next.delete('page'); // Reset to page 1 on filter changes
          }
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams();
      if (search) q.set('search', search);
      if (guide && isFaculty) q.set('guide', guide);
      if (status) q.set('status', status);
      q.set('sort', sort);
      q.set('order', order);
      q.set('page', String(page));
      q.set('pageSize', String(pageSize));

      const res = await api.get<ListResponse<ProjectSummary>>(`/projects?${q.toString()}`);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [search, guide, isFaculty, status, sort, order, page]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleResetFilters = () => {
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  const hasActiveFilters = Boolean(search || guide || status || (sort !== 'updatedAt'));

  return (
    <div>
      <PageHeader
        title={isFaculty ? 'All Projects Directory' : 'My Projects'}
        description={
          isFaculty
            ? 'Browse, search, and monitor all non-deleted student capstone projects across SRM.'
            : 'View and manage the capstone projects you have created or joined as a team member.'
        }
        actions={
          !isFaculty ? (
            <Link to="/projects/new">
              <Button variant="primary" size="md" icon={<PlusCircle className="w-4 h-4" />}>
                Create Project
              </Button>
            </Link>
          ) : undefined
        }
      />

      {/* Filter and Search Bar */}
      <FilterBar>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          <div className="w-full sm:w-64">
            <SearchField
              placeholder="Search title..."
              value={searchInput}
              onChange={(val) => {
                setSearchInput(val);
                updateParam('search', val);
              }}
              label="Search title"
            />
          </div>

          {isFaculty && (
            <div className="w-full sm:w-56">
              <SearchField
                placeholder="Search guide name..."
                value={guideInput}
                onChange={(val) => {
                  setGuideInput(val);
                  updateParam('guide', val);
                }}
                label="Search guide name"
              />
            </div>
          )}

          <div className="w-full sm:w-48">
            <Select
              aria-label="Filter by Status"
              value={status}
              onChange={(e) => updateParam('status', e.target.value)}
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'DRAFT', label: 'Draft' },
                { value: 'PENDING_REVIEW', label: 'Pending Review' },
                { value: 'CHANGES_REQUESTED', label: 'Changes Requested' },
                { value: 'IN_PROGRESS', label: 'In Progress' },
                { value: 'COMPLETED', label: 'Completed' },
                { value: 'REJECTED', label: 'Rejected' },
              ]}
            />
          </div>

          <div className="w-full sm:w-40">
            <Select
              aria-label="Sort by"
              value={`${sort}:${order}`}
              onChange={(e) => {
                const [s, o] = e.target.value.split(':');
                setSearchParams((prev) => {
                  const next = new URLSearchParams(prev);
                  next.set('sort', s);
                  next.set('order', o);
                  next.delete('page');
                  return next;
                });
              }}
              options={[
                { value: 'updatedAt:desc', label: 'Recently Updated' },
                { value: 'createdAt:desc', label: 'Newest First' },
                { value: 'createdAt:asc', label: 'Oldest First' },
                { value: 'title:asc', label: 'Title (A-Z)' },
                { value: 'status:asc', label: 'Status' },
              ]}
            />
          </div>
        </div>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetFilters}
            icon={<RotateCcw className="w-3.5 h-3.5" />}
            className="text-text-muted hover:text-text shrink-0 self-start sm:self-center"
          >
            Reset
          </Button>
        )}
      </FilterBar>

      {/* Content */}
      {loading ? (
        <LoadingState message="Loading projects..." />
      ) : error ? (
        <ErrorState
          title="Could not load projects"
          message={error}
          onRetry={fetchProjects}
        />
      ) : data && data.items.length === 0 ? (
        hasActiveFilters ? (
          <EmptyState
            title="No matching projects"
            description="No projects match your current filter and search criteria. Try clearing or adjusting your filters."
            icon={<SlidersHorizontal className="w-6 h-6" />}
            action={
              <Button variant="outline" size="sm" onClick={handleResetFilters}>
                Clear All Filters
              </Button>
            }
          />
        ) : !isFaculty ? (
          <EmptyState
            title="You don't have any projects yet"
            description="Create your first capstone project and select a faculty guide to begin tracking milestones."
            action={
              <Link to="/projects/new">
                <Button variant="primary" size="md" icon={<PlusCircle className="w-4 h-4" />}>
                  Create Project
                </Button>
              </Link>
            }
          />
        ) : (
          <EmptyState
            title="No projects found"
            description="There are currently no projects in the system."
          />
        )
      ) : data ? (
        <div className="space-y-4">
          <ProjectTable projects={data.items} />
          <Pagination
            page={data.page}
            pageSize={data.pageSize}
            total={data.total}
            onPageChange={(p) => updateParam('page', String(p))}
          />
        </div>
      ) : null}
    </div>
  );
}
