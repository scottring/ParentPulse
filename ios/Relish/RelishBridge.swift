import Foundation

/// Where a deep link, quick action, widget or Siri can send someone. The app never
/// loads a URL built from one: it asks the trusted page to go there over the bridge.
enum RelishRoute: String, CaseIterable, Sendable {
    case newEntry = "new-entry"
    case table
    case spot
    case play
    case family
    /// Something shared to Relish is waiting in the App Group.
    case share

    static let scheme = "relish"
    var url: URL { URL(string: "\(Self.scheme)://\(rawValue)")! }

    /// Home-screen quick actions (Info.plist UIApplicationShortcutItems).
    static let shortcutPrefix = "my.relish.book."
    init?(shortcutType: String) {
        guard shortcutType.hasPrefix(Self.shortcutPrefix),
              let route = RelishRoute(rawValue: String(shortcutType.dropFirst(Self.shortcutPrefix.count))),
              route == .newEntry || route == .play else { return nil }
        self = route
    }
}

/// The page's side of the bridge: `ready`, `widgets`, `table`, `share-received`.
/// Version 1. Anything with an unknown version, type, key or value is dropped.
enum PageMessage: Equatable {
    case ready
    case widgets(WidgetSnapshot)
    case table(open: Bool)
    case shareReceived(id: String)

    static let version = 1
    /// Matches WIDGET_LIMITS in src/lib/relish/native-bridge.ts.
    static let limits = (when: 80, title: 120, prompt: 300, line: 280, who: 120)

    static func parse(_ body: Any) -> PageMessage? {
        guard let message = body as? [String: Any], isNumber(message["v"], equalTo: version),
              let type = message["type"] as? String else { return nil }
        switch type {
        case "ready":
            return only(message, ["v", "type"]) ? .ready : nil
        case "table":
            guard only(message, ["v", "type", "open"]), let open = bool(message["open"]) else { return nil }
            return .table(open: open)
        case "share-received":
            guard only(message, ["v", "type", "id"]), let id = message["id"] as? String, isShareID(id) else { return nil }
            return .shareReceived(id: id)
        case "widgets":
            guard only(message, ["v", "type", "tonight", "familyLine"]),
                  let tonight = optional(message["tonight"], tonight(_:)),
                  let familyLine = optional(message["familyLine"], familyLine(_:)) else { return nil }
            return .widgets(WidgetSnapshot(tonight: tonight.value, familyLine: familyLine.value))
        default:
            return nil
        }
    }

    static func isShareID(_ id: String) -> Bool {
        !id.isEmpty && id.count <= 100 && id.allSatisfy { $0.isASCII && ($0.isLetter || $0.isNumber || $0 == "-") }
    }

    private struct Field<T> { let value: T? }
    /// A present-but-null value is allowed (it clears); a missing key or a bad value is not.
    private static func optional<T>(_ value: Any?, _ read: (Any) -> T?) -> Field<T>? {
        guard let value else { return nil }
        if value is NSNull { return Field(value: nil) }
        guard let read = read(value) else { return nil }
        return Field(value: read)
    }
    private static func tonight(_ value: Any) -> WidgetSnapshot.Tonight? {
        guard let t = value as? [String: Any], only(t, ["when", "title", "prompt", "own"]),
              let when = text(t["when"], limits.when), let title = text(t["title"], limits.title, required: true),
              let prompt = text(t["prompt"], limits.prompt), let own = bool(t["own"]) else { return nil }
        return .init(when: when, title: title, prompt: prompt, own: own)
    }
    private static func familyLine(_ value: Any) -> WidgetSnapshot.FamilyLine? {
        guard let f = value as? [String: Any], only(f, ["text", "who"]),
              let line = text(f["text"], limits.line, required: true), let who = text(f["who"], limits.who) else { return nil }
        return .init(text: line, who: who)
    }
    private static func only(_ dict: [String: Any], _ keys: Set<String>) -> Bool {
        Set(dict.keys).isSubset(of: keys)
    }
    private static func text(_ value: Any?, _ max: Int, required: Bool = false) -> String? {
        guard let s = value as? String, s.count <= max, !required || !s.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return nil }
        return s
    }
    /// WebKit hands JavaScript booleans and numbers over as NSNumber; tell them apart.
    private static func isBoolean(_ value: Any?) -> Bool {
        guard let n = value as? NSNumber else { return false }
        return CFGetTypeID(n) == CFBooleanGetTypeID()
    }
    private static func bool(_ value: Any?) -> Bool? {
        isBoolean(value) ? (value as? NSNumber)?.boolValue : nil
    }
    private static func isNumber(_ value: Any?, equalTo expected: Int) -> Bool {
        guard let n = value as? NSNumber, !isBoolean(n) else { return false }
        return n.doubleValue == Double(expected)
    }
}

/// The app's side: where to go, something shared, the phone standing up.
enum NativeMessage: Equatable {
    case open(RelishRoute)
    case share(id: String, text: String, imageJPEG: Data?)
    case posture(tent: Bool)

    /// The JSON-safe dictionary handed to `window.relishNative.receive`.
    var payload: [String: Any]? {
        switch self {
        case .open(let route):
            guard route != .share else { return nil }
            return ["v": PageMessage.version, "type": "open", "place": route.rawValue]
        case .share(let id, let text, let image):
            guard PageMessage.isShareID(id) else { return nil }
            var body: [String: Any] = ["v": PageMessage.version, "type": "share", "id": id, "text": String(text.prefix(ShareInbox.textLimit))]
            if let image { body["image"] = "data:image/jpeg;base64," + image.base64EncodedString() }
            return body
        case .posture(let tent):
            return ["v": PageMessage.version, "type": "posture", "tent": tent]
        }
    }
}

/// Tent posture: the hinge is partly open and Relish is on the compact outer screen,
/// in landscape. The inner screen then faces the table and the outer one faces the family.
enum Posture {
    static func isTent(partiallyOpen: Bool, windowSize: CGSize) -> Bool {
        partiallyOpen && windowSize.width > windowSize.height && windowSize.height > 0 && windowSize.height <= 500
    }
}
