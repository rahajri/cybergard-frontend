"use client";

import { useState, useEffect } from 'react';
import { X, Share2, CheckCircle2, XCircle, Users } from 'lucide-react';
import { toast } from 'sonner';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Organization {
  id: string;
  name: string;
  tenant_id: string;
  tenant_name: string;
  is_active: boolean;
  activated_at?: string;
}

interface Questionnaire {
  id: string;
  name: string;
  status: string;
}

interface ShareQuestionnaireModalProps {
  questionnaire: Questionnaire | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ShareQuestionnaireModal({
  questionnaire,
  onClose,
  onSuccess
}: ShareQuestionnaireModalProps) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgs, setSelectedOrgs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!questionnaire) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [questionnaire, onClose]);

  useEffect(() => {
    if (questionnaire) {
      fetchOrganizationsWithStatus();
    }
  }, [questionnaire]);

  const fetchOrganizationsWithStatus = async () => {
    if (!questionnaire) return;

    setLoading(true);
    try {
      // Fetch all organizations
      const orgsResponse = await fetch(`${API_BASE}/api/v1/admin/organizations`, {
        credentials: 'include'
      });

      if (!orgsResponse.ok) {
        const errorText = await orgsResponse.text();
        console.error('Organizations fetch error:', orgsResponse.status, errorText);
        throw new Error(`Erreur ${orgsResponse.status}: ${errorText}`);
      }

      const orgsData = await orgsResponse.json();
      console.log('Fetched organizations:', orgsData);

      // The endpoint returns { items: [...], total: N }
      const allOrgs = orgsData.items || orgsData.organizations || orgsData;

      // Fetch organizations that have activated this questionnaire
      const activationsResponse = await fetch(
        `${API_BASE}/api/v1/admin/questionnaires/${questionnaire.id}/organizations?active_only=false`,
        {
          credentials: 'include'
        }
      );

      const activatedOrgs = activationsResponse.ok ? await activationsResponse.json() : [];

      // Create a map of activated organizations
      const activationMap = new Map<string, Organization>(
        activatedOrgs.map((org: Organization) => [org.id, org])
      );

      // Merge data
      const mergedOrgs = allOrgs.map((org: unknown) => {
        const o = org as Record<string, unknown>;
        const activation = activationMap.get(o.id as string);
        return {
          id: o.id as string,
          name: o.name as string,
          tenant_id: o.tenant_id as string,
          // Use short tenant ID for now - backend doesn't include tenant name
          tenant_name: o.tenant_id ? `Tenant ${String(o.tenant_id).substring(0, 8)}...` : 'N/A',
          is_active: activation?.is_active || false,
          activated_at: activation?.activated_at
        };
      });

      setOrganizations(mergedOrgs);
    } catch (error) {
      console.error('Error fetching organizations:', error);
      toast.error('Erreur lors du chargement des organizations');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedOrgs.size === organizations.length) {
      setSelectedOrgs(new Set());
    } else {
      setSelectedOrgs(new Set(organizations.map(org => org.id)));
    }
  };

  const handleSelectOrg = (orgId: string) => {
    const newSelected = new Set(selectedOrgs);
    if (newSelected.has(orgId)) {
      newSelected.delete(orgId);
    } else {
      newSelected.add(orgId);
    }
    setSelectedOrgs(newSelected);
  };

  const handleBulkActivate = async () => {
    if (!questionnaire || selectedOrgs.size === 0) return;

    if (questionnaire.status !== 'published') {
      toast.error('Le questionnaire doit être publié pour être partagé');
      return;
    }

    setProcessing(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      const promises = Array.from(selectedOrgs).map(async (orgId) => {
        try {
          const response = await fetch(
            `${API_BASE}/api/v1/admin/questionnaires/organizations/${orgId}/questionnaires/${questionnaire.id}/activate`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              credentials: 'include',
              body: JSON.stringify({
                inherit_to_children: true
              })
            }
          );

          if (response.ok) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (error) {
          errorCount++;
        }
      });

      await Promise.all(promises);

      if (successCount > 0) {
        toast.success(`${successCount} organization(s) activée(s) avec succès`);
      }
      if (errorCount > 0) {
        toast.error(`${errorCount} erreur(s) lors de l'activation`);
      }

      // Refresh the list
      await fetchOrganizationsWithStatus();
      setSelectedOrgs(new Set());
      onSuccess();
    } catch (error) {
      console.error('Error during bulk activation:', error);
      toast.error('Erreur lors de l\'activation en masse');
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkDeactivate = async () => {
    if (!questionnaire || selectedOrgs.size === 0) return;

    setProcessing(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      const promises = Array.from(selectedOrgs).map(async (orgId) => {
        try {
          const response = await fetch(
            `${API_BASE}/api/v1/admin/questionnaires/organizations/${orgId}/questionnaires/${questionnaire.id}/deactivate`,
            {
              method: 'DELETE',
              credentials: 'include'
            }
          );

          if (response.ok || response.status === 204) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (error) {
          errorCount++;
        }
      });

      await Promise.all(promises);

      if (successCount > 0) {
        toast.success(`${successCount} organization(s) désactivée(s) avec succès`);
      }
      if (errorCount > 0) {
        toast.error(`${errorCount} erreur(s) lors de la désactivation`);
      }

      // Refresh the list
      await fetchOrganizationsWithStatus();
      setSelectedOrgs(new Set());
      onSuccess();
    } catch (error) {
      console.error('Error during bulk deactivation:', error);
      toast.error('Erreur lors de la désactivation en masse');
    } finally {
      setProcessing(false);
    }
  };

  if (!questionnaire) return null;

  const isPublished = questionnaire.status === 'published';
  const activeCount = organizations.filter(org => org.is_active).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Share2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">
                  Partager le questionnaire
                </h2>
                <p className="text-white/90 font-medium mb-1">{questionnaire.name}</p>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      isPublished
                        ? 'bg-green-500/20 text-green-100'
                        : 'bg-yellow-500/20 text-yellow-100'
                    }`}
                  >
                    {questionnaire.status}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/20 text-white">
                    {activeCount} organisation{activeCount > 1 ? 's' : ''} active{activeCount > 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              disabled={processing}
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Warning if not published */}
        {!isPublished && (
          <div className="mx-6 mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Attention :</strong> Ce questionnaire doit être publié avant de pouvoir être partagé avec des organizations.
            </p>
          </div>
        )}

        {/* Body - scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
          ) : organizations.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">Aucune organization trouvée</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Selection summary */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedOrgs.size === organizations.length}
                      onChange={handleSelectAll}
                      className="w-5 h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                      disabled={!isPublished || processing}
                    />
                    <span className="font-medium text-gray-700">
                      Tout sélectionner
                    </span>
                  </label>
                  {selectedOrgs.size > 0 && (
                    <span className="text-sm text-gray-600">
                      {selectedOrgs.size} sélectionnée{selectedOrgs.size > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>

              {/* Organizations list */}
              <div className="space-y-2">
                {organizations.map((org) => (
                  <div
                    key={org.id}
                    className={`flex items-center justify-between p-4 border-2 rounded-lg transition-all ${
                      selectedOrgs.has(org.id)
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <input
                        type="checkbox"
                        checked={selectedOrgs.has(org.id)}
                        onChange={() => handleSelectOrg(org.id)}
                        className="w-5 h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                        disabled={!isPublished || processing}
                      />
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">
                          {org.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          Tenant: {org.tenant_name}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {org.is_active ? (
                        <span className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                          <CheckCircle2 className="w-4 h-4" />
                          Active
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm font-medium">
                          <XCircle className="w-4 h-4" />
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer - sticky */}
        <div className="border-t bg-gray-50 p-6">
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={onClose}
              className="px-6 py-2.5 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              disabled={processing}
            >
              Annuler
            </button>
            <div className="flex gap-3">
              <button
                onClick={handleBulkDeactivate}
                disabled={!isPublished || selectedOrgs.size === 0 || processing}
                className="px-6 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                <XCircle className="w-5 h-5" />
                Désactiver la sélection
              </button>
              <button
                onClick={handleBulkActivate}
                disabled={!isPublished || selectedOrgs.size === 0 || processing}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-lg"
              >
                <CheckCircle2 className="w-5 h-5" />
                {processing ? 'Traitement...' : 'Activer la sélection'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
