function show(platform, enabled, useSettingsInsteadOfPreferences) {
    document.body.classList.add(`platform-${platform}`);

    if (typeof enabled === "boolean") {
        document.body.classList.toggle(`state-on`, enabled);
        document.body.classList.toggle(`state-off`, !enabled);
    } else {
        document.body.classList.remove(`state-on`);
        document.body.classList.remove(`state-off`);
    }
}

function openPreferences() {
    webkit.messageHandlers.controller.postMessage("open-preferences");
}

document.querySelector("button.open-preferences").addEventListener("click", openPreferences);

// Opened in a normal browser (the mockups page): ?platform=ios|mac&state=on|off
if (!window.webkit?.messageHandlers?.controller) {
    const params = new URLSearchParams(location.search);
    const state = params.get("state");
    show(params.get("platform") || "ios", state ? state === "on" : undefined, true);
}
