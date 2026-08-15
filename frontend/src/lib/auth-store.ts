import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AuthSession {
  token: string;
  role: string;
  phone: string;
  doctorId?: string | null;
  doctorFullName?: string | null;
}

interface AuthState {
  token: string | null;
  role: string | null;
  phone: string | null;
  doctorId: string | null;
  doctorFullName: string | null;
  setSession: (session: AuthSession) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      role: null,
      phone: null,
      doctorId: null,
      doctorFullName: null,
      setSession: (session) =>
        set({
          token: session.token,
          role: session.role,
          phone: session.phone,
          doctorId: session.doctorId ?? null,
          doctorFullName: session.doctorFullName ?? null,
        }),
      logout: () => set({ token: null, role: null, phone: null, doctorId: null, doctorFullName: null }),
    }),
    { name: "suraksha-auth" }
  )
);
