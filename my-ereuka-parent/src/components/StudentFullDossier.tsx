import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Share,
  Linking,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Brand, Radius, Shadows, Spacing } from '@/constants/theme';

export interface StudentDossierData {
  id: string;
  first_name: string;
  last_name: string;
  matricule: string;
  birth_date: string;
  birth_place: string;
  gender: 'M' | 'F';
  nationality: string;
  class_name: string;
  academic_year: string;
  status: 'active' | 'pending';
  // Filiation & Family
  father_name: string;
  father_profession: string;
  mother_name: string;
  mother_profession: string;
  guardian_name: string;
  guardian_phone: string;
  guardian_email: string;
  home_address: string;
  // Health
  blood_group: 'O+' | 'O-' | 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-';
  allergies: string;
  medical_conditions: string;
  doctor_name: string;
  doctor_phone: string;
  emergency_contact: string;
  eps_aptitude: 'Apte' | 'Inapte partiel' | 'Inapte';
  vaccines_status: 'À jour' | 'En attente rappel';
  // Cantine
  cantine_subscribed: boolean;
  cantine_plan: string;
  cantine_diet: string;
  cantine_balance: number;
  cantine_status: 'paid' | 'partial' | 'pending';
  // Transport
  transport_subscribed: boolean;
  transport_line: string;
  transport_stop: string;
  transport_driver: string;
  transport_phone: string;
  transport_vehicle: string;
  transport_status: 'paid' | 'partial' | 'pending';
  // Photo
  photo_url?: string;
  // Grades & Bulletin summary
  overall_avg: number;
  class_rank: string;
  grades: {
    subject: string;
    coef: number;
    grade: number;
    max: number;
    class_avg: number;
    comment: string;
  }[];
}

interface Props {
  student: StudentDossierData;
  onClose?: () => void;
  accentColor?: string;
}

type DossierSection = 'carte' | 'bulletin' | 'fiche' | 'attestation' | 'sante' | 'services';

export function StudentFullDossier({
  student,
  onClose,
  accentColor = Brand.violet,
}: Props) {
  const [activeSection, setActiveSection] = useState<DossierSection>('carte');
  const [cardFlipped, setCardFlipped] = useState(false);

  const fullName = `${student.first_name} ${student.last_name}`;
  const initials = `${student.first_name[0] || 'E'}${student.last_name[0] || 'R'}`;

  // Direct phone call
  const handleCallParent = () => {
    const clean = student.guardian_phone.replace(/\s+/g, '');
    Linking.openURL(`tel:${clean}`).catch(() => {
      Alert.alert('Erreur', 'Impossible de passer l\'appel.');
    });
  };

  // WhatsApp
  const handleWhatsApp = () => {
    const clean = student.guardian_phone.replace(/[^\d+]/g, '');
    const text = encodeURIComponent(`Bonjour M./Mme ${student.last_name}, concernant le dossier scolaire de votre enfant ${fullName}.`);
    Linking.openURL(`https://wa.me/${clean}?text=${text}`).catch(() => {
      Alert.alert('Erreur', 'Impossible d\'ouvrir WhatsApp.');
    });
  };

  // Share certificate
  const handleShareAttestation = async () => {
    try {
      await Share.share({
        message: `📜 ATTESTATION OFFICIELLE DE SCOLARITÉ • EURÊKA ERP\n\n` +
          `Nous certifions que l'élève ${fullName}\n` +
          `Né(e) le : ${student.birth_date} à ${student.birth_place}\n` +
          `Matricule : ${student.matricule}\n` +
          `Est régulièrement inscrit(e) en classe de : ${student.class_name}\n` +
          `Pour l'année académique : ${student.academic_year}\n\n` +
          `Délivré par la Direction des Études le ${new Date().toLocaleDateString('fr-FR')}.\n` +
          `Référence : EUR-CERT-${student.matricule}-2026\n` +
          `Document certifié avec cachet numérique officiel.`,
      });
    } catch (e) {
      console.log(e);
    }
  };

  // Share Bulletin
  const handleShareBulletin = async () => {
    try {
      await Share.share({
        message: `📊 BULLETIN TRIMESTRIEL • EURÊKA ERP\n\n` +
          `Élève : ${fullName} (${student.class_name})\n` +
          `Matricule : ${student.matricule} • Année : ${student.academic_year}\n` +
          `Moyenne Générale : ${student.overall_avg.toFixed(2)}/20\n` +
          `Rang dans la classe : ${student.class_rank}\n` +
          `Mention : ${student.overall_avg >= 16 ? 'Très Bien' : student.overall_avg >= 14 ? 'Bien' : 'Assez Bien'}\n\n` +
          `Avis du Conseil : Félicitations du Conseil de Classe.\n` +
          `Certifié conforme par Eurêka School Management.`,
      });
    } catch (e) {
      console.log(e);
    }
  };

  return (
    <View style={styles.container}>
      {/* ── Top Header Bar ── */}
      <View style={[styles.headerBar, { backgroundColor: accentColor }]}>
        <View style={styles.headerTitleBox}>
          <Text style={styles.headerSubtitle}>Dossier de l'Élève</Text>
          <Text style={styles.headerMainTitle} numberOfLines={1}>{fullName}</Text>
          <Text style={styles.headerMetaClass}>
            {student.class_name} • {student.matricule}
          </Text>
        </View>

        {onClose && (
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Contact & Action Pill Bar ── */}
      <View style={styles.contactBar}>
        <TouchableOpacity style={[styles.contactPill, { backgroundColor: '#EFF6FF' }]} onPress={handleCallParent}>
          <Ionicons name="call" size={14} color={Brand.blue} />
          <Text style={[styles.contactPillTxt, { color: Brand.blue }]}>Appeler Parent</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.contactPill, { backgroundColor: '#ECFDF5' }]} onPress={handleWhatsApp}>
          <Ionicons name="logo-whatsapp" size={14} color="#059669" />
          <Text style={[styles.contactPillTxt, { color: '#059669' }]}>WhatsApp</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.contactPill, { backgroundColor: '#F5F3FF' }]} onPress={handleShareAttestation}>
          <Ionicons name="share-outline" size={14} color="#7C3AED" />
          <Text style={[styles.contactPillTxt, { color: '#7C3AED' }]}>Exporter</Text>
        </TouchableOpacity>
      </View>

      {/* ── Horizontal Section Selector Tabs (6 sections) ── */}
      <View style={styles.tabsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {[
            { id: 'carte' as const, label: '🪪 Carte Élève', icon: 'card-outline' },
            { id: 'bulletin' as const, label: '📑 Bulletin', icon: 'document-text-outline' },
            { id: 'fiche' as const, label: '👤 Fiche Info', icon: 'person-outline' },
            { id: 'attestation' as const, label: '📜 Attestation', icon: 'ribbon-outline' },
            { id: 'sante' as const, label: '🩺 Santé', icon: 'medkit-outline' },
            { id: 'services' as const, label: '🍽️🚌 Services', icon: 'bus-outline' },
          ].map(tab => {
            const isTabActive = activeSection === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.tabChip,
                  isTabActive && { backgroundColor: accentColor, borderColor: accentColor },
                ]}
                onPress={() => setActiveSection(tab.id)}
              >
                <Text style={[styles.tabChipTxt, isTabActive && styles.tabChipTxtActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.contentScroll} showsVerticalScrollIndicator={false}>
        {/* ════════════════════════════════════════════════════════════
            1. CARTE D'ÉLÈVE / ÉTUDIANT (ID CARD)
        ════════════════════════════════════════════════════════════ */}
        {activeSection === 'carte' && (
          <View style={styles.sectionWrap}>
            <View style={styles.cardFlipHeader}>
              <Text style={styles.sectionHeading}>Carte Numérique Officielle</Text>
              <TouchableOpacity
                style={styles.flipBtn}
                onPress={() => setCardFlipped(!cardFlipped)}
              >
                <Ionicons name="sync-outline" size={15} color={accentColor} />
                <Text style={[styles.flipBtnTxt, { color: accentColor }]}>
                  {cardFlipped ? 'Voir Recto' : 'Voir Verso'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* The Badge Card */}
            {!cardFlipped ? (
              // ── RECTO ──
              <View style={[styles.idCardRecto, Shadows.lg]}>
                {/* Header ribbon */}
                <View style={styles.idCardTopRibbon}>
                  <View style={styles.idCardLogo}>
                    <Text style={styles.idCardLogoTxt}>E</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.idCardSchoolName}>EURÊKA ÉTABLISSEMENT</Text>
                    <Text style={styles.idCardSchoolSub}>CARTE SCOLAIRE & ÉTUDIANTE • {student.academic_year}</Text>
                  </View>
                  <View style={styles.idCardBadgeType}>
                    <Text style={styles.idCardBadgeTypeTxt}>OFFICIEL</Text>
                  </View>
                </View>

                {/* Body with Photo + Data */}
                <View style={styles.idCardBody}>
                  <View style={styles.idCardPhotoCircle}>
                    {student.photo_url ? (
                      <Image
                        source={{ uri: student.photo_url }}
                        style={styles.idCardPhotoImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <Text style={styles.idCardPhotoInitials}>{initials}</Text>
                    )}
                  </View>

                  <View style={styles.idCardMetaCol}>
                    <Text style={styles.idCardName}>{fullName}</Text>
                    <Text style={styles.idCardClass}>CLASSE : {student.class_name}</Text>
                    <Text style={styles.idCardMatricule}>MATRICULE : {student.matricule}</Text>
                    <Text style={styles.idCardDate}>NÉ(E) LE : {student.birth_date}</Text>

                    {/* Services micro badges */}
                    <View style={styles.idCardServicesRow}>
                      {student.cantine_subscribed && (
                        <View style={[styles.idCardServiceBadge, { backgroundColor: '#ECFDF5' }]}>
                          <Text style={{ fontSize: 9, color: '#059669', fontWeight: '800' }}>🍽️ CANTINE</Text>
                        </View>
                      )}
                      {student.transport_subscribed && (
                        <View style={[styles.idCardServiceBadge, { backgroundColor: '#EFF6FF' }]}>
                          <Text style={{ fontSize: 9, color: '#2563EB', fontWeight: '800' }}>🚌 TRANSPORT</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                {/* Barcode / QR Code strip */}
                <View style={styles.idCardBarcodeStrip}>
                  <View style={styles.idCardBarcodeLines}>
                    {[4, 2, 6, 3, 5, 2, 7, 3, 6, 2, 4, 3, 7, 2, 5, 3, 6, 2].map((w, idx) => (
                      <View key={idx} style={[styles.barcodeLine, { width: w }]} />
                    ))}
                  </View>
                  <Text style={styles.idCardBarcodeVal}>{student.matricule} • CERTIFIÉ</Text>
                </View>
              </View>
            ) : (
              // ── VERSO ──
              <View style={[styles.idCardVerso, Shadows.lg]}>
                <Text style={styles.idCardVersoTitle}>CONDITIONS GÉNÉRALES & SÉCURITÉ</Text>
                <Text style={styles.idCardVersoText}>
                  Cette carte est strictement personnelle et obligatoire pour l'accès aux cours, à la restauration scolaire et au bus de ramassage.
                </Text>

                <View style={styles.idCardVersoGrid}>
                  <View style={styles.idCardVersoItem}>
                    <Text style={styles.idCardVersoLabel}>GROUPE SANGUIN</Text>
                    <Text style={styles.idCardVersoValBold}>{student.blood_group}</Text>
                  </View>
                  <View style={styles.idCardVersoItem}>
                    <Text style={styles.idCardVersoLabel}>URGENCE TUTEUR</Text>
                    <Text style={styles.idCardVersoVal}>{student.guardian_phone}</Text>
                  </View>
                </View>

                <View style={styles.idCardSignatureBox}>
                  <View>
                    <Text style={styles.idCardSignLabel}>Le Titulaire</Text>
                    <Text style={styles.idCardSignPlaceholder}>{student.first_name}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.idCardSignLabel}>Le Chef d'Établissement</Text>
                    <View style={styles.idCardSealCircle}>
                      <Text style={{ fontSize: 8, color: '#1E3A8A', fontWeight: '900' }}>SCEAU</Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            <TouchableOpacity style={styles.cardDownloadBtn} onPress={handleShareAttestation}>
              <Ionicons name="download-outline" size={16} color="#FFFFFF" />
              <Text style={styles.cardDownloadBtnTxt}>Partager / Sauvegarder la Carte</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ════════════════════════════════════════════════════════════
            2. BULLETIN DE NOTES OFFICIEL
        ════════════════════════════════════════════════════════════ */}
        {activeSection === 'bulletin' && (
          <View style={styles.sectionWrap}>
            <View style={[styles.bulletinHeaderCard, Shadows.md]}>
              <View style={styles.bulletinHeaderTop}>
                <View>
                  <Text style={styles.bulletinSchoolName}>EURÊKA ACADÉMIE</Text>
                  <Text style={styles.bulletinDocTitle}>BULLETIN SCOLAIRE OFFICIEL</Text>
                  <Text style={styles.bulletinPeriod}>1er Trimestre • Année {student.academic_year}</Text>
                </View>
                <View style={styles.bulletinAvgBox}>
                  <Text style={styles.bulletinAvgLabel}>MOYENNE</Text>
                  <Text style={[styles.bulletinAvgValue, { color: accentColor }]}>
                    {student.overall_avg.toFixed(2)}
                  </Text>
                  <Text style={styles.bulletinAvgMax}>/20</Text>
                </View>
              </View>

              <View style={styles.bulletinDivider} />

              <View style={styles.bulletinMetaRow}>
                <Text style={styles.bulletinMetaItem}>Élève : <Text style={{ fontWeight: '800' }}>{fullName}</Text></Text>
                <Text style={styles.bulletinMetaItem}>Classe : <Text style={{ fontWeight: '800' }}>{student.class_name}</Text></Text>
                <Text style={styles.bulletinMetaItem}>Rang : <Text style={{ fontWeight: '900', color: Brand.green }}>{student.class_rank}</Text></Text>
              </View>
            </View>

            {/* Grades Table */}
            <View style={styles.tableCard}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.tableColHeader, { flex: 2 }]}>Matière</Text>
                <Text style={[styles.tableColHeader, { width: 38, textAlign: 'center' }]}>Coef</Text>
                <Text style={[styles.tableColHeader, { width: 44, textAlign: 'center' }]}>Note</Text>
                <Text style={[styles.tableColHeader, { width: 44, textAlign: 'center' }]}>Classe</Text>
                <Text style={[styles.tableColHeader, { flex: 2, textAlign: 'right' }]}>Appréciation</Text>
              </View>

              {student.grades.map((g, idx) => (
                <View key={idx} style={[styles.tableDataRow, idx % 2 === 1 && { backgroundColor: '#F8FAFC' }]}>
                  <Text style={[styles.tableCellSubject, { flex: 2 }]} numberOfLines={1}>{g.subject}</Text>
                  <Text style={[styles.tableCellCenter, { width: 38 }]}>{g.coef}</Text>
                  <Text style={[styles.tableCellGrade, { width: 44, color: g.grade >= 14 ? Brand.green : g.grade >= 10 ? Brand.blue : Brand.red }]}>
                    {g.grade.toFixed(1)}
                  </Text>
                  <Text style={[styles.tableCellCenter, { width: 44, color: '#64748B' }]}>{g.class_avg.toFixed(1)}</Text>
                  <Text style={[styles.tableCellComment, { flex: 2 }]} numberOfLines={1}>{g.comment}</Text>
                </View>
              ))}
            </View>

            {/* Conseil de classe decision */}
            <View style={styles.councilBox}>
              <Text style={styles.councilTitle}>DÉCISION DU CONSEIL DE CLASSE</Text>
              <Text style={styles.councilMention}>🌟 FÉLICITATIONS DU CONSEIL DE CLASSE</Text>
              <Text style={styles.councilComment}>
                Excellent trimestre. Élève studieux, sérieux et participatif. Félicitations pour ce travail remarquable.
              </Text>
            </View>

            <TouchableOpacity style={[styles.cardDownloadBtn, { backgroundColor: Brand.blue }]} onPress={handleShareBulletin}>
              <Ionicons name="document-text-outline" size={16} color="#FFFFFF" />
              <Text style={styles.cardDownloadBtnTxt}>Exporter le Bulletin PDF Officiel</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ════════════════════════════════════════════════════════════
            3. FICHE INDIVIDUELLE DE RENSEIGNEMENTS
        ════════════════════════════════════════════════════════════ */}
        {activeSection === 'fiche' && (
          <View style={styles.sectionWrap}>
            <View style={[styles.infoSectionCard, Shadows.sm]}>
              <Text style={styles.infoSectionHeading}>État Civil de l'Élève</Text>

              <View style={styles.infoLine}>
                <Text style={styles.infoLabel}>Nom & Prénoms</Text>
                <Text style={styles.infoValue}>{fullName}</Text>
              </View>
              <View style={styles.infoLine}>
                <Text style={styles.infoLabel}>Date & Lieu de Naissance</Text>
                <Text style={styles.infoValue}>{student.birth_date} à {student.birth_place}</Text>
              </View>
              <View style={styles.infoLine}>
                <Text style={styles.infoLabel}>Sexe / Genre</Text>
                <Text style={styles.infoValue}>{student.gender === 'M' ? 'Masculin (Garçon)' : 'Féminin (Fille)'}</Text>
              </View>
              <View style={styles.infoLine}>
                <Text style={styles.infoLabel}>Nationalité</Text>
                <Text style={styles.infoValue}>{student.nationality}</Text>
              </View>
              <View style={styles.infoLine}>
                <Text style={styles.infoLabel}>Matricule National</Text>
                <Text style={styles.infoValueBold}>{student.matricule}</Text>
              </View>
              <View style={styles.infoLine}>
                <Text style={styles.infoLabel}>Classe Actuelle</Text>
                <Text style={styles.infoValueBold}>{student.class_name}</Text>
              </View>
            </View>

            {/* Filiation & Parents */}
            <View style={[styles.infoSectionCard, Shadows.sm]}>
              <Text style={styles.infoSectionHeading}>Filiation & Tuteur Légal</Text>

              <View style={styles.infoLine}>
                <Text style={styles.infoLabel}>Père</Text>
                <Text style={styles.infoValue}>{student.father_name} ({student.father_profession})</Text>
              </View>
              <View style={styles.infoLine}>
                <Text style={styles.infoLabel}>Mère</Text>
                <Text style={styles.infoValue}>{student.mother_name} ({student.mother_profession})</Text>
              </View>
              <View style={styles.infoLine}>
                <Text style={styles.infoLabel}>Tuteur Déclaré</Text>
                <Text style={styles.infoValueBold}>{student.guardian_name}</Text>
              </View>
              <View style={styles.infoLine}>
                <Text style={styles.infoLabel}>Téléphone Tuteur</Text>
                <TouchableOpacity onPress={handleCallParent}>
                  <Text style={[styles.infoValue, { color: Brand.blue, textDecorationLine: 'underline' }]}>
                    {student.guardian_phone}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.infoLine}>
                <Text style={styles.infoLabel}>Email de contact</Text>
                <Text style={styles.infoValue}>{student.guardian_email}</Text>
              </View>
              <View style={styles.infoLine}>
                <Text style={styles.infoLabel}>Adresse Domicile</Text>
                <Text style={styles.infoValue}>{student.home_address}</Text>
              </View>
            </View>
          </View>
        )}

        {/* ════════════════════════════════════════════════════════════
            4. ATTESTATION DE SCOLARITÉ
        ════════════════════════════════════════════════════════════ */}
        {activeSection === 'attestation' && (
          <View style={styles.sectionWrap}>
            <View style={[styles.attestationSheet, Shadows.md]}>
              {/* Official Seal and Header */}
              <View style={styles.attestationHeader}>
                <Text style={styles.attestationRepublic}>RÉPUBLIQUE DE CÔTE D'IVOIRE</Text>
                <Text style={styles.attestationMinistry}>Ministère de l'Éducation Nationale et de l'Alphabétisation</Text>
                <View style={styles.attestationDotted} />
                <Text style={styles.attestationTitle}>ATTESTATION DE FRÉQUENTATION SCOLAIRE</Text>
                <Text style={styles.attestationRef}>RÉFÉRENCE : EUR-ATT-{student.matricule}-2026</Text>
              </View>

              {/* Legal Certificate Statement */}
              <View style={styles.attestationBody}>
                <Text style={styles.attestationParagraph}>
                  Je soussigné, <Text style={{ fontWeight: '800' }}>Directeur des Études du Groupe Scolaire Eurêka</Text>, certifie par la présente que l'élève :
                </Text>

                <View style={styles.attestationBox}>
                  <Text style={styles.attestationStudentName}>{fullName}</Text>
                  <Text style={styles.attestationStudentMeta}>
                    Né(e) le {student.birth_date} à {student.birth_place} ({student.nationality})
                  </Text>
                  <Text style={styles.attestationStudentMeta}>
                    Matricule : <Text style={{ fontWeight: '800' }}>{student.matricule}</Text>
                  </Text>
                </View>

                <Text style={styles.attestationParagraph}>
                  Est régulièrement inscrit(e) et fréquente les cours dispensés dans notre établissement en classe de <Text style={{ fontWeight: '800', color: Brand.blue }}>{student.class_name}</Text> au titre de l'année scolaire <Text style={{ fontWeight: '800' }}>{student.academic_year}</Text>.
                </Text>

                <Text style={styles.attestationParagraph}>
                  En foi de quoi, la présente attestation lui est délivrée pour servir et valoir ce que de droit.
                </Text>
              </View>

              {/* Seal and Signature */}
              <View style={styles.attestationFooter}>
                <View>
                  <Text style={styles.attestationDate}>
                    Fait à Abidjan, le {new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </Text>
                  <Text style={styles.attestationSignTitle}>La Direction de l'Établissement</Text>
                </View>
                <View style={styles.officialStamp}>
                  <Ionicons name="checkmark-done-circle" size={20} color="#1E3A8A" />
                  <Text style={styles.officialStampTxt}>CACHET ÉLECTRONIQUE CONFORME</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity style={[styles.cardDownloadBtn, { backgroundColor: Brand.blue }]} onPress={handleShareAttestation}>
              <Ionicons name="print-outline" size={16} color="#FFFFFF" />
              <Text style={styles.cardDownloadBtnTxt}>Imprimer / Télécharger l'Attestation</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ════════════════════════════════════════════════════════════
            5. DOSSIER SANTÉ (HEALTH RECORD)
        ════════════════════════════════════════════════════════════ */}
        {activeSection === 'sante' && (
          <View style={styles.sectionWrap}>
            {/* Blood group card */}
            <View style={[styles.healthHeroCard, Shadows.sm]}>
              <View style={styles.healthHeroLeft}>
                <Text style={styles.healthHeroLabel}>Groupe Sanguin</Text>
                <View style={styles.bloodBadge}>
                  <Text style={styles.bloodBadgeTxt}>{student.blood_group}</Text>
                </View>
              </View>
              <View style={styles.healthHeroDivider} />
              <View style={styles.healthHeroRight}>
                <Text style={styles.healthHeroLabel}>Aptitude EPS / Sport</Text>
                <View style={styles.epsBadge}>
                  <Ionicons name="fitness" size={14} color="#059669" />
                  <Text style={styles.epsBadgeTxt}>{student.eps_aptitude}</Text>
                </View>
                <Text style={styles.vaccineTxt}>Carnet vaccinal : {student.vaccines_status}</Text>
              </View>
            </View>

            {/* Medical Info Details */}
            <View style={[styles.infoSectionCard, Shadows.sm]}>
              <Text style={styles.infoSectionHeading}>Antécédents & Précautions</Text>

              <View style={styles.healthAlertRow}>
                <Ionicons name="alert-circle" size={18} color="#D97706" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.healthAlertTitle}>Allergies Notifiées</Text>
                  <Text style={styles.healthAlertVal}>{student.allergies || 'Aucune allergie connue'}</Text>
                </View>
              </View>

              <View style={styles.healthAlertRow}>
                <Ionicons name="medkit" size={18} color={Brand.blue} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.healthAlertTitle}>Conditions médicales / Traitement</Text>
                  <Text style={styles.healthAlertVal}>{student.medical_conditions || 'Aucun traitement régulier en cours'}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoLine}>
                <Text style={styles.infoLabel}>Médecin Traitant</Text>
                <Text style={styles.infoValue}>{student.doctor_name}</Text>
              </View>
              <View style={styles.infoLine}>
                <Text style={styles.infoLabel}>Téléphone Médecin</Text>
                <TouchableOpacity onPress={() => Linking.openURL(`tel:${student.doctor_phone.replace(/\s+/g, '')}`)}>
                  <Text style={[styles.infoValue, { color: Brand.blue, textDecorationLine: 'underline' }]}>
                    {student.doctor_phone}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.infoLine}>
                <Text style={styles.infoLabel}>Contact Urgence 24/7</Text>
                <Text style={styles.infoValueBold}>{student.emergency_contact}</Text>
              </View>
            </View>
          </View>
        )}

        {/* ════════════════════════════════════════════════════════════
            6. SERVICES : CANTINE & TRANSPORT SCOLAIRE
        ════════════════════════════════════════════════════════════ */}
        {activeSection === 'services' && (
          <View style={styles.sectionWrap}>
            {/* ── CANTINE ── */}
            <View style={[styles.serviceCard, Shadows.sm, { borderLeftColor: Brand.green }]}>
              <View style={styles.serviceHeader}>
                <View style={[styles.serviceIconCircle, { backgroundColor: '#ECFDF5' }]}>
                  <Ionicons name="restaurant" size={22} color={Brand.green} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.serviceTitle}>Restauration & Cantine Scolaire</Text>
                  <Text style={styles.serviceSubtitle}>{student.cantine_plan}</Text>
                </View>
                <View style={[styles.serviceStatusPill, { backgroundColor: student.cantine_subscribed ? '#ECFDF5' : '#FEF2F2' }]}>
                  <Text style={[styles.serviceStatusTxt, { color: student.cantine_subscribed ? Brand.green : Brand.red }]}>
                    {student.cantine_subscribed ? '✓ Souscrit' : 'Non Souscrit'}
                  </Text>
                </View>
              </View>

              <View style={styles.serviceBody}>
                <View style={styles.serviceDataLine}>
                  <Text style={styles.serviceDataLabel}>Régime Alimentaire</Text>
                  <Text style={styles.serviceDataVal}>{student.cantine_diet}</Text>
                </View>
                <View style={styles.serviceDataLine}>
                  <Text style={styles.serviceDataLabel}>Solde Déjeuners du Mois</Text>
                  <Text style={styles.serviceDataValBold}>{student.cantine_balance} repas restants</Text>
                </View>
                <View style={styles.serviceDataLine}>
                  <Text style={styles.serviceDataLabel}>Statut de Règlement</Text>
                  <Text style={[styles.serviceDataValBold, { color: Brand.green }]}>
                    {student.cantine_status === 'paid' ? 'À jour (Payé)' : 'En attente'}
                  </Text>
                </View>
              </View>
            </View>

            {/* ── TRANSPORT ── */}
            <View style={[styles.serviceCard, Shadows.sm, { borderLeftColor: Brand.blue }]}>
              <View style={styles.serviceHeader}>
                <View style={[styles.serviceIconCircle, { backgroundColor: '#EFF6FF' }]}>
                  <Ionicons name="bus" size={22} color={Brand.blue} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.serviceTitle}>Transport & Ramassage Scolaire</Text>
                  <Text style={styles.serviceSubtitle}>{student.transport_line}</Text>
                </View>
                <View style={[styles.serviceStatusPill, { backgroundColor: student.transport_subscribed ? '#EFF6FF' : '#FEF2F2' }]}>
                  <Text style={[styles.serviceStatusTxt, { color: student.transport_subscribed ? Brand.blue : Brand.red }]}>
                    {student.transport_subscribed ? '✓ Actif' : 'Non Souscrit'}
                  </Text>
                </View>
              </View>

              <View style={styles.serviceBody}>
                <View style={styles.serviceDataLine}>
                  <Text style={styles.serviceDataLabel}>Point de Ramassage</Text>
                  <Text style={styles.serviceDataValBold}>{student.transport_stop}</Text>
                </View>
                <View style={styles.serviceDataLine}>
                  <Text style={styles.serviceDataLabel}>Chauffeur / Convoyeur</Text>
                  <Text style={styles.serviceDataVal}>{student.transport_driver}</Text>
                </View>
                <View style={styles.serviceDataLine}>
                  <Text style={styles.serviceDataLabel}>Contact Chauffeur</Text>
                  <TouchableOpacity onPress={() => Linking.openURL(`tel:${student.transport_phone.replace(/\s+/g, '')}`)}>
                    <Text style={[styles.serviceDataValBold, { color: Brand.blue, textDecorationLine: 'underline' }]}>
                      {student.transport_phone}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.serviceDataLine}>
                  <Text style={styles.serviceDataLabel}>Véhicule Affecté</Text>
                  <Text style={styles.serviceDataVal}>{student.transport_vehicle}</Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerBar: {
    paddingHorizontal: Spacing.base,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleBox: { flex: 1 },
  headerSubtitle: { fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: '700', textTransform: 'uppercase' },
  headerMainTitle: { fontSize: 18, fontWeight: '900', color: '#FFFFFF', marginTop: 2 },
  headerMetaClass: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactBar: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: Spacing.base,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  contactPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: Radius.full,
    gap: 5,
  },
  contactPillTxt: { fontSize: 11, fontWeight: '800' },
  tabsWrapper: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    maxHeight: 50,
  },
  tabsScroll: { paddingHorizontal: Spacing.base, paddingVertical: 8 },
  tabChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: '#F1F5F9',
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabChipTxt: { fontSize: 12, color: '#475569', fontWeight: '700' },
  tabChipTxtActive: { color: '#FFFFFF', fontWeight: '800' },
  contentScroll: { padding: Spacing.base, paddingBottom: 110 },
  sectionWrap: { gap: 12 },
  /* ID Card Recto */
  cardFlipHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionHeading: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  flipBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  flipBtnTxt: { fontSize: 12, fontWeight: '800' },
  idCardRecto: {
    backgroundColor: '#1E3A8A',
    borderRadius: Radius.xxl,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  idCardTopRibbon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.15)',
    paddingBottom: 10,
    marginBottom: 12,
  },
  idCardLogo: { width: 34, height: 34, borderRadius: Radius.md, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  idCardLogoTxt: { fontSize: 20, fontWeight: '900', color: '#1E3A8A' },
  idCardSchoolName: { fontSize: 12, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.5 },
  idCardSchoolSub: { fontSize: 9, color: 'rgba(255,255,255,0.7)', fontWeight: '600', marginTop: 1 },
  idCardBadgeType: { backgroundColor: '#F59E0B', paddingHorizontal: 7, paddingVertical: 2, borderRadius: Radius.full },
  idCardBadgeTypeTxt: { fontSize: 8, fontWeight: '900', color: '#FFFFFF' },
  idCardBody: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  idCardPhotoCircle: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  idCardPhotoImage: {
    width: 74,
    height: 74,
    borderRadius: 37,
  },
  idCardPhotoInitials: { fontSize: 26, fontWeight: '900', color: '#FFFFFF' },
  idCardMetaCol: { flex: 1 },
  idCardName: { fontSize: 16, fontWeight: '900', color: '#FFFFFF', marginBottom: 2 },
  idCardClass: { fontSize: 11, color: '#93C5FD', fontWeight: '700' },
  idCardMatricule: { fontSize: 11, color: '#FCD34D', fontWeight: '800', marginTop: 1 },
  idCardDate: { fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 1 },
  idCardServicesRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
  idCardServiceBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.md },
  idCardBarcodeStrip: {
    marginTop: 14,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: Radius.lg,
    padding: 8,
    alignItems: 'center',
  },
  idCardBarcodeLines: { flexDirection: 'row', gap: 3, alignItems: 'center', height: 26 },
  barcodeLine: { height: '100%', backgroundColor: '#0F172A' },
  idCardBarcodeVal: { fontSize: 9, fontWeight: '800', color: '#0F172A', marginTop: 3, letterSpacing: 1 },
  /* ID Card Verso */
  idCardVerso: {
    backgroundColor: '#0F172A',
    borderRadius: Radius.xxl,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: '#334155',
  },
  idCardVersoTitle: { fontSize: 11, fontWeight: '900', color: '#FCD34D', letterSpacing: 0.5, marginBottom: 6 },
  idCardVersoText: { fontSize: 10, color: '#CBD5E1', lineHeight: 14, marginBottom: 12 },
  idCardVersoGrid: { flexDirection: 'row', gap: 10, backgroundColor: 'rgba(255,255,255,0.06)', padding: 10, borderRadius: Radius.lg, marginBottom: 12 },
  idCardVersoItem: { flex: 1 },
  idCardVersoLabel: { fontSize: 9, color: '#94A3B8', fontWeight: '700' },
  idCardVersoVal: { fontSize: 11, color: '#FFFFFF', fontWeight: '700', marginTop: 2 },
  idCardVersoValBold: { fontSize: 15, color: '#EF4444', fontWeight: '900', marginTop: 1 },
  idCardSignatureBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  idCardSignLabel: { fontSize: 9, color: '#94A3B8', fontWeight: '600' },
  idCardSignPlaceholder: { fontSize: 13, color: '#60A5FA', fontStyle: 'italic', fontWeight: '700', marginTop: 2 },
  idCardSealCircle: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  cardDownloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.violet,
    paddingVertical: 12,
    borderRadius: Radius.lg,
    gap: 6,
    marginTop: 4,
  },
  cardDownloadBtnTxt: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  /* Bulletin */
  bulletinHeaderCard: { backgroundColor: '#FFFFFF', borderRadius: Radius.xxl, padding: Spacing.base, borderWidth: 1, borderColor: '#E2E8F0' },
  bulletinHeaderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  bulletinSchoolName: { fontSize: 11, color: '#64748B', fontWeight: '800', letterSpacing: 0.5 },
  bulletinDocTitle: { fontSize: 15, fontWeight: '900', color: '#0F172A', marginTop: 2 },
  bulletinPeriod: { fontSize: 11, color: '#64748B', marginTop: 1 },
  bulletinAvgBox: { backgroundColor: '#F8FAFC', paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.xl, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  bulletinAvgLabel: { fontSize: 9, fontWeight: '700', color: '#64748B' },
  bulletinAvgValue: { fontSize: 24, fontWeight: '900', marginTop: 1 },
  bulletinAvgMax: { fontSize: 10, color: '#94A3B8', fontWeight: '700' },
  bulletinDivider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 10 },
  bulletinMetaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  bulletinMetaItem: { fontSize: 11, color: '#475569' },
  tableCard: { backgroundColor: '#FFFFFF', borderRadius: Radius.xl, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden' },
  tableHeaderRow: { flexDirection: 'row', backgroundColor: '#F1F5F9', paddingVertical: 8, paddingHorizontal: 10 },
  tableColHeader: { fontSize: 10, fontWeight: '800', color: '#475569', textTransform: 'uppercase' },
  tableDataRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F1F5F9' },
  tableCellSubject: { fontSize: 11, fontWeight: '800', color: '#0F172A' },
  tableCellCenter: { fontSize: 11, textAlign: 'center', fontWeight: '600' },
  tableCellGrade: { fontSize: 12, textAlign: 'center', fontWeight: '900' },
  tableCellComment: { fontSize: 10, color: '#64748B', fontStyle: 'italic', textAlign: 'right' },
  councilBox: { backgroundColor: '#EFF6FF', borderRadius: Radius.xl, padding: Spacing.base, borderWidth: 1, borderColor: '#BFDBFE' },
  councilTitle: { fontSize: 10, fontWeight: '800', color: '#2563EB', textTransform: 'uppercase' },
  councilMention: { fontSize: 13, fontWeight: '900', color: '#1E40AF', marginTop: 4 },
  councilComment: { fontSize: 11, color: '#334155', fontStyle: 'italic', marginTop: 4, lineHeight: 15 },
  /* Info section */
  infoSectionCard: { backgroundColor: '#FFFFFF', borderRadius: Radius.xl, padding: Spacing.base, borderWidth: 1, borderColor: '#E2E8F0' },
  infoSectionHeading: { fontSize: 13, fontWeight: '800', color: '#0F172A', marginBottom: 10 },
  infoLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F8FAFC',
    gap: 8,
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    flexShrink: 0,
    width: '42%',
  },
  infoValue: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '700',
    flex: 1,
    textAlign: 'right',
    flexWrap: 'wrap',
  },
  infoValueBold: {
    fontSize: 12,
    color: Brand.blue,
    fontWeight: '800',
    flex: 1,
    textAlign: 'right',
    flexWrap: 'wrap',
  },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 8 },
  /* Attestation */
  attestationSheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.xxl,
    padding: Spacing.xl,
    borderWidth: 2,
    borderColor: '#93C5FD',
  },
  attestationHeader: { alignItems: 'center', marginBottom: 14 },
  attestationRepublic: { fontSize: 11, fontWeight: '900', color: '#1E3A8A', letterSpacing: 0.5 },
  attestationMinistry: { fontSize: 9, color: '#64748B', fontWeight: '600', marginTop: 2, textAlign: 'center' },
  attestationDotted: { width: 80, height: 2, backgroundColor: '#E2E8F0', marginVertical: 8 },
  attestationTitle: { fontSize: 14, fontWeight: '900', color: '#1E3A8A', textAlign: 'center', letterSpacing: 0.5 },
  attestationRef: { fontSize: 9, color: '#94A3B8', fontWeight: '700', marginTop: 3 },
  attestationBody: { marginVertical: 10 },
  attestationParagraph: { fontSize: 12, color: '#334155', lineHeight: 18, marginBottom: 8 },
  attestationBox: { backgroundColor: '#EFF6FF', padding: 12, borderRadius: Radius.lg, marginVertical: 6, alignItems: 'center' },
  attestationStudentName: { fontSize: 16, fontWeight: '900', color: '#1E40AF' },
  attestationStudentMeta: { fontSize: 11, color: '#475569', marginTop: 2 },
  attestationFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  attestationDate: { fontSize: 10, color: '#64748B', fontStyle: 'italic' },
  attestationSignTitle: { fontSize: 11, fontWeight: '800', color: '#0F172A', marginTop: 2 },
  officialStamp: { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#93C5FD', padding: 6, borderRadius: Radius.md, alignItems: 'center', width: 90 },
  officialStampTxt: { fontSize: 7, fontWeight: '900', color: '#1E3A8A', textAlign: 'center', marginTop: 2 },
  /* Health */
  healthHeroCard: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: Radius.xl, padding: Spacing.base, borderWidth: 1, borderColor: '#E2E8F0' },
  healthHeroLeft: { flex: 1, alignItems: 'center' },
  healthHeroLabel: { fontSize: 10, fontWeight: '700', color: '#64748B', textTransform: 'uppercase' },
  bloodBadge: { backgroundColor: '#FEF2F2', paddingHorizontal: 16, paddingVertical: 6, borderRadius: Radius.lg, marginTop: 6 },
  bloodBadgeTxt: { fontSize: 24, fontWeight: '900', color: '#DC2626' },
  healthHeroDivider: { width: 1, backgroundColor: '#E2E8F0', marginHorizontal: 12 },
  healthHeroRight: { flex: 1.5, justifyContent: 'center' },
  epsBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ECFDF5', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.md, marginTop: 4 },
  epsBadgeTxt: { fontSize: 12, fontWeight: '800', color: '#059669' },
  vaccineTxt: { fontSize: 10, color: '#64748B', marginTop: 6 },
  healthAlertRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F1F5F9',
    alignItems: 'flex-start',
  },
  healthAlertTitle: { fontSize: 11, fontWeight: '800', color: '#475569', flexWrap: 'wrap' },
  healthAlertVal: { fontSize: 12, fontWeight: '600', color: '#0F172A', marginTop: 2, flexWrap: 'wrap' },
  /* Services */
  serviceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.xl,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderLeftWidth: 4,
  },
  serviceHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  serviceIconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  serviceTitle: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  serviceSubtitle: { fontSize: 11, color: '#64748B', marginTop: 1 },
  serviceStatusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.full },
  serviceStatusTxt: { fontSize: 10, fontWeight: '800' },
  serviceBody: { backgroundColor: '#F8FAFC', borderRadius: Radius.lg, padding: 10, gap: 8 },
  serviceDataLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 2,
  },
  serviceDataLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    flexShrink: 0,
    width: '44%',
  },
  serviceDataVal: {
    fontSize: 11,
    color: '#0F172A',
    fontWeight: '700',
    flex: 1,
    textAlign: 'right',
    flexWrap: 'wrap',
  },
  serviceDataValBold: {
    fontSize: 12,
    color: Brand.blue,
    fontWeight: '900',
    flex: 1,
    textAlign: 'right',
    flexWrap: 'wrap',
  },
});
