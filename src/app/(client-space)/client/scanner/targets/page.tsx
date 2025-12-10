'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Radar,
  Plus,
  RefreshCw,
  Globe,
  Server,
  Shield,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Clock,
  Play,
  Eye,
  Trash2,
  Edit,
  Search,
  Filter,
  MoreVertical,
  ArrowLeft,
  Activity,
  Calendar,
  Target,
  Building2
} from 'lucide-react';
import { ConfirmModal, ModalType } from '@/components/ui/ConfirmModal';
import { ErrorDisplay, getErrorTypeFromMessage, extractPermissionCodeFromMessage } from '@/components/ui/ErrorDisplay';
import AddTargetModal from '../components/AddTargetModal';

// Types
interface ExternalTarget {
  id: string;
  tenant_id: string;
  type: 'DOMAIN' | 'SUBDOMAIN' | 'IP' | 'IP_RANGE' | 'EMAIL_DOMAIN';
  value: string;
  label: string | null;
  description: string | null;
  scan_frequency: 'MANUAL' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
  is_active: boolean;
  last_scan_at: string | null;
  last_scan_status: 'NEVER' | 'SUCCESS' | 'ERROR';
  last_exposure_score: number | null;
  entity_id: string | null;
  entity_name: string | null;
  created_at: string;
  updated_at: string | null;
}

interface TargetListResponse {
  items: ExternalTarget[];
  total: number;
  limit: number;
  offset: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function TargetsListPage() {
  const router = useRouter();
  const [targets, setTargets] = useState<ExternalTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [targetToDelete, setTargetToDelete] = useState<ExternalTarget | null>(null);
  const [scanningTargetId, setScanningTargetId] = useState<string | null>(null);
  const [modalResult, setModalResult] = useState<{ type: ModalType; message: string } | null>(null);

  useEffect(() => {
    fetchTargets();
  }, [searchQuery, typeFilter, statusFilter]);

  const fetchTargets = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (typeFilter) params.append('type', typeFilter);
      if (statusFilter === 'active') params.append('is_active', 'true');
      if (statusFilter === 'inactive') params.append('is_active', 'false');
      params.append('limit', '50');

      const response = await fetch(`${API_BASE}/api/v1/external-scanner/targets?${params}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const data: TargetListResponse = await response.json();
      setTargets(data.items);
      setTotal(data.total);
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error fetching targets:', err);
      setError(error.message || 'Erreur lors du chargement des cibles');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleAddTarget = async (targetData: {
    type: string;
    value: string;
    label?: string;
    description?: string;
    scan_frequency: string;
    entity_id?: string;
  }) => {
    try {
      const response = await fetch(`${API_BASE}/api/v1/external-scanner/targets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(targetData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Erreur lors de la création');
      }

      setShowAddModal(false);
      setModalResult({ type: 'success', message: 'Cible créée avec succès !' });
      fetchTargets();
    } catch (err: unknown) {
      const error = err as Error;
      setModalResult({ type: 'error', message: error.message });
    }
  };

  const handleDeleteTarget = async () => {
    if (!targetToDelete) return;

    try {
      const response = await fetch(`${API_BASE}/api/v1/external-scanner/targets/${targetToDelete.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression');
      }

      setTargetToDelete(null);
      setModalResult({ type: 'success', message: 'Cible supprimée avec succès' });
      fetchTargets();
    } catch (err: unknown) {
      const error = err as Error;
      setModalResult({ type: 'error', message: error.message });
    }
  };

  const handleLaunchScan = async (target: ExternalTarget) => {
    setScanningTargetId(target.id);
    try {
      const response = await fetch(`${API_BASE}/api/v1/external-scanner/targets/${target.id}/scan`, {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Erreur lors du lancement du scan');
      }

      const data = await response.json();
      setModalResult({
        type: 'success',
        message: `Scan lancé pour ${target.value}. ID: ${data.scan_id.slice(0, 8)}...`
      });

      // Rediriger vers le détail du scan
      router.push(`/client/scanner/scans/${data.scan_id}`);
    } catch (err: unknown) {
      const error = err as Error;
      setModalResult({ type: 'error', message: error.message });
    } finally {
      setScanningTargetId(null);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'DOMAIN':
        return <Globe className="w-5 h-5" />;
      case 'SUBDOMAIN':
        return <Globe className="w-5 h-5" />;
      case 'IP':
        return <Server className="w-5 h-5" />;
      case 'IP_RANGE':
        return <Server className="w-5 h-5" />;
      default:
        return <Target className="w-5 h-5" />;
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      DOMAIN: 'Domaine',
      SUBDOMAIN: 'Sous-domaine',
      IP: 'IP',
      IP_RANGE: 'Plage IP',
      EMAIL_DOMAIN: 'Domaine Email'
    };
    return labels[type] || type;
  };

  const getStatusBadge = (target: ExternalTarget) => {
    if (target.last_scan_status === 'NEVER') {
      return (
        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full flex items-center">
          <Clock className="w-3 h-3 mr-1" />
          Jamais scanné
        </span>
      );
    }
    if (target.last_scan_status === 'SUCCESS') {
      return (
        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full flex items-center">
          <CheckCircle className="w-3 h-3 mr-1" />
          Succès
        </span>
      );
    }
    return (
      <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full flex items-center">
        <AlertCircle className="w-3 h-3 mr-1" />
        Erreur
      </span>
    );
  };

  const getScoreColor = (score: number | null) => {
    if (score === null) return 'text-gray-400';
    if (score >= 70) return 'text-red-600';
    if (score >= 40) return 'text-orange-500';
    if (score >= 20) return 'text-yellow-500';
    return 'text-green-600';
  };

  const getScoreBg = (score: number | null) => {
    if (score === null) return 'bg-gray-100';
    if (score >= 70) return 'bg-red-50';
    if (score >= 40) return 'bg-orange-50';
    if (score >= 20) return 'bg-yellow-50';
    return 'bg-green-50';
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Jamais';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFrequencyLabel = (freq: string) => {
    const labels: Record<string, string> = {
      MANUAL: 'Manuel',
      DAILY: 'Quotidien',
      WEEKLY: 'Hebdomadaire',
      MONTHLY: 'Mensuel'
    };
    return labels[freq] || freq;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center client">
        <div className="text-center">
          <Radar className="w-12 h-12 text-cyan-600 animate-pulse mx-auto mb-4" />
          <p className="text-gray-600">Chargement des cibles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col client" data-section="scanner-targets">
      {/* Header Sticky */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link
                href="/client/scanner"
                className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                  <Globe className="w-8 h-8 mr-3 text-cyan-600" />
                  Cibles Externes
                </h1>
                <p className="mt-1 text-sm text-gray-600">
                  Gérez vos domaines, IPs et sous-domaines à scanner
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={fetchTargets}
                disabled={refreshing}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Actualiser
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors flex items-center shadow-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nouvelle Cible
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-6 flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher une cible..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
              />
            </div>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 bg-white"
            >
              <option value="">Tous les types</option>
              <option value="DOMAIN">Domaine</option>
              <option value="SUBDOMAIN">Sous-domaine</option>
              <option value="IP">IP</option>
              <option value="IP_RANGE">Plage IP</option>
              <option value="EMAIL_DOMAIN">Domaine Email</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 bg-white"
            >
              <option value="">Tous les statuts</option>
              <option value="active">Actif</option>
              <option value="inactive">Inactif</option>
            </select>

            {/* Results count */}
            <span className="text-sm text-gray-500">
              {total} cible{total > 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-[1600px] mx-auto w-full px-8 py-8">
        {error ? (
          <ErrorDisplay
            type={getErrorTypeFromMessage(error)}
            customMessage={error}
            onRetry={fetchTargets}
            showBack={true}
            showHome={true}
            permissionCode={extractPermissionCodeFromMessage(error)}
            actionName="Gestion des Cibles Scanner"
          />
        ) : targets.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-cyan-50 rounded-full mb-6">
              <Globe className="w-10 h-10 text-cyan-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              Aucune cible configurée
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Ajoutez vos premiers domaines, adresses IP ou sous-domaines pour commencer à analyser votre surface d'attaque externe.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-3 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors font-semibold inline-flex items-center"
            >
              <Plus className="w-5 h-5 mr-2" />
              Ajouter une cible
            </button>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cible
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Organisme
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dernier Scan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fréquence
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {targets.map((target) => (
                  <tr key={target.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getScoreBg(target.last_exposure_score)} mr-3`}>
                          {getTypeIcon(target.type)}
                        </div>
                        <div>
                          <Link
                            href={`/client/scanner/targets/${target.id}`}
                            className="font-medium text-gray-900 hover:text-cyan-600"
                          >
                            {target.value}
                          </Link>
                          {target.label && (
                            <p className="text-xs text-gray-500">{target.label}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                        {getTypeLabel(target.type)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {target.entity_name ? (
                        <div className="flex items-center text-sm">
                          <Building2 className="w-4 h-4 text-cyan-500 mr-2" />
                          <span className="text-gray-700">{target.entity_name}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xl font-bold ${getScoreColor(target.last_exposure_score)}`}>
                        {target.last_exposure_score !== null ? target.last_exposure_score : '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(target.last_scan_at)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">
                        {getFrequencyLabel(target.scan_frequency)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(target)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleLaunchScan(target)}
                          disabled={scanningTargetId === target.id || !target.is_active}
                          className="p-2 text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Lancer un scan"
                        >
                          {scanningTargetId === target.id ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </button>
                        <Link
                          href={`/client/scanner/targets/${target.id}`}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Voir les détails"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => setTargetToDelete(target)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Target Modal */}
      <AddTargetModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddTarget}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!targetToDelete}
        onClose={() => setTargetToDelete(null)}
        onConfirm={handleDeleteTarget}
        title="Supprimer la cible"
        message={`Êtes-vous sûr de vouloir supprimer la cible "${targetToDelete?.value}" ? Cette action supprimera également l'historique des scans associés.`}
        type="confirm"
        confirmText="Supprimer"
        confirmButtonColor="red"
      />

      {/* Result Modal */}
      {modalResult && (
        <ConfirmModal
          isOpen={true}
          onClose={() => setModalResult(null)}
          title={modalResult.type === 'success' ? 'Succès' : 'Erreur'}
          message={modalResult.message}
          type={modalResult.type}
        />
      )}
    </div>
  );
}
