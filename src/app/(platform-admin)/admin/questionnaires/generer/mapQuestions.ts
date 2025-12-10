// Types
interface UploadCondition {
  required_for_values: string[];
  attachment_types: string[];
  min_files: number;
  max_files?: number | null;
  accepts_links: boolean;
  help_text?: string;
  is_mandatory: boolean;
}

interface GeneratedQuestion {
  id: string;
  question_text: string;
  response_type: 'yes_no' | 'single_choice' | 'multi_choice' | 'text' | 'number' | 'date' | 'file' | 'boolean' | 'open' | 'rating';
  is_required: boolean;
  is_mandatory?: boolean;
  upload_conditions?: UploadCondition | null;
  help_text?: string;
  estimated_time_minutes?: number;
  criticality_level: 'low' | 'medium' | 'high' | 'critical';
  rationale?: string;
  options?: string[];
  validation_rules?: Record<string, unknown>;
  related_requirements?: string[];
  requirement_id?: string;
  requirement_details?: Record<string, unknown>;
  ai_confidence?: number;
  // Nouveaux champs métadonnées
  question_code?: string;
  chapter?: string;
  evidence_types?: string[];
  tags?: string[];
}

/** Convertit une question "API/Backend" en GeneratedQuestion (UI) sans perdre les champs. */
export function mapFromApiQuestion(dto: Record<string, unknown>): GeneratedQuestion {
  // 1) Préserver help_text (si présent)
  const helpText: string | undefined =
    typeof dto?.help_text === "string" && dto.help_text.trim().length > 0
      ? dto.help_text.trim()
      : undefined;

  // 2) Unifier le type de réponse
  // backend peut renvoyer: "type" OU "response_type"
  let responseTypeRaw: string = (dto?.response_type || dto?.type || "open") as string;

  // quelques alias fréquents
  if (responseTypeRaw === "yesno") responseTypeRaw = "yes_no";
  if (responseTypeRaw === "bool") responseTypeRaw = "boolean";
  if (responseTypeRaw === "text_open") responseTypeRaw = "open";

  const responseType = responseTypeRaw as GeneratedQuestion["response_type"];

  // 3) is_required / is_mandatory
  const isMandatory = Boolean(dto?.is_mandatory ?? dto?.is_required ?? false);
  const isRequired = Boolean(dto?.is_required ?? dto?.is_mandatory ?? false);

  // 4) upload_conditions : peut arriver en objet… ou en chaîne JSON
  let uploadConditions: UploadCondition | null | undefined = dto?.upload_conditions as UploadCondition | null | undefined;
  if (typeof uploadConditions === "string") {
    try {
      uploadConditions = JSON.parse(uploadConditions) as UploadCondition;
    } catch {
      uploadConditions = null;
    }
  }

  // 5) options : forcer un tableau sur single/multi
  let options: string[] | undefined = Array.isArray(dto?.options)
    ? dto.options
    : undefined;

  if ((responseType === "single_choice" || responseType === "multi_choice") && !options) {
    // garde-fou minimal pour éviter les fallbacks UI
    options = ["Oui", "Non"];
  }

  // 6) criticality_level : borner aux valeurs autorisées (avec défaut "medium")
  let critRaw = (dto?.criticality_level || dto?.difficulty || dto?.criticality || "medium").toString().toLowerCase();

  // ✅ Mapper les valeurs de l'IA (easy/medium/hard) vers les valeurs frontend (low/medium/high)
  const difficultyMapping: Record<string, string> = {
    "easy": "low",
    "hard": "high",
    "medium": "medium",
    "critical": "critical",
    "low": "low",
    "high": "high"
  };

  critRaw = difficultyMapping[critRaw] || "medium";

  const allowedCrit = new Set(["low", "medium", "high", "critical"]);
  const criticality_level: GeneratedQuestion["criticality_level"] =
    (allowedCrit.has(critRaw) ? critRaw : "medium") as GeneratedQuestion["criticality_level"];

  // 7) estimated_time_minutes propre
  const estimated_time_minutes =
    typeof dto?.estimated_time_minutes === "number"
      ? dto.estimated_time_minutes
      : undefined;

  // 8) rationale : on ne fabrique pas un fallback si help_text existe déjà
  const rationale: string | undefined =
    typeof dto?.rationale === "string" && dto.rationale.trim()
      ? dto.rationale.trim()
      : undefined;

  // 9) validation_rules : toujours un objet si absent
  const validation_rules = typeof dto?.validation_rules === "object" && dto.validation_rules !== null
    ? (dto.validation_rules as Record<string, unknown>)
    : ({} as Record<string, unknown>);

  // 10) options: s'assurer que ce sont des strings (au cas où)
  if (Array.isArray(options)) {
    options = options.map(String);
  }

  // 11) Nouveaux champs métadonnées
  const question_code = dto?.question_code ?? undefined;
  const chapter = dto?.chapter ?? undefined;
  const evidence_types = Array.isArray(dto?.evidence_types) ? dto.evidence_types : undefined;
  const tags = Array.isArray(dto?.tags) ? dto.tags : undefined;

  return {
    id: String(dto?.id ?? cryptoRandomId()),
    question_text: String(dto?.question_text ?? dto?.text ?? "").trim(),
    response_type: responseType,
    is_required: isRequired,
    is_mandatory: isMandatory,
    upload_conditions: uploadConditions ?? undefined,
    help_text: helpText,
    estimated_time_minutes,
    criticality_level,
    rationale,
    options,
    validation_rules,
    related_requirements: Array.isArray(dto?.related_requirements) ? dto.related_requirements : undefined,
    requirement_id: (dto?.requirement_id as string | undefined) ?? undefined,
    requirement_details: (dto?.requirement_details as Record<string, unknown> | undefined) ?? undefined,
    ai_confidence: typeof dto?.ai_confidence === "number" ? dto.ai_confidence : undefined,
    question_code: question_code as string | undefined,
    chapter: chapter as string | undefined,
    evidence_types,
    tags,
  };
}

/** petit util local si tu n'as pas déjà un générateur d'ID côté front */
function cryptoRandomId(): string {
  // Navigateur moderne
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    // @ts-ignore
    return crypto.randomUUID();
  }
  // Fallback simple
  return "q_" + Math.random().toString(36).slice(2, 10);
}
