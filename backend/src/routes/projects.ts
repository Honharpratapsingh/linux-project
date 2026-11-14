import { Router } from 'express';
import { ProjectController } from '../controllers/projectController';
import { requireAuth } from '../middleware/auth';
import { validateUuidParam } from '../middleware/security';

export function createProjectRouter(projectController: ProjectController): Router {
  const router = Router();

  // All project endpoints require an authenticated user
  router.use(requireAuth);

  router.get('/', projectController.list);
  router.post('/', projectController.create);

  router.get('/:id', validateUuidParam('id'), projectController.getById);
  router.patch('/:id', validateUuidParam('id'), projectController.update);
  router.delete('/:id', validateUuidParam('id'), projectController.delete);
  router.get('/:id/history', validateUuidParam('id'), projectController.getHistory);

  // Workflow transitions
  router.post('/:id/submit', validateUuidParam('id'), projectController.submit);
  router.post('/:id/approve', validateUuidParam('id'), projectController.approve);
  router.post(
    '/:id/request-changes',
    validateUuidParam('id'),
    projectController.requestChanges
  );
  router.post('/:id/reject', validateUuidParam('id'), projectController.reject);
  router.post('/:id/complete', validateUuidParam('id'), projectController.complete);

  // Archive & restore
  router.patch('/:id/archive', validateUuidParam('id'), projectController.archive);
  router.patch('/:id/restore', validateUuidParam('id'), projectController.restore);

  return router;
}
