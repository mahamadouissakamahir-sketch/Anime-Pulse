// =====================================================================
// CONFIGURATION MONÉTISATION — AnimePulse
// Seul fichier à modifier pour la monétisation. Rien d'autre à toucher.
// =====================================================================

// -----------------------------------------------------------------
// 1) PUBLICITÉ — désactivée pour l'instant.
// Pour activer plus tard : ADS_ENABLED = true + colle ton AD_CLIENT_ID
// (ex: "ca-pub-1234567890") une fois ton compte AdSense validé.
// -----------------------------------------------------------------
const ADS_ENABLED = false;
const AD_CLIENT_ID = "REMPLACE_MOI";

// -----------------------------------------------------------------
// 2) BOUTON "SOUTENIR" — Wave, Amana, Airtel Money
// Le clic ouvre l'appli via un lien "intent://" (la méthode fiable sur
// Android : soit ça ouvre l'appli installée, soit ça bascule proprement
// vers le Play Store — jamais de page d'erreur). Le numéro reste aussi
// toujours affiché en secours pour un envoi manuel.
//
// Si "androidPackage" est laissé à null (cas d'Airtel Money ici, le
// package exact variant selon les pays), le bouton saute directement à
// l'affichage du numéro — toujours zéro erreur, juste pas de tentative
// d'ouverture automatique.
//
// Si un jour tu obtiens un vrai lien de paiement (ex: Wave Business,
// pay.wave.com/m/...), colle-le dans "link" : le bouton l'utilisera
// alors en priorité pour un vrai clic direct pré-rempli.
// -----------------------------------------------------------------
const SUPPORT_CONFIG = {
  wave: {
    label: "Wave",
    number: "+227 96 33 20 18",
    link: null,
    androidPackage: "com.wave.personal",
    storeUrl: "https://play.google.com/store/apps/details?id=com.wave.personal"
  },
  amana: {
    label: "Amana (AmanaTa)",
    number: "+227 96 33 20 18",
    link: null,
    androidPackage: "com.iisoft.tm.appamana",
    storeUrl: "https://play.google.com/store/apps/details?id=com.iisoft.tm.appamana"
  },
  airtel: {
    label: "Airtel Money",
    number: "+227 96 33 20 18",
    link: null,
    androidPackage: null, // package variable selon les pays, pas de tentative d'ouverture auto
    storeUrl: "https://play.google.com/store/search?q=Airtel%20Money&c=apps"
  }
};

// -----------------------------------------------------------------
// 3) CONTACT — WhatsApp
// Lien "wa.me" officiel : fonctionne toujours (ouvre l'appli si
// installée, sinon WhatsApp Web), jamais d'erreur, aucune config à
// faire d'autre que le numéro.
// -----------------------------------------------------------------
const WHATSAPP_CONFIG = {
  number: "22796332018" // format international SANS + ni espaces (exigé par wa.me)
};
