import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { api } from '../../lib/api';
import { ProjectSummary, ListResponse } from '../../types/api';
import { PageHeader } from '../../components/common/PageHeader';
import { Pagination } from '../../components/common/Pagination';
import { LoadingState } from '../../components/common/LoadingState';
import { ErrorState } from '../../components/common/ErrorState';
import { EmptyState } from '../../components/common/EmptyState';
import { ProjectTable } from '../../components/project/ProjectTable';

export default function PendingReviewsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = 15;

  const [data, setData] = useState<ListResponse<ProjectSummary> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPending = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams({
        assigned: 'me',
        status: 'PENDING_REVIEW',
        sort: 'createdAt',
        order: 'asc',
        page: String(page),
        pageSize: String(pageSize),
      });

      const res = await api.get<ListResponse<ProjectSummary>>(`/projects?${q.toString()}`);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load pending reviews');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  return (
    <div>
      <PageHeader
        title="Pending Reviews"
        description="Capstone projects submitted by students awaiting your formal evaluation and approval (oldest submissions first)."
      />

      {loading ? (
        <LoadingState message="Loading review queue..." />
      ) : error ? (
        <ErrorState
          title="Could not load pending reviews"
          message={error}
          onRetry={fetchPending}
        />
      ) : data && data.items.length === 0 ? (
        <EmptyState
          title="Review Queue is Clear"
          description="You have no projects currently awaiting review. New submissions will appear here automatically."
          icon={<Clock className="w-6 h-6" />}
        />
      ) : data ? (
        <div className="space-y-4">
          <ProjectTable projects={data.items} showGuide={false} />
          <Pagination
            page={data.page}
            pageSize={data.pageSize}
            total={data.total}
            onPageChange={(p) => {
              setSearchParams({ page: String(p) });
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
