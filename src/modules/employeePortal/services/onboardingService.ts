import type { OnboardingChecklist, OnboardingStep } from '../types/onboardingTypes';
export const onboardingChecklists: OnboardingChecklist[] = [{ id: 'onboard_general', name: 'General Workshop Onboarding', active: true }];
export const onboardingSteps: OnboardingStep[] = [{ id: 'step_tools', checklistId: 'onboard_general', title: 'Issue tool and safety checklist', ownerRole: 'HR Admin', required: true, order: 1 }];
export const onboardingService = { async listChecklists() { return onboardingChecklists; }, async listSteps() { return onboardingSteps; } };
