//
//  SafariWebExtensionHandler.swift
//  Shared (Extension)
//

import SafariServices

// Safari needs a native principal class for every web extension. The extension never calls
// browser.runtime.sendNativeMessage (no "nativeMessaging" permission), so this handler reads
// nothing, logs nothing and returns an empty reply.
class SafariWebExtensionHandler: NSObject, NSExtensionRequestHandling {

    func beginRequest(with context: NSExtensionContext) {
        context.completeRequest(returningItems: [], completionHandler: nil)
    }

}
