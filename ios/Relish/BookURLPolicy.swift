import Foundation

/// Keep navigation, downloads and media inside the configured book origin.
struct BookURLPolicy {
    static let production = URL(string: "https://app.relish.my/relish/")!
    let origin: URL

    static func startURL(_ configured: String?, development: Bool) -> URL {
        guard development, let configured, let url = URL(string: configured),
              url.user == nil, url.password == nil, let host = url.host else { return production }
        let preview = url.scheme == "https" && host.hasPrefix("lifemanual-") && host.hasSuffix("-scottrings-projects.vercel.app")
        let local = url.scheme == "http" && ["localhost", "127.0.0.1"].contains(host)
        return preview || local ? url : production
    }

    private func port(_ url: URL) -> Int { url.port ?? (url.scheme == "https" ? 443 : 80) }
    func trusts(_ url: URL) -> Bool {
        url.user == nil && url.password == nil && url.scheme == origin.scheme &&
            url.host == origin.host && port(url) == port(origin)
    }
    func permitsDownload(_ url: URL) -> Bool {
        if trusts(url) { return true }
        guard url.scheme == "blob", let source = URL(string: String(url.absoluteString.dropFirst(5))) else { return false }
        return trusts(source)
    }
    func permitsMedia(scheme: String, host: String, port suppliedPort: Int, mainFrame: Bool) -> Bool {
        let effectivePort = suppliedPort == 0 ? (scheme == "https" ? 443 : 80) : suppliedPort
        return mainFrame && scheme == origin.scheme && host == origin.host && effectivePort == port(origin)
    }
    func permitsExternalLink(_ url: URL) -> Bool {
        ["https", "mailto"].contains(url.scheme ?? "") && url.user == nil && url.password == nil
    }
}
