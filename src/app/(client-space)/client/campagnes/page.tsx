'use client';

import '@/app/styles/client-header.css';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getCampaignStatusLabel, getRecurrenceTypeLabel } from '@/utils/labels';
import LaunchCampaignModal from './components/LaunchCampaignModal';
import { ErrorDisplay, getErrorTypeFromMessage, extractPermissionCodeFromMessage } from '@/components/ui/ErrorDisplay';
import { UnauthorizedActionModal } from '@/components/ui/UnauthorizedActionModal';
import { usePermissions } from '@/hooks/usePermissions';
import {
  Target,
  Plus,
  Play,
  Pause,
  CheckCircle,
  Clock,
  AlertTriangle,
  Eye,
  FileText,
  Calendar,
  BarChart3,
  Users,
  RefreshCw,
  Edit,
  Trash2
} from 'lucide-react';

interface Campaign {
  id: string;
  title: string;
  description: string;
  questionnaire_id: string;
  questionnaire_name: string;
  status: 'draft' | 'ongoing' | 'late' | 'frozen' | 'completed' | 'cancelled';
  recurrence_type: 'once' | 'monthly' | 'quarterly' | 'yearly' | null;
  launch_date: string | null;
  due_date: string | null;
  frozen_date: string | null;
  questions_total: number;
  questions_answered: number;
  progress: number;
  created_at: string;
  updated_at: string;
  auditor_ids?: string[];
  entity_ids?: string[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function CampagnesPage() {
  const router = useRouter();
  const { hasPermission } = usePermissions();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [launchingId, setLaunchingId] = useState<string | null>(null);
  const [showLaunchModal, setShowLaunchModal] = useState(false);
  const [campaignToLaunch, setCampaignToLaunch] = useState<Campaign | null>(null);
  const [contactsToInvite, setContactsToInvite] = useState<number>(0);

  // État pour le modal d'action non autorisée
  const [unauthorizedModal, setUnauthorizedModal] = useState<{
    isOpen: boolean;
    actionName: string;
    permissionCode: string;
  }>({ isOpen: false, actionName: '', permissionCode: '' });

  useEffect(() => {
    fetchCampaigns();
  }, []);

  // Fonction pour vérifier une permission et exécuter une action ou afficher le modal
  const checkPermissionAndExecute = (
    permissionCode: string,
    actionName: string,
    action: () => void
  ) => {
    if (hasPermission(permissionCode)) {
      action();
    } else {
      setUnauthorizedModal({
        isOpen: true,
        actionName,
        permissionCode,
      });
    }
  };

  // Handler pour créer une nouvelle campagne
  const handleNewCampaign = () => {
    checkPermissionAndExecute(
      'CAMPAIGN_CREATE',
      'créer une nouvelle campagne',
      () => router.push('/client/campagnes/generer')
    );
  };

  // Handler pour modifier une campagne
  const handleEditCampaign = (campaignId: string) => {
    checkPermissionAndExecute(
      'CAMPAIGN_UPDATE',
      'modifier cette campagne',
      () => router.push(`/client/campagnes/generer?id=${campaignId}`)
    );
  };

  const fetchCampaigns = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/v1/campaigns`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setCampaigns(data.items || data || []);
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error fetching campaigns:', err);
      setError(error.message || 'Erreur lors du chargement des campagnes');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenLaunchModal = async (campaign: Campaign) => {
    // Vérifier la permission avant d'ouvrir le modal
    if (!hasPermission('CAMPAIGN_CREATE')) {
      setUnauthorizedModal({
        isOpen: true,
        actionName: 'lancer cette campagne',
        permissionCode: 'CAMPAIGN_CREATE',
      });
      return;
    }

    setCampaignToLaunch(campaign);

    // Récupérer le nombre de contacts à inviter depuis le backend
    try {
      const response = await fetch(`${API_BASE}/api/v1/campaigns/${campaign.id}/contacts-count`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setContactsToInvite(data.count || 0);
        console.log(`📊 ${data.count} contact(s) seront invités au lancement`);
      } else {
        console.error('Erreur récupération contacts count');
        setContactsToInvite(0);
      }
    } catch (err) {
      console.error('Erreur:', err);
      setContactsToInvite(0);
    }

    setShowLaunchModal(true);
  };

  const handleCloseLaunchModal = () => {
    setShowLaunchModal(false);
    setCampaignToLaunch(null);
    setContactsToInvite(0);
  };

  const handleConfirmLaunch = async () => {
    if (!campaignToLaunch) return;

    setLaunchingId(campaignToLaunch.id);
    try {
      const response = await fetch(`${API_BASE}/api/v1/campaigns/${campaignToLaunch.id}/launch`, {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Erreur lors du lancement de la campagne');
      }

      const updatedCampaign = await response.json();

      // Mettre à jour la campagne dans la liste
      setCampaigns(prev => prev.map(c => c.id === campaignToLaunch.id ? updatedCampaign : c));

      // Fermer la modal
      handleCloseLaunchModal();

    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error launching campaign:', err);
      alert(`❌ Erreur lors du lancement :\n${error.message}`);
    } finally {
      setLaunchingId(null);
    }
  };

  const getStatusBadge = (status: Campaign['status']) => {
    const badges = {
      draft: <span className="px-3 py-1 bg-gray-100 text-gray-800 text-sm rounded-full flex items-center"><FileText className="w-3 h-3 mr-1" />{getCampaignStatusLabel('draft')}</span>,
      ongoing: <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full flex items-center"><Play className="w-3 h-3 mr-1" />{getCampaignStatusLabel('ongoing')}</span>,
      late: <span className="px-3 py-1 bg-orange-100 text-orange-800 text-sm rounded-full flex items-center"><AlertTriangle className="w-3 h-3 mr-1" />{getCampaignStatusLabel('late')}</span>,
      frozen: <span className="px-3 py-1 bg-purple-100 text-purple-800 text-sm rounded-full flex items-center"><Pause className="w-3 h-3 mr-1" />{getCampaignStatusLabel('frozen')}</span>,
      completed: <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full flex items-center"><CheckCircle className="w-3 h-3 mr-1" />{getCampaignStatusLabel('completed')}</span>,
      cancelled: <span className="px-3 py-1 bg-red-100 text-red-800 text-sm rounded-full flex items-center"><Clock className="w-3 h-3 mr-1" />{getCampaignStatusLabel('cancelled')}</span>
    };
    return badges[status];
  };

  const getStatusColor = (status: Campaign['status']) => {
    const colors = {
      draft: 'bg-gray-50 border-gray-200',
      ongoing: 'bg-green-50 border-green-200',
      late: 'bg-orange-50 border-orange-200',
      frozen: 'bg-purple-50 border-purple-200',
      completed: 'bg-emerald-50 border-emerald-200',
      cancelled: 'bg-red-50 border-red-200'
    };
    return colors[status];
  };

  // Récurrence labels maintenant gérés via utils/labels.ts

  const stats = {
    total: campaigns.length,
    ongoing: campaigns.filter(c => c.status === 'ongoing').length,
    completed: campaigns.filter(c => c.status === 'completed').length,
    late: campaigns.filter(c => c.status === 'late').length,
    averageProgress: campaigns.length > 0
      ? Math.round(campaigns.reduce((sum, c) => sum + c.progress, 0) / campaigns.length)
      : 0
  };

  if (loading) {
    return (
      <div className="min-h-screen px-8 pt-2 pb-8 client flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-purple-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Chargement des campagnes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col client" data-section="campagnes">
        {/* Header Sticky même en cas d'erreur */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-[1600px] mx-auto px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                  <Target className="w-8 h-8 mr-3 text-purple-600" />
                  Campagnes d'Audit
                </h1>
                <p className="mt-1 text-sm text-gray-600">
                  Gérez vos campagnes d'audit avec récurrence automatique
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Contenu erreur */}
        <div className="flex-1">
          <ErrorDisplay
            type={getErrorTypeFromMessage(error)}
            customMessage={error}
            onRetry={fetchCampaigns}
            showBack={false}
            showHome={true}
            permissionCode={extractPermissionCodeFromMessage(error)}
            actionName="Gestion des Campagnes"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col client" data-section="campagnes">
      {/* Header Sticky - Pattern GUIDE_HEADER_STICKY */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Target className="w-8 h-8 mr-3 text-purple-600" />
                Campagnes d'Audit
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Gérez vos campagnes d'audit avec récurrence automatique
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={fetchCampaigns}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Actualiser
              </button>
              <button
                onClick={handleNewCampaign}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center shadow-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nouvelle Campagne
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content Container */}
      <div className="flex-1 max-w-[1600px] mx-auto w-full px-8 py-8">

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-sm text-gray-600">Campagnes</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <Target className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">En Cours</p>
              <p className="text-2xl font-bold text-gray-900">{stats.ongoing}</p>
              <p className="text-sm text-blue-600">Actives</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <Play className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Terminées</p>
              <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
              <p className="text-sm text-green-600">Complètes</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Progression Moyenne</p>
              <p className="text-2xl font-bold text-gray-900">{stats.averageProgress}%</p>
              <p className="text-sm text-gray-600">Toutes campagnes</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <BarChart3 className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Liste des campagnes */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-6 flex items-center">
          <Target className="w-5 h-5 mr-2" />
          Campagnes d'Audit ({campaigns.length})
        </h2>

        {campaigns.length > 0 ? (
          <div className="space-y-4">
            {campaigns.map((campaign) => (
              <div
                key={campaign.id}
                className={`border rounded-lg p-6 ${getStatusColor(campaign.status)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">{campaign.title}</h3>
                      {getStatusBadge(campaign.status)}
                    </div>

                    {campaign.description && (
                      <p className="text-sm text-gray-600 mb-3">{campaign.description}</p>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <FileText className="w-4 h-4 mr-2" />
                        {campaign.questionnaire_name || 'Questionnaire non défini'}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="w-4 h-4 mr-2" />
                        {campaign.launch_date ? `Démarré le ${new Date(campaign.launch_date).toLocaleDateString('fr-FR')}` : 'Pas encore lancée'}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Clock className="w-4 h-4 mr-2" />
                        Récurrence: {getRecurrenceTypeLabel(campaign.recurrence_type)}
                      </div>
                      <div className="flex items-center text-sm text-gray-600 group relative">
                        <Target className="w-4 h-4 mr-2" />
                        <span className="font-medium">{campaign.progress}% complété</span>

                        {/* Tooltip au survol */}
                        <div className="invisible group-hover:visible absolute left-0 top-full mt-2 w-64 bg-gray-900 text-white text-xs rounded-lg p-3 z-10 shadow-xl">
                          <div className="font-semibold mb-2 text-gray-100">Détails de progression</div>
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <span className="text-gray-300">Questions répondues :</span>
                              <span className="font-medium text-white">{campaign.questions_answered}/{campaign.questions_total}</span>
                            </div>
                            {campaign.entity_ids && (
                              <div className="flex justify-between">
                                <span className="text-gray-300">Entités concernées :</span>
                                <span className="font-medium text-white">{campaign.entity_ids.length}</span>
                              </div>
                            )}
                          </div>
                          {/* Petite flèche */}
                          <div className="absolute left-4 -top-1 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                        </div>
                      </div>
                    </div>

                    {/* Progress bar */}
                    {campaign.questions_total > 0 && (
                      <div className="mb-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-gray-700">Progression</span>
                          <span className="text-sm text-gray-600">{campaign.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              campaign.progress === 100 ? 'bg-green-600' :
                              campaign.progress >= 50 ? 'bg-purple-600' : 'bg-orange-600'
                            }`}
                            style={{ width: `${campaign.progress}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex space-x-2 ml-4">
                    <Link
                      href={`/client/campagnes/${campaign.id}`}
                      className="p-2 text-gray-600 hover:text-blue-600 border border-gray-300 rounded-lg hover:bg-blue-50"
                      title="Voir les détails"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>

                    {campaign.status === 'draft' && (
                      <>
                        <button
                          onClick={() => handleEditCampaign(campaign.id)}
                          className="p-2 text-gray-600 hover:text-blue-600 border border-gray-300 rounded-lg hover:bg-blue-50 inline-flex items-center"
                          title="Modifier la campagne"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => checkPermissionAndExecute(
                            'CAMPAIGN_DELETE',
                            'supprimer cette campagne',
                            () => console.log('Delete campaign', campaign.id)
                          )}
                          className="p-2 text-gray-600 hover:text-red-600 border border-gray-300 rounded-lg hover:bg-red-50"
                          title="Supprimer la campagne"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleOpenLaunchModal(campaign)}
                          disabled={launchingId === campaign.id}
                          className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {launchingId === campaign.id ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              Lancement...
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4" />
                              Lancer
                            </>
                          )}
                        </button>
                      </>
                    )}

                    {campaign.status === 'ongoing' && (
                      <button className="px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm flex items-center gap-2">
                        <Pause className="w-4 h-4" />
                      </button>
                    )}

                    {campaign.status === 'completed' && (
                      <button className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm">
                        Rapport
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 px-6">
            {/* Icône illustrative */}
            <div className="inline-flex items-center justify-center w-20 h-20 bg-purple-50 rounded-full mb-6">
              <Target className="w-10 h-10 text-purple-400" />
            </div>

            {/* Titre principal */}
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              🎯 Aucune campagne d'évaluation n'a encore été créée
            </h3>

            {/* Description */}
            <p className="text-base text-gray-600 mb-6 max-w-2xl mx-auto">
              Lancez votre première campagne pour planifier et suivre vos évaluations d'organismes.
            </p>

            {/* Liste des bénéfices */}
            <div className="bg-gray-50 rounded-lg p-6 mb-8 max-w-xl mx-auto text-left">
              <p className="font-semibold text-gray-900 mb-4 text-center">
                👉 Créez une campagne pour :
              </p>
              <ul className="space-y-3">
                <li className="flex items-start text-gray-700">
                  <CheckCircle className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                  <span>Sélectionner vos organismes évalués</span>
                </li>
                <li className="flex items-start text-gray-700">
                  <CheckCircle className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                  <span>Choisir un questionnaire et des auditeurs</span>
                </li>
                <li className="flex items-start text-gray-700">
                  <CheckCircle className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                  <span>Suivre la conformité et générer vos rapports</span>
                </li>
              </ul>
            </div>

            {/* Bouton d'action principal */}
            <button
              onClick={handleNewCampaign}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-base font-semibold shadow-lg hover:shadow-xl inline-flex items-center"
            >
              <Plus className="w-5 h-5 mr-2" />
              Nouvelle Campagne
            </button>

            {/* Aide supplémentaire */}
            <p className="text-sm text-gray-500 mt-6">
              Besoin d'aide ? Consultez la{' '}
              <a href="#" className="text-purple-600 hover:text-purple-700 underline">
                documentation
              </a>
            </p>
          </div>
        )}
      </div>

      {/* Actions en bas */}
      {campaigns.length > 0 && (
        <div className="mt-6 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            {stats.ongoing} campagnes en cours • {stats.completed} terminées • {stats.late} en retard
          </div>

          <div className="flex space-x-3">
            <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center">
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </button>
            <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center">
              <Calendar className="w-4 h-4 mr-2" />
              Planifier
            </button>
          </div>
        </div>
      )}
      </div> {/* End Content Container */}

      {/* Launch Campaign Modal */}
      <LaunchCampaignModal
        isOpen={showLaunchModal}
        onClose={handleCloseLaunchModal}
        onConfirm={handleConfirmLaunch}
        campaignTitle={campaignToLaunch?.title || ''}
        contactsCount={contactsToInvite}
        questionnaireName={campaignToLaunch?.questionnaire_name}
      />

      {/* Modal pour action non autorisée */}
      <UnauthorizedActionModal
        isOpen={unauthorizedModal.isOpen}
        onClose={() => setUnauthorizedModal({ ...unauthorizedModal, isOpen: false })}
        actionName={unauthorizedModal.actionName}
        permissionCode={unauthorizedModal.permissionCode}
      />
    </div>
  );
}
