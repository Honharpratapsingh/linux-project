import { User } from '../types';
import {
  DashboardRepository,
  StudentDashboardSummary,
  FacultyDashboardSummary,
} from '../repositories/dashboardRepository';

export class DashboardService {
  constructor(private dashboardRepo: DashboardRepository) {}

  async getSummary(
    user: User
  ): Promise<StudentDashboardSummary | FacultyDashboardSummary> {
    if (user.role === 'STUDENT') {
      return this.dashboardRepo.getStudentSummary(user.id);
    }
    return this.dashboardRepo.getFacultySummary(user.id);
  }
}
