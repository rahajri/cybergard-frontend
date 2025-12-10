# Composant CrossReferentialCoverage

## 📊 Description

Affiche la couverture cross-référentielle d'une campagne d'audit.

Pour une campagne basée sur un framework (ex: ISO 27001), ce composant montre le pourcentage de couverture des autres frameworks (ISO 27002, PSSI, etc.) via les Control Points partagés.

## 🎯 Utilisation

### Import

```tsx
import { CrossReferentialCoverage } from '@/components/campaigns/CrossReferentialCoverage';
```

### Props

```typescript
interface CrossReferentialCoverageProps {
  campaignId: string;  // UUID de la campagne
}
```

### Exemple d'intégration

```tsx
// Dans la page de détail de campagne (ex: admin/campaigns/[id]/page.tsx)

export default function CampaignDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className="space-y-6">
      {/* Autres sections... */}

      {/* Onglet Actions */}
      <TabsContent value="actions">
        <div className="space-y-6">
          {/* Autres éléments de l'onglet Actions... */}

          {/* Couverture Cross-Référentielle */}
          <CrossReferentialCoverage campaignId={params.id} />
        </div>
      </TabsContent>
    </div>
  );
}
```

## 🎨 Design

### États

1. **Chargement** : Affiche un spinner
2. **Erreur** : Affiche un message d'erreur
3. **Aucune couverture** : Message informatif
4. **Couverture disponible** : Affiche les statistiques et barres de progression

### Sections

#### 1. Statistiques Globales

```
┌─────────────────────────────────────────────┐
│ 📊 Couverture Cross-Référentielle          │
├─────────────────────────────────────────────┤
│                                             │
│  Framework de base    Requirements    CPs  │
│  ISO 27001-2022            12          30   │
│                                             │
└─────────────────────────────────────────────┘
```

#### 2. Couverture par Framework

```
┌──────────────────────────────┐  ┌──────────────────────────────┐
│ ISO 27002-2022         12.9% │  │ PSSI                   11.1% │
│ ▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░ │  │ ▓▓░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ 12 / 93 requirements couverts│  │ 11 / 99 requirements couverts│
└──────────────────────────────┘  └──────────────────────────────┘
```

### Couleurs de Badge et Progress

| Pourcentage | Couleur Badge | Couleur Barre | Signification |
|-------------|---------------|---------------|---------------|
| ≥ 15%       | default       | green         | Excellente couverture |
| 10-15%      | secondary     | blue          | Bonne couverture |
| 5-10%       | outline       | orange        | Couverture moyenne |
| < 5%        | outline       | red           | Couverture faible |

## 🔧 API Backend

### Endpoint

**GET** `/api/v1/campaigns/{campaign_id}/cross-referential-coverage`

**Authentification** : Bearer Token (Keycloak)

### Réponse

```typescript
interface CrossReferentialData {
  campaign_id: string;
  campaign_title: string;
  base_framework_code: string | null;
  base_framework_name: string | null;
  total_requirements_in_campaign: number;
  total_control_points: number;
  frameworks_coverage: Array<{
    framework_code: string;
    framework_name: string;
    requirements_covered: number;
    total_requirements: number;
    coverage_percentage: number;
  }>;
}
```

### Exemple de Réponse

```json
{
  "campaign_id": "dcdb2976-1b43-4fda-8816-f71058b63ae5",
  "campaign_title": "ISO 27001",
  "base_framework_code": "27001",
  "base_framework_name": "27001-2022",
  "total_requirements_in_campaign": 12,
  "total_control_points": 30,
  "frameworks_coverage": [
    {
      "framework_code": "27002",
      "framework_name": "27002-2022",
      "requirements_covered": 12,
      "total_requirements": 93,
      "coverage_percentage": 12.9
    },
    {
      "framework_code": "PSSI",
      "framework_name": "PSSI",
      "requirements_covered": 11,
      "total_requirements": 99,
      "coverage_percentage": 11.1
    }
  ]
}
```

## 💡 Détails Techniques

### Gestion du Token

Le composant utilise `localStorage.getItem('access_token')` pour récupérer le token Keycloak.

**Important** : Assurez-vous que le token est bien stocké dans le localStorage après l'authentification.

### Cas d'Usage

#### Cas 1 : Campagne avec questionnaire partiel

Si un auditeur crée un mini-questionnaire avec seulement **12 requirements** sur les **116 du framework ISO 27001**, la couverture est calculée uniquement sur ces 12 requirements.

```
Framework ISO 27001 complet    : 116 requirements
Questionnaire de la campagne   : 12 requirements (10.3%)
                                   ↓
Couverture calculée sur 12 requirements uniquement
```

#### Cas 2 : Aucun Control Point

Si le questionnaire n'a aucune question liée à des Control Points, le composant affiche un message informatif.

#### Cas 3 : Aucune couverture cross-référentielle

Si les Control Points de la campagne ne sont liés à aucun autre framework, le message "Aucune couverture cross-référentielle détectée" s'affiche.

### Performance

- **Chargement initial** : ~200-300ms (sans cache)
- **Recommandation** : Ajouter un cache Redis côté backend (TTL 30 minutes)

## 📱 Responsive

Le composant est responsive et s'adapte aux différentes tailles d'écran :

- **Mobile** : Cards empilés verticalement (1 colonne)
- **Tablet** : 2 colonnes
- **Desktop** : 2 colonnes avec espacement optimisé

## 🧪 Tests

### Test avec navigateur

1. Ouvrir une page de campagne
2. Vérifier que le composant charge correctement
3. Vérifier les barres de progression
4. Tester le responsive

### Test des cas limites

```tsx
// Cas 1 : Aucune couverture
// frameworks_coverage: []

// Cas 2 : Couverture très faible
// coverage_percentage: 2.5

// Cas 3 : Couverture excellente
// coverage_percentage: 85.0
```

## 🎯 Exemple Complet d'Intégration

```tsx
// app/(platform-admin)/admin/campaigns/[id]/page.tsx

"use client";

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CrossReferentialCoverage } from '@/components/campaigns/CrossReferentialCoverage';

export default function CampaignDetailPage({ params }: { params: { id: string } }) {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Détail Campagne</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Aperçu</TabsTrigger>
          <TabsTrigger value="progress">Progression</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
          <TabsTrigger value="scope">Périmètre</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="actions" className="space-y-6 mt-6">
          {/* Section 1 : Couverture Cross-Référentielle */}
          <CrossReferentialCoverage campaignId={params.id} />

          {/* Section 2 : Plan d'action publié */}
          {/* ... autres sections ... */}
        </TabsContent>

        {/* Autres onglets... */}
      </Tabs>
    </div>
  );
}
```

## 📖 Documentation Complémentaire

- Backend : [documentations/features/CROSS_REFERENTIAL_KPIS.md](../../documentations/features/CROSS_REFERENTIAL_KPIS.md)
- API Endpoint : [backend/src/api/v1/campaigns.py](../../backend/src/api/v1/campaigns.py) (lignes 2007-2163)
- Schémas : [backend/src/schemas/campaign.py](../../backend/src/schemas/campaign.py) (lignes 195-223)

---

**✅ Composant prêt à l'emploi**

Pour toute question ou amélioration, consulter la documentation backend ou contacter l'équipe de développement.
