import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { idbStorage } from './storage';

export interface FileItem {
  id: string;
  name: string;
  type: 'folder' | 'pdf' | 'image' | 'excel' | 'word' | 'unknown';
  size?: number; // bytes
  modifiedAt: string;
  parentId: string | null;
  dataUrl?: string;
}

export type SortField = 'name' | 'type' | 'date' | 'size';
export type SortDirection = 'asc' | 'desc';

interface ClipboardState {
  type: 'cut' | 'copy';
  items: string[];
}

interface DocumentState {
  items: FileItem[];
  currentPath: string[];
  currentView: 'home' | 'folder';
  recentItems: { id: string; type: 'file' | 'folder'; visitedAt: string }[];
  folderSettings: Record<string, { viewMode: 'grid' | 'list' }>;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  setFolderViewMode: (folderId: string | null, mode: 'grid' | 'list') => void;
  history: string[][];
  historyIndex: number;
  navigateBack: () => void;
  navigateForward: () => void;
  navigateToFolder: (folderId: string | null) => void;
  navigateUp: () => void;
  navigateHome: () => void;
  addRecentItem: (id: string, type: 'file' | 'folder') => void;
  addItem: (item: Omit<FileItem, 'id'>) => void;
  updateItem: (id: string, updates: Partial<Omit<FileItem, 'id'>>) => void;
  deleteItem: (id: string) => void;
  renameItem: (id: string, newName: string) => void;
  moveItem: (itemId: string, newParentId: string | null) => void;
  copyItem: (itemId: string, newParentId: string | null) => void;
  
  sortField: SortField;
  sortDirection: SortDirection;
  setSort: (field: SortField, direction: SortDirection) => void;
  
  clipboard: ClipboardState | null;
  setClipboard: (clipboard: ClipboardState | null) => void;
  clearClipboard: () => void;
}

const initialItems: FileItem[] = [
  { id: 'downloads', name: 'Downloads', type: 'folder', modifiedAt: new Date().toISOString(), parentId: null },
  { id: 'documents', name: 'Documents', type: 'folder', modifiedAt: new Date().toISOString(), parentId: null },
  { id: 'pictures', name: 'Pictures', type: 'folder', modifiedAt: new Date().toISOString(), parentId: null },
  { id: 'music', name: 'Music', type: 'folder', modifiedAt: new Date().toISOString(), parentId: null },
  { id: 'videos', name: 'Videos', type: 'folder', modifiedAt: new Date().toISOString(), parentId: null },
  { id: 'proj2026', name: 'Project 2026', type: 'folder', modifiedAt: new Date().toISOString(), parentId: null },
  { id: 'geo', name: '001_Geophysical Investigation', type: 'folder', modifiedAt: new Date().toISOString(), parentId: 'proj2026' },
];

export const useDocumentStore = create<DocumentState>()(
  persist(
    (set, get) => ({
      items: initialItems,
  currentPath: [],
  currentView: 'home' as 'home' | 'folder',
  recentItems: [] as { id: string; type: 'file' | 'folder'; visitedAt: string }[],
  history: [[]],
  historyIndex: 0,
  folderSettings: {},
  searchQuery: '',
  sortField: 'name',
  sortDirection: 'asc',
  clipboard: null,
  setSearchQuery: (query) => set({ searchQuery: query }),
  setFolderViewMode: (folderId, mode) => set(state => ({
    folderSettings: {
      ...state.folderSettings,
      [folderId || 'root']: { ...state.folderSettings[folderId || 'root'], viewMode: mode }
    }
  })),
  setSort: (field, direction) => set({ sortField: field, sortDirection: direction }),
  setClipboard: (clipboard) => set({ clipboard }),
  clearClipboard: () => set({ clipboard: null }),
  navigateToFolder: (folderId) => {
    if (folderId === null) {
      set(state => {
        const newPath: string[] = [];
        const newHistory = state.history.slice(0, state.historyIndex + 1);
        newHistory.push(newPath);
        return { currentPath: newPath, history: newHistory, historyIndex: newHistory.length - 1, currentView: 'folder' as const };
      });
    } else {
      const items = get().items;
      let currentId: string | null = folderId;
      const newPath: string[] = [];
      
      while (currentId !== null) {
        const folder = items.find(i => i.id === currentId);
        if (!folder || folder.type !== 'folder') break;
        newPath.unshift(folder.id);
        currentId = folder.parentId;
      }
      
      if (newPath.length > 0) {
        set(state => {
          const newHistory = state.history.slice(0, state.historyIndex + 1);
          newHistory.push(newPath);
          // Add to recentItems
          const existing = state.recentItems.filter(r => r.id !== folderId);
          const updated = [{ id: folderId, type: 'folder' as const, visitedAt: new Date().toISOString() }, ...existing].slice(0, 20);
          return { currentPath: newPath, history: newHistory, historyIndex: newHistory.length - 1, currentView: 'folder' as const, recentItems: updated };
        });
      }
    }
  },
  navigateHome: () => set({ currentView: 'home' }),
  addRecentItem: (id, type) => set(state => {
    const existing = state.recentItems.filter(r => r.id !== id);
    const updated = [{ id, type, visitedAt: new Date().toISOString() }, ...existing].slice(0, 20);
    return { recentItems: updated };
  }),
  navigateUp: () => {
    const path = [...get().currentPath];
    path.pop();
    set(state => {
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(path);
      return { currentPath: path, history: newHistory, historyIndex: newHistory.length - 1 };
    });
  },
  navigateBack: () => {
    set(state => {
      if (state.historyIndex > 0) {
        const newIndex = state.historyIndex - 1;
        return { currentPath: state.history[newIndex], historyIndex: newIndex };
      }
      return state;
    });
  },
  navigateForward: () => {
    set(state => {
      if (state.historyIndex < state.history.length - 1) {
        const newIndex = state.historyIndex + 1;
        return { currentPath: state.history[newIndex], historyIndex: newIndex };
      }
      return state;
    });
  },
  addItem: (item) => {
    const newItem = { ...item, id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` };
    set(state => ({ items: [...state.items, newItem] }));
  },
  updateItem: (id, updates) => {
    set(state => ({
      items: state.items.map(i => i.id === id ? { ...i, ...updates } : i)
    }));
  },
  deleteItem: (id) => {
    set(state => {
      // Recursive delete logic for folders could be added here, 
      // but for mockup we just filter the exact ID.
      return { items: state.items.filter(i => i.id !== id) };
    });
  },
  renameItem: (id, newName) => {
    set(state => ({
      items: state.items.map(i => i.id === id ? { ...i, name: newName } : i)
    }));
  },
    moveItem: (itemId, newParentId) => {
      set(state => ({
        items: state.items.map(i => i.id === itemId ? { ...i, parentId: newParentId } : i)
      }));
    },
    copyItem: (itemId, newParentId) => {
      set(state => {
        const itemToCopy = state.items.find(i => i.id === itemId);
        if (!itemToCopy) return state;
        const newItem = {
          ...itemToCopy,
          id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          parentId: newParentId,
          modifiedAt: new Date().toISOString()
        };
        // Simple logic for same folder copy naming
        if (itemToCopy.parentId === newParentId) {
          newItem.name = `Copy of ${itemToCopy.name}`;
        }
        return { items: [...state.items, newItem] };
      });
    }
  }),
  {
    name: 'ansa-document-storage',
    storage: createJSONStorage(() => idbStorage),
  }
));
