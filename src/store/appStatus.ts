import { create } from 'zustand';

/** Transient, non-persisted app status flags (client state). */
interface AppStatusState {
  /** Set when the API answers 426 `app_update_required`. */
  updateRequired: boolean;
  setUpdateRequired: (value: boolean) => void;
  /** The account was just deleted: Welcome shows a short confirmation (until dismissed). */
  accountDeleted: boolean;
  setAccountDeleted: (value: boolean) => void;
}

export const useAppStatus = create<AppStatusState>()((set) => ({
  updateRequired: false,
  setUpdateRequired: (updateRequired) => set({ updateRequired }),
  accountDeleted: false,
  setAccountDeleted: (accountDeleted) => set({ accountDeleted }),
}));
