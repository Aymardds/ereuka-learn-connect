import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
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
  BookMarked,
  Layers,
  Clock,
  Zap,
} from "lucide-react";

export const Route = createFileRoute("/landing")({
  component: LandingPage,
});

function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);

  // GitHub Releases base URL for desktop app downloads
  const GH_RELEASE = "https://github.com/Aymardds/ereuka-learn-connect/releases/download/v1.0.0";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const features = [
    {
      icon: <Users className="w-6 h-6" />,
      title: "Gestion des élèves & étudiants",
      desc: "Inscriptions, dossiers, cartes scolaires, absences et comportements centralisés.",
    },
    {
      icon: <BookOpen className="w-6 h-6" />,
      title: "Notes, bulletins & LMD",
      desc: "Saisie des notes, génération automatique de bulletins et gestion du système LMD universitaire.",
    },
    {
      icon: <Banknote className="w-6 h-6" />,
      title: "Paiements Mobile Money",
      desc: "Collecte des frais de scolarité via Wave, Orange Money, MTN, Moov & CinetPay.",
    },
    {
      icon: <Clock className="w-6 h-6" />,
      title: "Emplois du temps",
      desc: "Planification automatique des cours, salles et enseignants sans conflits.",
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: "Statistiques & BI",
      desc: "Tableaux de bord temps réel, rapports financiers et indicateurs de performance.",
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Multi-établissements",
      desc: "Gérez plusieurs campus depuis un seul portail avec des droits d'accès distincts.",
    },
    {
      icon: <Smartphone className="w-6 h-6" />,
      title: "Portail Parents & Élèves",
      desc: "Accès mobile aux notes, paiements, bulletins et communications de l'établissement.",
    },
    {
      icon: <Globe className="w-6 h-6" />,
      title: "Hors-ligne partiel",
      desc: "Fonctionnement garanti même sans connexion internet stable — idéal pour l'Afrique.",
    },
  ];

  const schoolTypes = [
    { icon: <BookMarked className="w-5 h-5" />, label: "Maternelle & Primaire" },
    { icon: <BookOpen className="w-5 h-5" />, label: "Collège & Lycée" },
    { icon: <GraduationCap className="w-5 h-5" />, label: "Université & Supérieur" },
    { icon: <Layers className="w-5 h-5" />, label: "Groupe scolaire multi-niveaux" },
    { icon: <Building2 className="w-5 h-5" />, label: "Centres de formation" },
  ];

  const testimonials = [
    {
      name: "Dr. Kouamé Assoumou",
      role: "Directeur Général, Groupe Scolaire Excellence",
      text: "Eurêka a transformé la gestion de nos 3 campus. Les bulletins qui prenaient 2 semaines se génèrent maintenant en quelques minutes.",
      rating: 5,
    },
    {
      name: "Prof. Fatou Diallo",
      role: "VP Administration, Université Privée de Dakar",
      text: "La gestion LMD et les paiements Wave intégrés ont simplifié énormément notre quotidien. Nos étudiants adorent le portail en ligne.",
      rating: 5,
    },
    {
      name: "M. Jean-Baptiste Zongo",
      role: "Censeur, Lycée Privé Saint-Michel",
      text: "Le suivi des présences et les emplois du temps automatiques nous font gagner un temps précieux chaque semaine.",
      rating: 5,
    },
  ];

  const stats = [
    { value: "50+", label: "Établissements actifs" },
    { value: "30 000+", label: "Élèves & étudiants gérés" },
    { value: "5 pays", label: "Présence en Afrique de l'Ouest" },
    { value: "99.9%", label: "Disponibilité du service" },
  ];

  return (
    <div className="min-h-screen bg-white font-sans antialiased">
      {/* ── NAVBAR ── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link to="/landing" className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-sm">
                <img src="/favicon.svg" alt="Eurêka" className="w-6 h-6" />
              </div>
              <span className="font-display text-xl font-bold text-gray-900">
                Eurêka <span className="text-primary font-normal text-sm">ERP</span>
              </span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-6">
              <a href="#fonctionnalites" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                Fonctionnalités
              </a>
              <a href="#etablissements" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                Établissements
              </a>
              <a href="#temoignages" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                Témoignages
              </a>
              <Link
                to="/login"
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Connexion
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90 transition-opacity"
              >
                Enregistrer mon établissement <ArrowRight className="w-4 h-4" />
              </Link>
            </nav>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-3">
            <a href="#fonctionnalites" className="block text-sm text-gray-700 py-2" onClick={() => setMobileMenuOpen(false)}>Fonctionnalités</a>
            <a href="#etablissements" className="block text-sm text-gray-700 py-2" onClick={() => setMobileMenuOpen(false)}>Établissements</a>
            <a href="#temoignages" className="block text-sm text-gray-700 py-2" onClick={() => setMobileMenuOpen(false)}>Témoignages</a>
            <Link to="/login" className="block text-sm text-gray-700 py-2" onClick={() => setMobileMenuOpen(false)}>Connexion</Link>
            <Link
              to="/register"
              className="block w-full text-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
              onClick={() => setMobileMenuOpen(false)}
            >
              Enregistrer mon établissement
            </Link>
          </div>
        )}
      </header>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden pt-24 pb-20 md:pt-36 md:pb-32">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f291e] via-[#1a4433] to-[#0f291e]" />
        <div className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: "radial-gradient(circle at 20% 50%, #f59e0b 0%, transparent 50%), radial-gradient(circle at 80% 20%, #10b981 0%, transparent 40%)"
          }}
        />
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.3) 1px, transparent 1px)",
            backgroundSize: "40px 40px"
          }}
        />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-medium text-white/80 backdrop-blur-sm mb-8">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
              Nouveau · Disponible sur macOS et Windows
            </div>

            <h1 className="font-display text-4xl font-bold leading-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
              L'ERP éducatif conçu
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-200">
                pour l'Afrique
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg text-white/70 leading-relaxed">
              Eurêka digitalise la gestion académique, financière, RH et administrative de votre établissement scolaire ou universitaire — du primaire au supérieur.
            </p>

            {/* CTA Buttons */}
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              {/* Primary CTA: Register */}
              <Link
                to="/register"
                className="group inline-flex items-center gap-3 rounded-2xl bg-amber-500 px-7 py-4 text-base font-bold text-gray-900 shadow-lg shadow-amber-500/30 hover:bg-amber-400 transition-all duration-200 hover:scale-105"
              >
                <Building2 className="w-5 h-5" />
                Enregistrer mon établissement
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>

              {/* Secondary CTA: Download */}
              <div className="relative">
                <button
                  onClick={() => setDownloadOpen(!downloadOpen)}
                  className="group inline-flex items-center gap-3 rounded-2xl border border-white/25 bg-white/10 px-7 py-4 text-base font-semibold text-white backdrop-blur-sm hover:bg-white/20 transition-all duration-200"
                >
                  <Download className="w-5 h-5" />
                  Télécharger l'application
                  <ChevronDown className={`w-4 h-4 transition-transform ${downloadOpen ? "rotate-180" : ""}`} />
                </button>

                {/* Download dropdown */}
                {downloadOpen && (
                  <div className="absolute top-full left-0 mt-2 w-72 rounded-2xl bg-white shadow-2xl shadow-black/20 border border-gray-100 p-3 z-50">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider px-2 pb-2">
                      Choisir votre plateforme
                    </p>
                    <a
                      href="/release/Eureka ERP Setup 1.0.0.exe"
                      download
                      className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                          <rect x="2" y="2" width="9" height="9" rx="1" fill="#00BCF2"/>
                          <rect x="13" y="2" width="9" height="9" rx="1" fill="#00BCF2"/>
                          <rect x="2" y="13" width="9" height="9" rx="1" fill="#00BCF2"/>
                          <rect x="13" y="13" width="9" height="9" rx="1" fill="#00BCF2"/>
                        </svg>
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-900">Windows</div>
                        <div className="text-xs text-gray-500">Installeur NSIS · 135 MB</div>
                      </div>
                    </a>
                    <a
                      href="/release/Eureka ERP 1.0.0.exe"
                      download
                      className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                          <rect x="2" y="2" width="9" height="9" rx="1" fill="#00BCF2"/>
                          <rect x="13" y="2" width="9" height="9" rx="1" fill="#00BCF2"/>
                          <rect x="2" y="13" width="9" height="9" rx="1" fill="#00BCF2"/>
                          <rect x="13" y="13" width="9" height="9" rx="1" fill="#00BCF2"/>
                        </svg>
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-900">Windows Portable</div>
                        <div className="text-xs text-gray-500">Sans installation · 118 MB</div>
                      </div>
                    </a>
                    <a
                      href="/release/Eureka ERP-1.0.0.dmg"
                      download
                      className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50">
                        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="#555"/>
                          <path d="M15.5 8.5a3.5 3.5 0 0 1-3.5 3.5A3.5 3.5 0 0 1 8.5 8.5 3.5 3.5 0 0 1 12 5a3.5 3.5 0 0 1 3.5 3.5z" fill="#fff"/>
                          <path d="M4 18c1.5-2 4-3 8-3s6.5 1 8 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-900">macOS · DMG</div>
                        <div className="text-xs text-gray-500">Installeur universel · 150 MB</div>
                      </div>
                    </a>
                    <a
                      href="/release/Eureka ERP-1.0.0-mac.zip"
                      download
                      className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50">
                        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="#555"/>
                          <path d="M15.5 8.5a3.5 3.5 0 0 1-3.5 3.5A3.5 3.5 0 0 1 8.5 8.5 3.5 3.5 0 0 1 12 5a3.5 3.5 0 0 1 3.5 3.5z" fill="#fff"/>
                          <path d="M4 18c1.5-2 4-3 8-3s6.5 1 8 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-900">macOS · ZIP</div>
                        <div className="text-xs text-gray-500">Archive portable · 146 MB</div>
                      </div>
                    </a>
                    <div className="mt-2 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2.5">
                      <p className="text-xs text-amber-700">
                        <strong>Version 1.0.0</strong> — Mode hors-ligne pris en charge avec synchronisation automatique et détection de serveur local.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sub-note */}
            <p className="mt-5 text-sm text-white/50">
              Accès web également disponible sur{" "}
              <a href="https://eureka.inexiumus.com" className="text-amber-400 hover:underline" target="_blank" rel="noopener noreferrer">
                eureka.inexiumus.com
              </a>
            </p>
          </div>

          {/* Stats strip */}
          <div className="mt-20 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center backdrop-blur-sm">
                <div className="font-display text-3xl font-bold text-white">{s.value}</div>
                <div className="mt-1 text-xs text-white/60">{s.label}</div>
              </div>
            ))}
          </div>

          {/* App Interface Preview Mockup */}
          <div className="mt-16 -mb-16 relative mx-auto max-w-5xl z-10">
            <div className="rounded-2xl border border-white/20 bg-black/40 p-2 shadow-2xl shadow-black/60 backdrop-blur-md">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10 bg-black/30 rounded-t-xl">
                <span className="h-3 w-3 rounded-full bg-rose-500/80" />
                <span className="h-3 w-3 rounded-full bg-amber-500/80" />
                <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
                <span className="text-[11px] text-white/60 font-mono ml-2">eureka-erp.app &bull; Interface Scolaire & Universitaire</span>
              </div>
              <div className="overflow-hidden rounded-b-xl bg-gray-900">
                <img 
                  src="/landing1.jpg" 
                  alt="Aperçu plateforme Eurêka ERP" 
                  className="w-full h-auto object-cover max-h-[520px] rounded-b-xl"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronDown className="w-6 h-6 text-white/40" />
        </div>
      </section>

      {/* ── TYPES D'ÉTABLISSEMENTS ── */}
      <section id="etablissements" className="pt-28 pb-20 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary uppercase tracking-wider">
              Pour tous les niveaux
            </span>
            <h2 className="mt-4 font-display text-3xl font-bold text-gray-900 sm:text-4xl">
              Adapté à votre type d'établissement
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-gray-500">
              Eurêka s'adapte intelligemment au type d'établissement : les données, menus et terminologies changent automatiquement selon votre profil.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            {schoolTypes.map((t) => (
              <div
                key={t.label}
                className="flex items-center gap-2.5 rounded-2xl border border-gray-200 bg-white px-5 py-3.5 shadow-sm text-sm font-medium text-gray-700 hover:border-primary/40 hover:bg-primary/5 transition-colors"
              >
                <span className="text-primary">{t.icon}</span>
                {t.label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FONCTIONNALITÉS ── */}
      <section id="fonctionnalites" className="py-24 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary uppercase tracking-wider">
              Fonctionnalités complètes
            </span>
            <h2 className="mt-4 font-display text-3xl font-bold text-gray-900 sm:text-4xl">
              Tout ce dont votre établissement a besoin
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-gray-500">
              Une plateforme tout-en-un qui couvre tous les besoins de gestion, de la scolarité aux finances, sans modules séparés à acheter.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div
                key={f.title}
                className="group rounded-2xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-200"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  {f.icon}
                </div>
                <h3 className="mt-4 font-display text-base font-semibold text-gray-900">{f.title}</h3>
                <p className="mt-2 text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMMENT ÇA MARCHE ── */}
      <section className="py-24 bg-gradient-to-br from-[#0f291e] to-[#1a4433]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold text-white/80 uppercase tracking-wider">
              Démarrage rapide
            </span>
            <h2 className="mt-4 font-display text-3xl font-bold text-white sm:text-4xl">
              Opérationnel en 48h
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {[
              {
                step: "01",
                icon: <Building2 className="w-6 h-6" />,
                title: "Enregistrez votre établissement",
                desc: "Remplissez le formulaire en ligne avec les informations de votre école ou université. Gratuit et sans engagement.",
              },
              {
                step: "02",
                icon: <Shield className="w-6 h-6" />,
                title: "Validation & Configuration",
                desc: "Notre équipe valide votre dossier et configure votre espace personnalisé sous 24 à 48h ouvrables.",
              },
              {
                step: "03",
                icon: <Zap className="w-6 h-6" />,
                title: "Accédez et gérez",
                desc: "Connectez-vous au portail web ou téléchargez l'application desktop. Vos données sont sécurisées sur le cloud.",
              },
            ].map((step) => (
              <div key={step.step} className="relative rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
                <div className="font-display text-6xl font-bold text-white/10 absolute top-4 right-6">{step.step}</div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
                  {step.icon}
                </div>
                <h3 className="mt-5 font-display text-lg font-semibold text-white">{step.title}</h3>
                <p className="mt-2 text-sm text-white/60 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TÉMOIGNAGES ── */}
      <section id="temoignages" className="py-24 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary uppercase tracking-wider">
              Ils nous font confiance
            </span>
            <h2 className="mt-4 font-display text-3xl font-bold text-gray-900 sm:text-4xl">
              Ce que disent nos utilisateurs
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {testimonials.map((t) => (
              <div key={t.name} className="rounded-2xl border border-gray-100 bg-white p-7 shadow-sm">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-gray-600 leading-relaxed italic">"{t.text}"</p>
                <div className="mt-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-display font-bold text-sm">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{t.name}</div>
                    <div className="text-xs text-gray-500">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="py-24 bg-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="rounded-3xl bg-gradient-to-br from-[#0f291e] to-[#1a4433] p-12 md:p-16 shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: "radial-gradient(circle at 70% 30%, #f59e0b 0%, transparent 50%)"
              }}
            />
            <div className="relative">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-medium text-white/80">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                Inscription gratuite · Aucun engagement
              </span>
              <h2 className="mt-6 font-display text-3xl font-bold text-white sm:text-4xl">
                Prêt à digitaliser
                <br />
                votre établissement ?
              </h2>
              <p className="mt-4 text-white/60 max-w-xl mx-auto">
                Rejoignez les établissements qui font confiance à Eurêka pour gérer leur administration scolaire au quotidien.
              </p>

              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  to="/register"
                  className="group inline-flex items-center gap-3 rounded-2xl bg-amber-500 px-8 py-4 text-base font-bold text-gray-900 shadow-lg shadow-amber-500/30 hover:bg-amber-400 transition-all duration-200 hover:scale-105"
                >
                  <Building2 className="w-5 h-5" />
                  Enregistrer mon établissement
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-8 py-4 text-base font-semibold text-white backdrop-blur-sm hover:bg-white/20 transition-all duration-200"
                >
                  Accéder à mon portail
                </Link>
              </div>

              <p className="mt-6 text-xs text-white/40">
                En vous inscrivant, vous acceptez nos{" "}
                <a href="#" className="underline hover:text-white/60">Conditions d'utilisation</a>{" "}
                et notre{" "}
                <a href="#" className="underline hover:text-white/60">Politique de confidentialité</a>.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                  <img src="/favicon.svg" alt="Eurêka" className="w-5 h-5" />
                </div>
                <span className="font-display font-bold text-white">Eurêka ERP</span>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed">
                La plateforme de gestion scolaire et universitaire conçue pour l'Afrique.
              </p>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Produit</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#fonctionnalites" className="hover:text-white transition-colors">Fonctionnalités</a></li>
                <li><a href="#etablissements" className="hover:text-white transition-colors">Établissements</a></li>
                <li><a href="#temoignages" className="hover:text-white transition-colors">Témoignages</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Téléchargement</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="/release/Eureka ERP Setup 1.0.0.exe" download className="hover:text-white transition-colors">Windows (Installeur)</a></li>
                <li><a href="/release/Eureka ERP 1.0.0.exe" download className="hover:text-white transition-colors">Windows (Portable)</a></li>
                <li><a href="/release/Eureka ERP-1.0.0.dmg" download className="hover:text-white transition-colors">macOS (DMG)</a></li>
                <li><a href="/release/Eureka ERP-1.0.0-mac.zip" download className="hover:text-white transition-colors">macOS (ZIP)</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Accès</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link to="/login" className="hover:text-white transition-colors">Connexion</Link></li>
                <li><Link to="/register" className="hover:text-white transition-colors">Inscription établissement</Link></li>
                <li><a href="https://eureka.inexiumus.com" className="hover:text-white transition-colors" target="_blank" rel="noopener noreferrer">Portail web</a></li>
              </ul>
            </div>
          </div>

          <div className="mt-10 border-t border-gray-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-gray-500">
              © {new Date().getFullYear()} Eurêka ERP · Inexiumus · Tous droits réservés.
            </p>
            <p className="text-xs text-gray-600">
              Fabriqué avec ❤️ pour l'éducation africaine.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
