'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  ChevronDown, 
  ChevronRight, 
  Download,
  RefreshCw,
  BookOpen,
  Folder,
  FileText,
  Database,
  Calendar,
  Tag
} from 'lucide-react';

interface HierarchyNode {
  id: string;
  code: string;
  title: string;
  level: number;
  children: HierarchyNode[];
  requirements: Requirement[];
}

interface Requirement {
  id: string;
  official_code: string;
  title: string;
  description: string;
  tags?: string;
  niveau_risque?: string;
  obligation_conformite?: string;
}

export default function ViewReferentielPage() {
  const params = useParams();
  const router = useRouter();
  const frameworkId = params?.id as string;

  const [framework, setFramework] = useState<any>(null);
  const [hierarchy, setHierarchy] = useState<HierarchyNode[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Charger les données du référentiel
  const fetchFrameworkData = async () => {
    try {
      setLoading(true);
      
      // Charger les infos du référentiel
      const fwResponse = await fetch(`http://localhost:8000/api/v1/frameworks/${frameworkId}`);
      if (!fwResponse.ok) throw new Error('Référentiel introuvable');
      const fwData = await fwResponse.json();
      setFramework(fwData);

      // Charger la hiérarchie
      const hierarchyResponse = await fetch(`http://localhost:8000/api/v1/frameworks/${frameworkId}/hierarchy`);
      if (!hierarchyResponse.ok) throw new Error('Erreur chargement hiérarchie');
      const hierarchyData = await hierarchyResponse.json();
      setHierarchy(hierarchyData.hierarchy || []);

      // Ouvrir les nœuds racines par défaut
      if (hierarchyData.hierarchy && hierarchyData.hierarchy.length > 0) {
        const rootPaths = hierarchyData.hierarchy.map((node: HierarchyNode) => '/' + node.code);
        setExpandedNodes(new Set(rootPaths));
      }

      setLoading(false);
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (frameworkId) {
      fetchFrameworkData();
    }
  }, [frameworkId]);

  const toggleNodeExpansion = (path: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  };

  const handleExport = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/frameworks/${frameworkId}/export?format=xlsx`);
      if (!response.ok) throw new Error('Erreur export');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${framework.code}_export.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erreur export:', error);
      alert('Erreur lors de l\'export');
    }
  };

  const renderHierarchyNode = (node: HierarchyNode, depth: number = 0, parentPath: string = '') => {
    const nodePath = parentPath + '/' + node.code;
    const isExpanded = expandedNodes.has(nodePath);
    const hasChildren = (node.children && node.children.length > 0) || (node.requirements && node.requirements.length > 0);

    // Responsive indentation
    const mobileIndent = depth * 12;
    const desktopIndent = depth * 24;

    return (
      <div key={nodePath} className="mb-2">
        {/* Nœud de domaine */}
        <div
          className={`
            flex items-center p-2 sm:p-3 rounded-lg border transition-all
            ${depth === 0 ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-white border-gray-200'}
            ${hasChildren ? 'cursor-pointer hover:bg-gray-50' : ''}
          `}
          style={{ marginLeft: `${mobileIndent}px` }}
          onClick={() => hasChildren && toggleNodeExpansion(nodePath)}
        >
          {hasChildren && (
            isExpanded ?
              <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2 text-blue-600 flex-shrink-0" /> :
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2 text-gray-400 flex-shrink-0" />
          )}
          {!hasChildren && <div className="w-5 sm:w-7 flex-shrink-0" />}

          <Folder className={`w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 flex-shrink-0 ${depth === 0 ? 'text-blue-600' : 'text-gray-500'}`} />

          <span className={`
            flex-1 min-w-0 truncate
            ${depth === 0 ? 'text-sm sm:text-base font-semibold text-blue-900' : 'text-xs sm:text-sm font-medium text-gray-900'}
          `}>
            {node.title}
          </span>

          {node.code && (
            <span className="hidden sm:inline text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 bg-gray-100 text-gray-600 rounded font-mono ml-2 flex-shrink-0">
              {node.code}
            </span>
          )}

          {node.requirements && node.requirements.length > 0 && (
            <span className="text-[10px] sm:text-xs px-1.5 sm:px-2.5 py-0.5 sm:py-1 bg-green-100 text-green-700 rounded-full font-semibold ml-1.5 sm:ml-3 flex-shrink-0">
              {node.requirements.length} <span className="hidden sm:inline">exigence{node.requirements.length > 1 ? 's' : ''}</span>
            </span>
          )}
        </div>

        {/* Sous-domaines */}
        {isExpanded && node.children && node.children.length > 0 && (
          <div className="mt-1.5 sm:mt-2 ml-2 sm:ml-4">
            {node.children.map(child => renderHierarchyNode(child, depth + 1, nodePath))}
          </div>
        )}

        {/* Exigences */}
        {isExpanded && node.requirements && node.requirements.length > 0 && (
          <div className="mt-1.5 sm:mt-2" style={{ marginLeft: `${mobileIndent + 16}px` }}>
            {node.requirements.map((req: Requirement) => (
              <div
                key={req.id}
                className="p-2.5 sm:p-4 bg-white border border-gray-200 border-l-2 sm:border-l-3 border-l-blue-500 rounded-lg mb-2 shadow-sm"
              >
                {/* Header exigence */}
                <div className="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-3">
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0 mt-0.5" />

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-1">
                      <span className="text-[10px] sm:text-xs font-bold text-blue-600 bg-blue-50 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded font-mono">
                        {req.official_code}
                      </span>

                      {req.niveau_risque && (
                        <span className={`
                          text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded font-semibold uppercase
                          ${req.niveau_risque === 'high' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}
                        `}>
                          {req.niveau_risque}
                        </span>
                      )}

                      {req.obligation_conformite && (
                        <span className="hidden sm:inline text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 rounded font-semibold">
                          {req.obligation_conformite}
                        </span>
                      )}
                    </div>

                    <strong className="text-xs sm:text-sm text-gray-900 block leading-snug line-clamp-2 sm:line-clamp-none">
                      {req.title}
                    </strong>
                  </div>
                </div>

                {/* Description */}
                {req.description && (
                  <p className="text-[11px] sm:text-sm text-gray-600 leading-relaxed mb-2 sm:mb-3 pl-6 sm:pl-8 line-clamp-3 sm:line-clamp-none">
                    {req.description}
                  </p>
                )}

                {/* Tags */}
                {req.tags && req.tags.trim() !== '' && (
                  <div className="flex flex-wrap gap-1 sm:gap-1.5 pl-6 sm:pl-8">
                    <Tag className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
                    {req.tags.split(',').slice(0, 3).map((tag: string, i: number) => (
                      <span
                        key={i}
                        className="text-[10px] sm:text-xs px-1.5 sm:px-2.5 py-0.5 bg-yellow-50 text-yellow-700 rounded font-medium"
                      >
                        {tag.trim()}
                      </span>
                    ))}
                    {req.tags.split(',').length > 3 && (
                      <span className="text-[10px] text-gray-400">+{req.tags.split(',').length - 3}</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Compter les exigences totales
  const countTotalRequirements = () => {
    return hierarchy.reduce((total, node) => {
      const countReqs = (n: HierarchyNode): number => {
        let count = n.requirements ? n.requirements.length : 0;
        if (n.children) {
          count += n.children.reduce((sum, child) => sum + countReqs(child), 0);
        }
        return count;
      };
      return total + countReqs(node);
    }, 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4">
        <div className="text-center">
          <RefreshCw className="w-6 h-6 sm:w-8 sm:h-8 animate-spin mx-auto mb-3 sm:mb-4 text-blue-600" />
          <p className="text-sm sm:text-base text-gray-600">Chargement du référentiel...</p>
        </div>
      </div>
    );
  }

  if (error || !framework) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4">
        <div className="text-center">
          <Database className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 text-red-500" />
          <h2 className="text-lg sm:text-xl font-bold mb-2">Erreur</h2>
          <p className="text-sm sm:text-base text-gray-600 mb-4">{error || 'Référentiel introuvable'}</p>
          <button
            onClick={() => router.push('/admin/referentiels')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100">
      {/* HEADER STICKY */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 md:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
              <button
                onClick={() => router.push('/admin/referentiels')}
                className="p-2 hover:bg-gray-100 rounded-lg transition flex-shrink-0"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <div className="p-2 sm:p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex-shrink-0">
                <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 truncate">
                  {framework.name}
                </h1>
                <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-gray-600 truncate">
                  {framework.code} • v{framework.version} • {framework.publisher || 'N/A'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <button
                onClick={handleExport}
                className="inline-flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Exporter</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Contenu */}
      <main className="flex-1 max-w-[1600px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        {/* Statistiques */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
          <div className="bg-white rounded-xl border border-blue-200 p-3 sm:p-4 md:p-6">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 mb-1 truncate">Domaines racines</p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-blue-600">{hierarchy.length}</p>
              </div>
              <div className="p-2 sm:p-3 rounded-lg bg-blue-100 text-blue-600 flex-shrink-0">
                <Folder className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-green-200 p-3 sm:p-4 md:p-6">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 mb-1 truncate">Exigences totales</p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-green-600">{countTotalRequirements()}</p>
              </div>
              <div className="p-2 sm:p-3 rounded-lg bg-green-100 text-green-600 flex-shrink-0">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-purple-200 p-3 sm:p-4 md:p-6">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 mb-1 truncate">Langue</p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-purple-600">{framework.language?.toUpperCase() || 'FR'}</p>
              </div>
              <div className="p-2 sm:p-3 rounded-lg bg-purple-100 text-purple-600 flex-shrink-0">
                <Tag className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-orange-200 p-3 sm:p-4 md:p-6">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 mb-1 truncate">Date d'import</p>
                <p className="text-sm sm:text-base md:text-lg font-bold text-orange-600">
                  {new Date(framework.import_date).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <div className="p-2 sm:p-3 rounded-lg bg-orange-100 text-orange-600 flex-shrink-0">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
              </div>
            </div>
          </div>
        </div>

        {/* Hiérarchie */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-900">
              Structure hiérarchique
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              Cliquez sur les dossiers pour naviguer dans l'arborescence
            </p>
          </div>

          <div className="p-3 sm:p-4 md:p-6 min-h-[300px] sm:min-h-[400px]">
            {hierarchy.length > 0 ? (
              hierarchy.map(node => renderHierarchyNode(node, 0, ''))
            ) : (
              <div className="text-center py-12 sm:py-16 text-gray-400">
                <Database className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4" />
                <p className="text-sm sm:text-base font-medium">Aucune hiérarchie détectée</p>
                <p className="text-xs sm:text-sm mt-2">
                  Ce référentiel n'a pas de structure hiérarchique définie.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}