import React, { useRef, useState, useEffect } from 'react';
import { 
  Folder, FileText, Image as ImageIcon, FileSpreadsheet, FileIcon, 
  Search, Upload, Plus, LayoutGrid, List, ChevronRight, 
  MoreVertical, Download, Trash2, Edit2, Home, ArrowLeft,
  ArrowUp, ArrowDown, ChevronDown, ClipboardPaste, Copy, Scissors, CheckSquare, X
} from 'lucide-react';
import { useDocumentStore, type FileItem } from '../../../store/documentStore';
import { useToastStore } from '../../../store/toastStore';
import { clsx } from 'clsx';
import { Modal } from '../../../components/ui/Modal';
import { FileViewerModal } from '../../../components/ui/FileViewerModal';
import { FolderTree } from '../components/FolderTree';

export function DocumentExplorerPage() {
  const { 
    items, currentPath, currentView, recentItems, folderSettings, searchQuery, 
    sortField, sortDirection, clipboard,
    history, historyIndex,
    setSearchQuery, setFolderViewMode, setSort, setClipboard, clearClipboard, 
    navigateToFolder, navigateUp, navigateBack, navigateForward, navigateHome,
    addItem, updateItem, deleteItem, renameItem, moveItem, copyItem, addRecentItem
  } = useDocumentStore();
  const addToast = useToastStore((state) => state.addToast);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Modal States
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [itemToRename, setItemToRename] = useState<FileItem | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<FileItem | null>(null);

  const [viewingFile, setViewingFile] = useState<FileItem | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

  // Conflict State
  type ConflictItem = { file?: File, existingItem: FileItem, type: FileItem['type'], name: string, dataUrl?: string };
  const [conflictQueue, setConflictQueue] = useState<ConflictItem[]>([]);
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);

  const getUniqueName = (baseName: string, parentId: string | null) => {
    let newName = baseName;
    let counter = 1;
    const lastDotIdx = baseName.lastIndexOf('.');
    const namePart = lastDotIdx > 0 ? baseName.substring(0, lastDotIdx) : baseName;
    const extPart = lastDotIdx > 0 ? baseName.substring(lastDotIdx) : '';
    
    while (items.some(i => i.parentId === parentId && i.name.toLowerCase() === newName.toLowerCase())) {
      newName = `${namePart} (${counter})${extPart}`;
      counter++;
    }
    return newName;
  };

  // Auto-create system folders if they don't exist
  useEffect(() => {
    const requiredFolders = ['Downloads', 'Documents', 'Pictures', 'Music', 'Videos'];
    requiredFolders.forEach(name => {
      const exists = items.some(i => 
        i.type === 'folder' && 
        i.parentId === null && 
        (i.name.toLowerCase() === name.toLowerCase() || i.name.toLowerCase() === name.toLowerCase().slice(0, -1))
      );
      if (!exists) {
        addItem({
          name,
          type: 'folder',
          modifiedAt: new Date().toISOString(),
          parentId: null
        });
      }
    });
  }, [items.length, addItem]); // Only check when length changes to avoid infinite loops if it fails

  // Get current folder ID (null means root)
  const currentFolderId = currentPath.length > 0 ? currentPath[currentPath.length - 1] : null;
  const viewMode = folderSettings[currentFolderId || 'root']?.viewMode || 'grid';
  const setViewMode = (mode: 'grid' | 'list') => setFolderViewMode(currentFolderId, mode);
  
  // Filter and sort items
  const filteredItems = items.filter(item => {
    if (searchQuery) {
      return item.name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    
    // Hide Quick Access folders from the root view
    if (currentFolderId === null && item.type === 'folder') {
       const isDownloadFolder = item.name.toLowerCase() === 'download' || item.name.toLowerCase() === 'downloads';
       const isDocumentFolder = item.name.toLowerCase() === 'document' || item.name.toLowerCase() === 'documents';
       const isPictureFolder = item.name.toLowerCase() === 'picture' || item.name.toLowerCase() === 'pictures';
       const isMusicFolder = item.name.toLowerCase() === 'music';
       const isVideoFolder = item.name.toLowerCase() === 'video' || item.name.toLowerCase() === 'videos';
       if (isDownloadFolder || isDocumentFolder || isPictureFolder || isMusicFolder || isVideoFolder) return false;
    }

    return item.parentId === currentFolderId;
  }).sort((a, b) => {
    let cmp = 0;
    if (sortField === 'name') cmp = a.name.localeCompare(b.name);
    else if (sortField === 'type') cmp = a.type.localeCompare(b.type);
    else if (sortField === 'date') cmp = new Date(a.modifiedAt).getTime() - new Date(b.modifiedAt).getTime();
    else if (sortField === 'size') cmp = (a.size || 0) - (b.size || 0);
    
    // Always put folders first when sorting by name/type/date
    if (a.type === 'folder' && b.type !== 'folder') return -1;
    if (a.type !== 'folder' && b.type === 'folder') return 1;

    return sortDirection === 'asc' ? cmp : -cmp;
  });

  // Breadcrumb path calculation
  const pathNames = currentPath.map(id => {
    const item = items.find(i => i.id === id);
    return item ? { id, name: item.name } : { id, name: 'Unknown' };
  });

  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    e.dataTransfer.setData('text/plain', itemId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Necessary to allow dropping
  };

  const handleDrop = (e: React.DragEvent, targetFolderId: string | null) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData('text/plain');
    
    // Prevent moving into itself or moving a folder into its own child (simplified check here)
    if (itemId && itemId !== targetFolderId) {
      moveItem(itemId, targetFolderId);
      addToast('success', 'Item Moved', 'File has been moved to the folder.');
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const pendingConflicts: ConflictItem[] = [];
      const safeFiles: File[] = [];

      Array.from(files).forEach(file => {
        let type: FileItem['type'] = 'unknown';
        if (file.type.includes('pdf')) type = 'pdf';
        else if (file.type.includes('image')) type = 'image';
        else if (file.name.endsWith('.xls') || file.name.endsWith('.xlsx')) type = 'excel';
        else if (file.name.endsWith('.doc') || file.name.endsWith('.docx')) type = 'word';

        const existingItem = items.find(i => i.parentId === currentFolderId && i.name.toLowerCase() === file.name.toLowerCase());
        
        if (existingItem) {
          pendingConflicts.push({ file, existingItem, type, name: file.name });
        } else {
          safeFiles.push(file);
        }
      });

      // Process safe files
      safeFiles.forEach(file => {
        let type: FileItem['type'] = 'unknown';
        if (file.type.includes('pdf')) type = 'pdf';
        else if (file.type.includes('image')) type = 'image';
        else if (file.name.endsWith('.xls') || file.name.endsWith('.xlsx')) type = 'excel';
        else if (file.name.endsWith('.doc') || file.name.endsWith('.docx')) type = 'word';

        const reader = new FileReader();
        reader.onload = (ev) => {
          addItem({
            name: file.name,
            type,
            size: file.size,
            modifiedAt: new Date().toISOString(),
            parentId: currentFolderId,
            dataUrl: ev.target?.result as string
          });
        };
        reader.readAsDataURL(file);
      });

      if (safeFiles.length > 0) {
        addToast('success', 'Upload Started', `${safeFiles.length} file(s) are being processed and uploaded.`);
      }

      if (pendingConflicts.length > 0) {
        setConflictQueue(pendingConflicts);
        setIsConflictModalOpen(true);
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCreateFolderClick = () => {
    setNewFolderName('');
    setIsCreateFolderModalOpen(true);
  };

  const confirmCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFolderName.trim()) {
      const name = newFolderName.trim();
      const existingItem = items.find(i => i.parentId === currentFolderId && i.name.toLowerCase() === name.toLowerCase());
      
      if (existingItem) {
        setIsCreateFolderModalOpen(false);
        setConflictQueue([{ existingItem, type: 'folder', name, isFolder: true }]);
        setIsConflictModalOpen(true);
      } else {
        addItem({
          name,
          type: 'folder',
          modifiedAt: new Date().toISOString(),
          parentId: currentFolderId
        });
        addToast('success', 'Folder Created', `Folder "${name}" created successfully.`);
        setIsCreateFolderModalOpen(false);
      }
    }
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return '--';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getIcon = (type: FileItem['type'], sizeClass = "w-8 h-8") => {
    switch(type) {
      case 'folder': return <Folder className={`${sizeClass} text-primary fill-primary/20`} />;
      case 'pdf': return <FileText className={`${sizeClass} text-danger`} />;
      case 'image': return <ImageIcon className={`${sizeClass} text-success`} />;
      case 'excel': return <FileSpreadsheet className={`${sizeClass} text-success`} />;
      case 'word': return <FileText className={`${sizeClass} text-blue-600`} />;
      default: return <FileIcon className={`${sizeClass} text-textSecondary`} />;
    }
  };

  const handleItemClick = (e: React.MouseEvent, item: FileItem) => {
    e.stopPropagation();
    const newSelection = new Set(e.ctrlKey || e.metaKey ? selectedItemIds : []);
    
    if (e.shiftKey && lastSelectedId) {
      const lastIdx = filteredItems.findIndex(i => i.id === lastSelectedId);
      const currIdx = filteredItems.findIndex(i => i.id === item.id);
      if (lastIdx !== -1 && currIdx !== -1) {
        const start = Math.min(lastIdx, currIdx);
        const end = Math.max(lastIdx, currIdx);
        const rangeSelection = new Set(selectedItemIds);
        for (let i = start; i <= end; i++) {
          rangeSelection.add(filteredItems[i].id);
        }
        setSelectedItemIds(rangeSelection);
      }
    } else if (e.ctrlKey || e.metaKey) {
      if (newSelection.has(item.id)) newSelection.delete(item.id);
      else newSelection.add(item.id);
      setSelectedItemIds(newSelection);
      setLastSelectedId(item.id);
    } else {
      setSelectedItemIds(new Set([item.id]));
      setLastSelectedId(item.id);
    }
  };

  const handleItemDoubleClick = (item: FileItem) => {
    if (item.type === 'folder') {
      addRecentItem(item.id, 'folder');
      navigateToFolder(item.id);
    } else {
      addRecentItem(item.id, 'file');
      setViewingFile(item);
    }
    setActiveMenuId(null);
  };

  const handleRenameClick = (item: FileItem) => {
    setItemToRename(item);
    setRenameValue(item.name);
    setIsRenameModalOpen(true);
    setActiveMenuId(null);
  };

  const confirmRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (itemToRename && renameValue.trim() && renameValue.trim() !== itemToRename.name) {
      const name = renameValue.trim();
      const existingItem = items.find(i => i.parentId === currentFolderId && i.name.toLowerCase() === name.toLowerCase() && i.id !== itemToRename.id);

      if (existingItem) {
        setIsRenameModalOpen(false);
        setConflictQueue([{ existingItem, type: itemToRename.type, name, renameId: itemToRename.id }]);
        setIsConflictModalOpen(true);
      } else {
        renameItem(itemToRename.id, name);
        addToast('success', 'Renamed', `Item renamed to "${name}".`);
        setIsRenameModalOpen(false);
      }
    } else {
      setIsRenameModalOpen(false);
    }
  };

  const handleDeleteClick = (item?: FileItem) => {
    if (item) {
      setItemToDelete(item);
      setSelectedItemIds(new Set([item.id]));
    } else if (selectedItemIds.size > 0) {
      // For bulk delete, we'll handle it inside confirmDelete or a new function
    }
    setIsDeleteModalOpen(true);
    setActiveMenuId(null);
  };

  const confirmDelete = () => {
    if (selectedItemIds.size > 0) {
      selectedItemIds.forEach(id => deleteItem(id));
      addToast('success', 'Deleted', `${selectedItemIds.size} item(s) have been removed.`);
      setIsDeleteModalOpen(false);
      setSelectedItemIds(new Set());
      setItemToDelete(null);
    }
  };

  const handleBulkAction = (action: 'cut' | 'copy') => {
    if (selectedItemIds.size > 0) {
      setClipboard({ type: action, items: Array.from(selectedItemIds) });
      addToast('success', action === 'cut' ? 'Cut' : 'Copied', `${selectedItemIds.size} item(s) ready to paste.`);
      if (action === 'cut') setSelectedItemIds(new Set()); // Deselect after cut (optional UX)
    }
  };

  const handlePaste = () => {
    if (!clipboard) return;
    clipboard.items.forEach(itemId => {
      if (clipboard.type === 'cut') {
        moveItem(itemId, currentFolderId);
      } else {
        copyItem(itemId, currentFolderId);
      }
    });
    addToast('success', 'Pasted', `${clipboard.items.length} item(s) pasted successfully.`);
    if (clipboard.type === 'cut') clearClipboard();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      setSelectedItemIds(new Set(filteredItems.map(i => i.id)));
      return;
    }
    if (e.key === 'Delete') {
      if (selectedItemIds.size > 0) setIsDeleteModalOpen(true);
      return;
    }
    
    // Arrow navigation
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      if (filteredItems.length === 0) return;
      if (selectedItemIds.size === 0) {
        setSelectedItemIds(new Set([filteredItems[0].id]));
        setLastSelectedId(filteredItems[0].id);
        return;
      }
      
      const currentIdx = filteredItems.findIndex(i => i.id === lastSelectedId);
      if (currentIdx === -1) return;

      let nextIdx = currentIdx;
      if (viewMode === 'list') {
        if (e.key === 'ArrowUp') nextIdx = Math.max(0, currentIdx - 1);
        if (e.key === 'ArrowDown') nextIdx = Math.min(filteredItems.length - 1, currentIdx + 1);
      } else {
        // Grid view approx calculations (assuming 5 cols on lg screen)
        if (e.key === 'ArrowLeft') nextIdx = Math.max(0, currentIdx - 1);
        if (e.key === 'ArrowRight') nextIdx = Math.min(filteredItems.length - 1, currentIdx + 1);
        if (e.key === 'ArrowUp') nextIdx = Math.max(0, currentIdx - 5);
        if (e.key === 'ArrowDown') nextIdx = Math.min(filteredItems.length - 1, currentIdx + 5);
      }

      const nextId = filteredItems[nextIdx].id;
      if (e.shiftKey) {
        const newSelection = new Set(selectedItemIds);
        newSelection.add(nextId);
        setSelectedItemIds(newSelection);
      } else {
        setSelectedItemIds(new Set([nextId]));
      }
      setLastSelectedId(nextId);
    }

    if (e.key === 'Enter' && selectedItemIds.size === 1) {
      const item = filteredItems.find(i => i.id === Array.from(selectedItemIds)[0]);
      if (item) handleItemDoubleClick(item);
    }
  };

  const handleConflictResolution = (action: 'overwrite' | 'keep' | 'cancel') => {
    if (action === 'cancel') {
      setConflictQueue([]);
      setIsConflictModalOpen(false);
      return;
    }

    conflictQueue.forEach(conflict => {
      if (action === 'overwrite') {
        if (conflict.renameId) {
           deleteItem(conflict.existingItem.id);
           renameItem(conflict.renameId, conflict.name);
        } else if (conflict.isFolder) {
           updateItem(conflict.existingItem.id, { modifiedAt: new Date().toISOString() });
        } else if (conflict.file) {
           const reader = new FileReader();
           reader.onload = (ev) => {
             updateItem(conflict.existingItem.id, {
               size: conflict.file!.size,
               modifiedAt: new Date().toISOString(),
               dataUrl: ev.target?.result as string
             });
           };
           reader.readAsDataURL(conflict.file);
        }
      } else if (action === 'keep') {
        const uniqueName = getUniqueName(conflict.name, currentFolderId);
        
        if (conflict.renameId) {
          renameItem(conflict.renameId, uniqueName);
        } else if (conflict.isFolder) {
          addItem({
            name: uniqueName,
            type: 'folder',
            modifiedAt: new Date().toISOString(),
            parentId: currentFolderId
          });
        } else if (conflict.file) {
          const reader = new FileReader();
          reader.onload = (ev) => {
            addItem({
              name: uniqueName,
              type: conflict.type,
              size: conflict.file!.size,
              modifiedAt: new Date().toISOString(),
              parentId: currentFolderId,
              dataUrl: ev.target?.result as string
            });
          };
          reader.readAsDataURL(conflict.file);
        }
      }
    });

    addToast('success', 'Resolved', `Action applied to ${conflictQueue.length} conflicting item(s).`);
    setConflictQueue([]);
    setIsConflictModalOpen(false);
  };

  return (
    <div 
      className="h-[calc(100vh-4rem)] w-full flex flex-row bg-card overflow-hidden outline-none focus:ring-2 focus:ring-primary/20 focus:outline-offset-[-2px]"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <FolderTree />
      
      <div className="flex flex-col flex-1 min-w-0 bg-background">
        {/* Navigation Bar */}
        <div className="px-4 py-2 bg-background flex items-center gap-4">
          <div className="flex items-center gap-1 text-textSecondary">
            <button 
              onClick={() => navigateUp()} 
              disabled={currentPath.length === 0}
              className="p-1.5 rounded hover:bg-secondary/20 disabled:opacity-30 disabled:hover:bg-transparent"
              title="Up"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
            <button 
              onClick={() => navigateBack()}
              disabled={historyIndex === 0}
              className="p-1.5 rounded hover:bg-secondary/20 disabled:opacity-30 disabled:hover:bg-transparent"
              title="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={() => navigateForward()}
              disabled={historyIndex === history.length - 1}
              className="p-1.5 rounded hover:bg-secondary/20 disabled:opacity-30 disabled:hover:bg-transparent"
              title="Forward"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Breadcrumb / Address Bar */}
          <div className="flex-1 flex items-center bg-card border border-border rounded shadow-sm px-2 py-1 h-8 overflow-hidden">
            <button 
              onClick={() => navigateToFolder(null)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, null)}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-secondary/20 text-xs font-medium text-textPrimary whitespace-nowrap"
            >
              <Home className="w-3.5 h-3.5" /> <span>This PC</span>
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-textSecondary mx-1 shrink-0" />
            <button 
              onClick={() => navigateToFolder(null)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, null)}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-secondary/20 text-xs font-medium text-textPrimary whitespace-nowrap"
            >
              CGE File
            </button>
            {pathNames.map((crumb, idx) => (
              <React.Fragment key={crumb.id}>
                <ChevronRight className="w-3.5 h-3.5 text-textSecondary mx-1 shrink-0" />
                <button 
                  onClick={() => {
                    const newPath = currentPath.slice(0, idx + 1);
                    navigateToFolder(crumb.id);
                  }}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, crumb.id)}
                  className="px-1.5 py-0.5 rounded hover:bg-secondary/20 text-xs font-medium text-textPrimary whitespace-nowrap truncate max-w-[150px]"
                >
                  {crumb.name}
                </button>
              </React.Fragment>
            ))}
            <div className="flex-1 min-w-[20px]" onClick={() => setSelectedItemIds(new Set())}></div>
          </div>

          {/* Search Box */}
          <div className="relative w-48 sm:w-64 h-8 shrink-0">
            <input 
              type="text" 
              placeholder={`Search ${currentFolderId ? pathNames[pathNames.length-1].name : 'CGE File'}`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-full pl-3 pr-8 bg-card border border-border rounded shadow-sm text-xs focus:outline-none focus:ring-1 focus:ring-primary/50 text-textPrimary placeholder-textSecondary"
            />
            <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-textSecondary" />
          </div>
        </div>

        {/* Command Bar */}
        <div className="px-4 py-2 border-b border-border bg-card flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-sm text-textSecondary">
          <div className="flex items-center gap-1 flex-wrap">
            <button 
              onClick={handleCreateFolderClick}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded hover:bg-secondary/20 text-textPrimary"
            >
              <Plus className="w-4 h-4" /> <span className="font-medium">New</span>
            </button>
            <div className="w-px h-5 bg-border mx-2"></div>
            
            <button 
              onClick={() => handleBulkAction('cut')} 
              disabled={selectedItemIds.size === 0}
              className="p-1.5 rounded hover:bg-secondary/20 disabled:opacity-40 disabled:hover:bg-transparent" title="Cut"
            >
              <Scissors className="w-4 h-4" />
            </button>
            <button 
              onClick={() => handleBulkAction('copy')} 
              disabled={selectedItemIds.size === 0}
              className="p-1.5 rounded hover:bg-secondary/20 disabled:opacity-40 disabled:hover:bg-transparent" title="Copy"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button 
              onClick={handlePaste} 
              disabled={!clipboard}
              className="p-1.5 rounded hover:bg-secondary/20 disabled:opacity-40 disabled:hover:bg-transparent" title="Paste"
            >
              <ClipboardPaste className="w-4 h-4" />
            </button>
            <button 
              onClick={() => {
                if (selectedItemIds.size === 1) {
                  const item = filteredItems.find(i => i.id === Array.from(selectedItemIds)[0]);
                  if (item) handleRenameClick(item);
                }
              }}
              disabled={selectedItemIds.size !== 1}
              className="p-1.5 rounded hover:bg-secondary/20 disabled:opacity-40 disabled:hover:bg-transparent" title="Rename"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button 
              className="p-1.5 rounded hover:bg-secondary/20 disabled:opacity-40 disabled:hover:bg-transparent" title="Share"
              disabled
            >
              <ChevronRight className="w-4 h-4 -rotate-45" />
            </button>
            <button 
              onClick={() => handleDeleteClick()} 
              disabled={selectedItemIds.size === 0}
              className="p-1.5 rounded hover:bg-secondary/20 disabled:opacity-40 disabled:hover:bg-transparent" title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <div className="w-px h-5 bg-border mx-2"></div>

            {/* Sort Dropdown mock */}
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded hover:bg-secondary/20 text-textPrimary">
              <ArrowDown className="w-4 h-4" /> <span>Sort</span> <ChevronDown className="w-3.5 h-3.5" />
            </button>
            
            {/* View Dropdown */}
            <button 
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded hover:bg-secondary/20 text-textPrimary"
            >
              {viewMode === 'list' ? <List className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />} <span>View</span> <ChevronDown className="w-3.5 h-3.5" />
            </button>

            <button className="p-1.5 rounded hover:bg-secondary/20 ml-1">
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center">
             <button 
              onClick={handleUploadClick}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors text-sm font-medium"
            >
              <Upload className="w-4 h-4" /> Upload
            </button>
            <input type="file" multiple ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
          </div>
            {/* Status Bar */}
            <div className="bg-card border-t border-border px-4 py-1.5 flex items-center justify-between text-xs text-textSecondary mt-auto shrink-0">
              <div className="flex items-center gap-4">
                <span>{filteredItems.length} items</span>
                {selectedItemIds.size > 0 && <span>{selectedItemIds.size} item(s) selected</span>}
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setViewMode('list')} 
                  className={clsx("p-1 rounded", viewMode === 'list' ? "bg-secondary/20" : "hover:bg-secondary/10")}
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => setViewMode('grid')} 
                  className={clsx("p-1 rounded", viewMode === 'grid' ? "bg-secondary/20" : "hover:bg-secondary/10")}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
        </div>

      {/* Main Content Area */}
      <div 
        className="flex-1 overflow-auto bg-background"
        onClick={(e) => { if (e.target === e.currentTarget) setSelectedItemIds(new Set()) }}
      >
        {currentView === 'home' ? (
          // === HOME VIEW ===
          <div className="p-6 space-y-8">
            {/* Quick Access */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <ChevronDown className="w-4 h-4 text-textSecondary" />
                <h2 className="text-sm font-semibold text-textSecondary uppercase tracking-wider">Quick Access</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {[
                  { name: 'Downloads', id: items.find(i => i.parentId === null && i.name.toLowerCase() === 'downloads')?.id },
                  { name: 'Documents', id: items.find(i => i.parentId === null && i.name.toLowerCase() === 'documents')?.id },
                  { name: 'Pictures', id: items.find(i => i.parentId === null && i.name.toLowerCase() === 'pictures')?.id },
                  { name: 'Music', id: items.find(i => i.parentId === null && i.name.toLowerCase() === 'music')?.id },
                  { name: 'Videos', id: items.find(i => i.parentId === null && i.name.toLowerCase() === 'videos')?.id },
                ].map(qa => qa.id ? (
                  <div
                    key={qa.id}
                    className="flex flex-col items-center gap-2 p-4 bg-card border border-border rounded-xl cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group"
                    onClick={() => { addRecentItem(qa.id!, 'folder'); navigateToFolder(qa.id!); }}
                  >
                    {getIcon('folder', 'w-10 h-10')}
                    <span className="text-xs font-medium text-textPrimary text-center">{qa.name}</span>
                    <span className="text-[10px] text-textSecondary">Stored locally</span>
                  </div>
                ) : null)}
              </div>
            </section>

            {/* Recent Files */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <ChevronDown className="w-4 h-4 text-textSecondary" />
                <h2 className="text-sm font-semibold text-textSecondary uppercase tracking-wider">Recent</h2>
              </div>
              {recentItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-textSecondary">
                  <Folder className="w-14 h-14 mb-3 opacity-20" />
                  <p className="text-sm">No recent activity yet.</p>
                  <p className="text-xs mt-1 opacity-70">Files and folders you open will appear here.</p>
                </div>
              ) : (
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-background text-textSecondary font-medium border-b border-border">
                      <tr>
                        <th className="px-4 py-2.5 font-medium">Name</th>
                        <th className="px-4 py-2.5 font-medium hidden sm:table-cell">Type</th>
                        <th className="px-4 py-2.5 font-medium hidden md:table-cell">Last Opened</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentItems.map(r => {
                        const item = items.find(i => i.id === r.id);
                        if (!item) return null;
                        return (
                          <tr
                            key={r.id}
                            className="hover:bg-secondary/5 cursor-pointer transition-colors group"
                            onDoubleClick={() => {
                              if (item.type === 'folder') navigateToFolder(item.id);
                              else { setViewingFile(item); }
                            }}
                          >
                            <td className="px-4 py-1.5">
                              <div className="flex items-center gap-3">
                                {getIcon(item.type, 'w-5 h-5')}
                                <span className="font-medium text-textPrimary truncate">{item.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-1.5 text-textSecondary hidden sm:table-cell text-xs">
                              {item.type === 'folder' ? 'File Folder' : item.type === 'pdf' ? 'PDF Document' : item.type === 'image' ? 'Image File' : item.type === 'excel' ? 'Excel Spreadsheet' : item.type === 'word' ? 'Word Document' : 'File'}
                            </td>
                            <td className="px-4 py-1.5 text-textSecondary hidden md:table-cell text-xs">
                              {new Date(r.visitedAt).toLocaleDateString() + ' ' + new Date(r.visitedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-textSecondary">
            <Folder className="w-16 h-16 mb-4 opacity-20" />
            <h3 className="text-lg font-medium text-textPrimary mb-1">Folder is Empty</h3>
            <p>Upload files or create folders to get started.</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredItems.map(item => (
              <div 
                key={item.id} 
                draggable
                onDragStart={(e) => handleDragStart(e, item.id)}
                onDragOver={item.type === 'folder' ? handleDragOver : undefined}
                onDrop={item.type === 'folder' ? (e) => handleDrop(e, item.id) : undefined}
                className={clsx(
                  "relative group bg-card border rounded-xl p-4 flex flex-col items-center gap-3 transition-all cursor-pointer",
                  selectedItemIds.has(item.id) ? "border-2 border-primary shadow-md bg-[#D4AF37]/10 scale-[0.98]" : "border-border hover:border-primary/50 hover:shadow-md"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  handleItemClick(e, item);
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  handleItemDoubleClick(item);
                }}
              >
                {item.type === 'image' && item.dataUrl ? (
                  <div className="w-full h-20 rounded-md overflow-hidden bg-secondary/10 flex items-center justify-center shrink-0">
                    <img src={item.dataUrl} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="h-20 flex items-center justify-center shrink-0">
                    {getIcon(item.type)}
                  </div>
                )}
                <span className="text-sm font-medium text-textPrimary text-center truncate w-full mt-auto" title={item.name}>
                  {item.name}
                </span>
                
                {/* Context Menu Button */}
                <button 
                  onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === item.id ? null : item.id); }}
                  className="absolute top-2 right-2 p-1 rounded-md text-textSecondary hover:bg-secondary/20 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {/* Context Menu */}
                {activeMenuId === item.id && (
                  <div className="absolute top-8 right-2 w-36 bg-card border border-border rounded-lg shadow-lg py-1 z-10" onClick={e => e.stopPropagation()}>
                    <button onClick={() => handleRenameClick(item)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-textPrimary hover:bg-secondary/10 text-left">
                      <Edit2 className="w-4 h-4" /> Rename
                    </button>
                    {item.type !== 'folder' && (
                      <button onClick={() => { addToast('success', 'Download Started', `Downloading ${item.name}...`); setActiveMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-textPrimary hover:bg-secondary/10 text-left">
                        <Download className="w-4 h-4" /> Download
                      </button>
                    )}
                    <button onClick={() => handleDeleteClick(item)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-danger/10 text-left">
                      <Trash2 className="w-4 h-4" /> Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-visible">
            <table className="w-full text-left text-sm">
              <thead className="bg-background text-textSecondary font-medium border-b border-border">
                <tr>
                  <th className="px-4 py-3 font-medium cursor-pointer hover:text-primary transition-colors" onClick={() => setSort('name', sortField === 'name' && sortDirection === 'asc' ? 'desc' : 'asc')}>
                    <div className="flex items-center gap-1">Name {sortField === 'name' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3"/> : <ArrowDown className="w-3 h-3"/>)}</div>
                  </th>
                  <th className="px-4 py-3 font-medium hidden lg:table-cell">Type</th>
                  <th className="px-4 py-3 font-medium hidden sm:table-cell cursor-pointer hover:text-primary transition-colors" onClick={() => setSort('date', sortField === 'date' && sortDirection === 'asc' ? 'desc' : 'asc')}>
                    <div className="flex items-center gap-1">Date Modified {sortField === 'date' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3"/> : <ArrowDown className="w-3 h-3"/>)}</div>
                  </th>
                  <th className="px-4 py-3 font-medium hidden md:table-cell cursor-pointer hover:text-primary transition-colors" onClick={() => setSort('size', sortField === 'size' && sortDirection === 'asc' ? 'desc' : 'asc')}>
                    <div className="flex items-center gap-1">Size {sortField === 'size' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3"/> : <ArrowDown className="w-3 h-3"/>)}</div>
                  </th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map(item => (
                  <tr 
                    key={item.id} 
                    draggable
                    onDragStart={(e) => handleDragStart(e, item.id)}
                    onDragOver={item.type === 'folder' ? handleDragOver : undefined}
                    onDrop={item.type === 'folder' ? (e) => handleDrop(e, item.id) : undefined}
                    className={clsx(
                      "transition-colors group cursor-pointer",
                      selectedItemIds.has(item.id) ? "bg-[#D4AF37]/20" : "hover:bg-secondary/5"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleItemClick(e, item);
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      handleItemDoubleClick(item);
                    }}
                  >
                    <td className="px-4 py-1.5">
                      <div className="flex items-center gap-3">
                        {getIcon(item.type, "w-5 h-5")}
                        <span className="font-medium text-textPrimary truncate">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-1.5 text-textSecondary hidden lg:table-cell text-xs">
                      {item.type === 'folder' ? 'File Folder' :
                       item.type === 'pdf' ? 'PDF Document' :
                       item.type === 'image' ? 'Image File' :
                       item.type === 'excel' ? 'Excel Spreadsheet' :
                       item.type === 'word' ? 'Word Document' : 'File'}
                    </td>
                    <td className="px-4 py-1.5 text-textSecondary hidden sm:table-cell text-xs">{formatDate(item.modifiedAt)}</td>
                    <td className="px-4 py-1.5 text-textSecondary hidden md:table-cell text-xs">{formatSize(item.size)}</td>
                    <td className="px-4 py-1.5 text-right relative">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === item.id ? null : item.id); }}
                        className="p-1 rounded-md text-textSecondary hover:bg-secondary/20 hover:text-textPrimary transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>
                      
                      {activeMenuId === item.id && (
                        <div className="absolute top-10 right-4 w-36 bg-card border border-border rounded-lg shadow-lg py-1 z-10" onClick={e => e.stopPropagation()}>
                          <button onClick={() => handleRenameClick(item)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-textPrimary hover:bg-secondary/10 text-left">
                            <Edit2 className="w-4 h-4" /> Rename
                          </button>
                          {item.type !== 'folder' && (
                            <button onClick={() => { addToast('success', 'Download Started', `Downloading ${item.name}...`); setActiveMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-textPrimary hover:bg-secondary/10 text-left">
                              <Download className="w-4 h-4" /> Download
                            </button>
                          )}
                          <button onClick={() => handleDeleteClick(item)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-danger/10 text-left">
                            <Trash2 className="w-4 h-4" /> Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>


      
      {isCreateFolderModalOpen && (
        <Modal 
          isOpen={isCreateFolderModalOpen} 
          onClose={() => setIsCreateFolderModalOpen(false)} 
          title="Create New Folder"
        >
          <form onSubmit={confirmCreateFolder} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-textSecondary mb-1">Folder Name</label>
              <input 
                type="text" 
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                autoFocus
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <button 
                type="button" 
                onClick={() => setIsCreateFolderModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-textSecondary hover:bg-secondary/10 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={!newFolderName.trim()}
                className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </form>
        </Modal>
      )}

      {isRenameModalOpen && (
        <Modal 
          isOpen={isRenameModalOpen} 
          onClose={() => setIsRenameModalOpen(false)} 
          title="Rename Item"
        >
          <form onSubmit={confirmRename} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-textSecondary mb-1">New Name</label>
              <input 
                type="text" 
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                autoFocus
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <button 
                type="button" 
                onClick={() => setIsRenameModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-textSecondary hover:bg-secondary/10 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={!renameValue.trim() || renameValue.trim() === itemToRename?.name}
                className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </form>
        </Modal>
      )}

      {isDeleteModalOpen && (
        <Modal 
          isOpen={isDeleteModalOpen} 
          onClose={() => setIsDeleteModalOpen(false)} 
          title="Confirm Deletion"
        >
          <div className="space-y-4">
            <p className="text-textSecondary">
              Are you sure you want to delete {itemToDelete ? `"${itemToDelete.name}"` : `${selectedItemIds.size} selected items`}? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <button 
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-textSecondary hover:bg-secondary/10 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                className="px-4 py-2 bg-danger text-white text-sm font-medium rounded-lg hover:bg-danger/90 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </Modal>
      )}

      {isConflictModalOpen && (
        <Modal 
          isOpen={isConflictModalOpen} 
          onClose={() => handleConflictResolution('cancel')} 
          title="File Conflict"
        >
          <div className="space-y-4">
            <p className="text-textSecondary">
              {conflictQueue.length > 1 
                ? `${conflictQueue.length} items already exist in this location. What would you like to do?` 
                : `"${conflictQueue[0]?.name}" already exists in this location. What would you like to do?`
              }
            </p>
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <button 
                onClick={() => handleConflictResolution('cancel')}
                className="px-4 py-2 text-sm font-medium text-textSecondary hover:bg-secondary/10 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleConflictResolution('keep')}
                className="px-4 py-2 bg-secondary text-textPrimary text-sm font-medium rounded-lg hover:bg-secondary/80 transition-colors"
              >
                Keep Both
              </button>
              <button 
                onClick={() => handleConflictResolution('overwrite')}
                className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
              >
                Overwrite {conflictQueue.length > 1 ? 'All' : ''}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {viewingFile && (
        <FileViewerModal 
          file={viewingFile} 
          isOpen={!!viewingFile} 
          onClose={() => setViewingFile(null)} 
        />
      )}
      </div>
    </div>
  );
}
