'use client';

import React from 'react';
import { Building2, ArrowLeft } from 'lucide-react';

export default function EntitiesListPage() {
  return (
    <div className="min-h-screen p-8">
      <div className="mb-6">
        <button 
          onClick={() => window.location.href = '/client/administration'}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour à l'écosystème
        </button>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
          <Building2 className="w-8 h-8 mr-3" />
          Liste des Entités
        </h1>
        <p className="text-gray-600">
          Vue détaillée de toutes les entités de votre écosystème
        </p>
      </div>
      
      <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
        <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Liste détaillée à venir</h3>
        <p className="text-gray-500">
          Cette page affichera la liste détaillée de toutes les entités avec options de tri et filtrage avancé.
        </p>
      </div>
    </div>
  );
}