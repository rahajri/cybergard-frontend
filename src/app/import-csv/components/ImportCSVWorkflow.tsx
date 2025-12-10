'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Upload, FileText, CheckCircle, AlertCircle, Download,
  Eye, Settings, Plus, Save, X, RefreshCw, ArrowLeft,
  ArrowRight, Check, Info, ChevronRight, ChevronDown, Folder, Database
} from 'lucide-react';
import '@/app/styles/import-referentiels.css';
import ImportResultModal from './ImportResultModal';
import { useRouter } from 'next/navigation';

import * as XLSX from 'xlsx';

// Slugify helper
const slugify = (s: string) =>
  (s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

interface RequirementInfo {
  index: number;
  code: string;
  titre: string;
  description: string;
  tags: string;
  niveau_risque: string;
  obligation: string;
}

interface HierarchyNode {
  id: string;
  level: number;
  code: string;
  title: string;
  children: HierarchyNode[];
  requirements: RequirementInfo[];
}

interface ExcelData {
  headers: string[];
  data: unknown[];
}

interface FrameworkInfo {
  code: string;
  name: string;
  version: string;
  publisher: string;
  language: string;
  description: string;
}

interface ColumnMapping {
  [key: string]: string;
}

const ImportExcelWorkflow = () => {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelData, setExcelData] = useState<ExcelData>({ headers: [], data: [] });
  const [hierarchyTree, setHierarchyTree] = useState<HierarchyNode[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [frameworkInfo, setFrameworkInfo] = useState<FrameworkInfo>({
    code: '',
    name: '',
    version: '1.0',
    publisher: '',
    language: 'fr',
    description: ''
  });
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [importProgress, setImportProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [xlsxLoaded, setXlsxLoaded] = useState(false);
  
  const [importResult, setImportResult] = useState<{
    isOpen: boolean;
    success: boolean;
    frameworkCode: string;
    frameworkName: string;
    stats?: {
      domains_created: number;
      requirements_created: number;
      warnings?: string[];
      errors?: string[];
    };
  } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Charger XLSX uniquement côté client
  useEffect(() => {
    setXlsxLoaded(true);
  }, []);

  const steps = [
    { id: 1, name: 'Upload', title: 'Sélection du fichier', description: 'Téléchargez votre fichier Excel', icon: Upload },
    { id: 2, name: 'Preview', title: 'Aperçu des données', description: 'Vérifiez la structure détectée', icon: Eye },
    { id: 3, name: 'Config', title: 'Configuration', description: 'Informations du référentiel', icon: Settings },
    { id: 4, name: 'Confirmation', title: 'Confirmation', description: 'Lancez l\'import', icon: CheckCircle },
  ];

  const detectHierarchyColumns = (headers: string[]): ColumnMapping => {
    const mapping: ColumnMapping = {};
    
    const patterns: { [key: string]: string[] } = {
      'domaine': ['domaine', 'domain', 'niveau 0', 'niveau0', 'racine', 'root'],
      'domaine_rang1': ['domaine_rang1', 'domainerang1', 'sous-domaine 1', 'sousdomaine1', 'niveau 1', 'niveau1', 'rang1', 'subdomain1'],
      'domaine_rang2': ['domaine_rang2', 'domainerang2', 'sous-domaine 2', 'sousdomaine2', 'niveau 2', 'niveau2', 'rang2', 'subdomain2'],
      'domaine_rang3': ['domaine_rang3', 'domainerang3', 'sous-domaine 3', 'sousdomaine3', 'niveau 3', 'niveau3', 'rang3', 'subdomain3'],
      'domaine_rang4': ['domaine_rang4', 'domainerang4', 'sous-domaine 4', 'sousdomaine4', 'niveau 4', 'niveau4', 'rang4', 'subdomain4'],
      'code_officiel': ['code_officiel', 'codeofficiel', 'code officiel', 'code', 'code exigence', 'official code', 'requirement code', 'ref'],
      'titre': ['titre', 'title', 'nom', 'name', 'libelle', 'libellé', 'intitulé', 'titre exigence', 'requirement title'],
      'description': ['description', 'desc', 'texte', 'text', 'contenu', 'content', 'exigence', 'requirement'],
      'tags': ['tags', 'tag', 'mots-clés', 'keywords', 'domaine audit', 'audit', 'classification', 'category'],
      'niveau_risque': ['niveau_risque', 'niveaurisque', 'niveau risque', 'risk level', 'criticité', 'criticality', 'risque', 'risk'],
      'obligation_conformite': ['obligation_conformite', 'obligation', 'conformité', 'compliance', 'mandatory', 'obligatoire', 'type']
    };

    Object.keys(patterns).forEach(expectedKey => {
      const normalizedHeaders = headers.map(h => 
        h.toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]/g, '')
      );

      const matchIndex = normalizedHeaders.findIndex(normHeader => 
        patterns[expectedKey].some(pattern => {
          const normPattern = pattern
            .toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]/g, '');
          return normHeader === normPattern || normHeader.includes(normPattern) || normPattern.includes(normHeader);
        })
      );

      if (matchIndex !== -1) {
        mapping[expectedKey] = headers[matchIndex];
      }
    });

    return mapping;
  };

  const readExcelFile = async (file: File): Promise<{ headers: string[], data: unknown[] }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
          
          if (jsonData.length === 0) {
            reject(new Error('Fichier Excel vide'));
            return;
          }
          
          const headers = jsonData[0].map((h: unknown) => String(h).trim());
          
          const rows = jsonData.slice(1)
            .filter(row => row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== ''))
            .map(row => {
              const obj: Record<string, unknown> = {};
              headers.forEach((header, index) => {
                obj[header] = row[index] !== undefined && row[index] !== null ? String(row[index]).trim() : '';
              });
              return obj;
            });
          
          resolve({ headers, data: rows });
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Erreur de lecture du fichier'));
      reader.readAsBinaryString(file);
    });
  };

  const buildHierarchyTree = (data: unknown[], mapping: ColumnMapping): HierarchyNode[] => {
    const tree: HierarchyNode[] = [];
    const nodeMap = new Map<string, HierarchyNode>();

    data.forEach((row, index) => {
      const rowData = row as Record<string, unknown>;
      let levelsRaw = [
        rowData[mapping['domaine']] || '',
        rowData[mapping['domaine_rang1']] || '',
        rowData[mapping['domaine_rang2']] || '',
        rowData[mapping['domaine_rang3']] || '',
        rowData[mapping['domaine_rang4']] || ''
      ].map(v => String(v).trim()).filter(v => v !== '');

      if (levelsRaw.length === 0) {
        return;
      }

      const levels: string[] = [];
      for (const t of levelsRaw) {
        if (levels.length === 0 || levels[levels.length - 1].toLowerCase() !== t.toLowerCase()) {
          levels.push(t);
        }
      }

      let parentKey = '';
      let currentLevelArray = tree;

      levels.forEach((title, idx) => {
        const level = idx;
        const sl = slugify(title);
        const key = `${parentKey}>L${level}:${sl}`;
        let node = nodeMap.get(key);

        if (!node) {
          node = {
            id: key,
            level,
            code: sl,
            title,
            children: [],
            requirements: []
          };
          currentLevelArray.push(node);
          nodeMap.set(key, node);
        }

        parentKey = key;
        currentLevelArray = node.children;

        if (idx === levels.length - 1) {
          node.requirements.push({
            index: index + 1,
            code: String(rowData[mapping['code_officiel']] || ''),
            titre: String(rowData[mapping['titre']] || ''),
            description: String(rowData[mapping['description']] || ''),
            tags: String(rowData[mapping['tags']] || ''),
            niveau_risque: String(rowData[mapping['niveau_risque']] || ''),
            obligation: String(rowData[mapping['obligation_conformite']] || '')
          });
        }
      });
    });

    return tree;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    const file = files.find(f => f.name.toLowerCase().endsWith('.xlsx') || f.name.toLowerCase().endsWith('.xls'));
    if (file) handleFileUpload(file);
    else alert('❌ Veuillez sélectionner un fichier Excel (.xlsx ou .xls)');
  };

  const handleFileUpload = async (file: File) => {
    if (!file || !(file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls'))) {
      alert('❌ Veuillez sélectionner un fichier Excel valide');
      return;
    }

    setIsProcessing(true);
    setExcelFile(file);

    try {
      const { headers, data } = await readExcelFile(file);
      
      if (data.length === 0) {
        throw new Error('Aucune donnée détectée dans le fichier');
      }
      
      setExcelData({ headers, data });
      
      const autoMapping = detectHierarchyColumns(headers);
      setColumnMapping(autoMapping);
      
      const tree = buildHierarchyTree(data, autoMapping);
      setHierarchyTree(tree);
      
      setExpandedNodes(new Set(tree.map(node => node.id)));
      
      const fileName = file.name.replace(/\.(xlsx|xls)$/i, '');
      if (!frameworkInfo.name.trim()) {
        // Extraire le code : prendre seulement le premier groupe alphanumérique
        const codeMatch = fileName.match(/^([A-Za-z0-9]+)/);
        const extractedCode = codeMatch ? codeMatch[1].toUpperCase() : fileName.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 20);

        setFrameworkInfo(prev => ({
          ...prev,
          name: fileName,
          code: extractedCode
        }));
      }

      setCurrentStep(2);
    } catch (error: unknown) {
      const err = error as Error;
      alert('❌ Erreur : ' + err.message);
      setExcelFile(null);
      setExcelData({ headers: [], data: [] });
      setHierarchyTree([]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) handleFileUpload(files[0]);
  };

  const toggleNodeExpansion = (id: string) => {
    setExpandedNodes(prev => {
      const ns = new Set(prev);
      ns.has(id) ? ns.delete(id) : ns.add(id);
      return ns;
    });
  };

  const handleImport = async () => {
    console.log('🚀 handleImport appelé');
    console.log('📁 excelFile:', excelFile?.name);
    console.log('📋 frameworkInfo:', frameworkInfo);

    if (!excelFile) {
      alert('❌ Erreur : Aucun fichier sélectionné');
      return;
    }

    if (!frameworkInfo.code || !frameworkInfo.name) {
      alert('❌ Erreur : Code et nom du référentiel requis');
      return;
    }

    setIsProcessing(true);
    setImportProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', excelFile);
      formData.append('framework_info', JSON.stringify(frameworkInfo));

      console.log('📤 Envoi vers API...');
      setImportProgress(25);

      const response = await fetch('http://localhost:8000/api/v1/frameworks/upload-excel', {
        method: 'POST',
        body: formData
      });

      console.log('📥 Réponse API reçue:', response.status);
      setImportProgress(75);

      const result = await response.json();
      console.log('📊 Résultat:', result);

      if (response.ok && result.success) {
        setImportProgress(100);
        console.log('✅ Import réussi');

        setImportResult({
          isOpen: true,
          success: true,
          frameworkCode: frameworkInfo.code,
          frameworkName: frameworkInfo.name,
          stats: {
            domains_created: result.domains_created || 0,
            requirements_created: result.requirements_created || 0,
            warnings: result.warnings || []
          }
        });
      } else {
        throw new Error(result.errors?.join('\n') || result.detail || 'Erreur inconnue');
      }
    } catch (error: unknown) {
      const err = error as Error;
      console.error('❌ Erreur import:', error);
      setImportProgress(0);

      setImportResult({
        isOpen: true,
        success: false,
        frameworkCode: frameworkInfo.code,
        frameworkName: frameworkInfo.name,
        stats: {
          domains_created: 0,
          requirements_created: 0,
          errors: [err.message || 'Une erreur est survenue lors de l\'import']
        }
      });
    } finally {
      setIsProcessing(false);
      console.log('🏁 handleImport terminé');
    }
  };

  const downloadTemplate = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/frameworks/template/excel/download');
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'template_import_referentiel.xlsx';
        a.click();
        URL.revokeObjectURL(url);
      } else {
        alert('❌ Erreur téléchargement template');
      }
    } catch (error: unknown) {
      const err = error as Error;
      alert('❌ Erreur : ' + err.message);
    }
  };

  const nextStep = () => {
    if (currentStep < 4) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const renderHierarchyNode = (node: HierarchyNode, depth: number = 0) => {
    const nodeKey = node.id;
    const isExpanded = expandedNodes.has(nodeKey);
    const hasChildren = (node.children?.length ?? 0) > 0 || (node.requirements?.length ?? 0) > 0;

    // Indentation basée sur la profondeur (utilise une valeur intermédiaire pour mobile)
    const indent = depth * 16; // 16px par niveau (compromis mobile/desktop)

    return (
      <div key={nodeKey} className="mb-1.5 sm:mb-2">
        <div
          className={`
            flex items-center p-2 sm:p-3 rounded-md border transition-all text-xs sm:text-sm
            ${depth === 0 ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-gray-200'}
            ${hasChildren ? 'cursor-pointer hover:bg-gray-50' : ''}
            ${depth === 0 ? 'font-semibold' : 'font-medium'}
          `}
          style={{ marginLeft: `${indent}px` }}
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) toggleNodeExpansion(nodeKey);
          }}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 text-indigo-600 shrink-0" />
            ) : (
              <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 text-gray-400 shrink-0" />
            )
          ) : (
            <div className="w-4 sm:w-6 shrink-0" />
          )}

          <span className={`flex-1 truncate ${depth === 0 ? 'text-indigo-700' : 'text-gray-700'}`}>
            {node.title}
          </span>

          {node.requirements?.length > 0 && (
            <span className="text-xs px-1.5 sm:px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-semibold shrink-0 ml-1 sm:ml-2">
              {node.requirements.length}
              <span className="hidden sm:inline"> exig.</span>
            </span>
          )}
        </div>

        {isExpanded && (node.children?.length ?? 0) > 0 && (
          <div className="mt-1 sm:mt-1.5">
            {node.children.map((child) => renderHierarchyNode(child, depth + 1))}
          </div>
        )}

        {isExpanded && (node.requirements?.length ?? 0) > 0 && (
          <div
            className="mt-1 sm:mt-1.5"
            style={{ marginLeft: `${(depth + 1) * 16}px` }}
          >
            {node.requirements.map((req: RequirementInfo, idx: number) => (
              <div
                key={`${nodeKey}-req-${idx}`}
                className="p-2 sm:p-3 bg-gray-50 border border-gray-200 rounded mb-1 sm:mb-1.5"
              >
                <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-100 px-1.5 sm:px-2 py-0.5 rounded shrink-0">
                    {req.code}
                  </span>
                  <strong className="flex-1 text-xs sm:text-sm text-gray-800 truncate min-w-0">{req.titre}</strong>
                </div>

                <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 sm:line-clamp-3 mb-1 sm:mb-2">
                  {req.description || ''}
                </p>

                {req.tags && String(req.tags).trim() !== '' && (
                  <div className="flex flex-wrap gap-1">
                    {String(req.tags)
                      .split(',')
                      .slice(0, 3)
                      .map((tag: string, i: number) => (
                        <span
                          key={i}
                          className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full"
                        >
                          {tag.trim()}
                        </span>
                      ))}
                    {String(req.tags).split(',').length > 3 && (
                      <span className="text-xs text-gray-400">
                        +{String(req.tags).split(',').length - 3}
                      </span>
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

  if (!xlsxLoaded) {
    return (
      <div className="import-container">
        <div className="text-center py-12">
          <RefreshCw className="w-12 h-12 mx-auto mb-4 import-spinner" style={{color: 'var(--import-primary)'}} />
          <p style={{color: 'var(--import-text)'}}>Chargement du module Excel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">

      {/* 🔥 HEADER STICKY - RESPONSIVE */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-6">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 flex items-center">
                <Upload className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 mr-2 sm:mr-3 text-blue-600" />
                <span className="hidden sm:inline">Import de Référentiel Excel</span>
                <span className="sm:hidden">Import Excel</span>
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-gray-600 hidden sm:block">
                Importez et normalisez vos référentiels de cybersécurité avec hiérarchie complète
              </p>
            </div>
          </div>

          {/* Steps - Version Desktop */}
          <div className="hidden md:flex import-steps">
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                <div className={`import-step ${currentStep === step.id ? 'active' : ''} ${currentStep > step.id ? 'completed' : ''}`}>
                  <div className="import-step-dot">
                    {currentStep > step.id ? <Check className="w-5 h-5" /> : <step.icon className="w-5 h-5" />}
                  </div>
                  <div className="import-step-label">
                    <div className="font-medium">{step.name}</div>
                    <div className="text-xs mt-1">{step.description}</div>
                  </div>
                </div>
                {index < steps.length - 1 && <div className="import-step-connector" />}
              </React.Fragment>
            ))}
          </div>

          {/* Steps - Version Mobile (compact) */}
          <div className="md:hidden">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <React.Fragment key={step.id}>
                  <div className="flex flex-col items-center">
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all
                      ${currentStep === step.id
                        ? 'bg-blue-600 text-white ring-2 ring-blue-300'
                        : currentStep > step.id
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-500'}
                    `}>
                      {currentStep > step.id ? <Check className="w-4 h-4" /> : step.id}
                    </div>
                    <span className={`text-xs mt-1 ${currentStep === step.id ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                      {step.name}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-1 ${currentStep > step.id ? 'bg-green-500' : 'bg-gray-200'}`} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Contenu qui défile - RESPONSIVE */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">

      {/* Contenu */}
      <div className="import-card">
        
        {/* STEP 1: UPLOAD */}
        {currentStep === 1 && (
          <div>
            <div className="import-card-header">
              <h2 className="import-card-title">Sélection du fichier Excel</h2>
              <p className="import-card-subtitle">Téléchargez votre fichier ou utilisez notre template</p>
            </div>
            <div className="import-card-body space-y-4 sm:space-y-6">
              {/* Template section - RESPONSIVE */}
              <div className="import-template p-3 sm:p-4">
                <div className="import-template-title text-sm sm:text-base flex items-center gap-2">
                  <Download className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                  <span>Template Excel de référence</span>
                </div>
                <p className="import-template-text text-xs sm:text-sm mt-2">
                  Téléchargez notre template avec hiérarchie complète (5 niveaux) et exemples.
                </p>
                <button onClick={downloadTemplate} className="import-btn success mt-3 text-xs sm:text-sm w-full sm:w-auto">
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Télécharger le Template</span>
                  <span className="sm:hidden">Template</span>
                </button>
              </div>

              {/* Dropzone - RESPONSIVE */}
              <div
                className={`import-dropzone ${dragOver ? 'dragover' : ''} p-4 sm:p-8`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => !excelFile && fileInputRef.current?.click()}
                style={{ cursor: excelFile ? 'default' : 'pointer' }}
              >
                <Upload className="w-10 h-10 sm:w-16 sm:h-16 mx-auto import-dropzone-icon mb-2 sm:mb-4" />
                <div className="import-dropzone-text text-sm sm:text-base">
                  {excelFile ? (
                    <span className="truncate block max-w-[250px] mx-auto">{excelFile.name}</span>
                  ) : (
                    <>
                      <span className="hidden sm:block">Glissez votre fichier Excel ici</span>
                      <span className="sm:hidden">Appuyez pour sélectionner</span>
                    </>
                  )}
                </div>
                <div className="import-dropzone-subtext text-xs sm:text-sm mt-1 sm:mt-2">
                  <span className="hidden sm:block">Formats acceptés : Excel (.xlsx, .xls) - Max 10 Mo</span>
                  <span className="sm:hidden">.xlsx, .xls - Max 10 Mo</span>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileInputChange}
                  className="import-file-input"
                />
              </div>

              {/* Fichier sélectionné - RESPONSIVE */}
              {excelFile && (
                <div className="import-file-preview">
                  <div className="import-file-info flex items-center gap-2 sm:gap-3 p-2 sm:p-3">
                    <FileText className="w-8 h-8 sm:w-10 sm:h-10 import-file-icon shrink-0" />
                    <div className="import-file-details flex-1 min-w-0">
                      <h4 className="text-sm sm:text-base truncate">{excelFile.name}</h4>
                      <p className="import-file-meta text-xs sm:text-sm">
                        <span className="hidden sm:inline">Excel • </span>
                        {(excelFile.size / 1024).toFixed(2)} KB • {excelData.data.length} lignes
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setExcelFile(null);
                        setExcelData({ headers: [], data: [] });
                        setHierarchyTree([]);
                      }}
                      className="import-btn-icon danger shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
            {/* Actions - RESPONSIVE */}
            <div className="import-actions">
              <button
                onClick={nextStep}
                disabled={!excelFile || isProcessing}
                className="import-btn primary w-full sm:w-auto"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 import-spinner" />
                    <span className="hidden sm:inline">Analyse en cours...</span>
                    <span className="sm:hidden">Analyse...</span>
                  </>
                ) : (
                  <>
                    Continuer <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: PREVIEW */}
        {currentStep === 2 && (
          <div>
            <div className="import-card-header">
              <h2 className="import-card-title">Aperçu des données avec hiérarchie</h2>
              <p className="import-card-subtitle">
                {excelData.data.length} lignes détectées • {hierarchyTree.length} domaine{hierarchyTree.length > 1 ? 's' : ''} racine
              </p>
            </div>
            <div className="import-card-body">

              {/* Statistiques cards - RESPONSIVE */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="p-3 sm:p-4 rounded-lg" style={{
                  background: 'var(--import-primary-light)',
                  border: '1px solid var(--import-primary)'
                }}>
                  <div className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--import-primary)' }}>
                    {excelData.data.length}
                  </div>
                  <div className="text-xs sm:text-sm" style={{ color: 'var(--import-muted)' }}>Exigences totales</div>
                </div>
                <div className="p-3 sm:p-4 rounded-lg" style={{
                  background: 'var(--import-success-light)',
                  border: '1px solid var(--import-success)'
                }}>
                  <div className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--import-success)' }}>
                    {hierarchyTree.length}
                  </div>
                  <div className="text-xs sm:text-sm" style={{ color: 'var(--import-muted)' }}>Domaines racines</div>
                </div>
                <div className="p-3 sm:p-4 rounded-lg" style={{
                  background: 'var(--import-warning-light)',
                  border: '1px solid var(--import-warning)'
                }}>
                  <div className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--import-warning)' }}>
                    {excelData.headers.length}
                  </div>
                  <div className="text-xs sm:text-sm" style={{ color: 'var(--import-muted)' }}>Colonnes détectées</div>
                </div>
              </div>

              {/* Zone hiérarchie - RESPONSIVE */}
              <div className="p-3 sm:p-4 rounded-lg border max-h-[300px] sm:max-h-[400px] lg:max-h-[500px] overflow-y-auto" style={{
                background: 'var(--import-bg)',
                borderColor: 'var(--import-border)'
              }}>
                <h3 className="mb-3 sm:mb-4 text-sm sm:text-base font-semibold" style={{ color: 'var(--import-text)' }}>
                  🔍 Structure hiérarchique détectée
                </h3>
                {hierarchyTree.length > 0 ? (
                  hierarchyTree.map(node => renderHierarchyNode(node, 0))
                ) : (
                  <div className="text-center py-6 sm:py-8" style={{ color: 'var(--import-muted)' }}>
                    <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4" />
                    <p className="text-sm sm:text-base">Aucune hiérarchie détectée</p>
                  </div>
                )}
              </div>
            </div>
            {/* Actions - RESPONSIVE */}
            <div className="import-actions flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button onClick={prevStep} className="import-btn secondary w-full sm:w-auto order-2 sm:order-1">
                <ArrowLeft className="w-4 h-4" /> Retour
              </button>
              <button onClick={nextStep} className="import-btn primary w-full sm:w-auto order-1 sm:order-2">
                Continuer <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: CONFIG - RESPONSIVE */}
        {currentStep === 3 && (
          <div>
            <div className="import-card-header">
              <h2 className="import-card-title text-lg sm:text-xl">Configuration du référentiel</h2>
              <p className="import-card-subtitle text-xs sm:text-sm">Renseignez les métadonnées</p>
            </div>
            <div className="import-card-body">
              <div className="import-form space-y-4 sm:space-y-6">
                {/* Code + Nom - Stack sur mobile */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="import-form-group">
                    <label className="import-form-label text-xs sm:text-sm">Code du référentiel *</label>
                    <input
                      type="text"
                      className="import-form-input text-sm sm:text-base"
                      value={frameworkInfo.code}
                      onChange={(e) => setFrameworkInfo(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                      placeholder="ex: ISO27001"
                    />
                  </div>
                  <div className="import-form-group">
                    <label className="import-form-label text-xs sm:text-sm">Nom du référentiel *</label>
                    <input
                      type="text"
                      className="import-form-input text-sm sm:text-base"
                      value={frameworkInfo.name}
                      onChange={(e) => setFrameworkInfo(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="ex: ISO 27001:2022"
                    />
                  </div>
                </div>
                {/* Version + Éditeur - Stack sur mobile */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="import-form-group">
                    <label className="import-form-label text-xs sm:text-sm">Version</label>
                    <input
                      type="text"
                      className="import-form-input text-sm sm:text-base"
                      value={frameworkInfo.version}
                      onChange={(e) => setFrameworkInfo(prev => ({ ...prev, version: e.target.value }))}
                      placeholder="ex: 2022"
                    />
                  </div>
                  <div className="import-form-group">
                    <label className="import-form-label text-xs sm:text-sm">Éditeur</label>
                    <input
                      type="text"
                      className="import-form-input text-sm sm:text-base"
                      value={frameworkInfo.publisher}
                      onChange={(e) => setFrameworkInfo(prev => ({ ...prev, publisher: e.target.value }))}
                      placeholder="ex: ISO"
                    />
                  </div>
                </div>
                {/* Langue - Demi-largeur sur desktop */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="import-form-group">
                    <label className="import-form-label text-xs sm:text-sm">Langue *</label>
                    <select
                      className="import-form-input text-sm sm:text-base"
                      value={frameworkInfo.language}
                      onChange={(e) => setFrameworkInfo(prev => ({ ...prev, language: e.target.value }))}
                    >
                      <option value="fr">Français (FR)</option>
                      <option value="en">English (EN)</option>
                      <option value="de">Deutsch (DE)</option>
                      <option value="es">Español (ES)</option>
                    </select>
                  </div>
                </div>
                {/* Description - Pleine largeur */}
                <div className="import-form-group">
                  <label className="import-form-label text-xs sm:text-sm">Description</label>
                  <textarea
                    className="import-form-input import-form-textarea text-sm sm:text-base"
                    value={frameworkInfo.description}
                    onChange={(e) => setFrameworkInfo(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Description du référentiel..."
                    rows={3}
                  />
                </div>
              </div>
            </div>
            {/* Actions - RESPONSIVE */}
            <div className="import-actions flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button onClick={prevStep} className="import-btn secondary w-full sm:w-auto order-2 sm:order-1">
                <ArrowLeft className="w-4 h-4" /> Retour
              </button>
              <button onClick={nextStep} disabled={!frameworkInfo.code || !frameworkInfo.name} className="import-btn primary w-full sm:w-auto order-1 sm:order-2">
                Continuer <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: CONFIRMATION - RESPONSIVE */}
        {currentStep === 4 && (
          <div>
            <div className="import-card-header">
              <h2 className="import-card-title text-lg sm:text-xl">Confirmation de l'import</h2>
              <p className="import-card-subtitle text-xs sm:text-sm">
                Vérifiez les informations avant de lancer l'importation
              </p>
            </div>

            <div className="import-card-body">
              {/* Résumé référentiel - RESPONSIVE */}
              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6 border-2 border-indigo-200">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                  <Database className="w-10 h-10 sm:w-12 sm:h-12 text-indigo-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg sm:text-xl font-bold text-indigo-900 truncate">
                      {frameworkInfo.name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1 text-xs sm:text-sm text-indigo-600">
                      <span className="bg-white px-2 sm:px-3 py-1 rounded font-semibold font-mono">
                        {frameworkInfo.code}
                      </span>
                      <span className="hidden sm:inline">•</span>
                      <span>v{frameworkInfo.version}</span>
                      <span className="hidden sm:inline">•</span>
                      <span>{frameworkInfo.language?.toUpperCase()}</span>
                    </div>
                  </div>
                </div>

                {frameworkInfo.description && (
                  <p className="text-xs sm:text-sm text-indigo-800 leading-relaxed bg-white/60 p-2 sm:p-3 rounded-lg">
                    {frameworkInfo.description}
                  </p>
                )}
              </div>

              {/* Statistiques - RESPONSIVE */}
              <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
                <div className="bg-white border-2 border-blue-100 rounded-xl p-3 sm:p-5 text-center">
                  <FileText className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 sm:mb-3 text-blue-500" />
                  <div className="text-xl sm:text-3xl font-bold text-blue-700 leading-none mb-1 sm:mb-2">
                    {excelData.data.length}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-500 font-medium">
                    Exigences
                  </div>
                </div>

                <div className="bg-white border-2 border-green-100 rounded-xl p-3 sm:p-5 text-center">
                  <Folder className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 sm:mb-3 text-green-500" />
                  <div className="text-xl sm:text-3xl font-bold text-green-600 leading-none mb-1 sm:mb-2">
                    {hierarchyTree.length}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-500 font-medium">
                    <span className="hidden sm:inline">Domaines racines</span>
                    <span className="sm:hidden">Domaines</span>
                  </div>
                </div>

                <div className="bg-white border-2 border-amber-100 rounded-xl p-3 sm:p-5 text-center">
                  <Eye className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 sm:mb-3 text-amber-500" />
                  <div className="text-xl sm:text-3xl font-bold text-amber-600 leading-none mb-1 sm:mb-2">
                    {excelData.headers.length}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-500 font-medium">
                    Colonnes
                  </div>
                </div>
              </div>

              {/* Info box - RESPONSIVE */}
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
                <div className="flex gap-2 sm:gap-3">
                  <Info className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs sm:text-sm font-semibold text-indigo-900 mb-1 sm:mb-2">
                      Ce qui va être créé :
                    </h4>
                    <ul className="text-xs sm:text-sm text-indigo-700 space-y-1 list-disc list-inside">
                      <li>Hiérarchie de domaines et sous-domaines</li>
                      <li>Exigences rattachées aux domaines</li>
                      <li>Métadonnées du référentiel</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Fichier source - RESPONSIVE */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs sm:text-sm font-semibold text-gray-700 truncate">
                    {excelFile?.name}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {excelFile && `${(excelFile.size / 1024).toFixed(2)} KB`}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions - RESPONSIVE */}
            <div className="import-actions flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={prevStep}
                disabled={isProcessing}
                className="import-btn secondary w-full sm:w-auto order-2 sm:order-1"
              >
                <ArrowLeft className="w-4 h-4" /> Retour
              </button>

              <button
                onClick={handleImport}
                disabled={!frameworkInfo.code || !frameworkInfo.name || isProcessing}
                className="import-btn success w-full sm:w-auto order-1 sm:order-2 py-3 sm:py-2 text-sm sm:text-base"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 import-spinner" />
                    <span className="hidden sm:inline">Import en cours... {importProgress}%</span>
                    <span className="sm:hidden">{importProgress}%</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 sm:w-5 sm:h-5" />
                    Lancer l'import
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

        {/* Modal de résultat d'import */}
        {importResult && (
          <ImportResultModal
            isOpen={importResult.isOpen}
            success={importResult.success}
            onClose={() => {
              setImportResult(null);
              // Réinitialiser complètement le workflow
              setCurrentStep(1);
              setExcelFile(null);
              setExcelData({ headers: [], data: [] });
              setHierarchyTree([]);
              setFrameworkInfo({
                code: '',
                name: '',
                version: '1.0',
                publisher: '',
                language: 'fr',
                description: ''
              });
              setColumnMapping({});
              setImportProgress(0);
            }}
            onNavigateToList={() => router.push('/admin/referentiels')}
            frameworkCode={importResult.frameworkCode}
            frameworkName={importResult.frameworkName}
            stats={importResult.stats}
          />
        )}
      </div>
    </div>
  );
};

export default ImportExcelWorkflow;