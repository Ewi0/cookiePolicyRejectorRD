/* Cookie Policy Rejector — multilingual vocabulary used to recognise consent UI.
 * Labels are normalised (lower-case, collapsed whitespace, trimmed punctuation)
 * before matching. Latin/Cyrillic/Greek phrases need a letter boundary on both
 * sides; CJK/Arabic/Hebrew phrases match as plain substrings. */
var CPR = globalThis.CPR || (globalThis.CPR = {});

(() => {
  const B = '(?<![\\p{L}\\p{N}])';
  const E = '(?![\\p{L}\\p{N}])';
  const words = (list, loose = []) =>
    new RegExp(`${B}(?:${list.join('|')})${E}` + (loose.length ? `|${loose.join('|')}` : ''), 'iu');

  const ONLY_NECESSARY = '(?:strictly |technically )?(?:necessary|essential|required|functional|mandatory)';

  const reject = words([
    // en
    "reject(?: all| everything| optional| non-?essential| additional| unnecessary)?(?: cookies)?",
    "decline(?: all| optional| non-?essential| additional)?(?: cookies)?",
    "deny(?: all)?(?: cookies)?", "refuse(?: all| non-?essential| optional)?(?: cookies)?",
    "disagree(?: to all| and close)?", "i do not (?:agree|accept|consent)", "i don't (?:agree|accept)",
    "do not (?:accept|agree|consent|allow)", "don't (?:accept|allow)", "no,? thanks?", "no thank you",
    `(?:only|just) (?:allow |accept |use )?(?:the )?${ONLY_NECESSARY}(?: cookies)?(?: only)?`,
    `(?:allow |accept |use )?${ONLY_NECESSARY} (?:cookies )?only`,
    `(?:accept|allow|use) (?:only )?${ONLY_NECESSARY}(?: cookies)?`,
    'continue without (?:accepting|agreeing|consent(?:ing)?|cookies)', 'opt[- ]?out(?: of all)?', 'object to all',
    // de
    '(?:alle |alles )?ablehnen', 'verweigern', 'nicht (?:einverstanden|zustimmen|akzeptieren)',
    'nur (?:technisch )?(?:notwendige|essenzielle|essentielle|erforderliche|funktionale)(?: cookies)?(?: (?:akzeptieren|zulassen|erlauben|verwenden))?',
    'weiter ohne (?:einwilligung|zustimmung|zu akzeptieren)', 'ohne (?:einwilligung|zustimmung) fortfahren',
    // fr
    '(?:tout )?refuser(?: tout| et fermer| les cookies| tous les cookies)?', 'je refuse', 'rejeter(?: tout)?',
    'continuer sans accepter', "(?:accepter )?(?:uniquement|seulement) (?:les )?(?:cookies )?(?:strictement )?(?:nécessaires|essentiels)", 'non,? merci',
    // es / pt / it
    'rechazar(?: todo| todas| todos| todas las cookies| cookies| y cerrar)?', 'denegar(?: todo| todas)?', 'no acepto',
    '(?:aceptar )?solo (?:las )?(?:cookies )?(?:necesarias|esenciales|imprescindibles|técnicas)', 'continuar sin aceptar',
    'rejeitar(?: tudo| todos)?', 'recusar(?: tudo| todos)?', '(?:aceitar )?(?:apenas|somente) (?:os )?(?:cookies )?(?:necessários|essenciais)', 'continuar sem aceitar',
    'rifiut(?:a|o)(?: tutto| tutti)?', 'nega(?: tutto)?', 'continua senza accettare', '(?:accetta )?solo (?:i )?(?:cookie )?(?:necessari|essenziali|tecnici)',
    // nl / pl / nordics
    '(?:alles |alle cookies )?weigeren', '(?:alle )?(?:cookies )?afwijzen', 'niet akkoord', 'alleen (?:noodzakelijke|functionele|essentiële)(?: cookies)?', 'nee,? bedankt',
    'odrzuć(?: wszystkie| wszystko)?', 'nie zgadzam się', 'tylko (?:niezbędne|wymagane|konieczne)',
    'avvisa(?: alla)?', 'neka(?: alla)?', 'avböj(?: alla)?', 'endast nödvändiga(?: cookies)?',
    'afvis(?: alle)?', 'kun (?:strengt )?nødvendige(?: cookies)?', 'avvis(?: alle)?', 'avslå(?: alle)?', 'bare nødvendige',
    'hylkää(?: kaikki)?', 'vain välttämättömät', 'kieltäydy',
    // cs / sk / hu / ro / el / tr
    'odmítnout(?: vše| všechny)?', 'pouze nezbytné', 'odmietnuť(?: všetko| všetky)?', 'iba nevyhnutné',
    'elutasít(?:om|ás)?', '(?:összes|mind) elutasítása', 'csak (?:a )?(?:szükséges|kötelező)',
    'respinge(?: tot| toate)?', 'resping', 'refuz(?: tot| toate)?', 'doar (?:cele )?necesare',
    'απόρριψη(?: όλων)?', 'απορρίπτω', '(?:tümünü )?reddet', '(?:sadece|yalnızca) (?:gerekli|zorunlu)',
    // ru / uk / bg / south slavic / baltic
    'отклонить(?: все)?', 'отказаться', 'только необходимые', 'відхилити(?: все)?', 'лише необхідні',
    'отхвърл(?:и|яне)(?: всички)?', 'odbij(?: sve)?', 'odbaci(?: sve)?', 'zavrni(?: vse)?', 'samo nužni',
    'atmesti(?: visus)?', 'noraidīt(?: visus)?', 'keeldu(?: kõigist)?',
  ], ['すべて拒否', '拒否', '全部拒绝', '拒绝', '拒絕', '모두 거부', '거부', 'رفض', 'דחה', 'דחייה']);

  const save = words([
    'save(?: and exit| & exit| and close| & close| settings| preferences| my preferences| choices| my choices| selection)?',
    'confirm(?: my)?(?: choices| selection| preferences)?', 'submit(?: preferences)?',
    '(?:allow|accept) (?:selected|selection|current selection)',
    '(?:auswahl|einstellungen) (?:speichern|bestätigen|erlauben|zulassen|akzeptieren)', 'speichern', 'bestätigen',
    'enregistrer(?: mes choix| et fermer| les paramètres)?', '(?:confirmer|valider)(?: mes choix| la sélection| ma sélection)?', 'sauvegarder',
    'guardar(?: y salir| configuración| preferencias| cambios)?', 'confirmar(?: selección| mis preferencias| escolhas| seleção)?', '(?:aceptar|permitir) selección',
    'salva(?: ed esci| le preferenze| impostazioni)?', 'conferma(?: le scelte| selezione)?', 'accetta selezionati', 'salvar(?: preferências)?',
    '(?:voorkeuren |keuze )?opslaan', 'bevestigen', 'selectie toestaan', 'zapisz(?: ustawienia| wybór)?', 'potwierdź(?: wybór)?',
    'spara(?: inställningar| val)?', 'bekräfta(?: val)?', 'gem(?: indstillinger| valg)?', 'bekræft(?: valg)?', 'lagre(?: innstillinger| valg)?', 'bekreft(?: valg)?',
    'tallenna(?: asetukset| valinnat)?', 'vahvista(?: valinnat)?', 'uložit(?: nastavení)?', 'potvrdit(?: výběr)?', 'uložiť(?: nastavenia)?',
    'mentés', 'beállítások mentése', 'salvează(?: setările| preferințele)?', 'confirmă(?: alegerile)?', 'αποθήκευση(?: ρυθμίσεων)?',
    '(?:tercihleri )?kaydet', 'сохранить(?: настройки| выбор)?', 'подтвердить(?: выбор)?', 'зберегти',
  ], ['設定を保存', '保存', '確認', '确认', '선택 저장', '저장']);

  const accept = words([
    'accept(?: all| everything| all cookies| cookies| and close| & close| and continue| & continue| recommended(?: settings)?)?', 'i accept',
    'allow(?: all| all cookies| cookies| everything)?', '(?:i )?agree(?: and (?:close|continue|proceed)| & (?:close|continue)| to all)?',
    'yes,? i (?:agree|accept)', 'consent(?: to all)?', 'got it', 'ok(?:ay)?', 'i understand', 'understood', 'continue', 'sounds good', 'fine by me', "that's ok", 'yes',
    '(?:alle |alles )?akzeptieren', '(?:allen )?zustimmen', '(?:alle )?(?:cookies )?(?:zulassen|erlauben)', 'einverstanden', '(?:alle )?annehmen', 'ich stimme zu', 'verstanden',
    'accepter(?: tout| et fermer| et continuer| les cookies| tous les cookies)?', 'tout accepter', "j'accepte", 'autoriser(?: tout| tous les cookies)?', "d'accord", 'ok pour moi', "j'ai compris", 'compris', 'continuer',
    'aceptar(?: todo| todas| todos| todas las cookies| cookies| y cerrar| y continuar)?', 'acepto', 'permitir(?: todo| todas| todos)?', 'de acuerdo', 'entendido', 'consentir',
    'accett(?:a|o)(?: tutto| tutti| tutti i cookie)?', 'consenti(?: tutto| tutti)?', 'acconsento', 'ho capito', 'va bene',
    'aceitar(?: tudo| todos| todos os cookies)?', 'aceito', 'concordo', 'concordar', 'entendi',
    '(?:alles |alle cookies )?accepteren', '(?:ik ga )?akkoord', '(?:alle )?(?:cookies )?toestaan', 'oké', 'prima',
    '(?:za)?akceptuj(?: wszystkie)?', 'akceptuję', 'zgadzam się', 'zgoda', 'zezwól(?: na wszystkie)?', 'rozumiem',
    'acceptera(?: alla)?', 'godkänn(?: alla)?', 'tillåt(?: alla)?', 'jag godkänner', 'jag förstår', 'okej',
    'accepter alle', 'tillad(?: alle)?', 'godta(?: alle)?', 'tillat(?: alle)?', 'jeg accepterer', 'jeg godtar', 'forstået', 'greit',
    'hyväksy(?: kaikki)?', 'salli(?: kaikki)?', 'hyväksyn', 'selvä',
    'přijmout(?: vše| všechny)?', 'souhlasím', 'povolit(?: vše)?', 'rozumím', 'prijať(?: všetko| všetky)?', 'súhlasím', 'povoliť(?: všetko)?',
    'elfogad(?:om|ás)?', 'összes elfogadása', 'mindet elfogadom', 'engedélyez(?:és)?', 'rendben',
    'accept(?:a|ă)?(?: tot| toate)?', 'sunt de acord', 'permite(?: toate)?', 'am înțeles',
    'αποδοχή(?: όλων)?', 'αποδέχομαι', 'συμφωνώ', 'εντάξει', '(?:tümünü )?kabul et', 'kabul ediyorum', 'onayla', 'anladım', 'tamam',
    'принять(?: все)?', 'согласен', 'согласна', 'хорошо', 'понятно', 'прийняти(?: все)?', 'погоджуюсь', 'приемам', 'приеми(?: всички)?', 'съгласен',
    'prihvati(?: sve)?', 'prihvaćam', 'slažem se', 'sprejmi(?: vse)?', 'strinjam se', 'sutinku', 'priimti(?: visus)?', 'piekrītu', 'pieņemt(?: visus)?', 'nõustun', 'luba kõik',
  ], ['すべて受け入れる', '受け入れる', '同意する', '同意', '承諾', '全部接受', '接受全部', '接受', '允许', '모두 동의', '동의', '수락', 'قبول', 'موافق', 'אישור', 'מסכים']);

  // Accept labels that are too vague to trust unless the box is clearly a cookie notice.
  const weak = new RegExp(`^(?:got it|ok(?:ay)?|i understand|understood|continue|yes|fine by me|sounds good|that's ok|verstanden|compris|j'ai compris|continuer|entendido|ho capito|va bene|entendi|oké|prima|rozumiem|okej|forstået|greit|selvä|rozumím|rendben|am înțeles|εντάξει|anladım|tamam|хорошо|понятно)$`, 'iu');

  const settings = words([
    '(?:cookie |privacy )?settings', '(?:set |manage )?preferences', 'manage(?: options| cookies| settings| choices| my choices)?', 'customi[sz]e(?: settings| cookies| choices)?',
    'more options', 'options', 'show purposes', 'configure', 'let me choose', 'adjust(?: settings)?',
    '(?:cookie-)?einstellungen', 'anpassen', 'verwalten', 'mehr optionen', 'individuelle einstellungen', 'konfigurieren',
    'paramètres', 'paramétrer', 'personnaliser', 'gérer(?: mes choix| les cookies| les préférences)?', "plus d'options", 'préférences',
    'configurar', 'configuración', 'personalizar', 'gestionar(?: cookies| preferencias)?', 'más opciones', 'preferencias', 'ajustes',
    'impostazioni', 'personalizza', 'gestisci(?: preferenze| opzioni)?', 'altre opzioni', 'preferenze', 'definições', 'configurações', 'gerir', 'gerenciar', 'mais opções', 'preferências',
    'instellingen', 'aanpassen', 'voorkeuren', 'beheren', 'meer opties', 'ustawienia', 'dostosuj', 'zarządzaj', 'więcej opcji', 'preferencje',
    'inställningar', 'anpassa', 'hantera', 'indstillinger', 'tilpas', 'innstillinger', 'tilpass', 'administrer', 'asetukset', 'mukauta', 'hallinnoi',
    'nastavení', 'přizpůsobit', 'spravovat', 'nastavenia', 'beállítások', 'testreszabás', 'setări', 'personalizează', 'ρυθμίσεις', 'προσαρμογή',
    'ayarlar', 'özelleştir', 'настройки', 'настроить', 'налаштування',
  ], ['設定', '设置', '設置', '설정', '自定义']);

  // Things we never press: policy links, vendor lists, "learn more", and the paywall
  // exits of consent-or-pay walls ("Reject all and subscribe", "Subscribe now", "Log in").
  const never = words([
    'policy', 'privacy policy', 'cookie policy', 'cookie notice', 'learn more', 'more info(?:rmation)?', 'read more', 'details', 'show details',
    'vendors?', 'partners?', 'imprint', 'impressum', 'terms', 'datenschutzerklärung', 'datenschutzhinweise', 'mehr erfahren',
    'politique', 'en savoir plus', 'política', 'más información', 'informativa', 'privacyverklaring', 'polityka', 'leggi di più',
    'subscribe', 'subscription', 'subscriber', 'purchase', 'buy', 'pay', 'payment', 'paid', 'ad-?lite', 'ad-?free', 'sign in', 'sign up', 'log ?in', 'register',
    'abonnieren', 'abonnement', 'abo', 'pur-?abo', 'kaufen', 'anmelden', 'registrieren', 'werbefrei',
    "s'abonner", 'abonnez-vous', 'abonnement', 'payer', 'acheter', 'se connecter', 'connexion',
    'suscríbete', 'suscribirse', 'suscripción', 'pagar', 'comprar', 'iniciar sesión', 'abbonati', 'abbonamento', 'accedi', 'assinar', 'assinatura',
    'abonneren', 'abonnement afsluiten', 'inloggen', 'subskrybuj', 'prenumerera', 'abonner', 'logg inn', 'tilaa',
  ]);

  const close = /^(?:close|dismiss|close banner|close dialog|x|×|✕|✖|✗|schließen|fermer|cerrar|chiudi|fechar|sluiten|zamknij|stäng|luk|lukk|sulje|zavřít|bezárás|închide|κλείσιμο|kapat|закрыть)$/iu;

  const topic = /cookie|consent|consens|gdpr|rgpd|dsgvo|ccpa|einwilligung|toestemming|samtycke|samtykke|suostumus|souhlas|kakor|eväste|süti|ciasteczk|informasjonskapsl|piškot|sīkdatn|slapuk|küpsis|çerez|kolačić|biscoit|куки|колачић|бисквитк|クッキー|쿠키|ملفات تعريف الارتباط|עוגיות/iu;

  // Links that, when the *user* clicks them, mean "show me the consent UI".
  const privacyLink = /cookie|consent|privacy|datenschutz|confidentialité|privacidad|privacy settings/iu;

  const norm = (s) => String(s || '')
    .toLowerCase()
    .replace(/[‘’ʼ`´]/g, "'")
    .replace(/\s+/g, ' ')
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')
    .trim();

  CPR.patterns = { reject, save, accept, weak, settings, never, close, topic, privacyLink, norm };
})();
