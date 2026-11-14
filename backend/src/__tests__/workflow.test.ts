import { describe, it, expect } from 'vitest';
import {
  computePermissions,
  TRANSITION_MAP,
  ProjectRelation,
  MilestoneStats,
} from '../services/workflow';
import { ProjectStatus } from '../types';

describe('Workflow Unit Tests', () => {
  describe('Transition Map', () => {
    it('defines valid transitions', () => {
      expect(TRANSITION_MAP.submit.from).toEqual([
        'DRAFT',
        'CHANGES_REQUESTED',
        'REJECTED',
      ]);
      expect(TRANSITION_MAP.submit.to).toBe('PENDING_REVIEW');

      expect(TRANSITION_MAP.approve.from).toEqual(['PENDING_REVIEW']);
      expect(TRANSITION_MAP.approve.to).toBe('IN_PROGRESS');

      expect(TRANSITION_MAP['request-changes'].from).toEqual(['PENDING_REVIEW']);
      expect(TRANSITION_MAP['request-changes'].to).toBe('CHANGES_REQUESTED');

      expect(TRANSITION_MAP.reject.from).toEqual(['PENDING_REVIEW']);
      expect(TRANSITION_MAP.reject.to).toBe('REJECTED');

      expect(TRANSITION_MAP.complete.from).toEqual(['IN_PROGRESS']);
      expect(TRANSITION_MAP.complete.to).toBe('COMPLETED');
    });
  });

  describe('computePermissions', () => {
    const creatorStudent = { id: 's1', role: 'STUDENT' as const };
    const guideFaculty = { id: 'f1', role: 'FACULTY' as const };
    const otherFaculty = { id: 'f2', role: 'FACULTY' as const };
    const memberStudent = { id: 's2', role: 'STUDENT' as const };

    it('creator permissions in DRAFT state', () => {
      const relation: ProjectRelation = { isCreator: true, isMember: true, isGuide: false };
      const perms = computePermissions(
        { status: 'DRAFT', archivedAt: null },
        creatorStudent,
        relation
      );

      expect(perms.canEdit).toBe(true);
      expect(perms.canChangeGuide).toBe(true);
      expect(perms.canManageTeam).toBe(true);
      expect(perms.canSubmit).toBe(true);
      expect(perms.canManageMilestones).toBe(true);
      expect(perms.canArchive).toBe(true);
      expect(perms.canRestore).toBe(false);
      expect(perms.canDelete).toBe(false);
      expect(perms.canApprove).toBe(false);
    });

    it('creator permissions in PENDING_REVIEW state', () => {
      const relation: ProjectRelation = { isCreator: true, isMember: true, isGuide: false };
      const perms = computePermissions(
        { status: 'PENDING_REVIEW', archivedAt: null },
        creatorStudent,
        relation
      );

      expect(perms.canEdit).toBe(false);
      expect(perms.canChangeGuide).toBe(false);
      expect(perms.canManageTeam).toBe(false);
      expect(perms.canSubmit).toBe(false);
      expect(perms.canManageMilestones).toBe(false);
      expect(perms.canArchive).toBe(false);
    });

    it('guide permissions in PENDING_REVIEW state', () => {
      const relation: ProjectRelation = { isCreator: false, isMember: false, isGuide: true };
      const perms = computePermissions(
        { status: 'PENDING_REVIEW', archivedAt: null },
        guideFaculty,
        relation
      );

      expect(perms.canApprove).toBe(true);
      expect(perms.canReject).toBe(true);
      expect(perms.canRequestChanges).toBe(true);
      expect(perms.canGiveFeedback).toBe(true);
      expect(perms.canComplete).toBe(false);
      expect(perms.canArchive).toBe(false);
    });

    it('guide completion blocked reasons in IN_PROGRESS state', () => {
      const relation: ProjectRelation = { isCreator: false, isMember: false, isGuide: true };

      // 0 milestones
      const statsZero: MilestoneStats = { total: 0, completed: 0 };
      const p1 = computePermissions(
        { status: 'IN_PROGRESS', archivedAt: null },
        guideFaculty,
        relation,
        statsZero
      );
      expect(p1.canComplete).toBe(true);
      expect(p1.completionBlockedReason).toBe('NO_MILESTONES');

      // Incomplete milestones (1 of 2)
      const statsIncomplete: MilestoneStats = { total: 2, completed: 1 };
      const p2 = computePermissions(
        { status: 'IN_PROGRESS', archivedAt: null },
        guideFaculty,
        relation,
        statsIncomplete
      );
      expect(p2.canComplete).toBe(true);
      expect(p2.completionBlockedReason).toBe('INCOMPLETE_MILESTONES');

      // All milestones completed (2 of 2)
      const statsAllDone: MilestoneStats = { total: 2, completed: 2 };
      const p3 = computePermissions(
        { status: 'IN_PROGRESS', archivedAt: null },
        guideFaculty,
        relation,
        statsAllDone
      );
      expect(p3.canComplete).toBe(true);
      expect(p3.completionBlockedReason).toBeNull();
    });

    it('archive & restore permissions for COMPLETED and REJECTED states', () => {
      const guideRel: ProjectRelation = { isCreator: false, isMember: false, isGuide: true };
      const creatorRel: ProjectRelation = { isCreator: true, isMember: true, isGuide: false };

      // Guide can archive COMPLETED
      const pGuideCompleted = computePermissions(
        { status: 'COMPLETED', archivedAt: null },
        guideFaculty,
        guideRel
      );
      expect(pGuideCompleted.canArchive).toBe(true);

      // Creator cannot archive COMPLETED
      const pCreatorCompleted = computePermissions(
        { status: 'COMPLETED', archivedAt: null },
        creatorStudent,
        creatorRel
      );
      expect(pCreatorCompleted.canArchive).toBe(false);

      // Guide can archive REJECTED
      const pGuideRejected = computePermissions(
        { status: 'REJECTED', archivedAt: null },
        guideFaculty,
        guideRel
      );
      expect(pGuideRejected.canArchive).toBe(true);

      // Creator cannot restore a REJECTED project archived by guide
      const pCreatorRestoringRejected = computePermissions(
        { status: 'REJECTED', archivedAt: '2026-01-01T00:00:00Z' },
        creatorStudent,
        creatorRel
      );
      expect(pCreatorRestoringRejected.canRestore).toBe(false);

      // Guide can restore a REJECTED project
      const pGuideRestoringRejected = computePermissions(
        { status: 'REJECTED', archivedAt: '2026-01-01T00:00:00Z' },
        guideFaculty,
        guideRel
      );
      expect(pGuideRestoringRejected.canRestore).toBe(true);
      expect(pGuideRestoringRejected.canDelete).toBe(true);
    });

    it('archived projects are read-only except restore and delete', () => {
      const guideRel: ProjectRelation = { isCreator: false, isMember: false, isGuide: true };
      const perms = computePermissions(
        { status: 'COMPLETED', archivedAt: '2026-01-01T00:00:00Z' },
        guideFaculty,
        guideRel
      );

      expect(perms.canEdit).toBe(false);
      expect(perms.canChangeGuide).toBe(false);
      expect(perms.canManageTeam).toBe(false);
      expect(perms.canSubmit).toBe(false);
      expect(perms.canManageMilestones).toBe(false);
      expect(perms.canApprove).toBe(false);
      expect(perms.canReject).toBe(false);
      expect(perms.canRequestChanges).toBe(false);
      expect(perms.canComplete).toBe(false);
      expect(perms.canGiveFeedback).toBe(false);
      expect(perms.canArchive).toBe(false);
      expect(perms.canRestore).toBe(true);
      expect(perms.canDelete).toBe(true);
    });
  });
});
