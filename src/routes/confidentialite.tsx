import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, Shield, Lock, Eye, FileText, CheckCircle2, Mail, Building2 } from 'lucide-react';

export const Route = createFileRoute('/confidentialite')({
  component: ConfidentialitePage,
});

function ConfidentialitePage() {
  const lastUpdated = "21 novembre 2026";

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans selection:bg-[#DFBE73]/30">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-stone-200/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            to="/landing"
            className="flex items-center gap-2 text-sm font-semibold text-stone-700 hover:text-stone-950 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour à l'accueil</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 p-1.5">
              <Shield className="w-5 h-5 text-amber-700" />
            </div>
            <span className="font-bold text-base text-stone-950">Eurêka · Confidentialité</span>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-b from-amber-500/10 via-stone-50 to-stone-50 border-b border-stone-200/60 py-12 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-900 text-xs font-bold mb-4">
            <Shield className="w-3.5 h-3.5" />
            Protection des données scolaires & familiales
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-stone-950 tracking-tight">
            Politique de Confidentialité
          </h1>
          <p className="mt-3 text-sm sm:text-base text-stone-600 max-w-2xl mx-auto">
            Chez Eurêka ERP, la protection de la vie privée des élèves, parents, enseignants et établissements scolaires est au cœur de nos engagements.
          </p>
          <p className="mt-2 text-xs text-stone-500">
            Dernière mise à jour : {lastUpdated} · Applicable à l'application web et mobile iOS (App Store)
          </p>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="bg-white rounded-3xl border border-stone-200/80 shadow-sm p-6 sm:p-10 space-y-10">

          {/* 1. Introduction & Responsable */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-amber-800">
              <Building2 className="w-5 h-5" />
              <h2 className="text-lg font-bold text-stone-950">1. Responsable du traitement des données</h2>
            </div>
            <p className="text-sm leading-relaxed text-stone-700">
              La plateforme <strong>Eurêka ERP</strong> et les applications mobiles associées (dont l'application <strong>Eurêka</strong> sur l'Apple App Store) sont éditées par <strong>Inexiumus</strong>. Les établissements scolaires partenaires agissent en qualité de responsables conjoints de traitement pour la gestion administrative et pédagogique de leurs élèves.
            </p>
          </section>

          {/* 2. Données collectées */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-amber-800">
              <FileText className="w-5 h-5" />
              <h2 className="text-lg font-bold text-stone-950">2. Données collectées</h2>
            </div>
            <p className="text-sm text-stone-700 leading-relaxed">
              Dans le cadre strict du suivi pédagogique et des services périscolaires, les données suivantes peuvent être collectées :
            </p>
            <ul className="grid sm:grid-cols-2 gap-3 text-xs sm:text-sm text-stone-700">
              <li className="flex items-start gap-2 bg-stone-50 p-3 rounded-xl border border-stone-200/60">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Identité élève :</strong> nom, prénoms, date et lieu de naissance, classe, matricule, photo de profil scolaire.</span>
              </li>
              <li className="flex items-start gap-2 bg-stone-50 p-3 rounded-xl border border-stone-200/60">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Coordonnées parents / tuteurs :</strong> nom, téléphone, email, adresse de résidence.</span>
              </li>
              <li className="flex items-start gap-2 bg-stone-50 p-3 rounded-xl border border-stone-200/60">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Vie scolaire :</strong> relevés de notes, bulletins, retards, absences justifiées et observations.</span>
              </li>
              <li className="flex items-start gap-2 bg-stone-50 p-3 rounded-xl border border-stone-200/60">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Services périscolaires :</strong> formules de cantine, régimes alimentaires déclarés, circuits et arrêts de transport scolaire.</span>
              </li>
              <li className="flex items-start gap-2 bg-stone-50 p-3 rounded-xl border border-stone-200/60">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Règlements & Échéanciers :</strong> historique des paiements (scolarité, cantine, transport), reçus officiels (sans stockage de numéros de carte bancaire).</span>
              </li>
              <li className="flex items-start gap-2 bg-stone-50 p-3 rounded-xl border border-stone-200/60">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Authentification :</strong> identifiants sécurisés, tokens de session, authentification Sign in with Apple.</span>
              </li>
            </ul>
          </section>

          {/* 3. Finalités */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-amber-800">
              <Eye className="w-5 h-5" />
              <h2 className="text-lg font-bold text-stone-950">3. Finalités du traitement</h2>
            </div>
            <p className="text-sm text-stone-700 leading-relaxed">
              Vos données sont exclusivement traitées pour :
            </p>
            <div className="grid gap-2 text-xs sm:text-sm text-stone-700">
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/60">
                • Permettre aux parents de consulter les notes, moyennes, bulletins et absences de leurs enfants en temps réel.
              </div>
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/60">
                • Faciliter les inscriptions et le règlement des frais scolaires, déjeuners de cantine et transport scolaire via des passerelles agréées.
              </div>
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/60">
                • Assurer la communication officielle et instantanée entre la direction, le corps professoral et les familles.
              </div>
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/60">
                • Assurer la sécurité physique des élèves (contrôle de ramassage bus, fiches sanitaires d'urgence et régimes cantine).
              </div>
            </div>
          </section>

          {/* 4. Sécurité & Données des Mineurs */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-amber-800">
              <Lock className="w-5 h-5" />
              <h2 className="text-lg font-bold text-stone-950">4. Sécurité et protection des mineurs</h2>
            </div>
            <p className="text-sm text-stone-700 leading-relaxed">
              La plateforme Eurêka applique les plus hauts standards de sécurité de l'industrie :
            </p>
            <ul className="list-disc pl-5 text-xs sm:text-sm text-stone-700 space-y-1.5">
              <li><strong>Chiffrement de bout en bout :</strong> toutes les transmissions sont sécurisées par le protocole TLS 1.3 / HTTPS.</li>
              <li><strong>Isolation stricte des établissements (RLS) :</strong> chaque école dispose d'un espace cloisonné par des politiques Row-Level Security (PostgreSQL).</li>
              <li><strong>Zéro publicité ni traçage :</strong> aucune donnée d'élève ou de parent n'est revendue, cédée ou utilisée à des fins publicitaires ou de profilage commercial.</li>
              <li><strong>Pas de publicité tierce :</strong> l'application mobile ne contient aucun SDK publicitaire ou traceur intrusif.</li>
            </ul>
          </section>

          {/* 5. Vos Droits */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-amber-800">
              <Shield className="w-5 h-5" />
              <h2 className="text-lg font-bold text-stone-950">5. Vos droits (Accès, Rectification, Suppression)</h2>
            </div>
            <p className="text-sm text-stone-700 leading-relaxed">
              Conformément aux réglementations sur la protection des données personnelles, tout parent ou représentant légal dispose des droits suivants :
            </p>
            <div className="grid sm:grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/60">
                <span className="block font-bold text-xs sm:text-sm text-stone-900">Droit d'accès</span>
                <span className="text-[11px] text-stone-600">Consulter l'ensemble des données enregistrées.</span>
              </div>
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/60">
                <span className="block font-bold text-xs sm:text-sm text-stone-900">Droit de rectification</span>
                <span className="text-[11px] text-stone-600">Corriger toute information inexacte ou obsolète.</span>
              </div>
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/60">
                <span className="block font-bold text-xs sm:text-sm text-stone-900">Droit à l'effacement</span>
                <span className="text-[11px] text-stone-600">Demander la suppression de son compte et de ses accès.</span>
              </div>
            </div>
          </section>

          {/* 6. Contact */}
          <section className="border-t border-stone-200 pt-6 space-y-3">
            <div className="flex items-center gap-2 text-stone-900 font-bold text-base">
              <Mail className="w-4 h-4 text-amber-700" />
              <span>Contact & Délégué à la Protection des Données (DPO)</span>
            </div>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              Pour toute question relative à cette politique de confidentialité ou pour exercer vos droits, vous pouvez contacter notre équipe à :
            </p>
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-stone-800">Support Eurêka ERP · Inexiumus</p>
                <p className="text-xs text-stone-600">Abidjan, Côte d'Ivoire</p>
              </div>
              <a
                href="mailto:contact@inexiumus.com"
                className="text-xs font-bold text-amber-900 hover:underline px-3 py-1.5 rounded-lg bg-white border border-amber-500/30 shadow-xs"
              >
                contact@inexiumus.com
              </a>
            </div>
          </section>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200 py-8 px-4 text-center text-xs text-stone-500">
        <p>© {new Date().getFullYear()} Eurêka ERP · Inexiumus · Tous droits réservés.</p>
      </footer>
    </div>
  );
}
