import { UserReadingStateRepository } from '../repositories/userReadingState.repository';
import { UserReadingState } from '../models/userReadingState';

export class UserReadingStateService {
  private userReadingStateRepository: UserReadingStateRepository;

  constructor() {
    this.userReadingStateRepository = new UserReadingStateRepository();
  }

  async updateUserModuleAccess(userId: string, moduleId: string): Promise<void> {
    // Update user reading state
    await this.userReadingStateRepository.updateUserReadingState({
      userId,
      moduleId
    });

    // Clean up old reading states to keep only the last 2
    await this.userReadingStateRepository.cleanupOldReadingStates(userId);
  }

  async getLastAccessedModules(userId: string): Promise<UserReadingState[]> {
    return await this.userReadingStateRepository.getUserLastAccessedModules(userId);
  }
}
