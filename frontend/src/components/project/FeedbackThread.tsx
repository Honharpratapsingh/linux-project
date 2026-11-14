import { useState } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { Feedback } from '../../types/api';
import { Button } from '../common/Button';
import { Textarea } from '../common/Textarea';
import { formatDateTime } from '../../lib/dates';

interface FeedbackThreadProps {
  feedback: Feedback[];
  canGiveFeedback: boolean;
  onSubmitFeedback: (message: string) => Promise<void>;
}

export function FeedbackThread({
  feedback,
  canGiveFeedback,
  onSubmitFeedback,
}: FeedbackThreadProps) {
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setError('Feedback message cannot be empty');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await onSubmitFeedback(message.trim());
      setMessage('');
    } catch (err: any) {
      setError(err.message || 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'APPROVAL':
        return 'bg-sage text-text';
      case 'CHANGES_REQUESTED':
        return 'bg-peach text-text';
      case 'REJECTION':
        return 'bg-error/20 text-error';
      default:
        return 'bg-sidebar text-text-secondary border border-border/60';
    }
  };

  return (
    <div className="bg-surface border border-border rounded-lg p-5 sm:p-6 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-serif text-lg font-medium text-text flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-text-muted" /> Faculty Feedback & Review Notes
          </h3>
          <p className="text-xs text-text-secondary mt-0.5">
            Guidance, evaluation comments, and status revision notes
          </p>
        </div>
        <span className="text-xs text-text-muted">{feedback.length} entries</span>
      </div>

      {/* Give Feedback Form (Faculty only) */}
      {canGiveFeedback && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 rounded-lg bg-sidebar/50 border border-border/80">
          <Textarea
            label="Post Faculty Comment"
            placeholder="Share feedback, advice, or suggestions with the project team..."
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              if (error) setError('');
            }}
            error={error}
            rows={3}
            required
          />
          <div className="flex justify-end mt-3">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={submitting}
              icon={<Send className="w-3.5 h-3.5" />}
            >
              Post Comment
            </Button>
          </div>
        </form>
      )}

      {/* List (newest first) */}
      {feedback.length === 0 ? (
        <p className="text-sm font-sans text-text-muted py-6 text-center">
          No faculty feedback recorded on this project yet.
        </p>
      ) : (
        <ul className="divide-y divide-divider">
          {feedback.map((fb) => (
            <li key={fb.id} className="py-3.5 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-sans text-xs font-semibold text-text">
                    {fb.author.fullName}
                  </span>
                  <span
                    className={`text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-full ${getTypeBadgeClass(
                      fb.feedbackType
                    )}`}
                  >
                    {fb.feedbackType.replace('_', ' ')}
                  </span>
                </div>
                <span className="text-xs text-text-muted font-sans tabular-nums shrink-0">
                  {formatDateTime(fb.createdAt)}
                </span>
              </div>
              <p className="font-sans text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
                {fb.message}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
