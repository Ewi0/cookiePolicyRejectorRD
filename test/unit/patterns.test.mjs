// What the engine would make of a button label, in every language patterns.js knows.
// kindOf() is the exact decision engine.js takes for each visible control.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadContent } from './load.mjs';

const P = loadContent('patterns.js').patterns;

function expectKind(kind, labels) {
  for (const label of labels) assert.equal(P.kindOf(label), kind, `"${label}" should be ${kind}`);
}

test('refuse buttons, about 25 languages', () => {
  expectKind('reject', [
    'Reject all', 'Reject All Cookies', 'Decline', 'Deny', 'Refuse non-essential cookies', 'I do not agree',
    'Only necessary cookies', 'Necessary only', 'Use necessary cookies only', 'Accept only necessary cookies',
    'Only allow essential cookies', 'Continue without accepting', 'No, thanks',
    'Alle ablehnen', 'Ablehnen', 'Nur notwendige Cookies', 'Nur essenzielle Cookies akzeptieren', 'Weiter ohne Einwilligung',
    'Tout refuser', 'Refuser', 'Je refuse', 'Continuer sans accepter',
    'Rechazar todo', 'Rechazar', 'Solo cookies necesarias', 'Continuar sin aceptar',
    'Rifiuta tutto', 'Rifiuta', 'Continua senza accettare',
    'Rejeitar tudo', 'Recusar', 'Continuar sem aceitar',
    'Alles weigeren', 'Weigeren', 'Alleen noodzakelijke cookies',
    'Odrzuć wszystkie', 'Odrzuć',
    'Avvisa alla', 'Neka', 'Endast nödvändiga cookies', 'Afvis alle', 'Avvis alle', 'Hylkää kaikki',
    'Odmítnout vše', 'Odmietnuť všetko', 'Összes elutasítása', 'Respinge tot', 'Απόρριψη όλων', 'Tümünü reddet',
    'Отклонить все', 'Відхилити все', 'Отхвърли всички', 'Odbij sve', 'Zavrni vse',
    'Atmesti visus', 'Noraidīt visus', 'Keeldu kõigist',
    'すべて拒否', '全部拒绝', '拒絕', '모두 거부', 'رفض', 'דחה',
  ]);
});

test('approve buttons, about 25 languages', () => {
  expectKind('accept', [
    'Accept all', 'Accept All Cookies', 'Allow all', 'Allow all cookies', 'I agree', 'Agree and close', 'I accept',
    'Alle akzeptieren', 'Akzeptieren', 'Zustimmen', 'Alle Cookies zulassen', 'Einverstanden',
    'Tout accepter', 'Accepter', 'J’accepte', 'Aceptar todo', 'Aceptar', 'Acepto',
    'Accetta tutto', 'Accetto', 'Aceitar tudo', 'Alles accepteren', 'Akkoord',
    'Akceptuj wszystkie', 'Zaakceptuj wszystkie', 'Zgadzam się',
    'Acceptera alla', 'Godkänn alla', 'Accepter alle', 'Tillad alle', 'Godta alle', 'Hyväksy kaikki',
    'Přijmout vše', 'Prijať všetko', 'Összes elfogadása', 'Acceptă tot', 'Αποδοχή όλων', 'Tümünü kabul et',
    'Принять все', 'Прийняти все', 'Приеми всички', 'Prihvati sve', 'Sprejmi vse',
    'Priimti visus', 'Pieņemt visus', 'Luba kõik',
    'すべて受け入れる', '同意する', '全部接受', '모두 동의', 'قبول', 'אישור',
  ]);
});

test('vague labels only count inside a clear cookie notice', () => {
  expectKind('weak', ['Got it', 'OK', 'Okay', 'I understand', 'Verstanden', "J'ai compris", 'Entendido', 'Ho capito', 'Rozumiem', 'Понятно']);
});

test('save and settings controls of the second layer', () => {
  expectKind('save', [
    'Save preferences', 'Save & exit', 'Confirm my choices', 'Allow selection', 'Auswahl speichern', 'Enregistrer mes choix',
    'Guardar preferencias', 'Salva le preferenze', 'Voorkeuren opslaan', 'Zapisz ustawienia', 'Spara inställningar', 'Сохранить настройки',
  ]);
  expectKind('settings', [
    'Cookie settings', 'Manage preferences', 'Customize', 'More options', 'Einstellungen', 'Paramétrer', 'Personnaliser',
    'Configurar', 'Impostazioni', 'Instellingen', 'Ustawienia', 'Inställningar', 'Настройки', '設定',
  ]);
  expectKind('close', ['×', '✕', 'Close', 'Dismiss', 'Schließen', 'Fermer', 'Cerrar', 'Chiudi']);
});

test('never presses policy links, paywall exits or log-ins', () => {
  expectKind(null, [
    'Reject all and subscribe', 'Subscribe now', 'Jetzt abonnieren', 'Pur-Abo abschließen', 'Werbefrei lesen', "S'abonner",
    'Suscríbete', 'Abbonati', 'Log in', 'Sign in', 'Se connecter', 'Anmelden', 'Privacy policy', 'Cookie policy',
    'Learn more', 'Mehr erfahren', 'En savoir plus', 'Show vendors', 'Partners', 'Impressum',
  ]);
});

test('ignores ordinary controls and runaway labels', () => {
  expectKind(null, ['', '   ', 'Next', 'Menu', 'Read the article', 'Search', `Accept ${'all '.repeat(30)}`]);
});

test('labels are normalised before matching', () => {
  assert.equal(P.norm('  Accept   ALL! '), 'accept all');
  assert.equal(P.norm('J’accepte'), "j'accepte");
  assert.equal(P.norm('→ Tout refuser ←'), 'tout refuser');
});

test('recognises a cookie notice by its wording', () => {
  for (const text of [
    'We use cookies to improve your experience', 'Diese Website verwendet Cookies', 'Ce site utilise des cookies',
    'Utilizziamo i cookie', 'Usamos cookies', 'Wij gebruiken cookies', 'Używamy ciasteczek', 'Ta strona korzysta z ciasteczka',
    'Vi använder kakor', 'Mēs izmantojam sīkdatnes', 'Sīkdatņu iestatījumi', 'Χρησιμοποιούμε μπισκότα', 'Bu site çerez kullanır',
    'Мы используем куки', 'クッキーを使用しています', '쿠키를 사용합니다', 'Manage your consent',
  ]) assert.ok(P.topic.test(text), text);
  assert.ok(!P.topic.test('Local council approves new bike lanes'));
});
