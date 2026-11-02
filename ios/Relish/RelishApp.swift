import SwiftUI
import WebKit

@main
struct RelishApp: App {
    var body: some Scene {
        WindowGroup { RelishBook() }
    }
}

struct RelishBook: View {
    @StateObject private var browser = BookBrowser()
    @Environment(\.scenePhase) private var phase

    var body: some View {
        ZStack {
            Color(red: 0.816, green: 0.851, blue: 0.839).ignoresSafeArea()
            BookWebView(browser: browser)
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
                Color(red: 0.816, green: 0.851, blue: 0.839).ignoresSafeArea()
                VStack(spacing: 16) {
                    Image(systemName: "book.closed").font(.largeTitle)
                    Text("relish").font(.system(size: 40, design: .serif))
                    Text("Content hidden while Relish is inactive.").font(.subheadline)
                }
                .foregroundStyle(Color(red: 0.24, green: 0.31, blue: 0.32))
                .accessibilityLabel("Relish. Your private book is covered.")
            }
        }
        .tint(Color(red: 0.27, green: 0.40, blue: 0.42))
        .sheet(item: $browser.export) { item in
            BackupShare(url: item.url) { browser.finishExport(item) }
        }
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
    private var downloads: [ObjectIdentifier: URL] = [:]

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
        webView = WKWebView(frame: .zero, configuration: configuration)
        super.init()
        #if DEBUG
        webView.isInspectable = true
        #endif
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.isOpaque = false
        webView.backgroundColor = UIColor(red: 0.816, green: 0.851, blue: 0.839, alpha: 1)
        webView.scrollView.contentInsetAdjustmentBehavior = .automatic
        // WKWebView handles its safe region and keyboard. No UIScreen/idiom,
        // orientation lock, custom JS bridge, or speculative posture APIs.
        webView.load(URLRequest(url: startURL))
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
        error = "Connect to the internet to open Relish. Your encrypted books on this device have not been removed."
    }
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) { error = nil }
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        error = "Relish needs to reopen. Your last saved words are still in your encrypted book."
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
        self.error = "The backup could not be exported. Your book is still on this device."
    }
    func finishExport(_ item: BackupExport) {
        export = nil
        try? FileManager.default.removeItem(at: item.url.deletingLastPathComponent())
    }
}
