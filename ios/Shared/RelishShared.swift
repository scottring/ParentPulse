import Foundation

/// What the app, its widgets and Share to Relish keep in their shared App Group.
/// Built into all three targets. Plain JSON files: no UserDefaults, no tracking.
enum RelishShared {
    static let appGroup = "group.my.relish.book"
    static var container: URL? {
        FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroup)
    }
}

/// The widgets' words, written by the app from the page's `widgets` message.
struct WidgetSnapshot: Codable, Equatable, Sendable {
    struct Tonight: Codable, Equatable, Sendable {
        var when: String
        var title: String
        var prompt: String
        /// The family's own words: the lock-screen widget never shows them.
        var own: Bool
    }
    struct FamilyLine: Codable, Equatable, Sendable {
        var text: String
        var who: String
    }
    var tonight: Tonight?
    /// Only present while a grown-up has the family-line widget turned on.
    var familyLine: FamilyLine?
    static let empty = WidgetSnapshot(tonight: nil, familyLine: nil)
}

enum WidgetStore {
    static func url(in container: URL? = RelishShared.container) -> URL? {
        container?.appendingPathComponent("widgets.json")
    }
    static func read(from container: URL? = RelishShared.container) -> WidgetSnapshot {
        guard let url = url(in: container), let data = try? Data(contentsOf: url),
              let snapshot = try? JSONDecoder().decode(WidgetSnapshot.self, from: data) else { return .empty }
        return snapshot
    }
    /// Saves the snapshot; returns whether anything changed (so timelines reload only then).
    /// Readable after the first unlock so lock-screen widgets can draw; it never holds private writing.
    @discardableResult
    static func write(_ snapshot: WidgetSnapshot, to container: URL? = RelishShared.container) -> Bool {
        guard let url = url(in: container), read(from: container) != snapshot else { return false }
        let encoder = JSONEncoder()
        encoder.outputFormatting = .sortedKeys
        guard let data = try? encoder.encode(snapshot) else { return false }
        do {
            try data.write(to: url, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
            return true
        } catch { return false }
    }
}

/// Words or a photo shared to Relish from another app, waiting for the app to open a draft.
/// One item at a time; a newer share replaces an older one. Never put in a URL.
struct SharedItem: Codable, Equatable, Sendable {
    var id: String
    var text: String
    var hasImage: Bool
    var createdAt: Date
}

enum ShareInbox {
    static let textLimit = 8000
    /// Items not picked up within a day are discarded.
    static let lifetime: TimeInterval = 86_400

    static func folder(in container: URL? = RelishShared.container) -> URL? {
        container?.appendingPathComponent("ShareInbox", isDirectory: true)
    }
    static func put(text: String, image: Data?, in container: URL? = RelishShared.container, now: Date = Date()) throws -> SharedItem {
        guard let folder = folder(in: container) else { throw CocoaError(.fileNoSuchFile) }
        try? FileManager.default.removeItem(at: folder)
        try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true, attributes: [.protectionKey: FileProtectionType.complete])
        // Whole seconds: what ISO 8601 keeps.
        let stamp = Date(timeIntervalSince1970: now.timeIntervalSince1970.rounded(.down))
        let item = SharedItem(id: UUID().uuidString, text: String(text.prefix(textLimit)), hasImage: image != nil, createdAt: stamp)
        if let image {
            try image.write(to: folder.appendingPathComponent("image.jpg"), options: [.atomic, .completeFileProtection])
        }
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        try encoder.encode(item).write(to: folder.appendingPathComponent("item.json"), options: [.atomic, .completeFileProtection])
        return item
    }
    /// The waiting item and its photo, if any; nil when there is none or it went stale.
    static func peek(in container: URL? = RelishShared.container, now: Date = Date()) -> (item: SharedItem, image: Data?)? {
        guard let folder = folder(in: container),
              let data = try? Data(contentsOf: folder.appendingPathComponent("item.json")) else { return nil }
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        guard let item = try? decoder.decode(SharedItem.self, from: data),
              now.timeIntervalSince(item.createdAt) < lifetime else {
            try? FileManager.default.removeItem(at: folder)
            return nil
        }
        let image = item.hasImage ? try? Data(contentsOf: folder.appendingPathComponent("image.jpg")) : nil
        return (item, image)
    }
    /// Once the page has opened the draft.
    static func remove(id: String, in container: URL? = RelishShared.container) {
        guard let folder = folder(in: container), let waiting = peek(in: container), waiting.item.id == id else { return }
        try? FileManager.default.removeItem(at: folder)
    }
}
