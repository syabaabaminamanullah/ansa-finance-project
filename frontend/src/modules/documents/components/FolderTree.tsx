import React, { useState, useEffect } from 'react';
import { useDocumentStore, type FileItem } from '../../../store/documentStore';
import { ChevronRight, ChevronDown, Folder, HardDrive, Home, Image, User, Monitor, Download, FileText, Music, Video, MonitorPlay } from 'lucide-react';
import { clsx } from 'clsx';

interface FolderNodeProps {
  folder: FileItem;
  allFolders: FileItem[];
  level: number;
  currentFolderId: string | null;
  onNavigate: (id: string | null) => void;
  currentPath: string[];
}

function FolderNode({ folder, allFolders, level, currentFolderId, onNavigate, currentPath }: FolderNodeProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const children = allFolders.filter(f => f.parentId === folder.id);
  const hasChildren = children.length > 0;
  const isSelected = currentFolderId === folder.id;

  // Auto-expand if the current path contains this folder
  useEffect(() => {
    if (currentPath.includes(folder.id)) {
      setIsExpanded(true);
    }
  }, [currentPath, folder.id]);

  return (
    <div>
      <div 
        className={clsx(
          "flex items-center gap-1.5 py-1.5 px-2 rounded-lg cursor-pointer transition-colors text-sm group",
          isSelected ? "bg-primary/20 text-primary font-medium" : "text-textSecondary hover:bg-secondary/10 hover:text-textPrimary",
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={() => onNavigate(folder.id)}
      >
        <button 
          className="p-0.5 rounded hover:bg-secondary/20 invisible group-hover:visible transition-all flex items-center justify-center shrink-0"
          style={{ visibility: hasChildren ? 'visible' : 'hidden' }}
          onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
        >
          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>
        <Folder className={clsx("w-4 h-4 shrink-0", isSelected ? "fill-primary/20" : "fill-none")} />
        <span className="truncate">{folder.name}</span>
      </div>
      {isExpanded && hasChildren && (
        <div className="flex flex-col mt-0.5">
          {children.map(child => (
            <FolderNode 
              key={child.id} 
              folder={child} 
              allFolders={allFolders} 
              level={level + 1} 
              currentFolderId={currentFolderId}
              onNavigate={onNavigate}
              currentPath={currentPath}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FolderTree() {
  const { items, currentPath, currentView, navigateToFolder, navigateHome } = useDocumentStore();
  const currentFolderId = currentPath.length > 0 ? currentPath[currentPath.length - 1] : null;
  const folders = items.filter(i => i.type === 'folder').sort((a,b) => a.name.localeCompare(b.name));
  const isHome = currentView === 'home';
  
  const rootOnlyFolders = folders.filter(f => f.parentId === null);
  const downloadFolder = rootOnlyFolders.find(f => f.name.toLowerCase() === 'download' || f.name.toLowerCase() === 'downloads');
  const documentFolder = rootOnlyFolders.find(f => f.name.toLowerCase() === 'document' || f.name.toLowerCase() === 'documents');
  const picturesFolder = rootOnlyFolders.find(f => f.name.toLowerCase() === 'picture' || f.name.toLowerCase() === 'pictures');
  const musicFolder = rootOnlyFolders.find(f => f.name.toLowerCase() === 'music');
  const videosFolder = rootOnlyFolders.find(f => f.name.toLowerCase() === 'video' || f.name.toLowerCase() === 'videos');
  
  const rootFolders = rootOnlyFolders.filter(f => {
    const name = f.name.toLowerCase();
    if (name === 'download' || name === 'downloads') return false;
    if (name === 'document' || name === 'documents') return false;
    if (name === 'picture' || name === 'pictures') return false;
    if (name === 'music') return false;
    if (name === 'video' || name === 'videos') return false;
    return true;
  });

  return (
    <div className="w-56 md:w-64 border-r border-border bg-card flex flex-col h-full overflow-y-auto overflow-x-hidden pt-2 pb-6 custom-scrollbar shrink-0 hidden md:flex text-sm select-none">
      
      {/* Quick Access Section */}
      <div className="flex flex-col gap-0.5 px-2 mb-4">
        <div 
          className={clsx("flex items-center gap-2 py-1.5 px-2 rounded-lg cursor-pointer transition-colors", isHome ? "bg-[#D4AF37]/20 text-primary font-medium" : "text-textSecondary hover:bg-secondary/10")}
          onClick={navigateHome}
        >
          <Home className="w-4 h-4 text-warning" /> <span>Home</span>
        </div>
      </div>

      <div className="h-px w-full bg-border/50 mb-4"></div>

      {/* Pinned Folders */}
      <div className="flex flex-col gap-0.5 px-2 mb-4">
        <div 
          className={clsx("flex items-center justify-between py-1.5 px-2 rounded-lg cursor-pointer transition-colors", downloadFolder && currentFolderId === downloadFolder.id ? "bg-[#D4AF37]/20 text-primary font-medium" : "text-textSecondary hover:bg-secondary/10")}
          onClick={() => downloadFolder && navigateToFolder(downloadFolder.id)}
        >
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-success" /> <span>Downloads</span>
          </div>
          {downloadFolder ? <div className="w-2 h-2 rounded-full bg-success"></div> : <div className="w-2 h-2 rounded-full bg-textSecondary/30"></div>}
        </div>
        <div 
          className={clsx("flex items-center justify-between py-1.5 px-2 rounded-lg cursor-pointer transition-colors", documentFolder && currentFolderId === documentFolder.id ? "bg-[#D4AF37]/20 text-primary font-medium" : "text-textSecondary hover:bg-secondary/10")}
          onClick={() => documentFolder && navigateToFolder(documentFolder.id)}
        >
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" /> <span>Documents</span>
          </div>
          {documentFolder ? <div className="w-2 h-2 rounded-full bg-primary"></div> : <div className="w-2 h-2 rounded-full bg-textSecondary/30"></div>}
        </div>
        <div 
          className={clsx("flex items-center justify-between py-1.5 px-2 rounded-lg cursor-pointer transition-colors", picturesFolder && currentFolderId === picturesFolder.id ? "bg-[#D4AF37]/20 text-primary font-medium" : "text-textSecondary hover:bg-secondary/10")}
          onClick={() => picturesFolder && navigateToFolder(picturesFolder.id)}
        >
          <div className="flex items-center gap-2">
            <Image className="w-4 h-4 text-primary" /> <span>Pictures</span>
          </div>
          {picturesFolder ? <div className="w-2 h-2 rounded-full bg-primary"></div> : <div className="w-2 h-2 rounded-full bg-textSecondary/30"></div>}
        </div>
        <div 
          className={clsx("flex items-center justify-between py-1.5 px-2 rounded-lg cursor-pointer transition-colors", musicFolder && currentFolderId === musicFolder.id ? "bg-[#D4AF37]/20 text-primary font-medium" : "text-textSecondary hover:bg-secondary/10")}
          onClick={() => musicFolder && navigateToFolder(musicFolder.id)}
        >
          <div className="flex items-center gap-2">
            <Music className="w-4 h-4 text-danger" /> <span>Music</span>
          </div>
          {musicFolder ? <div className="w-2 h-2 rounded-full bg-danger"></div> : <div className="w-2 h-2 rounded-full bg-textSecondary/30"></div>}
        </div>
        <div 
          className={clsx("flex items-center justify-between py-1.5 px-2 rounded-lg cursor-pointer transition-colors", videosFolder && currentFolderId === videosFolder.id ? "bg-[#D4AF37]/20 text-primary font-medium" : "text-textSecondary hover:bg-secondary/10")}
          onClick={() => videosFolder && navigateToFolder(videosFolder.id)}
        >
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4 text-primary" /> <span>Videos</span>
          </div>
          {videosFolder ? <div className="w-2 h-2 rounded-full bg-primary"></div> : <div className="w-2 h-2 rounded-full bg-textSecondary/30"></div>}
        </div>
      </div>

      <div className="h-px w-full bg-border/50 mb-4"></div>

      {/* This PC Section */}
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-1.5 py-1.5 px-2 rounded-lg cursor-pointer transition-colors text-textPrimary hover:bg-secondary/10 font-medium group">
          <ChevronDown className="w-3.5 h-3.5 text-textSecondary shrink-0" />
          <MonitorPlay className="w-4 h-4 text-primary" />
          <span>This PC</span>
        </div>
        
        <div className="flex flex-col gap-0.5 ml-3">
          <div className="flex items-center gap-1.5 py-1.5 px-2 rounded-lg cursor-pointer transition-colors text-textSecondary hover:bg-secondary/10 group">
            <ChevronRight className="w-3.5 h-3.5 shrink-0" />
            <HardDrive className="w-4 h-4 text-textSecondary" />
            <span>Windows (C:)</span>
          </div>

          <div 
            className={clsx(
              "flex items-center gap-1.5 py-1.5 px-2 rounded-lg cursor-pointer transition-colors group",
              currentFolderId === null ? "bg-[#D4AF37]/20 text-primary font-medium" : "text-textSecondary hover:bg-secondary/10 hover:text-textPrimary"
            )}
            onClick={() => navigateToFolder(null)}
          >
            <ChevronDown className="w-3.5 h-3.5 shrink-0" />
            <HardDrive className={clsx("w-4 h-4", currentFolderId === null ? "text-primary" : "text-textSecondary")} />
            <span>CGE File</span>
          </div>
          
          <div className="flex flex-col ml-3">
            {rootFolders.map(folder => (
              <FolderNode 
                key={folder.id}
                folder={folder}
                allFolders={folders}
                level={0}
                currentFolderId={currentFolderId}
                onNavigate={navigateToFolder}
                currentPath={currentPath}
              />
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
