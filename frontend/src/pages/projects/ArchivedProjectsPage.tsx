import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Archive } from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';
import { api } from '../../lib/api';
import { ProjectSummary, ListResponse } from '../../types/api';
import { PageHeader } from '../../components/common/PageHeader';
import { SearchField } from '../../components/common/SearchField';
import { FilterBar } from '../../components/common/FilterBar';
import { Pagination } from '../../components/common/Pagination';
import { LoadingState } from '../../components/common/LoadingState';
import { ErrorState } from '../../components/common/ErrorState';
import { EmptyState } from '../../components/common/EmptyState';
import { ProjectTable } from '../../components/project/ProjectTable';

export default function ArchivedProjectsPage() {
  const { user } = useAuth();
  const isFaculty = user?.role === 'FACULTY';
  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get('search') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = 15;

  const [searchInput, setSearchInput] = useState(search);
  const [data, setData] = useState<ListResponse<ProjectSummary> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  const fetchArchived = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams({
        archived: 'true',
        sort: 'updatedAt',
        order: 'desc',
        page: String(page),
        pageSize: String(pageSize),
      });
      if (search) q.set('search', search);

      const res = await api.get<ListResponse<ProjectSummary>>(`/projects?${q.toString()}`);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load archived projects');
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    fetchArchived();
  }, [fetchArchived]);

  return (
    <div>
      <PageHeader
        title="Archived Projects"
        description={
          isFaculty
            ? 'Review historical or closed capstone projects that have been archived.'
            : 'View your archived capstone projects. Archived projects are read-only until restored.'
        }
      />

      <FilterBar>
        <div className="w-full sm:w-72">
          <SearchField
            placeholder="Search archived projects..."
            value={searchInput}
            onChange={(val) => {
              setSearchInput(val);
              setSearchParams(
                (prev) => {
                  const next = new URLSearchParams(prev);
                  if (val.trim()) next.set('search', val.trim());
                  else next.delete('search');
                  next.delete('page');
                  return next;
                },
                { replace: true }
              );
            }}
            label="Search archived projects"
          />
        </div>
      </FilterBar>

      {loading ? (
        <LoadingState message="Loading archived projects..." />
      ) : error ? (
        <ErrorState
          title="Could not load archived projects"
          message={error}
          onRetry={fetchArchived}
        />
      ) : data && data.items.length === 0 ? (
        <EmptyState
          title="No Archived Projects"
          description={
            search
              ? 'No archived projects matched your search criteria.'
              : 'There are no archived projects to display.'
          }
          icon={<Archive className="w-6 h-6" />}
        />
      ) : data ? (
        <div className="space-y-4">
          <ProjectTable projects={data.items} isArchivedView />
          <Pagination
            page={data.page}
            pageSize={data.pageSize}
            total={data.total}
            onPageChange={(p) => setSearchParams({ page: String(p) })}
          />
        </div>
      ) : null}
    </div>
  );
}
