import XCTest
@testable import Relish

final class RelishBridgeTests: XCTestCase {
    let policy = BookURLPolicy(origin: BookURLPolicy.production)
    private let yes = NSNumber(value: true)
    private let no = NSNumber(value: false)

    // MARK: Deep links

    func testDeepLinksNameOnlyKnownPlaces() {
        XCTAssertEqual(BookURLPolicy.route(from: URL(string: "relish://new-entry")!), .newEntry)
        XCTAssertEqual(BookURLPolicy.route(from: URL(string: "relish://table")!), .table)
        XCTAssertEqual(BookURLPolicy.route(from: URL(string: "RELISH://Spot/")!), .spot)
        XCTAssertEqual(BookURLPolicy.route(from: URL(string: "relish://share")!), .share)
        for url in [
            "relish://outsider.invalid", "relish://table/../evil", "relish://table?url=https://outsider.invalid",
            "relish://table#x", "relish://user:secret@table", "relish://table:8080", "https://app.relish.my/relish/",
            "http://new-entry", "javascript:alert(1)", "relish:new-entry",
        ] {
            XCTAssertNil(BookURLPolicy.route(from: URL(string: url)!), url)
        }
        for route in RelishRoute.allCases {
            XCTAssertEqual(BookURLPolicy.route(from: route.url), route)
        }
    }
    func testRoutesOnlyGoToTheTrustedPage() {
        XCTAssertTrue(policy.canDeliver(to: URL(string: "https://app.relish.my/relish/")!))
        XCTAssertFalse(policy.canDeliver(to: nil))
        XCTAssertFalse(policy.canDeliver(to: URL(string: "https://outsider.invalid/relish/")!))
        XCTAssertFalse(policy.canDeliver(to: URL(string: "http://app.relish.my/relish/")!))
    }
    func testQuickActionsMapToTheirPlacesOnly() {
        XCTAssertEqual(RelishRoute(shortcutType: "my.relish.book.new-entry"), .newEntry)
        XCTAssertEqual(RelishRoute(shortcutType: "my.relish.book.play"), .play)
        XCTAssertNil(RelishRoute(shortcutType: "my.relish.book.share"))
        XCTAssertNil(RelishRoute(shortcutType: "other.app.new-entry"))
    }

    // MARK: Messages from the page

    func testBridgeAcceptsOnlyTheBooksMainFrame() {
        XCTAssertTrue(policy.acceptsBridgeMessage(scheme: "https", host: "app.relish.my", port: 0, mainFrame: true))
        XCTAssertFalse(policy.acceptsBridgeMessage(scheme: "https", host: "app.relish.my", port: 443, mainFrame: false))
        XCTAssertFalse(policy.acceptsBridgeMessage(scheme: "https", host: "outsider.invalid", port: 0, mainFrame: true))
        XCTAssertFalse(policy.acceptsBridgeMessage(scheme: "http", host: "app.relish.my", port: 0, mainFrame: true))
        XCTAssertFalse(policy.acceptsBridgeMessage(scheme: "https", host: "app.relish.my", port: 8443, mainFrame: true))
    }
    func testParsesTheVersionedMessageSet() {
        XCTAssertEqual(PageMessage.parse(["v": 1, "type": "ready"]), .ready)
        XCTAssertEqual(PageMessage.parse(["v": 1, "type": "table", "open": yes]), .table(open: true))
        XCTAssertEqual(PageMessage.parse(["v": 1, "type": "share-received", "id": "AB-12"]), .shareReceived(id: "AB-12"))
        let tonight: [String: Any] = ["when": "Tonight at dinner", "title": "Hearing each other out", "prompt": "Let someone finish a story.", "own": no]
        XCTAssertEqual(
            PageMessage.parse(["v": 1, "type": "widgets", "tonight": tonight, "familyLine": NSNull()]),
            .widgets(WidgetSnapshot(tonight: .init(when: "Tonight at dinner", title: "Hearing each other out", prompt: "Let someone finish a story.", own: false), familyLine: nil))
        )
        XCTAssertEqual(
            PageMessage.parse(["v": 1, "type": "widgets", "tonight": NSNull(), "familyLine": ["text": "Hold my hand.", "who": "Leo, at bedtime"]]),
            .widgets(WidgetSnapshot(tonight: nil, familyLine: .init(text: "Hold my hand.", who: "Leo, at bedtime")))
        )
    }
    func testRejectsAnythingElse() {
        let tonight: [String: Any] = ["when": "", "title": "T", "prompt": "", "own": no]
        let bad: [Any] = [
            "ready",
            ["type": "ready"],
            ["v": 2, "type": "ready"],
            ["v": yes, "type": "ready"],
            ["v": "1", "type": "ready"],
            ["v": 1, "type": "ready", "extra": 1],
            ["v": 1, "type": "navigate", "url": "https://outsider.invalid/"],
            ["v": 1, "type": "table", "open": 1],
            ["v": 1, "type": "table"],
            ["v": 1, "type": "share-received", "id": "../../etc"],
            ["v": 1, "type": "share-received", "id": String(repeating: "a", count: 101)],
            // Both widget keys must be present; null clears, missing is malformed.
            ["v": 1, "type": "widgets", "tonight": tonight],
            ["v": 1, "type": "widgets", "tonight": tonight.merging(["title": "  "]) { $1 }, "familyLine": NSNull()],
            ["v": 1, "type": "widgets", "tonight": tonight.merging(["prompt": String(repeating: "x", count: 301)]) { $1 }, "familyLine": NSNull()],
            ["v": 1, "type": "widgets", "tonight": tonight.merging(["script": "x"]) { $1 }, "familyLine": NSNull()],
            ["v": 1, "type": "widgets", "tonight": tonight.merging(["own": "no"]) { $1 }, "familyLine": NSNull()],
            ["v": 1, "type": "widgets", "tonight": NSNull(), "familyLine": ["text": "", "who": "Leo"]],
            ["v": 1, "type": "widgets", "tonight": NSNull(), "familyLine": ["text": String(repeating: "x", count: 281), "who": "Leo"]],
        ]
        for body in bad { XCTAssertNil(PageMessage.parse(body), "\(body)") }
    }

    // MARK: Messages to the page

    func testNativeMessagesAreVersionedAndNeverCarryURLs() throws {
        XCTAssertEqual(NativeMessage.open(.newEntry).payload as? [String: AnyHashable], ["v": 1, "type": "open", "place": "new-entry"])
        XCTAssertNil(NativeMessage.open(.share).payload)
        XCTAssertEqual(NativeMessage.posture(tent: true).payload as? [String: AnyHashable], ["v": 1, "type": "posture", "tent": true])
        let share = try XCTUnwrap(NativeMessage.share(id: "abc-1", text: "From Safari", imageJPEG: Data([0xFF, 0xD8])).payload)
        XCTAssertEqual(share["image"] as? String, "data:image/jpeg;base64,/9g=")
        XCTAssertNil(NativeMessage.share(id: "../x", text: "hi", imageJPEG: nil).payload)
        XCTAssertEqual((NativeMessage.share(id: "a", text: String(repeating: "x", count: 9000), imageJPEG: nil).payload?["text"] as? String)?.count, 8000)
    }

    // MARK: Posture

    func testTentIsPartlyOpenOnTheOuterScreenInLandscape() {
        XCTAssertTrue(Posture.isTent(partiallyOpen: true, windowSize: CGSize(width: 852, height: 393)))
        XCTAssertFalse(Posture.isTent(partiallyOpen: false, windowSize: CGSize(width: 852, height: 393)))
        XCTAssertFalse(Posture.isTent(partiallyOpen: true, windowSize: CGSize(width: 393, height: 852)))
        // Partly open like a laptop, on the big inner screen: not a tent.
        XCTAssertFalse(Posture.isTent(partiallyOpen: true, windowSize: CGSize(width: 1100, height: 760)))
        XCTAssertFalse(Posture.isTent(partiallyOpen: true, windowSize: .zero))
    }

    // MARK: App Group storage

    private func container() throws -> URL {
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString, isDirectory: true)
        try FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
        addTeardownBlock { try? FileManager.default.removeItem(at: url) }
        return url
    }
    func testWidgetWordsAreWrittenOnlyWhenTheyChangeAndTheFamilyLineCanBeCleared() throws {
        let box = try container()
        XCTAssertEqual(WidgetStore.read(from: box), .empty)
        let on = WidgetSnapshot(tonight: .init(when: "Tonight", title: "T", prompt: "P", own: false), familyLine: .init(text: "Words", who: "Leo"))
        XCTAssertTrue(WidgetStore.write(on, to: box))
        XCTAssertFalse(WidgetStore.write(on, to: box))
        XCTAssertEqual(WidgetStore.read(from: box), on)
        var off = on
        off.familyLine = nil
        XCTAssertTrue(WidgetStore.write(off, to: box))
        XCTAssertNil(WidgetStore.read(from: box).familyLine)
        XCTAssertFalse(String(decoding: try Data(contentsOf: WidgetStore.url(in: box)!), as: UTF8.self).contains("Words"))
    }
    func testSharedItemsWaitOnceAndExpire() throws {
        let box = try container()
        let now = Date()
        let item = try ShareInbox.put(text: "From Safari", image: Data([1, 2, 3]), in: box, now: now)
        let waiting = try XCTUnwrap(ShareInbox.peek(in: box, now: now))
        XCTAssertEqual(waiting.item, item)
        XCTAssertEqual(waiting.image, Data([1, 2, 3]))
        // A newer share replaces the older one.
        let newer = try ShareInbox.put(text: "Newer", image: nil, in: box, now: now)
        XCTAssertEqual(ShareInbox.peek(in: box, now: now)?.item.id, newer.id)
        XCTAssertNil(ShareInbox.peek(in: box, now: now)?.image)
        ShareInbox.remove(id: item.id, in: box)
        XCTAssertNotNil(ShareInbox.peek(in: box, now: now))
        ShareInbox.remove(id: newer.id, in: box)
        XCTAssertNil(ShareInbox.peek(in: box, now: now))
        _ = try ShareInbox.put(text: "Old", image: nil, in: box, now: now)
        XCTAssertNil(ShareInbox.peek(in: box, now: now.addingTimeInterval(ShareInbox.lifetime + 1)))
    }
}
