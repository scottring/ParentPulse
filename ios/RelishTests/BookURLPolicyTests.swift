import XCTest
@testable import Relish

final class BookURLPolicyTests: XCTestCase {
    let policy = BookURLPolicy(origin: BookURLPolicy.production)
    func testReleaseAlwaysUsesProduction() {
        for url in ["http://127.0.0.1:3210/relish/", "https://outsider.invalid/", "https://lifemanual-test-scottrings-projects.vercel.app/relish/"] {
            XCTAssertEqual(BookURLPolicy.startURL(url, development: false), BookURLPolicy.production)
        }
    }
    func testDebugOnlyAcceptsLocalOrRelishPreviews() {
        XCTAssertEqual(BookURLPolicy.startURL("http://127.0.0.1:3210/relish/", development: true).port, 3210)
        XCTAssertEqual(BookURLPolicy.startURL("https://lifemanual-test-scottrings-projects.vercel.app/relish/", development: true).host, "lifemanual-test-scottrings-projects.vercel.app")
        for url in ["http://app.relish.my/relish/", "https://outsider.invalid/", "https://lifemanual-test-scottrings-projects.vercel.app.evil.invalid/", "http://user:secret@localhost:3210/", "file:///tmp/book.html"] {
            XCTAssertEqual(BookURLPolicy.startURL(url, development: true), BookURLPolicy.production)
        }
    }
    func testOriginIncludesSchemePortAndCredentials() {
        XCTAssertTrue(policy.trusts(URL(string: "https://app.relish.my:443/privacy/")!))
        for url in ["http://app.relish.my/relish/", "https://app.relish.my:444/relish/", "https://app.relish.my.evil.invalid/", "https://user:secret@app.relish.my/"] {
            XCTAssertFalse(policy.trusts(URL(string: url)!))
        }
    }
    func testOnlyBookBlobsMayDownload() {
        XCTAssertTrue(policy.permitsDownload(URL(string: "blob:https://app.relish.my/fictional-backup")!))
        XCTAssertFalse(policy.permitsDownload(URL(string: "blob:https://outsider.invalid/file")!))
        XCTAssertFalse(policy.permitsDownload(URL(string: "file:///private/book.json")!))
        XCTAssertFalse(policy.permitsDownload(URL(string: "data:text/plain,secret")!))
    }
    func testMediaRequiresBookMainFrameAndExactOrigin() {
        XCTAssertTrue(policy.permitsMedia(scheme: "https", host: "app.relish.my", port: 0, mainFrame: true))
        XCTAssertFalse(policy.permitsMedia(scheme: "https", host: "app.relish.my", port: 443, mainFrame: false))
        XCTAssertFalse(policy.permitsMedia(scheme: "https", host: "app.relish.my", port: 444, mainFrame: true))
        XCTAssertFalse(policy.permitsMedia(scheme: "http", host: "app.relish.my", port: 80, mainFrame: true))
    }
    func testExternalNavigationCannotOpenArbitraryAppSchemes() {
        XCTAssertTrue(policy.permitsExternalLink(URL(string: "https://example.com/privacy/")!))
        XCTAssertTrue(policy.permitsExternalLink(URL(string: "mailto:support@example.invalid")!))
        for url in ["javascript:alert(1)", "file:///etc/passwd", "tel:123", "https://user:secret@example.com/"] {
            XCTAssertFalse(policy.permitsExternalLink(URL(string: url)!))
        }
    }
}
