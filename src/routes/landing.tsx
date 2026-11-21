import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { isDesktopApp } from "@/hooks/useIsDesktop";
import {
  Download,
  ArrowRight,
  GraduationCap,
  Users,
  Banknote,
  BarChart3,
  BookOpen,
  Shield,
  Smartphone,
  Globe,
  CheckCircle2,
  Star,
  ChevronDown,
  Menu,
  X,
  Building2,
  Clock,
  Zap,
  Baby,
  Backpack,
  School,
  Check,
  Laptop,
  LogIn,
  UserPlus,
  UtensilsCrossed,
  Bus,
} from "lucide-react";

export const Route = createFileRoute("/landing")({
  component: LandingPage,
});

type EducationLevelId = "maternelle" | "primaire" | "secondaire" | "superieur";

interface EducationLevel {
  id: EducationLevelId;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  badge: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  highlightKpi: string;
  highlightLabel: string;
  features: string[];
  ctaText: string;
}

function LandingPage() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<EducationLevelId>("secondaire");

  useEffect(() => {
    if (isDesktopApp()) {
      navigate({ to: "/login" });
    }
  }, [navigate]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const educationLevels: EducationLevel[] = [
    {
      id: "maternelle",
      label: "Maternelle",
      sublabel: "Petite, Moyenne & Grande Section",
      icon: <Baby className="w-5 h-5" />,
      badge: "Éveil & Petite Enfance",
      title: "Gestion bienveillante et lien quotidien avec les familles",
      description:
        "Accompagnez l'épanouissement des tout-petits avec des outils adaptés : suivi de l'éveil, présence quotidienne simplifiée, carnet de liaison digitalisé et partage sécurisé avec les parents.",
      image: "/Landing2.jpg",
      imageAlt: "Enfants en classe de maternelle épanouis avec Eurêka ERP",
      highlightKpi: "100%",
      highlightLabel: "Lien famille-école digitalisé et sécurisé",
      features: [
        "Carnet de suivi d'éveil, motricité et sociabilité de l'enfant",
        "Pointage des présences en 1 clic & suivi des siestes, repas et santé",
        "Portail parents sur mobile : photos des activités et annonces de la classe",
        "Facturation douce des frais de garderie, cantine et activités d'éveil",
      ],
      ctaText: "Inscrire une école maternelle",
    },
    {
      id: "primaire",
      label: "Primaire",
      sublabel: "Du CP au CM2 (CI au CM2)",
      icon: <Backpack className="w-5 h-5" />,
      badge: "Socle Fondamental",
      title: "Acquisition des compétences & bulletins scolaires instantanés",
      description:
        "Offrez à vos maîtres et maîtresses une interface intuitive pour saisir les notes, évaluer par compétences, éditer les bulletins périodiques et communiquer avec les parents sans perte de temps.",
      image: "/Login.jpg",
      imageAlt: "Enseignant félicitant son élève de primaire pour ses résultats",
      highlightKpi: "30 sec",
      highlightLabel: "Pour générer les bulletins de toute une classe",
      features: [
        "Évaluation par compétences et calcul automatique des moyennes",
        "Génération instantanée des bulletins scolaires trimestriels avec appréciations",
        "Cahier de texte numérique, suivi des leçons et des devoirs à domicile",
        "Encaissement des mensualités par Mobile Money (Wave, Orange, MTN, Moov)",
      ],
      ctaText: "Inscrire une école primaire",
    },
    {
      id: "secondaire",
      label: "Secondaire",
      sublabel: "Collège & Lycée (6ème à la Terminale)",
      icon: <School className="w-5 h-5" />,
      badge: "Excellence & Examens d'État",
      title: "Rigueur des coefficients, filières & préparation aux examens",
      description:
        "Pilotez sans stress la complexité du collège et du lycée : séries scientifiques, littéraires et techniques, pondération des matières, emplois du temps sans conflits et préparation au BEPC et Baccalauréat.",
      image: "/landing1.jpg",
      imageAlt: "Administration et direction de collège et lycée sur Eurêka ERP",
      highlightKpi: "0 conflit",
      highlightLabel: "Dans la planification automatique des emplois du temps",
      features: [
        "Gestion multi-séries (A, C, D, TI, G...) avec pondération exacte des coefficients",
        "Planification intelligente des emplois du temps : salles, classes et enseignants",
        "Conseils de classe automatisés, relevés officiels et classements d'honneur",
        "Fiches d'émargement des professeurs, cahier de texte et suivi disciplinaire",
      ],
      ctaText: "Inscrire un collège ou lycée",
    },
    {
      id: "superieur",
      label: "Supérieur & LMD",
      sublabel: "Universités, Facultés & Grandes Écoles",
      icon: <GraduationCap className="w-5 h-5" />,
      badge: "Système LMD Conforme CAMES",
      title: "Gestion universitaire complète, crédits ECTS et délibérations",
      description:
        "Conforme aux standards académiques universitaires : semestres (S1-S6), Unités d'Enseignement (UE), Éléments Constitutifs (ECUE), sessions normales et de rattrapage avec compensation automatique des crédits.",
      image: "/landing3.jpg",
      imageAlt: "Étudiante universitaire épanouie avec la plateforme Eurêka ERP",
      highlightKpi: "100% LMD",
      highlightLabel: "Calcul automatique des crédits et moyennes pondérées",
      features: [
        "Architecture Licence (L1-L3), Master (M1-M2) et filières doctorales",
        "Gestion des Unités d'Enseignement, crédits capitalisables et délibérations",
        "Sessions normales et de rattrapage avec calcul automatique de compensation",
        "Portail étudiant mobile : relevés de notes officiels, quittances et attestations",
      ],
      ctaText: "Inscrire une université ou institut",
    },
  ];

  const currentLevel = educationLevels.find((lvl) => lvl.id === activeTab) || educationLevels[2];

  const features = [
    {
      icon: <Users className="w-6 h-6" />,
      title: "Élèves & Étudiants",
      desc: "Inscriptions, matricules, dossiers scolaires, badges QR et archivage complet.",
    },
    {
      icon: <BookOpen className="w-6 h-6" />,
      title: "Notes, Bulletins & LMD",
      desc: "Calcul des moyennes pondérées, bulletins officiels et gestion des crédits universitaires.",
    },
    {
      icon: <Banknote className="w-6 h-6" />,
      title: "Paiements Mobile Money",
      desc: "Collecte intégrée via Wave, Orange Money, MTN, Moov et cartes bancaires.",
    },
    {
      icon: <Clock className="w-6 h-6" />,
      title: "Emplois du temps",
      desc: "Planification automatique des cours, salles et professeurs sans chevauchement.",
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: "Statistiques & Pilotage",
      desc: "Indicateurs en direct de réussite, taux de recouvrement et prévisions financières.",
    },
    {
      icon: <Globe className="w-6 h-6" />,
      title: "Mode Hors-ligne & Sync",
      desc: "Continuez à travailler sans Internet : vos données se synchronisent automatiquement dès le retour du réseau.",
    },
    {
      icon: <Smartphone className="w-6 h-6" />,
      title: "Portail Parents & Étudiants",
      desc: "Accès mobile aux notes, retards, devoirs, quittances et notifications de l'école.",
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Multi-campus & Sécurité",
      desc: "Pilotez plusieurs sites depuis une interface unique avec des droits sécurisés.",
    },
    {
      icon: <UtensilsCrossed className="w-6 h-6" />,
      title: "Gestion de Cantine",
      desc: "Suivi des repas, menus, inscriptions journalières, facturation et abonnements cantine par élève.",
    },
    {
      icon: <Bus className="w-6 h-6" />,
      title: "Transport Scolaire",
      desc: "Gestion des circuits, arrêts, affectation des élèves, paiements et suivi des véhicules en temps réel.",
    },
  ];

  const testimonials = [
    {
      name: "Dr. Kouamé Assoumou",
      role: "Directeur Général, Groupe Scolaire Excellence",
      text: "Eurêka a transformé la gestion de nos 3 campus de la maternelle au lycée. Les bulletins qui prenaient deux semaines se génèrent désormais en un clic.",
      rating: 5,
    },
    {
      name: "Prof. Fatou Diallo",
      role: "VP Administration, Université Privée de Dakar",
      text: "La conformité LMD, les délibérations de rattrapage et les paiements Wave intégrés nous ont fait gagner une fluidité incroyable. Nos étudiants adorent le portail.",
      rating: 5,
    },
    {
      name: "M. Jean-Baptiste Zongo",
      role: "Censeur, Lycée Privé Saint-Michel",
      text: "Le mode hors-ligne nous a sauvés lors des pannes de réseau : les professeurs ont continué à émarger et noter sans la moindre interruption.",
      rating: 5,
    },
  ];

  const stats = [
    { value: "50+", label: "Établissements partenaires" },
    { value: "35 000+", label: "Élèves & étudiants gérés" },
    { value: "5 pays", label: "Afrique de l'Ouest & Centrale" },
    { value: "99.9%", label: "Disponibilité du service" },
  ];

  return (
    <div className="min-h-screen bg-[#FAECBE] text-stone-900 font-sans antialiased selection:bg-amber-300 selection:text-stone-950 relative overflow-x-hidden">

      {/* ── AMBIENT LIQUID GLASS ORBS (REFLETS LIQUIDES FLUIDES) ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-32 left-1/4 w-[520px] h-[520px] bg-gradient-to-br from-amber-300/35 via-emerald-200/25 to-amber-100/35 rounded-full blur-3xl opacity-75 animate-pulse" />
        <div className="absolute top-[32%] -right-24 w-[480px] h-[480px] bg-gradient-to-bl from-emerald-300/20 via-amber-200/30 to-amber-300/25 rounded-full blur-3xl opacity-60" />
        <div className="absolute top-[68%] -left-20 w-[550px] h-[550px] bg-gradient-to-tr from-amber-300/25 via-emerald-200/20 to-transparent rounded-full blur-3xl opacity-60" />
      </div>

      {/* ── NAVBAR EFFET LIQUIDE GLASS ── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled
          ? "bg-[#FAECBE]/75 backdrop-blur-2xl border-b border-white/60 shadow-[0_10px_35px_rgba(180,120,40,0.08),inset_0_1px_1px_rgba(255,255,255,0.8)]"
          : "bg-[#FAECBE]/85 backdrop-blur-xl border-b border-white/40"
          }`}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-18 items-center justify-between">
            {/* Logo avec le Favicon officiel */}
            <Link to="/landing" className="flex items-center gap-3 group">
              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl p-1 bg-white/70 backdrop-blur-xl border border-white/80 shadow-[0_4px_16px_rgba(27,67,50,0.15),inset_0_1px_1px_rgba(255,255,255,0.9)] group-hover:scale-105 transition-all duration-200">
                <img src="/favicon.svg" alt="Eurêka ERP" className="h-full w-full object-contain drop-shadow-xs" />
              </div>
              <div className="flex flex-col">
                <span className="font-display text-xl font-black tracking-tight text-stone-900 flex items-center gap-1.5">
                  Eurêka <span className="text-amber-800 font-semibold text-xs px-2 py-0.5 rounded-full bg-amber-200/80 border border-amber-300 shadow-xs">ERP</span>
                </span>
                <span className="text-[10px] text-stone-600 font-medium -mt-0.5 hidden sm:block">
                  Maternelle · Primaire · Secondaire · Université
                </span>
              </div>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-7">
              <a href="#niveaux" className="text-sm font-semibold text-stone-700 hover:text-amber-800 transition-colors">
                Niveaux Scolaires
              </a>
              <a href="#fonctionnalites" className="text-sm font-semibold text-stone-700 hover:text-amber-800 transition-colors">
                Fonctionnalités
              </a>
              <a href="#temoignages" className="text-sm font-semibold text-stone-700 hover:text-amber-800 transition-colors">
                Témoignages
              </a>

              {/* Login link */}
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-sm font-bold text-stone-800 hover:text-amber-800 px-3.5 py-1.5 rounded-xl hover:bg-white/60 hover:backdrop-blur-md transition-all border border-transparent hover:border-white/60"
              >
                <LogIn className="w-4 h-4" />
                Connexion
              </Link>

              {/* Register CTA Liquide Glass */}
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 via-amber-600 to-amber-700 px-4 py-2 text-sm font-bold text-white shadow-[0_4px_14px_rgba(217,119,6,0.35),inset_0_1px_1px_rgba(255,255,255,0.4)] hover:brightness-105 hover:scale-105 transition-all duration-200 border border-amber-500/40"
              >
                <UserPlus className="w-4 h-4" />
                Créer un compte
              </Link>
            </nav>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 rounded-xl text-stone-800 bg-white/50 backdrop-blur-md border border-white/60 hover:bg-white/80 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6 text-amber-800" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown Liquide Glass */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#FAECBE]/90 backdrop-blur-2xl border-b border-white/60 px-4 py-5 space-y-3 shadow-2xl animate-in fade-in slide-in-from-top-2">
            <a href="#niveaux" className="block text-sm font-semibold text-stone-800 py-2" onClick={() => setMobileMenuOpen(false)}>
              Niveaux Scolaires
            </a>
            <a href="#fonctionnalites" className="block text-sm font-semibold text-stone-800 py-2" onClick={() => setMobileMenuOpen(false)}>
              Fonctionnalités
            </a>
            <a href="#temoignages" className="block text-sm font-semibold text-stone-800 py-2" onClick={() => setMobileMenuOpen(false)}>
              Témoignages
            </a>
            <div className="pt-3 border-t border-white/50 flex flex-col gap-2.5">
              <Link
                to="/login"
                className="flex items-center justify-center gap-2 rounded-xl border border-white/70 bg-white/70 backdrop-blur-xl px-4 py-2.5 text-sm font-bold text-stone-900 shadow-sm"
                onClick={() => setMobileMenuOpen(false)}
              >
                <LogIn className="w-4 h-4" />
                Se connecter à mon espace
              </Link>
              <Link
                to="/register"
                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 px-4 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_rgba(217,119,6,0.35),inset_0_1px_1px_rgba(255,255,255,0.4)]"
                onClick={() => setMobileMenuOpen(false)}
              >
                <UserPlus className="w-4 h-4" />
                Enregistrer mon établissement
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ── HERO SECTION EN DISPOSITION SPLIT-SCREEN (COMME LOGIN & REGISTER) ── */}
      <section className="relative pt-24 pb-12 md:pt-32 md:pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">

            {/* ── COLONNE DE PRÉSENTATION & ACTIONS (GAUCHE — DIRECT SUR FOND #FAECBE, SANS CARD) ── */}
            <div className="lg:col-span-6 xl:col-span-6 flex flex-col justify-center py-2 lg:py-4">

              <div>
                {/* Badge Catégorie Liquide Glass */}
                <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/60 backdrop-blur-xl px-4 py-2 text-xs font-bold text-amber-950 mb-6 shadow-[0_4px_16px_rgba(0,0,0,0.03),inset_0_1px_1px_rgba(255,255,255,0.8)] self-start">
                  <GraduationCap className="h-4 w-4 text-amber-700" />
                  <span>Système de Gestion Scolaire & Universitaire</span>
                </div>

                {/* Titre Principal */}
                <h1 className="font-display text-4xl sm:text-5xl xl:text-6xl font-black tracking-tight text-stone-950 leading-[1.1]">
                  L'ERP éducatif complet <br />
                  <span className="text-amber-800">au cœur de l'Afrique</span>
                </h1>

                {/* Sous-titre */}
                <p className="mt-5 text-base sm:text-lg text-stone-700 leading-relaxed font-normal max-w-xl">
                  Eurêka digitalise la gestion académique, financière, administrative et pédagogique de votre établissement de la <strong className="text-amber-900 font-semibold">Maternelle</strong> à l'<strong className="text-amber-900 font-semibold">Université (LMD)</strong>, avec synchronisation hors-ligne garantie.
                </p>

                {/* Barre de boutons d'action */}
                <div className="mt-8 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">

                  {/* Action 1 : Enregistrer mon établissement (Effet Liquide Glass) */}
                  <Link
                    to="/register"
                    className="group inline-flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-amber-600 via-amber-600 to-amber-700 px-6 py-3.5 text-sm font-bold text-white shadow-[0_6px_20px_rgba(217,119,6,0.35),inset_0_1px_1px_rgba(255,255,255,0.4)] hover:brightness-105 transition-all duration-200 hover:scale-[1.02] border border-amber-500/40"
                  >
                    <Building2 className="w-4 h-4 text-white" />
                    <span>Enregistrer mon établissement</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>

                  {/* Action 2 : Télécharger l'application Desktop (Effet Liquide Glass) */}
                  <div className="relative">
                    <button
                      onClick={() => setDownloadOpen(!downloadOpen)}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-2xl border border-white/75 bg-white/70 backdrop-blur-xl px-5 py-3.5 text-sm font-semibold text-stone-900 shadow-[0_4px_16px_rgba(0,0,0,0.03),inset_0_1px_2px_rgba(255,255,255,0.85)] hover:bg-white/90 hover:border-white transition-all duration-200"
                    >
                      <Download className="w-4 h-4 text-amber-700" />
                      <span>Télécharger</span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${downloadOpen ? "rotate-180" : ""}`} />
                    </button>

                    {/* Dropdown téléchargement Liquide Glass */}
                    {downloadOpen && (
                      <div className="absolute top-full left-0 mt-2 w-72 sm:w-80 rounded-2xl bg-white/90 backdrop-blur-2xl shadow-2xl shadow-stone-900/15 border border-white/80 p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                        <p className="text-xs font-bold text-amber-800 uppercase tracking-wider px-2 pb-2 border-b border-stone-100">
                          Choisir votre système
                        </p>
                        <div className="py-1 space-y-1">
                          <a
                            href="/release/Eureka ERP-1.0.0.dmg"
                            download
                            className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-amber-50/80 transition-colors group"
                          >
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-100/80 text-stone-800">
                              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                            </div>
                            <div>
                              <div className="text-xs font-bold text-stone-900 group-hover:text-amber-800">macOS (DMG)</div>
                              <div className="text-[11px] text-stone-500">Apple Silicon & Intel · 150 MB</div>
                            </div>
                          </a>
                          <a
                            href="/release/Eureka ERP Setup 1.0.0.exe"
                            download
                            className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-amber-50/80 transition-colors group"
                          >
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801"/></svg>
                            </div>
                            <div>
                              <div className="text-xs font-bold text-stone-900 group-hover:text-amber-800">Windows (Setup .exe)</div>
                              <div className="text-[11px] text-stone-500">Installeur NSIS · 189 MB</div>
                            </div>
                          </a>
                          <a
                            href="/release/Eureka ERP 1.0.0.exe"
                            download
                            className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-amber-50/80 transition-colors group"
                          >
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801"/></svg>
                            </div>
                            <div>
                              <div className="text-xs font-bold text-stone-900 group-hover:text-amber-800">Windows (Portable)</div>
                              <div className="text-[11px] text-stone-500">Sans installation · 172 MB</div>
                            </div>
                          </a>
                          <a
                            href="/release/Eureka ERP-1.0.0-mac.zip"
                            download
                            className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-amber-50/80 transition-colors group"
                          >
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-100/80 text-stone-800">
                              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                            </div>
                            <div>
                              <div className="text-xs font-bold text-stone-900 group-hover:text-amber-800">macOS (Archive ZIP)</div>
                              <div className="text-[11px] text-stone-500">Version zippée · 146 MB</div>
                            </div>
                          </a>
                        </div>
                        <div className="mt-2 rounded-xl bg-amber-50/80 border border-amber-200/80 p-2">
                          <p className="text-[10px] text-amber-900 leading-tight">
                            ⚡ <strong>Détection automatique</strong> serveur local (port 8080) & Cloud.
                          </p>
                        </div>

                        {/* Indication apps mobiles Android & iOS */}
                        <div className="mt-2.5 pt-2 border-t border-stone-100">
                          <p className="text-[10px] font-bold text-amber-900 uppercase tracking-wider px-1 pb-1.5 flex items-center gap-1.5">
                            <Smartphone className="w-3.5 h-3.5 text-amber-700" />
                            <span>Mobile Android & iOS (Bientôt)</span>
                          </p>
                          <div className="grid grid-cols-2 gap-1.5">
                            <div className="flex items-center gap-2 rounded-xl bg-stone-50/80 border border-stone-200/80 px-2.5 py-1.5 text-stone-800">
                              <svg className="w-4 h-4 text-emerald-600 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.551 0 .9993.4482.9993.9993.0001.5511-.4483.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5896 8.4024 13.8562 8 12 8s-3.5896.4024-5.1368 1.0507L4.8409 5.5477a.416.416 0 00-.5676-.1521.4157.4157 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3432-4.1021-2.6889-7.5743-6.1185-9.4396"/>
                              </svg>
                              <div>
                                <span className="block text-[10px] font-bold text-stone-900 leading-tight">Android</span>
                                <span className="block text-[9px] text-stone-500">Google Play</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 rounded-xl bg-stone-50/80 border border-stone-200/80 px-2.5 py-1.5 text-stone-800">
                              <svg className="w-4 h-4 text-stone-900 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                              </svg>
                              <div>
                                <span className="block text-[10px] font-bold text-stone-900 leading-tight">iOS</span>
                                <span className="block text-[9px] text-stone-500">App Store</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                </div>

                {/* Badge explicite application mobile Android & iOS (Liquide Glass) */}
                <div className="mt-5 inline-flex items-center gap-2.5 rounded-2xl bg-white/65 backdrop-blur-xl border border-white/75 px-4 py-2.5 text-xs text-stone-900 shadow-[0_4px_14px_rgba(0,0,0,0.03),inset_0_1px_1px_rgba(255,255,255,0.8)]">
                  <Smartphone className="w-4 h-4 text-amber-900 shrink-0" />
                  <span>
                    Application mobile pour <strong>Android</strong> & <strong>iOS</strong> prochainement disponible.
                  </span>
                </div>

                {/* Accès rapide connexion */}
                <p className="mt-4 text-xs text-stone-600">
                  Déjà enregistré ?{" "}
                  <Link to="/login" className="text-amber-800 font-bold hover:underline">
                    Se connecter
                  </Link>{" "}
                  ou visiter{" "}
                  <a href="https://eureka.inexiumus.com" className="text-amber-800 font-bold hover:underline" target="_blank" rel="noopener noreferrer">
                    eureka.inexiumus.com
                  </a>
                </p>
              </div>

            </div>

            {/* ── COLONNE VISUELLE DROITE : CADRE LIQUIDE GLASS AVEC IMAGE /Heros.jpg ── */}
            <div className="lg:col-span-6 xl:col-span-6 relative overflow-hidden rounded-3xl border border-white/75 bg-white/60 backdrop-blur-2xl shadow-[0_20px_50px_rgba(180,120,40,0.1),inset_0_1px_2px_rgba(255,255,255,0.95)] min-h-[420px] sm:min-h-[500px] lg:min-h-[580px] h-full flex items-center justify-center group">
              <img
                src="/Heros.jpg"
                alt="Gestion académique et éducative Eurêka ERP"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                loading="eager"
              />
            </div>

          </div>
        </div>
      </section>

      {/* ── SECTION DES NIVEAUX D'ENSEIGNEMENT SOUS FORME DE TABS (MATERNELLE A UNIVERSITE) ── */}
      <section id="niveaux" className="py-16 md:py-24 bg-[#FAECBE] relative">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-200/90 border border-amber-300 px-4 py-1.5 text-xs font-bold text-amber-900 uppercase tracking-wider">
              <GraduationCap className="w-4 h-4 text-amber-800" />
              Couverture Académique Intégrale
            </span>
            <h2 className="mt-4 font-display text-3xl sm:text-5xl font-black text-stone-950 tracking-tight">
              De la Maternelle à l'Université
            </h2>
            <p className="mt-4 text-base sm:text-lg text-stone-700">
              Eurêka ERP s'adapte précisément à la réalité de chaque cycle d'enseignement : terminologies, relevés, emplois du temps et règles de calculs changent automatiquement.
            </p>
          </div>

          {/* Sélecteur de TAB interactif avec effet Liquide Glass */}
          <div className="flex justify-center mb-10">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 bg-white/60 backdrop-blur-2xl p-2 rounded-2xl border border-white/70 shadow-[0_8px_30px_rgba(0,0,0,0.04),inset_0_1px_2px_rgba(255,255,255,0.85)] max-w-4xl w-full">
              {educationLevels.map((lvl) => {
                const isActive = activeTab === lvl.id;
                return (
                  <button
                    key={lvl.id}
                    onClick={() => setActiveTab(lvl.id)}
                    className={`flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-xl text-sm font-bold transition-all duration-200 ${isActive
                      ? "bg-amber-600 text-white shadow-md scale-[1.02] border border-amber-500/50"
                      : "text-stone-700 hover:text-stone-950 hover:bg-white/50 backdrop-blur-sm"
                      }`}
                  >
                    <span className={isActive ? "text-white" : "text-amber-700"}>
                      {lvl.icon}
                    </span>
                    <span className="truncate">{lvl.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Contenu du TAB Actif en Liquide Glass */}
          <div className="bg-white/75 backdrop-blur-2xl rounded-3xl border border-white/80 p-6 sm:p-10 lg:p-12 shadow-[0_20px_50px_rgba(180,120,40,0.08),inset_0_1px_2px_rgba(255,255,255,0.95)] relative overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">

              {/* Colonne gauche : Description, Fonctionnalités, KPI & CTA */}
              <div className="lg:col-span-6 space-y-6">
                <div>
                  <span className="inline-block rounded-full bg-amber-100/90 backdrop-blur-md border border-amber-300 px-3 py-1 text-xs font-bold text-amber-900 mb-3 shadow-xs">
                    {currentLevel.badge}
                  </span>
                  <div className="text-xs text-stone-500 font-bold uppercase tracking-wider mb-2">
                    {currentLevel.sublabel}
                  </div>
                  <h3 className="font-display text-2xl sm:text-3xl font-black text-stone-900 leading-snug">
                    {currentLevel.title}
                  </h3>
                  <p className="mt-3 text-stone-700 leading-relaxed text-sm sm:text-base">
                    {currentLevel.description}
                  </p>
                </div>

                {/* KPI Highlight Box */}
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#FAF0D1]/80 backdrop-blur-xl border border-amber-200/80 shadow-[inset_0_1px_2px_rgba(255,255,255,0.9)]">
                  <div className="font-display text-2xl sm:text-3xl font-black text-amber-800">
                    {currentLevel.highlightKpi}
                  </div>
                  <div className="text-xs sm:text-sm text-stone-800 font-semibold">
                    {currentLevel.highlightLabel}
                  </div>
                </div>

                {/* Liste des points forts */}
                <ul className="space-y-3">
                  {currentLevel.features.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-sm text-stone-700">
                      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                        <Check className="h-3.5 w-3.5" />
                      </div>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>

                {/* Bouton d'action pour ce niveau */}
                <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                  <Link
                    to="/register"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-6 py-3.5 text-sm font-bold text-white shadow-md hover:bg-amber-700 transition-all duration-200"
                  >
                    <span>{currentLevel.ctaText}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    to="/login"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-white/80 bg-white/60 backdrop-blur-xl px-5 py-3.5 text-sm font-semibold text-stone-800 hover:text-stone-950 hover:bg-white/90 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)] transition-all"
                  >
                    <LogIn className="w-4 h-4 text-amber-700" />
                    <span>Se connecter</span>
                  </Link>
                </div>
              </div>

              {/* Colonne droite : Image HD représentative issue de /public */}
              <div className="lg:col-span-6">
                <div className="relative group overflow-hidden rounded-2xl border border-white/80 bg-white/40 backdrop-blur-xl shadow-lg">
                  <img
                    src={currentLevel.image}
                    alt={currentLevel.imageAlt}
                    className="w-full h-[360px] sm:h-[420px] object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute bottom-4 left-4 right-4 z-20 flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-900 bg-white/85 backdrop-blur-xl px-3 py-1.5 rounded-xl border border-white/80 shadow-sm">
                      Module {currentLevel.label} &bull; Eurêka ERP
                    </span>
                    <span className="text-xs font-bold text-amber-900 bg-[#FAF0D1]/90 backdrop-blur-xl px-3 py-1.5 rounded-xl border border-white/80 shadow-sm flex items-center gap-1">
                      Conforme Afrique
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* ── FONCTIONNALITÉS COMPLÈTES ── */}
      <section id="fonctionnalites" className="py-24 bg-[#FAECBE]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-block rounded-full bg-amber-200/90 border border-amber-300 px-4 py-1.5 text-xs font-bold text-amber-900 uppercase tracking-wider">
              Fonctionnalités Centrales
            </span>
            <h2 className="mt-4 font-display text-3xl sm:text-5xl font-black text-stone-950">
              Tous les modules de gestion réunis
            </h2>
            <p className="mt-4 text-stone-700">
              Fini les tableurs éparpillés. Eurêka unifie l'ensemble de votre écosystème scolaire en un portail robuste et moderne.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div
                key={f.title}
                className="group rounded-2xl border border-white/75 bg-white/65 hover:bg-white/85 backdrop-blur-xl p-6 hover:border-amber-400 hover:shadow-[0_16px_36px_rgba(180,120,40,0.12),inset_0_1px_2px_rgba(255,255,255,0.9)] transition-all duration-300 shadow-[0_8px_24px_rgba(0,0,0,0.03),inset_0_1px_1px_rgba(255,255,255,0.8)] hover:-translate-y-1"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100/90 backdrop-blur-md text-amber-800 border border-amber-200/80 shadow-xs group-hover:bg-amber-600 group-hover:text-white transition-colors">
                  {f.icon}
                </div>
                <h3 className="mt-5 font-display text-lg font-bold text-stone-900 group-hover:text-amber-800 transition-colors">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm text-stone-600 leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PARCOURS EN 3 ÉTAPES (CONNEXION & CRÉATION DE COMPTE) ── */}
      <section className="py-24 bg-[#FAECBE]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-block rounded-full bg-amber-200/90 border border-amber-300 px-4 py-1.5 text-xs font-bold text-amber-900 uppercase tracking-wider">
              Mise en service rapide
            </span>
            <h2 className="mt-4 font-display text-3xl sm:text-5xl font-black text-stone-950">
              Opérationnel en 48 heures
            </h2>
            <p className="mt-4 text-stone-700">
              Un parcours fluide pour inscrire votre établissement et donner l'accès à vos équipes.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {[
              {
                step: "01",
                icon: <Building2 className="w-6 h-6" />,
                title: "1. Enregistrez votre établissement",
                desc: "Remplissez le formulaire de création de compte avec le profil de votre école (maternelle, primaire, collège, lycée ou université).",
                linkText: "Créer un compte →",
                linkTo: "/register",
              },
              {
                step: "02",
                icon: <Shield className="w-6 h-6" />,
                title: "2. Validation & Configuration",
                desc: "Notre équipe vérifie votre dossier et paramètre votre espace dédié sous 24 à 48 heures ouvrables sans engagement.",
                linkText: "Support & Assistance",
                linkTo: "#",
              },
              {
                step: "03",
                icon: <Zap className="w-6 h-6" />,
                title: "3. Connectez-vous & Pilotez",
                desc: "Accédez à votre tableau de bord par le web ou via l'application desktop macOS/Windows et invitez vos collaborateurs.",
                linkText: "Se connecter →",
                linkTo: "/login",
              },
            ].map((st) => (
              <div
                key={st.step}
                className="relative rounded-3xl border border-white/75 bg-white/70 hover:bg-white/90 backdrop-blur-xl p-8 shadow-[0_10px_30px_rgba(0,0,0,0.03),inset_0_1px_2px_rgba(255,255,255,0.85)] hover:shadow-[0_20px_40px_rgba(180,120,40,0.12)] hover:border-amber-400 transition-all duration-300 group"
              >
                <div className="font-display text-6xl font-black text-amber-200/80 absolute top-4 right-6 transition-transform duration-300 group-hover:scale-110">
                  {st.step}
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100/90 backdrop-blur-md text-amber-800 border border-amber-200/80 shadow-xs">
                  {st.icon}
                </div>
                <h3 className="mt-6 font-display text-lg font-bold text-stone-900">{st.title}</h3>
                <p className="mt-2 text-sm text-stone-600 leading-relaxed">{st.desc}</p>
                <div className="mt-6">
                  <Link
                    to={st.linkTo}
                    className="text-xs font-bold text-amber-800 hover:text-amber-900 transition-colors inline-flex items-center gap-1"
                  >
                    {st.linkText}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TÉMOIGNAGES ── */}
      <section id="temoignages" className="py-24 bg-[#FAECBE] border-t border-[#E8D4A2]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-block rounded-full bg-amber-200/90 border border-amber-300 px-4 py-1.5 text-xs font-bold text-amber-900 uppercase tracking-wider">
              Témoignages
            </span>
            <h2 className="mt-4 font-display text-3xl sm:text-5xl font-black text-stone-950">
              Ils ont choisi l'excellence avec Eurêka
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="rounded-3xl border border-white/75 bg-white/70 backdrop-blur-xl p-8 shadow-[0_10px_30px_rgba(0,0,0,0.03),inset_0_1px_2px_rgba(255,255,255,0.85)] hover:shadow-[0_16px_36px_rgba(180,120,40,0.1)] hover:border-amber-300 transition-all duration-300 relative"
              >
                <div className="flex gap-1 mb-5">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-500 text-amber-500" />
                  ))}
                </div>
                <p className="text-sm text-stone-700 leading-relaxed italic">
                  "{t.text}"
                </p>
                <div className="mt-6 flex items-center gap-3 pt-4 border-t border-stone-100/80">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-600 text-white font-display font-black text-base shadow-sm">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-stone-900">{t.name}</div>
                    <div className="text-xs text-amber-800 font-medium">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION HÉROS IMPACT & STATISTIQUES (AVANT LE DERNIER CTA) ── */}
      <section className="py-20 bg-[#FAECBE] border-t border-[#E8D4A2]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          {/* En-tête de section */}
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-200/90 border border-amber-300 px-4 py-1.5 text-xs font-bold text-amber-900 uppercase tracking-wider">
              <BarChart3 className="w-4 h-4 text-amber-800" />
              Impact & Présence Régionale
            </span>
            <h2 className="mt-4 font-display text-3xl sm:text-5xl font-black text-stone-950 tracking-tight">
              Des chiffres qui témoignent de la confiance
            </h2>
            <p className="mt-4 text-base sm:text-lg text-stone-700">
              Chaque jour, directeurs, enseignants, élèves et parents s'appuient sur Eurêka ERP pour assurer le succès de leur année académique.
            </p>
          </div>

          {/* Grille des 4 statistiques clés en Liquide Glass */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-16">
            {stats.map((s) => (
              <div
                key={s.label}
                className="rounded-3xl border border-white/75 bg-white/70 backdrop-blur-xl p-6 sm:p-8 text-center shadow-[0_8px_24px_rgba(0,0,0,0.03),inset_0_1px_2px_rgba(255,255,255,0.85)] hover:shadow-[0_16px_36px_rgba(180,120,40,0.12)] hover:border-amber-400 hover:-translate-y-1 transition-all duration-300"
              >
                <div className="font-display text-3xl sm:text-5xl font-black text-amber-800">{s.value}</div>
                <div className="mt-2 text-xs sm:text-sm text-stone-600 font-semibold">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Showcase héros : Eurêka sur Mobile (Android & iOS) et tous les écrans */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center rounded-3xl border border-white/80 bg-white/75 backdrop-blur-2xl p-6 sm:p-10 lg:p-12 shadow-[0_20px_50px_rgba(180,120,40,0.08),inset_0_1px_2px_rgba(255,255,255,0.95)]">
            
            <div className="lg:col-span-6 space-y-5">
              <span className="inline-flex items-center gap-2 rounded-full bg-amber-100/90 backdrop-blur-md border border-amber-300 px-3.5 py-1.5 text-xs font-bold text-amber-900 shadow-xs">
                <Smartphone className="w-4 h-4 text-amber-700" />
                Écosystème Mobile & Desktop
              </span>
              
              <h3 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black text-stone-950 leading-tight">
                Eurêka partout avec vous, <br />
                <span className="text-amber-800">sur tous vos appareils</span>
              </h3>

              <p className="text-sm sm:text-base text-stone-700 leading-relaxed">
                Accessible sur le Web, installable sur ordinateur (macOS & Windows), Eurêka arrive très bientôt dans votre poche.
                L'application mobile dédiée aux parents, élèves et enseignants sera <strong>disponible sur Android (Google Play) et iOS (App Store)</strong> pour suivre les présences, notes et paiements en direct.
              </p>

              {/* Badges stores */}
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center gap-3 rounded-2xl border border-white/80 bg-white/70 backdrop-blur-xl px-4 py-2.5 text-stone-800 shadow-[0_4px_12px_rgba(0,0,0,0.03),inset_0_1px_1px_rgba(255,255,255,0.8)]">
                  <svg className="w-6 h-6 text-emerald-600 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.551 0 .9993.4482.9993.9993.0001.5511-.4483.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5896 8.4024 13.8562 8 12 8s-3.5896.4024-5.1368 1.0507L4.8409 5.5477a.416.416 0 00-.5676-.1521.4157.4157 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3432-4.1021-2.6889-7.5743-6.1185-9.4396"/>
                  </svg>
                  <div>
                    <span className="block text-[10px] text-stone-500 uppercase font-bold tracking-wider">Bientôt disponible sur</span>
                    <span className="font-extrabold text-stone-900 text-sm">Google Play (Android)</span>
                  </div>
                </div>

                <div className="inline-flex items-center gap-3 rounded-2xl border border-white/80 bg-white/70 backdrop-blur-xl px-4 py-2.5 text-stone-800 shadow-[0_4px_12px_rgba(0,0,0,0.03),inset_0_1px_1px_rgba(255,255,255,0.8)]">
                  <svg className="w-6 h-6 text-stone-900 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                  <div>
                    <span className="block text-[10px] text-stone-500 uppercase font-bold tracking-wider">Bientôt disponible sur</span>
                    <span className="font-extrabold text-stone-900 text-sm">App Store (iOS)</span>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 text-xs font-bold text-amber-800 hover:text-amber-900 transition-colors"
                >
                  <Building2 className="w-4 h-4 text-amber-700" />
                  <span>Enregistrer mon établissement dès aujourd'hui</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            <div className="lg:col-span-6 relative overflow-hidden rounded-2xl border border-white/80 bg-white/40 backdrop-blur-xl shadow-lg aspect-[16/10] sm:aspect-[4/3] flex items-center justify-center">
              <img
                src="/landing1.jpg"
                alt="Eurêka ERP sur tous les écrans"
                className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                loading="lazy"
              />
            </div>

          </div>

        </div>
      </section>

      {/* ── BANNIÈRE D'APPEL À L'ACTION FINALE ── */}
      <section className="py-20 bg-[#FAECBE]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="rounded-3xl bg-amber-800 text-white p-10 sm:p-16 shadow-xl relative overflow-hidden">
            <div className="relative z-10 max-w-3xl mx-auto">
              <span className="inline-flex items-center gap-2 rounded-full bg-amber-700/80 px-4 py-1.5 text-xs font-bold text-amber-100">
                <CheckCircle2 className="w-4 h-4 text-amber-300" />
                Inscription sans engagement · Accompagnement gratuit
              </span>

              <h2 className="mt-6 font-display text-3xl sm:text-5xl font-black text-white leading-tight">
                Modernisez votre établissement dès aujourd'hui
              </h2>

              <p className="mt-4 text-amber-100/90 text-base sm:text-lg">
                Rejoignez les dizaines d'écoles, collèges, lycées et universités qui font confiance à Eurêka pour offrir une expérience moderne à leurs élèves, parents et enseignants.
              </p>

              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  to="/register"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-3 rounded-2xl bg-[#FAECBE] px-8 py-4 text-base font-bold text-stone-900 shadow-md hover:bg-white transition-all duration-200 hover:scale-105"
                >
                  <Building2 className="w-5 h-5 text-amber-800" />
                  <span>Enregistrer mon établissement</span>
                  <ArrowRight className="w-5 h-5" />
                </Link>

                <Link
                  to="/login"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-600 bg-amber-900/60 px-8 py-4 text-base font-bold text-white hover:bg-amber-900 transition-all duration-200"
                >
                  <LogIn className="w-5 h-5 text-amber-300" />
                  <span>Se connecter à mon espace</span>
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-amber-200">
                <span className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-amber-300" />
                  Maternelle à Université
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-amber-300" />
                  Mode Hors-ligne Garanti
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-amber-300" />
                  Mobile Money Intégré
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER CHALEUREUX ET CLAIR ── */}
      <footer className="bg-[#EED596] border-t border-[#DFBE73] text-stone-800 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">

            {/* Colonne 1 : Brand */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/70 backdrop-blur-xl border border-white/80 shadow-[0_4px_14px_rgba(0,0,0,0.06),inset_0_1px_2px_rgba(255,255,255,0.95)] p-1.5">
                  <img src="/favicon.svg" alt="Eurêka ERP" className="h-full w-full object-contain" />
                </div>
                <span className="font-display font-black text-xl text-stone-900">Eurêka ERP</span>
              </div>
              <p className="text-sm text-stone-700 leading-relaxed">
                Le système de gestion scolaire et universitaire nouvelle génération adapté aux réalités africaines.
              </p>
            </div>

            {/* Colonne 2 : Niveaux */}
            <div>
              <h4 className="text-sm font-bold text-stone-950 uppercase tracking-wider mb-4">Cycles d'enseignement</h4>
              <ul className="space-y-2 text-sm text-stone-700 font-medium">
                <li><button onClick={() => { setActiveTab("maternelle"); window.location.href = "#niveaux"; }} className="hover:text-amber-900">Maternelle & Petite Enfance</button></li>
                <li><button onClick={() => { setActiveTab("primaire"); window.location.href = "#niveaux"; }} className="hover:text-amber-900">Primaire (CP à CM2)</button></li>
                <li><button onClick={() => { setActiveTab("secondaire"); window.location.href = "#niveaux"; }} className="hover:text-amber-900">Secondaire (Collège & Lycée)</button></li>
                <li><button onClick={() => { setActiveTab("superieur"); window.location.href = "#niveaux"; }} className="hover:text-amber-900">Supérieur & Université (LMD)</button></li>
              </ul>
            </div>

            {/* Colonne 3 : Téléchargements */}
            <div>
              <h4 className="text-sm font-bold text-stone-950 uppercase tracking-wider mb-4">Applications Desktop</h4>
              <ul className="space-y-2 text-sm text-stone-700 font-medium">
                <li><a href="/release/Eureka ERP-1.0.0.dmg" download className="hover:text-amber-900">macOS (Apple Silicon & Intel)</a></li>
                <li><a href="/release/Eureka ERP Setup 1.0.0.exe" download className="hover:text-amber-900">Windows (Installeur Setup)</a></li>
                <li><a href="/release/Eureka ERP 1.0.0.exe" download className="hover:text-amber-900">Windows (Version Portable)</a></li>
                <li><a href="/release/Eureka ERP-1.0.0-mac.zip" download className="hover:text-amber-900">macOS (Archive ZIP)</a></li>
              </ul>
            </div>

            {/* Colonne 4 : Portails & Inscription */}
            <div>
              <h4 className="text-sm font-bold text-stone-950 uppercase tracking-wider mb-4">Accès Rapide</h4>
              <ul className="space-y-2 text-sm text-stone-700 font-medium">
                <li><Link to="/login" className="hover:text-amber-900 font-bold text-amber-900">Se connecter</Link></li>
                <li><Link to="/register" className="hover:text-amber-900 font-bold text-amber-900">Enregistrer un établissement</Link></li>
                <li><Link to="/confidentialite" className="hover:text-amber-900">Politique de Confidentialité</Link></li>
                <li><a href="https://eureka.inexiumus.com" target="_blank" rel="noopener noreferrer" className="hover:text-amber-900">Domaine officiel eureka.inexiumus.com</a></li>
              </ul>
            </div>

          </div>

          <div className="mt-12 border-t border-[#DFBE73] pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-600 font-medium">
            <p>© {new Date().getFullYear()} Eurêka ERP · Inexiumus · Tous droits réservés.</p>
            <div className="flex items-center gap-4">
              <Link to="/confidentialite" className="hover:underline text-stone-700 font-semibold">
                Politique de Confidentialité
              </Link>
              <span>·</span>
              <p className="flex items-center gap-1">
                Conçu pour l'essor de l'éducation en Afrique.
              </p>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
