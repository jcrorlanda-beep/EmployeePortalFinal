export interface OnboardingChecklist { id: string; name: string; positionId?: string; active: boolean; }
export interface OnboardingStep { id: string; checklistId: string; title: string; ownerRole: string; required: boolean; order: number; }
