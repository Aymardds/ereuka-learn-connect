/**
 * school-types.ts — Gestion dynamique des types d'établissement
 * Permet d'isoler strictement l'affichage et les fonctionnalités selon que
 * l'établissement est un Groupe Scolaire (Maternelle, Primaire, Secondaire)
 * ou un Établissement d'Enseignement Supérieur (Université, Grande École, LMD).
 */

export type SchoolLevel = 'Maternelle' | 'Primaire' | 'Secondaire' | 'Supérieur';

export interface EstablishmentTypeInfo {
  /** Liste des niveaux dispensés (ex: ['Maternelle', 'Primaire', 'Secondaire'] ou ['Supérieur']) */
  schoolTypes: string[];
  
  /** L'établissement a-t-il l'enseignement supérieur (Université / LMD) ? */
  hasSuperieur: boolean;
  
  /** L'établissement a-t-il l'enseignement scolaire (Maternelle, Primaire ou Secondaire) ? */
  hasK12: boolean;
  
  /** L'établissement est-il EXCLUSIVEMENT une université / enseignement supérieur ? */
  isUniversityOnly: boolean;
  
  /** L'établissement est-il EXCLUSIVEMENT un groupe scolaire (aucun cycle universitaire) ? */
  isK12Only: boolean;
  
  /** L'établissement est-il mixte (propose à la fois du scolaire et du supérieur) ? */
  isMixed: boolean;
  
  /** Catégorie principale */
  category: 'groupe_scolaire' | 'universite' | 'mixte';
  
  /** Libellé lisible pour les badges et en-têtes */
  badgeLabel: string;
  
  /** Description synthétique des niveaux */
  levelsSummary: string;
  
  /** Vocabulaire adapté : Élève vs Étudiant */
  studentTerm: string;
  studentsTerm: string;
  studentCapitalized: string;
  studentsCapitalized: string;
  
  /** Vocabulaire adapté : Classe vs Filière / Promotion */
  classTerm: string;
  classesTerm: string;
  classCapitalized: string;
  classesCapitalized: string;
  
  /** Évaluations : Bulletins trimestriels vs Relevés & Délibérations LMD */
  evaluationsTerm: string;
  
  /** Autorisation d'accès au module LMD */
  canAccessLMD: boolean;
  
  /** Autorisation d'accès au Cahier de texte scolaire */
  canAccessCahierDeTexte: boolean;
  
  /** Autorisation d'accès au Portail Parent (primaire/secondaire) */
  showParentPortal: boolean;
}

export function getEstablishmentTypeInfo(schoolTypesRaw?: string[] | null): EstablishmentTypeInfo {
  // Par défaut, si aucun type n'est configuré, considérer un Groupe Scolaire général (Primaire)
  const schoolTypes = Array.isArray(schoolTypesRaw) && schoolTypesRaw.length > 0
    ? schoolTypesRaw
    : ['Primaire'];

  const hasSuperieur = schoolTypes.includes('Supérieur');
  const hasK12 = schoolTypes.some(t => ['Maternelle', 'Primaire', 'Secondaire'].includes(t));

  const isUniversityOnly = hasSuperieur && !hasK12;
  const isK12Only = hasK12 && !hasSuperieur;
  const isMixed = hasSuperieur && hasK12;

  let category: 'groupe_scolaire' | 'universite' | 'mixte' = 'groupe_scolaire';
  let badgeLabel = '🏫 Groupe Scolaire';
  let levelsSummary = schoolTypes.join(' • ');

  if (isUniversityOnly) {
    category = 'universite';
    badgeLabel = '🎓 Enseignement Supérieur (Université / LMD)';
    levelsSummary = 'Licence • Master • Doctorat';
  } else if (isMixed) {
    category = 'mixte';
    badgeLabel = '🏛️ Établissement Mixte (Scolaire & Supérieur)';
    levelsSummary = `${schoolTypes.filter(t => t !== 'Supérieur').join(' • ')} + Université LMD`;
  } else {
    category = 'groupe_scolaire';
    badgeLabel = `🏫 Groupe Scolaire (${schoolTypes.join(', ')})`;
    levelsSummary = schoolTypes.join(' • ');
  }

  return {
    schoolTypes,
    hasSuperieur,
    hasK12,
    isUniversityOnly,
    isK12Only,
    isMixed,
    category,
    badgeLabel,
    levelsSummary,
    
    // Vocabulaire
    studentTerm: isUniversityOnly ? 'étudiant' : (isMixed ? 'élève / étudiant' : 'élève'),
    studentsTerm: isUniversityOnly ? 'étudiants' : (isMixed ? 'élèves & étudiants' : 'élèves'),
    studentCapitalized: isUniversityOnly ? 'Étudiant' : (isMixed ? 'Élève / Étudiant' : 'Élève'),
    studentsCapitalized: isUniversityOnly ? 'Étudiants' : (isMixed ? 'Élèves & Étudiants' : 'Élèves'),
    
    classTerm: isUniversityOnly ? 'filière / promotion' : 'classe',
    classesTerm: isUniversityOnly ? 'filières & promotions' : 'classes',
    classCapitalized: isUniversityOnly ? 'Filière / Promotion' : 'Classe',
    classesCapitalized: isUniversityOnly ? 'Filières & Promotions' : 'Classes',
    
    evaluationsTerm: isUniversityOnly ? 'Relevés LMD & Délibérations' : 'Bulletins & Moyennes',
    
    // Règles d'accès fonctionnelles
    canAccessLMD: hasSuperieur,
    canAccessCahierDeTexte: hasK12,
    showParentPortal: hasK12 || isMixed,
  };
}
