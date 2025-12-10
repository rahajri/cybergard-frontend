# Route Group (preview)

Ce groupe de routes est utilisé pour la prévisualisation des questionnaires sans le layout d'administration.

## Structure

```
(preview)/
├── layout.tsx                          # Layout vide (pas de menu admin)
└── preview/
    └── questionnaires/
        └── [id]/
            └── page.tsx                # Page de prévisualisation
```

## Pourquoi un groupe séparé ?

La page de prévisualisation affiche le questionnaire **exactement comme un audité le verrait**, avec :
- Le menu latéral de navigation des domaines
- La progression
- Les questions

Si cette page était dans le groupe `(platform-admin)`, elle hériterait du layout admin avec le menu de navigation principal, ce qui créerait un double menu et une interface confuse.

## Accès

- URL : `/preview/questionnaires/{id}`
- Ouverte dans un nouvel onglet depuis la liste des questionnaires (bouton 👁️)
- Mode lecture seule (pas de sauvegarde des réponses)

## Sécurité

Cette route devrait être protégée et accessible uniquement aux administrateurs de la plateforme.
