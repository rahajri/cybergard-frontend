// utils/mappings.ts
export const QUESTION_TYPE_LABELS: Record<string, string> = {
  yes_no: "Oui/Non",
  text: "Texte libre",
  select_one: "Menu déroulant (1 choix)",
  select_many: "Cases à cocher (plusieurs choix)",
  number: "Nombre",
  date: "Date",
  file: "Fichier",
  json: "JSON",
  single_choice: "Choix unique",
  multiple_choice: "Choix multiple"
};

export const QUESTION_MANDATORY_LABELS: Record<string, string> = {
  true: "Obligatoire",
  false: "Optionnel"
};
