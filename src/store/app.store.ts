import { create } from 'zustand'

interface AppState {
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void

  currentPage: string
  setCurrentPage: (page: string) => void

  activePluginId: string | null
  setActivePluginId: (id: string | null) => void

  loading: boolean
  setLoading: (loading: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

  currentPage: 'home',
  setCurrentPage: (page) => set({ currentPage: page }),

  activePluginId: null,
  setActivePluginId: (id) => set({ activePluginId: id }),

  loading: false,
  setLoading: (loading) => set({ loading })
}))
