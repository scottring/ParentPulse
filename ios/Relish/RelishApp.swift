import SwiftUI
import UIKit
import WebKit
import WidgetKit

@main
struct RelishApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    var body: some Scene {
        WindowGroup { RelishBook() }
    }
}

/// Quick actions, deep links, widgets and Siri all post a route here; the web view's
/// browser takes them as soon as it exists (a cold launch posts before it does).
@MainActor
final class RouteInbox {
    static let shared = RouteInbox()
    private var waiting: [RelishRoute] = []
    private var handler: ((RelishRoute) -> Void)?
    func post(_ route: RelishRoute?) {
        guard let route else { return }
        if let handler { handler(route) } else { waiting.append(route) }
    }
    func attach(_ handler: @escaping (RelishRoute) -> Void) {
        self.handler = handler
        let routes = waiting
        waiting = []
        routes.forEach(handler)
    }
}

/// Home-screen quick actions arrive through the scene: at launch, or while running.
final class AppDelegate: NSObject, UIApplicationDelegate {
    func application(_ application: UIApplication, configurationForConnecting session: UISceneSession, options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        if let item = options.shortcutItem {
            MainActor.assumeIsolated { RouteInbox.shared.post(RelishRoute(shortcutType: item.type)) }
        }
        let configuration = UISceneConfiguration(name: nil, sessionRole: session.role)
        configuration.delegateClass = SceneDelegate.self
        return configuration
    }
}
final class SceneDelegate: NSObject, UIWindowSceneDelegate {
    func windowScene(_ windowScene: UIWindowScene, performActionFor shortcutItem: UIApplicationShortcutItem, completionHandler: @escaping (Bool) -> Void) {
        let route = RelishRoute(shortcutType: shortcutItem.type)
        RouteInbox.shared.post(route)
        completionHandler(route != nil)
    }
}

struct RelishBook: View {
    @StateObject private var browser = BookBrowser()
    @Environment(\.scenePhase) private var phase

    var body: some View {
        ZStack {
            Color(red: 0.965, green: 0.957, blue: 0.929).ignoresSafeArea()
            BookWebView(browser: browser)
                .background(HingeWatcher { browser.setTent($0) }.ignoresSafeArea())
            if let error = browser.error {
                ContentUnavailableView {
                    Label("Could not open Relish", systemImage: "book.closed")
                } description: {
                    Text(error)
                } actions: {
                    Button("Try opening again") { browser.retry() }
                        .buttonStyle(.borderedProminent)
                }
                .background(.regularMaterial)
            }
            // Cover app-switcher snapshots without rebuilding the web view or
            // destroying a draft when a fold briefly changes scene activation.
            if phase != .active {
                Color(red: 0.965, green: 0.957, blue: 0.929).ignoresSafeArea()
                VStack(spacing: 16) {
                    Image(systemName: "book.closed").font(.largeTitle)
                    Text("relish").font(.system(size: 40, design: .serif))
                    Text("Content hidden while Relish is inactive.").font(.subheadline)
                }
                .foregroundStyle(Color(red: 0.188, green: 0.220, blue: 0.173))
                .accessibilityLabel("Relish. Your journal is covered.")
            }
        }
        .tint(Color(red: 0.263, green: 0.318, blue: 0.227))
        // Table mode: the whole outer screen faces the family.
        .statusBarHidden(browser.tableOpen)
        .persistentSystemOverlays(browser.tableOpen ? .hidden : .automatic)
        .sheet(item: $browser.export) { item in
            BackupShare(url: item.url) { browser.finishExport(item) }
        }
        // Widgets, Share to Relish and other apps: relish://new-entry and so on.
        .onOpenURL { url in
            if let route = BookURLPolicy.route(from: url) { browser.open(route) }
        }
        .onChange(of: phase) { _, now in
            // Something shared to Relish while the app was away.
            if now == .active { browser.open(.share) }
        }
    }
}

/// Watches the hinge (UIHingeInteraction, iOS 27.1). Tent posture is the hinge partly
/// open while Relish is on the compact outer screen in landscape.
struct HingeWatcher: UIViewRepresentable {
    let onTent: (Bool) -> Void
    func makeUIView(context: Context) -> HingeView {
        let view = HingeView()
        view.isUserInteractionEnabled = false
        view.onTent = onTent
        return view
    }
    func updateUIView(_ view: HingeView, context: Context) { view.onTent = onTent }
}
final class HingeView: UIView {
    var onTent: ((Bool) -> Void)?
    private var partiallyOpen = false
    private var last: Bool?
    override init(frame: CGRect) {
        super.init(frame: frame)
        addInteraction(UIHingeInteraction { [weak self] _, update in
            guard let self else { return }
            // No hinge (another device, or the view left a hinged hierarchy): not standing.
            self.partiallyOpen = update.hinge?.status == .partiallyOpen
            self.evaluate()
        })
    }
    required init?(coder: NSCoder) { nil }
    override func layoutSubviews() {
        super.layoutSubviews()
        evaluate()
    }
    private func evaluate() {
        let tent = Posture.isTent(partiallyOpen: partiallyOpen, windowSize: window?.bounds.size ?? .zero)
        guard tent != last else { return }
        last = tent
        onTent?(tent)
    }
}

/// Holds the browser weakly: WKUserContentController keeps its handlers alive.
@MainActor
final class BridgeProxy: NSObject, WKScriptMessageHandler {
    weak var browser: BookBrowser?
    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        browser?.receive(message)
    }
}

struct BookWebView: UIViewRepresentable {
    @ObservedObject var browser: BookBrowser
    func makeUIView(context: Context) -> WKWebView { browser.webView }
    // The exact same WKWebView survives every window size and fold transition.
    func updateUIView(_ view: WKWebView, context: Context) {}
}

struct BackupExport: Identifiable {
    let id = UUID()
    let url: URL
}
struct BackupShare: UIViewControllerRepresentable {
    let url: URL
    let finish: () -> Void
    func makeUIViewController(context: Context) -> UIActivityViewController {
        let controller = UIActivityViewController(activityItems: [url], applicationActivities: nil)
        controller.completionWithItemsHandler = { _, _, _, _ in finish() }
        return controller
    }
    func updateUIViewController(_ controller: UIActivityViewController, context: Context) {}
}

@MainActor
final class BookBrowser: NSObject, ObservableObject, WKNavigationDelegate, WKUIDelegate, WKDownloadDelegate {
    let webView: WKWebView
    let startURL: URL
    let policy: BookURLPolicy
    @Published var error: String?
    @Published var export: BackupExport?
    /// The page is showing Table mode: hide the status bar and keep the screen awake.
    @Published private(set) var tableOpen = false
    private var downloads: [ObjectIdentifier: URL] = [:]
    /// The trusted page has said `ready`: routes and shared items can go to it.
    private var pageReady = false
    private var pendingRoute: RelishRoute?
    private var delivering = false
    private var sharingID: String?
    private var tent = false
    private let bridge = BridgeProxy()

    override init() {
        let configured = Bundle.main.object(forInfoDictionaryKey: "RelishStartURL") as? String ?? ""
        #if DEBUG
        startURL = BookURLPolicy.startURL(configured, development: true)
        #else
        // A production binary cannot accidentally ship against a preview host.
        startURL = BookURLPolicy.production
        #endif
        policy = BookURLPolicy(origin: startURL)
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()
        configuration.allowsInlineMediaPlayback = true
        // The one bridge: a small versioned message set, checked in PageMessage.parse,
        // accepted only from the trusted origin's main frame.
        configuration.userContentController.add(bridge, contentWorld: .page, name: "relish")
        webView = WKWebView(frame: .zero, configuration: configuration)
        super.init()
        bridge.browser = self
        #if DEBUG
        webView.isInspectable = true
        #endif
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.isOpaque = false
        webView.backgroundColor = UIColor(red: 0.965, green: 0.957, blue: 0.929, alpha: 1)
        webView.scrollView.contentInsetAdjustmentBehavior = .automatic
        // WKWebView handles its safe region and keyboard. No UIScreen/idiom or
        // orientation lock; posture comes from UIHingeInteraction (HingeWatcher).
        webView.load(URLRequest(url: startURL))
        RouteInbox.shared.attach { [weak self] route in self?.open(route) }
    }

    // MARK: Bridge

    /// Takes the page somewhere. Nothing is loaded from the route itself: the trusted
    /// page is asked to go there once it says it's ready.
    func open(_ route: RelishRoute) {
        if route != .share { pendingRoute = route }
        if error != nil { retry() }
        flush()
    }
    func receive(_ message: WKScriptMessage) {
        let origin = message.frameInfo.securityOrigin
        guard policy.acceptsBridgeMessage(scheme: origin.protocol, host: origin.host, port: origin.port, mainFrame: message.frameInfo.isMainFrame),
              policy.canDeliver(to: webView.url),
              let parsed = PageMessage.parse(message.body) else { return }
        handle(parsed)
    }
    func handle(_ message: PageMessage) {
        switch message {
        case .ready:
            pageReady = true
            if tent { send(.posture(tent: true)) }
            flush()
        case .widgets(let snapshot):
            if WidgetStore.write(snapshot) { WidgetCenter.shared.reloadAllTimelines() }
        case .table(let open):
            tableOpen = open
            UIApplication.shared.isIdleTimerDisabled = open
        case .shareReceived(let id):
            ShareInbox.remove(id: id)
        }
    }
    func setTent(_ value: Bool) {
        guard value != tent else { return }
        tent = value
        if pageReady { send(.posture(tent: value)) }
    }
    private func flush() {
        guard pageReady, !delivering, policy.canDeliver(to: webView.url) else { return }
        guard let route = pendingRoute else { return flushShare() }
        delivering = true
        send(.open(route)) { [weak self] accepted in
            guard let self else { return }
            self.delivering = false
            if accepted, self.pendingRoute == route { self.pendingRoute = nil }
            self.flushShare()
        }
    }
    private func flushShare() {
        guard pageReady, policy.canDeliver(to: webView.url), let waiting = ShareInbox.peek(),
              sharingID != waiting.item.id else { return }
        sharingID = waiting.item.id
        send(.share(id: waiting.item.id, text: waiting.item.text, imageJPEG: waiting.image)) { [weak self] accepted in
            if !accepted { self?.sharingID = nil }
        }
    }
    private func send(_ message: NativeMessage, done: (@MainActor (Bool) -> Void)? = nil) {
        guard let payload = message.payload, policy.canDeliver(to: webView.url) else { done?(false); return }
        webView.callAsyncJavaScript(
            "return window.relishNative ? window.relishNative.receive(m) === true : false",
            arguments: ["m": payload], in: nil, in: .page
        ) { result in
            if case .success(let value) = result { done?((value as? Bool) == true) } else { done?(false) }
        }
    }
    func webView(_ webView: WKWebView, didCommit navigation: WKNavigation!) {
        // A new document: wait for its `ready` before sending anything.
        pageReady = false
        sharingID = nil
        if tableOpen { tableOpen = false; UIApplication.shared.isIdleTimerDisabled = false }
    }
    func retry() { error = nil; webView.load(URLRequest(url: startURL)) }
    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping @MainActor @Sendable (WKNavigationActionPolicy) -> Void) {
        guard let url = action.request.url else { decisionHandler(.cancel); return }
        if action.shouldPerformDownload && policy.permitsDownload(url) {
            decisionHandler(.download); return
        }
        if policy.trusts(url) {
            if action.targetFrame == nil { webView.load(action.request); decisionHandler(.cancel) }
            else { decisionHandler(.allow) }
        } else {
            decisionHandler(.cancel)
            if action.navigationType == .linkActivated, policy.permitsExternalLink(url) {
                UIApplication.shared.open(url)
            }
        }
    }
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError failure: Error) {
        guard (failure as NSError).code != NSURLErrorCancelled else { return }
        error = "Connect to the internet to open Relish. Your journals on this device are still here."
    }
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) { error = nil }
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        error = "Relish needs to reopen. Your last saved words are still in your journal."
    }
    func webView(_ webView: WKWebView, requestMediaCapturePermissionFor origin: WKSecurityOrigin, initiatedByFrame frame: WKFrameInfo, type: WKMediaCaptureType, decisionHandler: @escaping @MainActor @Sendable (WKPermissionDecision) -> Void) {
        let allowed = policy.permitsMedia(scheme: origin.protocol, host: origin.host, port: origin.port, mainFrame: frame.isMainFrame)
        decisionHandler(allowed ? .prompt : .deny)
    }
    func webView(_ webView: WKWebView, navigationAction: WKNavigationAction, didBecome download: WKDownload) { download.delegate = self }
    func webView(_ webView: WKWebView, navigationResponse: WKNavigationResponse, didBecome download: WKDownload) { download.delegate = self }
    func download(_ download: WKDownload, decideDestinationUsing response: URLResponse, suggestedFilename: String, completionHandler: @escaping @MainActor @Sendable (URL?) -> Void) {
        do {
            let folder = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString, isDirectory: true)
            try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true, attributes: [.protectionKey: FileProtectionType.complete])
            let file = folder.appendingPathComponent(URL(fileURLWithPath: suggestedFilename).lastPathComponent)
            downloads[ObjectIdentifier(download)] = file
            completionHandler(file)
        } catch { completionHandler(nil) }
    }
    func downloadDidFinish(_ download: WKDownload) {
        guard let url = downloads.removeValue(forKey: ObjectIdentifier(download)) else { return }
        export = BackupExport(url: url)
    }
    func download(_ download: WKDownload, didFailWithError error: Error, resumeData: Data?) {
        if let url = downloads.removeValue(forKey: ObjectIdentifier(download)) { try? FileManager.default.removeItem(at: url.deletingLastPathComponent()) }
        self.error = "The backup could not be exported. Your journal is still on this device."
    }
    func finishExport(_ item: BackupExport) {
        export = nil
        try? FileManager.default.removeItem(at: item.url.deletingLastPathComponent())
    }
}
