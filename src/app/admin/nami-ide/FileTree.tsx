"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, File, FolderOpen, Folder, FilePlus, FolderPlus, Trash2, Edit3 } from "lucide-react";
import type { FsTree, FsNode } from "./fs";

type Props = {
  tree: FsTree;
  activePath: string;
  onSelect: (path: string) => void;
  onToggle: (path: string) => void;
  onAddFile: (parentPath: string) => void;
  onAddFolder: (parentPath: string) => void;
  onDelete: (path: string) => void;
  onRename: (path: string) => void;
};

export function FileTree(props: Props) {
  return (
    <div className="text-xs select-none">
      {props.tree.map((n) => (
        <TreeNode key={n.name} node={n} path={n.name} depth={0} {...props} />
      ))}
    </div>
  );
}

function TreeNode({
  node, path, depth, ...p
}: { node: FsNode; path: string; depth: number } & Props) {
  const [hover, setHover] = useState(false);
  const isActive = p.activePath === path;
  const isFolder = node.type === "folder";

  return (
    <div>
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onClick={() => {
          if (isFolder) p.onToggle(path);
          else p.onSelect(path);
        }}
        className={`group flex items-center gap-1 px-2 py-1 cursor-pointer transition rounded ${
          isActive ? "bg-purple-500/20 text-purple-200" : "hover:bg-bg-elevated"
        }`}
        style={{ paddingLeft: `${depth * 12 + 6}px` }}
        title={path}
      >
        {/* chevron / icon */}
        {isFolder ? (
          <>
            {node.expanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
            {node.expanded ? <FolderOpen size={12} className="text-yellow-400" /> : <Folder size={12} className="text-yellow-400/70" />}
          </>
        ) : (
          <>
            <span style={{ width: 11 }} />
            <File size={12} className={isActive ? "text-purple-300" : "text-fg-muted"} />
          </>
        )}
        <span className="flex-1 truncate">{node.name}</span>

        {/* 右側 hover 圖示 */}
        {hover && (
          <div className="flex items-center gap-0.5 opacity-80">
            {isFolder && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); p.onAddFile(path); }}
                  className="p-0.5 rounded hover:bg-purple-500/30 hover:text-purple-200"
                  title="新增檔案"
                >
                  <FilePlus size={10} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); p.onAddFolder(path); }}
                  className="p-0.5 rounded hover:bg-yellow-500/30 hover:text-yellow-200"
                  title="新增資料夾"
                >
                  <FolderPlus size={10} />
                </button>
              </>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); p.onRename(path); }}
              className="p-0.5 rounded hover:bg-blue-500/30 hover:text-blue-200"
              title="重新命名"
            >
              <Edit3 size={10} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); p.onDelete(path); }}
              className="p-0.5 rounded hover:bg-red-500/30 hover:text-red-300"
              title="刪除"
            >
              <Trash2 size={10} />
            </button>
          </div>
        )}
      </div>

      {/* 子節點 (folder 且 expanded) */}
      {isFolder && node.expanded && node.children.length > 0 && (
        <div>
          {node.children.map((c) => (
            <TreeNode
              key={c.name}
              node={c}
              path={`${path}/${c.name}`}
              depth={depth + 1}
              {...p}
            />
          ))}
        </div>
      )}
      {isFolder && node.expanded && node.children.length === 0 && (
        <div className="text-[10px] text-fg-muted/50 italic px-2 py-0.5" style={{ paddingLeft: `${(depth + 1) * 12 + 18}px` }}>
          (空資料夾)
        </div>
      )}
    </div>
  );
}
