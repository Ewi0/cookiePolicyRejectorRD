// Look-alikes of real consent platforms, mounted by cmp.html?cmp=<id>. The markup follows what each
// platform puts in real pages (ids, classes, button labels, shadow roots, second layers, banners that
// are revealed by a class change). Every control carries data-out with what pressing it means for
// the site; the page records the outcome, so the e2e test sees what the site was actually told:
//   reject / accept   final answers          settings   opens the second layer
//   save              "save my choices": recorded as reject if every toggle is off, else custom
const BAR = 'position:fixed;left:0;right:0;bottom:0;padding:20px 28px;background:#fff;box-shadow:0 -4px 20px rgba(0,0,0,.15);font:15px system-ui;z-index:2147483000';
const MODAL = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);width:min(560px,90vw);padding:24px;background:#fff;box-shadow:0 10px 40px rgba(0,0,0,.3);font:15px system-ui;z-index:2147483001';
const TXT = 'We and our partners use cookies and similar technologies to store and access information on your device, to measure audiences and to personalise ads and content.';
const toggles = '<label><input type="checkbox" checked> Analytics</label> <label><input type="checkbox" checked> Advertising</label>';

/** Fields: html (light DOM), shadow ({ host, mode, html }), delay (ms before it appears),
 *  reveal ({ sel, cls }: in the page hidden by that class from the start, class removed after delay),
 *  hiddenCls (closing adds this class instead of display:none), keepBanner (settings leaves the banner up). */
window.CMPS = {
  cookiebot: {
    html: `<div id="CybotCookiebotDialog" data-test="banner" role="dialog" style="${BAR}">
      <div id="CybotCookiebotDialogBody"><h2>This website uses cookies</h2><p>${TXT}</p></div>
      <div id="CybotCookiebotDialogFooter">
        <button id="CybotCookiebotDialogBodyButtonDecline" data-out="reject">Deny</button>
        <button id="CybotCookiebotDialogBodyLevelButtonCustomize" data-out="settings">Customize</button>
        <button id="CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll" data-out="accept">Allow all</button>
      </div></div>`,
  },
  'cookiebot-selection': {
    html: `<div id="CybotCookiebotDialog" data-test="banner" role="dialog" style="${BAR}">
      <p>${TXT}</p>
      <div class="CybotCookiebotDialogBodyLevelButtonWrapper">
        <input type="checkbox" id="CybotCookiebotDialogBodyLevelButtonNecessary" checked disabled>
        <input type="checkbox" id="CybotCookiebotDialogBodyLevelButtonStatistics" checked>
        <input type="checkbox" id="CybotCookiebotDialogBodyLevelButtonMarketing" checked>
      </div>
      <button id="CybotCookiebotDialogBodyLevelButtonLevelOptinAllowallSelection" data-out="save">Allow selection</button>
      <button id="CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll" data-out="accept">Allow all</button></div>`,
  },
  didomi: {
    html: `<div id="didomi-host"><div id="didomi-notice" data-test="banner" class="didomi-notice-banner" style="${BAR}">
      <div class="didomi-notice-text">${TXT}</div>
      <button id="didomi-notice-learn-more-button" data-out="settings">Learn More</button>
      <button id="didomi-notice-disagree-button" data-out="reject"><span>Disagree</span></button>
      <button id="didomi-notice-agree-button" data-out="accept"><span>Agree and close</span></button></div></div>`,
  },
  'didomi-two-layer': {
    html: `<div id="didomi-host"><div id="didomi-notice" data-test="banner" class="didomi-notice-banner" style="${BAR}">
      <div class="didomi-notice-text">${TXT}</div>
      <button id="didomi-notice-learn-more-button" data-out="settings">Learn More</button>
      <button id="didomi-notice-agree-button" data-out="accept"><span>Agree and close</span></button></div>
      <div id="didomi-popup" class="didomi-popup-backdrop" style="display:none"><div class="didomi-popup-container" data-test="layer" style="${MODAL}">
        <h2>Your consent preferences</h2>${toggles}
        <button class="didomi-components-button" data-out="reject">Disagree to all</button>
        <button class="didomi-components-button" data-out="accept">Agree to all</button></div></div></div>`,
    layer: '#didomi-popup',
  },
  inmobi: {
    html: `<div id="qc-cmp2-container"><div id="qc-cmp2-main"><div id="qc-cmp2-ui" role="dialog" data-test="banner" style="${MODAL}">
      <h2>We value your privacy</h2><p>${TXT}</p>
      <div class="qc-cmp2-summary-buttons">
        <button mode="secondary" size="large" data-out="settings"><span>MORE OPTIONS</span></button>
        <button mode="secondary" size="large" data-out="reject"><span>DISAGREE</span></button>
        <button mode="primary" size="large" data-out="accept"><span>AGREE</span></button></div></div></div></div>`,
  },
  'inmobi-two-layer': {
    html: `<div id="qc-cmp2-container"><div id="qc-cmp2-main"><div id="qc-cmp2-ui" role="dialog" data-test="banner" style="${MODAL}">
      <div class="first"><h2>We value your privacy</h2><p>${TXT}</p>
      <div class="qc-cmp2-summary-buttons">
        <button mode="secondary" size="large" data-out="settings"><span>MORE OPTIONS</span></button>
        <button mode="primary" size="large" data-out="accept"><span>AGREE</span></button></div></div>
      <div class="qc-cmp2-consent-info" style="display:none">${toggles}
        <button mode="secondary" data-out="reject">REJECT ALL</button><button mode="primary" data-out="save">SAVE &amp; EXIT</button></div>
      </div></div></div>`,
    layer: '.qc-cmp2-consent-info',
    hideOnSettings: '.first',
  },
  trustarc: {
    html: `<div id="truste-consent-track" data-test="banner" style="${BAR}"><div id="truste-consent-content"><p>${TXT}</p>
      <button id="truste-show-consent" data-out="settings">Cookie Preferences</button>
      <button id="truste-consent-required" data-out="reject">Required Only</button>
      <button id="truste-consent-button" data-out="accept">Accept All</button></div></div>`,
  },
  'usercentrics-v2': {
    shadow: {
      host: '<div id="usercentrics-root"></div>', mode: 'open',
      html: `<div data-testid="uc-default-banner" data-test="banner-inner" style="${BAR}"><p>${TXT}</p>
        <button data-testid="uc-more-button" data-out="settings">Settings</button>
        <button data-testid="uc-deny-all-button" data-out="reject">Deny</button>
        <button data-testid="uc-accept-all-button" data-out="accept">Accept All</button></div>`,
    },
  },
  'usercentrics-v3': {
    shadow: {
      host: '<aside id="usercentrics-cmp-ui"></aside>', mode: 'open',
      html: `<div id="uc-main-dialog" role="dialog" data-test="banner-inner" style="${MODAL}"><p>${TXT}</p>
        <button id="more" data-out="settings">Settings</button>
        <button id="deny" data-out="reject">Deny</button>
        <button id="accept" data-out="accept">Accept All</button></div>`,
    },
  },
  'funding-choices': {
    html: `<div class="fc-consent-root"><div class="fc-dialog-overlay"></div><div class="fc-dialog-container"><div class="fc-dialog fc-choice-dialog" data-test="banner" style="${MODAL}">
      <h1>This site asks for consent to use your data</h1><p>${TXT}</p>
      <button class="fc-button fc-cta-consent fc-primary-button" data-out="accept"><p class="fc-button-label">Consent</p></button>
      <button class="fc-button fc-cta-do-not-consent fc-secondary-button" data-out="reject"><p class="fc-button-label">Do not consent</p></button>
      <button class="fc-button fc-cta-manage-options" data-out="settings"><p class="fc-button-label">Manage options</p></button></div></div></div>`,
  },
  'funding-choices-manage': {
    html: `<div class="fc-consent-root"><div class="fc-dialog-container"><div class="fc-dialog fc-choice-dialog" data-test="banner" style="${MODAL}">
      <h1>This site asks for consent to use your data</h1><p>${TXT}</p>
      <button class="fc-button fc-cta-consent fc-primary-button" data-out="accept"><p class="fc-button-label">Consent</p></button>
      <button class="fc-button fc-cta-manage-options" data-out="settings"><p class="fc-button-label">Manage options</p></button></div>
      <div class="fc-preference-container" data-test="layer" style="display:none;${MODAL}">${toggles}
        <button class="fc-button fc-confirm-choices" data-out="save"><p class="fc-button-label">Confirm choices</p></button></div></div></div>`,
    layer: '.fc-preference-container',
  },
  osano: {
    html: `<style>.osano-cm-dialog--hidden{display:none}</style><div class="osano-cm-window"><div class="osano-cm-dialog osano-cm-dialog--position_bottom osano-cm-dialog--type_bar osano-cm-dialog--hidden" data-test="banner" style="${BAR}">
      <span class="osano-cm-message">${TXT}</span>
      <button class="osano-cm-accept-all osano-cm-buttons__button osano-cm-button osano-cm-button--type_accept" data-out="accept">Accept All</button>
      <button class="osano-cm-denyAll osano-cm-buttons__button osano-cm-button osano-cm-button--type_denyAll" data-out="reject">Deny</button></div></div>`,
    reveal: { sel: '.osano-cm-dialog', cls: 'osano-cm-dialog--hidden' },
    hiddenCls: 'osano-cm-dialog--hidden',
  },
  cookieyes: {
    html: `<style>.cky-hide{display:none}</style><div class="cky-consent-container cky-banner-bottom cky-hide" data-test="banner" style="${BAR}"><div class="cky-consent-bar">
      <p class="cky-notice-des">${TXT}</p>
      <button class="cky-btn cky-btn-customize" data-out="settings">Customize</button>
      <button class="cky-btn cky-btn-reject" data-out="reject">Reject All</button>
      <button class="cky-btn cky-btn-accept" data-out="accept">Accept All</button></div></div>`,
    reveal: { sel: '.cky-consent-container', cls: 'cky-hide' },
    hiddenCls: 'cky-hide',
  },
  complianz: {
    html: `<style>.cmplz-hidden{display:none}</style><div id="cmplz-cookiebanner-container"><div class="cmplz-cookiebanner cmplz-hidden banner-1 optin cmplz-bottom" data-test="banner" style="${BAR}">
      <div class="cmplz-message">${TXT}</div>
      <button class="cmplz-btn cmplz-accept" data-out="accept">Accept</button>
      <button class="cmplz-btn cmplz-deny" data-out="reject">Deny</button>
      <button class="cmplz-btn cmplz-view-preferences" data-out="settings">View preferences</button></div></div>`,
    reveal: { sel: '.cmplz-cookiebanner', cls: 'cmplz-hidden' },
    hiddenCls: 'cmplz-hidden',
  },
  iubenda: {
    html: `<div id="iubenda-cs-banner" data-test="banner" style="${BAR}"><div class="iubenda-cs-content"><p>${TXT}</p>
      <button class="iubenda-cs-customize-btn" data-out="settings">Learn more and customize</button>
      <button class="iubenda-cs-reject-btn iubenda-cs-btn-primary" data-out="reject">Reject</button>
      <button class="iubenda-cs-accept-btn iubenda-cs-btn-primary" data-out="accept">Accept</button></div></div>`,
  },
  klaro: {
    html: `<div class="klaro"><div class="cookie-notice" data-test="banner" style="${BAR}"><div class="cn-body"><p>${TXT}</p>
      <div class="cn-ok"><a class="cn-learn-more" href="#" data-out="settings">Let me choose</a>
      <div class="cn-buttons"><button class="cm-btn cm-btn-danger cn-decline" data-out="reject">I decline</button>
      <button class="cm-btn cm-btn-success" data-out="accept">That's ok</button></div></div></div></div></div>`,
  },
  'borlabs-v2': {
    html: `<div id="BorlabsCookieBox"><div class="_brlbs-bar-wrap"><div class="_brlbs-box" data-test="banner" style="${BAR}"><p>${TXT}</p>
      <p class="_brlbs-accept"><a href="#" class="_brlbs-btn _brlbs-btn-accept-all" data-cookie-accept-all data-out="accept">Accept all</a></p>
      <p class="_brlbs-refuse-btn"><a href="#" class="_brlbs-btn" data-cookie-refuse data-out="reject">Only accept essential cookies</a></p></div></div></div>`,
  },
  consentmanager: {
    html: `<div id="cmpwrapper" class="cmpwrapper"><div id="cmpbox" class="cmpbox" data-test="banner" style="${BAR}"><div class="cmpboxtxt">${TXT}</div>
      <div class="cmpboxbtns"><a id="cmpwelcomebtnyes" class="cmpboxbtn cmpboxbtnyes" href="#" role="button" data-out="accept">Accept all</a>
      <a id="cmpwelcomebtnno" class="cmpboxbtn cmpboxbtnno" href="#" role="button" data-out="reject">Reject all</a>
      <a id="cmpwelcomebtncustom" class="cmpboxbtn cmpboxbtncustom" href="#" role="button" data-out="settings">Customize</a></div></div></div>`,
  },
  'cookie-control': {
    html: `<div id="ccc"><div id="ccc-notify" class="ccc-notify__bottom" data-test="banner" style="${BAR}"><div class="ccc-notify-text"><h3>This site uses cookies to store information on your computer.</h3></div>
      <div class="ccc-notify-buttons"><button class="ccc-notify-button ccc-link ccc-tabbable ccc-accept-button" data-out="accept"><span>Accept Recommended Settings</span></button>
      <button class="ccc-notify-button ccc-link ccc-tabbable ccc-reject-button" data-out="reject"><span>Reject All</span></button>
      <button class="ccc-notify-link ccc-link ccc-tabbable" data-out="settings">Cookie Preferences</button></div></div></div>`,
  },
  'cookieconsent-v3': {
    html: `<div id="cc-main"><div class="cm-wrapper"><div class="cm cm--box" role="dialog" data-test="banner" style="${BAR}"><div class="cm__body"><h2 class="cm__title">We use cookies</h2><p>${TXT}</p></div>
      <div class="cm__btns"><button type="button" class="cm__btn" data-role="all" data-out="accept">Accept all</button>
      <button type="button" class="cm__btn" data-role="necessary" data-out="reject">Reject all</button>
      <button type="button" class="cm__btn cm__btn--secondary" data-role="show" data-out="settings">Manage preferences</button></div></div></div></div>`,
  },
  // CookieConsent v2 where the secondary button (#c-s-bn) opens the settings: pressing it is no refusal.
  'cookieconsent-v2-settings': {
    html: `<div id="cc_div"><div id="cm" class="box" role="dialog" data-test="banner" style="${BAR}"><div id="c-inr"><div id="c-txt">${TXT}</div>
      <div id="c-bns"><button type="button" id="c-p-bn" class="c-bn" data-out="accept">Accept all</button>
      <button type="button" id="c-s-bn" class="c-bn c_link" data-out="settings">Settings</button></div></div></div>
      <div id="s-cnt" role="dialog" style="display:none"><div id="s-inr" data-test="layer" style="${MODAL}"><div id="s-bl">${toggles}</div>
      <div id="s-bns"><button type="button" id="s-all-bn" class="c-bn" data-out="accept">Accept all</button>
      <button type="button" id="s-rall-bn" class="c-bn" data-out="reject">Reject all</button>
      <button type="button" id="s-sv-bn" class="c-bn" data-out="save">Save settings</button></div></div></div></div>`,
    layer: '#s-cnt',
  },
  // OneTrust without "Reject All" anywhere: the preference centre only has toggles and "Confirm My Choices".
  'onetrust-toggles': {
    html: `<div id="onetrust-consent-sdk"><div id="onetrust-banner-sdk" data-test="banner" style="${BAR}"><p>${TXT}</p>
      <button id="onetrust-pc-btn-handler" data-out="settings">Cookie Settings</button>
      <button id="onetrust-accept-btn-handler" data-out="accept">Accept All Cookies</button></div>
      <div id="onetrust-pc-sdk" data-test="layer" style="display:none;${MODAL}"><h2>Privacy Preference Center</h2>
      <input type="checkbox" class="category-switch-handler" checked> Performance <input type="checkbox" class="category-switch-handler" checked> Targeting
      <button class="save-preference-btn-handler onetrust-close-btn-handler" data-out="save">Confirm My Choices</button>
      <button id="accept-recommended-btn-handler" data-out="accept">Allow All</button></div></div>`,
    layer: '#onetrust-pc-sdk',
  },
  shopify: {
    html: `<div id="shopify-pc__banner" class="shopify-pc__banner__dialog" data-test="banner" style="${BAR}"><h2>Cookie preferences</h2><p>${TXT}</p>
      <button id="shopify-pc__banner__btn-manage-prefs" data-out="settings">Manage preferences</button>
      <button id="shopify-pc__banner__btn-decline" data-out="reject">Decline</button>
      <button id="shopify-pc__banner__btn-accept" data-out="accept">Accept</button></div>`,
  },
  hubspot: {
    html: `<div id="hs-eu-cookie-confirmation" data-test="banner" style="${BAR}"><div id="hs-eu-cookie-confirmation-inner"><p>${TXT}</p>
      <div id="hs-eu-cookie-confirmation-button-group"><a href="#" id="hs-eu-confirmation-button" role="button" data-out="accept">Accept</a>
      <a href="#" id="hs-eu-decline-button" role="button" data-out="reject">Decline</a></div></div></div>`,
  },
  'cookie-notice': {
    html: `<div id="cookie-notice" role="dialog" class="cn-bottom" data-test="banner" style="${BAR}"><div class="cookie-notice-container"><span id="cn-notice-text">${TXT}</span>
      <span id="cn-notice-buttons"><a href="#" id="cn-accept-cookie" class="cn-set-cookie cn-button" data-out="accept">Ok</a>
      <a href="#" id="cn-refuse-cookie" class="cn-set-cookie cn-button" data-out="reject">No</a></span></div></div>`,
  },
  termly: {
    html: `<div class="termly-styles-module-root-f61419" role="dialog" data-test="banner" style="${BAR}"><p>${TXT}</p>
      <button data-tid="banner-decline" data-out="reject">Decline</button><button data-tid="banner-accept" data-out="accept">Accept</button></div>`,
  },
  amazon: {
    html: `<div id="sp-cc" data-test="banner" style="${BAR}"><h4>Select your cookie preferences</h4><p>${TXT}</p>
      <span class="a-button"><input id="sp-cc-accept" type="submit" value="Accept" data-out="accept"></span>
      <span class="a-button"><input id="sp-cc-rejectall-link" type="submit" value="Decline" data-out="reject"></span>
      <a id="sp-cc-customize" href="#" data-out="settings">Customise cookies</a></div>`,
  },
  'stack-exchange': {
    html: `<div class="js-consent-banner" data-test="banner" style="${BAR}"><p>${TXT}</p>
      <button class="js-accept-cookies" data-out="accept">Accept all cookies</button>
      <button class="js-reject-cookies" data-out="reject">Necessary cookies only</button>
      <button class="js-cookie-settings" data-out="settings">Customize settings</button></div>`,
  },
  wix: {
    html: `<div data-hook="consent-banner-root" data-test="banner" style="${BAR}"><p>${TXT}</p>
      <button data-hook="consent-banner-settings-button" data-out="settings">Settings</button>
      <button data-hook="consent-banner-decline-button" data-out="reject">Decline All</button>
      <button data-hook="consent-banner-apply-button" data-out="accept">Accept</button></div>`,
  },
  'cookie-script': {
    html: `<div id="cookiescript_injected" data-test="banner" style="${BAR}"><div id="cookiescript_description">${TXT}</div>
      <div id="cookiescript_accept" role="button" tabindex="0" data-out="accept">Accept all</div>
      <div id="cookiescript_reject" role="button" tabindex="0" data-out="reject">Decline all</div></div>`,
  },
  moove: {
    html: `<aside id="moove_gdpr_cookie_info_bar" class="moove-gdpr-info-bar-container" data-test="banner" style="${BAR}"><p>${TXT}</p>
      <button class="mgbutton moove-gdpr-infobar-allow-all" data-out="accept">Accept</button>
      <button class="mgbutton moove-gdpr-infobar-reject-btn" data-out="reject">Reject</button>
      <button class="mgbutton moove-gdpr-infobar-settings-btn" data-out="settings">Settings</button></aside>`,
  },
  tarteaucitron: {
    html: `<div id="tarteaucitronRoot"><div id="tarteaucitronAlertBig" data-test="banner" style="${BAR}"><span id="tarteaucitronDisclaimerAlert">Ce site utilise des cookies et vous donne le contrôle sur ce que vous souhaitez activer</span>
      <button id="tarteaucitronPersonalize2" data-out="accept">✓ Tout accepter</button>
      <button id="tarteaucitronAllDenied2" data-out="reject">✗ Tout refuser</button>
      <button id="tarteaucitronCloseAlert" data-out="settings">Personnaliser</button></div></div>`,
  },
  axeptio: {
    shadow: {
      host: '<div class="axeptio_mount"></div>', mode: 'open',
      html: `<div id="axeptio_overlay"><div class="axeptio_widget" data-test="banner-inner" style="${BAR}"><p>Ce site utilise des cookies. ${TXT}</p>
        <button id="axeptio_btn_dismiss" data-out="reject">Non merci</button>
        <button id="axeptio_btn_configure" data-out="settings">Je choisis</button>
        <button id="axeptio_btn_acceptAll" data-out="accept">OK pour moi</button></div></div>`,
    },
  },
  // Sites with no consent platform: found by their words alone.
  'generic-pl': {
    html: `<div class="cookie-bar" data-test="banner" style="${BAR}"><p>Ta strona używa plików cookie w celach statystycznych i marketingowych.</p>
      <button class="btn" data-out="settings">Ustawienia</button><button class="btn" data-out="reject">Odrzuć wszystkie</button><button class="btn" data-out="accept">Akceptuję</button></div>`,
  },
  'generic-ru': {
    html: `<div class="consent-popup" data-test="banner" style="${BAR}"><p>Мы используем файлы cookie, чтобы улучшить работу сайта и показывать рекламу.</p>
      <button data-out="reject">Отклонить все</button><button data-out="accept">Принять все</button></div>`,
  },
  'generic-ja': {
    html: `<div id="privacy-banner" data-test="banner" style="${BAR}"><p>当サイトでは、利便性向上と広告配信のためにクッキーを使用しています。</p>
      <button data-out="reject">すべて拒否</button><button data-out="accept">すべて受け入れる</button></div>`,
  },
  'generic-it-two-layer': {
    html: `<div id="gdpr-box" data-test="banner" style="${BAR}"><p>Questo sito utilizza cookie tecnici e, previo tuo consenso, cookie di profilazione.</p>
      <button data-out="settings">Personalizza</button><button data-out="accept">Accetta tutti</button></div>
      <div id="gdpr-prefs" role="dialog" aria-modal="true" data-test="layer" style="display:none;${MODAL}"><h2>Preferenze cookie</h2>${toggles}
      <button data-out="reject">Rifiuta tutto</button><button data-out="save">Salva le preferenze</button></div>`,
    layer: '#gdpr-prefs',
  },
  'generic-nl-toggles': {
    html: `<div id="cookiemelding" data-test="banner" style="${BAR}"><p>Wij gebruiken cookies om onze website te verbeteren en voor advertenties.</p>
      <button data-out="settings">Instellingen</button><button data-out="accept">Alles accepteren</button></div>
      <div id="cookie-instellingen" role="dialog" data-test="layer" style="display:none;${MODAL}"><h2>Cookie-instellingen</h2>${toggles}
      <button data-out="save">Voorkeuren opslaan</button></div>`,
    layer: '#cookie-instellingen',
  },
  'generic-sv-shadow': {
    shadow: {
      host: '<cookie-consent-banner></cookie-consent-banner>', mode: 'open',
      html: `<div data-test="banner-inner" style="${BAR}"><p>Vi använder kakor (cookies) för statistik och marknadsföring.</p>
        <button data-out="reject">Avvisa alla</button><button data-out="accept">Acceptera alla</button></div>`,
    },
  },
};

/** Mounts one look-alike and records what the site was told (window.__cpr.clicked). */
window.mountCmp = (id) => {
  const t = window.CMPS[id];
  if (!t) throw new Error(`unknown cmp ${id}`);
  const mount = () => {
    let root = document;
    let shadowRoot = null;
    if (t.shadow) {
      document.body.insertAdjacentHTML('beforeend', t.shadow.host);
      const host = document.body.lastElementChild;
      host.setAttribute('data-test', 'banner');
      shadowRoot = host.attachShadow({ mode: t.shadow.mode });
      shadowRoot.innerHTML = t.shadow.html;
      root = shadowRoot;
    } else document.body.insertAdjacentHTML('beforeend', t.html);
    const q = (sel) => root.querySelector(sel);
    const all = (sel) => [...root.querySelectorAll(sel)];
    const banners = () => all('[data-test="banner"], [data-test="banner-inner"]');
    const close = () => {
      for (const el of [...banners(), ...all('[data-test="layer"]')]) {
        if (t.hiddenCls && el.matches('[data-test="banner"]')) el.classList.add(t.hiddenCls);
        else el.style.display = 'none';
      }
      if (t.layer) q(t.layer).style.display = 'none';
    };
    root.addEventListener('click', (e) => {
      const b = e.target.closest?.('[data-out]');
      if (!b) return;
      e.preventDefault();
      const out = b.dataset.out;
      if (out === 'settings') {
        record('settings');
        if (!t.layer) return;
        if (t.hideOnSettings) q(t.hideOnSettings).style.display = 'none';
        else if (!t.keepBanner) for (const el of banners()) if (!el.contains(q(t.layer))) el.style.display = 'none';
        q(t.layer).style.display = 'block';
        const inner = q(t.layer).querySelector('[data-test="layer"]');
        if (inner) inner.style.display = 'block';
        return;
      }
      if (out === 'save') record(all('input[type="checkbox"]:not(:disabled)').some((i) => i.checked) ? 'custom' : 'reject');
      else record(out);
      close();
    });
    if (t.reveal) later(t.reveal.at || 800, () => q(t.reveal.sel).classList.remove(t.reveal.cls));
  };
  later(t.delay ?? 300, mount);
};
