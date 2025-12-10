# Composants de Notifications

Ce dossier contient les composants réutilisables pour gérer les notifications dans l'application.

## NotificationBell

Composant de cloche de notification qui affiche les mentions non lues.

### Fonctionnalités

- **Badge en temps réel**: Affiche le nombre de mentions non lues avec mise à jour automatique toutes les 30 secondes
- **Panneau de notifications**: Liste déroulante avec détails complets (auteur, question, commentaire)
- **Navigation intelligente**: Clic sur une notification redirige vers la question avec focus sur le commentaire
- **Marquage automatique**: Les notifications sont marquées comme lues au clic
- **Format adaptatif**: Compteur "9+" si plus de 9 notifications

### Utilisation

```tsx
import { NotificationBell } from '@/components/notifications';

function MyComponent() {
  return (
    <div className="header">
      <NotificationBell />
    </div>
  );
}
```

### API Backend

Le composant utilise les endpoints suivants:

- `GET /api/v1/collaboration/mentions/unread` - Récupère les mentions non lues
- `PATCH /api/v1/collaboration/mentions/{id}/read` - Marque une mention comme lue

### Données retournées

```typescript
interface MentionNotification {
  id: string;
  comment_id: string;
  comment_content: string;
  comment_created_at: string;
  author_first_name: string;
  author_last_name: string;
  question_id: string;
  question_text: string;
  question_order: number;
  audit_id: string;
  created_at: string;
}
```

### Prochaines étapes

- Ajouter des notifications pour les tâches assignées
- Support des notifications push/websockets
- Son de notification optionnel
- Filtres par type de notification
