import { Pool } from 'pg';
import { User, ProjectDetail } from '../types';
import { ProjectRepository } from '../repositories/projectRepository';
import { UserRepository } from '../repositories/userRepository';
import { ProjectService } from './projectService';
import { withTransaction } from '../utils/transaction';
import {
  forbidden,
  validationError,
  alreadyMember,
  teamFull,
  cannotRemoveLead,
  notFound,
  projectArchived,
} from '../utils/errors';

export class TeamService {
  constructor(
    private pool: Pool,
    private projectService: ProjectService,
    private projectRepo: ProjectRepository,
    private userRepo: UserRepository
  ) {}

  async addMember(
    user: User,
    projectId: string,
    studentId: string
  ): Promise<ProjectDetail> {
    return withTransaction(this.pool, async (client) => {
      // 1. Lock project row FOR UPDATE
      const { project, detail } = await this.projectService.getProjectForUser(
        client,
        projectId,
        user,
        true
      );

      if (project.archived_at) {
        throw projectArchived();
      }

      if (!detail.permissions.canManageTeam) {
        throw forbidden('Cannot manage team in current state');
      }

      // 2. Validate target user is a STUDENT
      const target = await this.userRepo.findById(studentId);
      if (!target || target.role !== 'STUDENT') {
        throw validationError('Target user must be a STUDENT');
      }

      // 3. Check duplicate
      const isAlready = await this.projectRepo.isUserMember(
        client,
        projectId,
        studentId
      );
      if (isAlready) {
        throw alreadyMember('User is already a project member');
      }

      // 4. Enforce team cap of 3 under project row lock
      const currentMembers = await this.projectRepo.getProjectMembers(
        client,
        projectId
      );
      if (currentMembers.length >= 3) {
        throw teamFull('Project team is full (maximum 3 members)');
      }

      // 5. Insert member
      await this.projectRepo.insertProjectMember(client, {
        projectId,
        studentId,
        membershipRole: 'MEMBER',
      });

      const updated = await this.projectService.getProjectForUser(
        client,
        projectId,
        user
      );
      return updated.detail;
    });
  }

  async removeMember(
    user: User,
    projectId: string,
    studentId: string
  ): Promise<ProjectDetail> {
    return withTransaction(this.pool, async (client) => {
      // 1. Lock project row FOR UPDATE
      const { project, detail } = await this.projectService.getProjectForUser(
        client,
        projectId,
        user,
        true
      );

      if (project.archived_at) {
        throw projectArchived();
      }

      if (!detail.permissions.canManageTeam) {
        throw forbidden('Cannot manage team in current state');
      }

      // 2. Check target membership
      const memberRes = await client.query<{ membership_role: string }>(
        'SELECT membership_role FROM project_members WHERE project_id = $1 AND student_id = $2',
        [projectId, studentId]
      );
      if (memberRes.rows.length === 0) {
        throw notFound('Student is not a member of this project');
      }

      if (memberRes.rows[0].membership_role === 'LEAD') {
        throw cannotRemoveLead('Cannot remove the project lead');
      }

      // 3. Delete member
      await client.query(
        'DELETE FROM project_members WHERE project_id = $1 AND student_id = $2',
        [projectId, studentId]
      );

      const updated = await this.projectService.getProjectForUser(
        client,
        projectId,
        user
      );
      return updated.detail;
    });
  }
}
