'use client';

import Image from "next/image";
import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { DomainNode } from "@/types/audite";

interface SidebarAuditeProps {
  domainTree: DomainNode[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  questionnaireName?: string;
}

export default function SidebarAudite({
  domainTree,
  selectedNodeId,
  onSelectNode,
  questionnaireName = "Questionnaire d'audit",
}: SidebarAuditeProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div
      className={[
        "h-full flex flex-col transition-all duration-300 ease-in-out bg-slate-900",
        isCollapsed ? "w-16" : "w-80",
      ].join(" ")}
    >
      {/* Header avec Logo */}
      <div className="p-6 border-b border-slate-800 flex-shrink-0">
        <div className={`flex items-center ${isCollapsed ? "justify-center" : "gap-3"}`}>
          <div className="flex items-center justify-center flex-shrink-0">
            <Image
              src="/logo-cyberguard.png"
              alt="Logo CyberGard"
              width={60}
              height={60}
              className="object-contain"
              priority
            />
          </div>

          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-base leading-tight text-white truncate">
                CYBERGARD AI
              </h1>
              <p className="text-xs text-slate-400 truncate">{questionnaireName}</p>
            </div>
          )}
        </div>
      </div>

      {/* Toggle Button */}
      <button
        type="button"
        onClick={() => setIsCollapsed((v) => !v)}
        className="absolute -right-3 top-20 w-6 h-6 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-full flex items-center justify-center transition-colors shadow-lg z-10"
        title={isCollapsed ? "Étendre le menu" : "Réduire le menu"}
      >
        {isCollapsed ? (
          <ChevronRight className="w-4 h-4 text-slate-300" />
        ) : (
          <ChevronLeft className="w-4 h-4 text-slate-300" />
        )}
      </button>

      {/* Navigation tree */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {!isCollapsed && (
          <p className="text-xs text-slate-500 uppercase font-semibold mb-3 px-3">
            Progression par domaine
          </p>
        )}

        {!isCollapsed && domainTree.map((node) => (
          <DomainNodeItem
            key={node.id}
            node={node}
            selectedNodeId={selectedNodeId}
            onSelectNode={onSelectNode}
            level={0}
          />
        ))}
      </nav>
    </div>
  );
}

interface DomainNodeItemProps {
  node: DomainNode;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  level: number;
}

function DomainNodeItem({
  node,
  selectedNodeId,
  onSelectNode,
  level,
}: DomainNodeItemProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const isSelected = node.id === selectedNodeId;
  const isCompleted = node.answered_count === node.question_count && node.question_count > 0;
  const hasProgress = node.answered_count > 0;
  const hasChildren = node.children && node.children.length > 0;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="transition-all">
      <div
        className={[
          "w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all text-sm cursor-pointer",
          isSelected
            ? "bg-indigo-600 text-white shadow-lg"
            : "text-slate-300 hover:bg-slate-800 hover:text-white",
          node.type === "domain" ? "font-medium" : "",
        ].join(" ")}
        style={{ paddingLeft: `${level * 12 + 12}px` }}
        onClick={() => onSelectNode(node.id)}
      >
        <div className="flex items-center flex-1 min-w-0">
          {/* Chevron pour les nœuds avec enfants */}
          {hasChildren && (
            <button
              onClick={handleToggle}
              className="mr-1 p-0.5 hover:bg-slate-700 rounded transition-colors"
              type="button"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          )}
          {!hasChildren && <span className="w-5" />}

          <span className="truncate">{node.name}</span>
        </div>

        <div className="flex items-center gap-2 ml-2">
          {/* Badge de progression (pour domaines et requirements) */}
          {(node.type === "domain" || node.type === "requirement") && (
            <span
              className={[
                "text-xs px-2 py-0.5 rounded-full font-medium",
                isCompleted
                  ? "bg-green-600 text-white"
                  : hasProgress
                  ? "bg-blue-600 text-white"
                  : "bg-slate-700 text-slate-300",
              ].join(" ")}
            >
              {node.answered_count}/{node.question_count}
            </span>
          )}

          {/* Indicateur mandatory non répondu (domaines) */}
          {(node.type === "domain" || node.type === "requirement") && node.has_mandatory_unanswered && (
            <AlertCircle className="w-4 h-4 text-amber-400" />
          )}

          {/* Indicateur complété (domaines) */}
          {isCompleted && (node.type === "domain" || node.type === "requirement") && (
            <CheckCircle className="w-4 h-4 text-green-400" />
          )}
        </div>
      </div>

      {/* Enfants (si présents et expanded) */}
      {hasChildren && isExpanded && (
        <div className="mt-1 ml-2 border-l border-slate-700 pl-2">
          {node.children.map((child) => (
            <DomainNodeItem
              key={child.id}
              node={child}
              selectedNodeId={selectedNodeId}
              onSelectNode={onSelectNode}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
