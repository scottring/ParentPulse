import XCTest

/// A walk through the native features in the fictional sample journal, for review
/// screenshots. Not part of the Relish scheme's tests: it needs a Debug build whose
/// RELISH_START_URL points at a local server, and it drives the home screen.
///
/// At each stop it writes `<name>.ready` into TOUR_DIR (pass TEST_RUNNER_TOUR_DIR to
/// xcodebuild) and waits for `<name>.done`, so a script on the Mac can take the
/// screenshot with `xcrun simctl io … screenshot`. Without TOUR_DIR it just pauses.
final class RelishTour: XCTestCase {
    let app = XCUIApplication(bundleIdentifier: "my.relish.book")
    let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
    var web: XCUIElement { app.webViews.firstMatch }

    override func setUp() {
        continueAfterFailure = true
    }

    private func stop(_ name: String, seconds: Double = 2) {
        Thread.sleep(forTimeInterval: seconds)
        guard let dir = ProcessInfo.processInfo.environment["TOUR_DIR"], !dir.isEmpty else {
            Thread.sleep(forTimeInterval: 3)
            return
        }
        let folder = URL(fileURLWithPath: dir)
        FileManager.default.createFile(atPath: folder.appendingPathComponent("\(name).ready").path, contents: nil)
        let done = folder.appendingPathComponent("\(name).done").path
        let deadline = Date().addingTimeInterval(40)
        while !FileManager.default.fileExists(atPath: done), Date() < deadline {
            Thread.sleep(forTimeInterval: 0.3)
        }
    }
    @discardableResult
    private func tap(_ label: String, in root: XCUIElement? = nil, timeout: Double = 12, required: Bool = true) -> Bool {
        let element = (root ?? web).buttons[label].firstMatch
        guard element.waitForExistence(timeout: timeout) else {
            if required { XCTFail("No button \(label)") }
            return false
        }
        // Bring it on screen: scroll the page down, then back up, until it can be tapped.
        for direction in [true, true, true, true, false, false, false, false, false, false] where !element.isHittable {
            let from = web.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: direction ? 0.75 : 0.3))
            let to = web.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: direction ? 0.35 : 0.7))
            from.press(forDuration: 0.05, thenDragTo: to)
        }
        element.tap()
        return true
    }
    private func tapText(_ text: String, timeout: Double = 8) {
        let element = web.staticTexts[text].firstMatch
        if element.waitForExistence(timeout: timeout) { element.tap() } else { XCTFail("No text \(text)") }
    }
    private func sample() {
        app.launch()
        XCUIDevice.shared.orientation = .portrait
        let explore = web.buttons["Explore a sample journal"].firstMatch
        if explore.waitForExistence(timeout: 30) {
            if !explore.isHittable { web.swipeUp() }
            explore.tap()
        }
        _ = web.buttons["Activities"].firstMatch.waitForExistence(timeout: 15)
    }

    func test1TableMode() {
        sample()
        tap("Activities")
        tap("Together", timeout: 4, required: false)
        tap("Try this tonight")
        Thread.sleep(forTimeInterval: 1.5)
        XCUIDevice.shared.orientation = .landscapeLeft
        Thread.sleep(forTimeInterval: 1.5)
        tap("Stand it up at the table")
        stop("01-table-start-closed")
        web.coordinate(withNormalizedOffset: CGVector(dx: 0.45, dy: 0.55)).tap()
        stop("02-table-question-closed")
        for _ in 0..<4 { web.coordinate(withNormalizedOffset: CGVector(dx: 0.45, dy: 0.55)).tap(); Thread.sleep(forTimeInterval: 0.6) }
        stop("03-table-done-closed")
        tap("Skip it")
        // "Start a car game" and the widgets use the same deep links.
        XCUIDevice.shared.system.open(URL(string: "relish://spot")!)
        Thread.sleep(forTimeInterval: 3)
        // Squares and the people who call them, by where they sit (the page re-renders after each tap).
        _ = web.buttons["Done spotting"].firstMatch.waitForExistence(timeout: 10)
        Thread.sleep(forTimeInterval: 1)
        let names = ["Alex", "Leo", "Anna", "June"]
        // aria-pressed buttons come through as toggles.
        let all = web.buttons.allElementsBoundByIndex + web.toggles.allElementsBoundByIndex + web.switches.allElementsBoundByIndex
        let buttons = all.filter { $0.exists && $0.frame.width > 0 }.map { ($0.label, $0.frame) }
        let people = buttons.filter { item in names.contains { item.0.contains($0) } }
        let top = people.map { $0.1.minY }.min() ?? .greatestFiniteMagnitude
        let cells = buttons.filter { item in
            !names.contains { item.0.contains($0) } && item.1.midY < top && item.1.minY > 60
        }
        let origin = app.coordinate(withNormalizedOffset: .zero)
        let at = { (frame: CGRect) in origin.withOffset(CGVector(dx: frame.midX, dy: frame.midY)).tap() }
        for (square, player) in [(1, "Leo"), (3, "Anna"), (6, "Leo")] where square < cells.count {
            at(cells[square].1)
            Thread.sleep(forTimeInterval: 0.6)
            if let who = people.first(where: { $0.0.contains(player) }) { at(who.1) }
            Thread.sleep(forTimeInterval: 0.9)
        }
        if cells.count > 4 { at(cells[4].1) }
        stop("04-table-spot-closed")
        tap("Leave the table")
        XCUIDevice.shared.orientation = .portrait
        Thread.sleep(forTimeInterval: 1)
    }

    func test2WidgetSettingAndQuickActions() {
        sample()
        // A grown-up turns on the family-line widget.
        let menu = web.buttons["Menu: family, account, settings, sound, help"].firstMatch
        if menu.waitForExistence(timeout: 10) { menu.tap() }
        tap("Settings")
        let toggle = web.descendants(matching: .any).matching(identifier: "Show a line from Our family journal").firstMatch
        if toggle.waitForExistence(timeout: 8) {
            for _ in 0..<8 where !toggle.isHittable {
                web.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.8))
                    .press(forDuration: 0.05, thenDragTo: web.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.4)))
            }
            Thread.sleep(forTimeInterval: 0.5)
            stop("05-settings-widget-off")
            toggle.tap()
            Thread.sleep(forTimeInterval: 1)
        }
        // The Home button doesn't reach the closed Duo's outer screen in the simulator;
        // leaving the app shows the home screen there.
        app.terminate()
        Thread.sleep(forTimeInterval: 2)
        // Long-press the icon: New entry and Play a game. The outer screen's home screen
        // doesn't expose its icons to UI automation, so this goes by position: Relish is
        // the first icon on the page shown.
        let screen = springboard.windows.firstMatch
        screen.coordinate(withNormalizedOffset: CGVector(dx: 0.122, dy: 0.116)).press(forDuration: 1.4)
        stop("06-quick-actions")
        let newEntry = springboard.buttons["New entry"].firstMatch
        if newEntry.waitForExistence(timeout: 4) { newEntry.tap() } else {
            springboard.staticTexts["New entry"].firstMatch.tap()
        }
        // Signed out, the route waits until a journal is open, then the new entry opens.
        let explore = web.buttons["Explore a sample journal"].firstMatch
        if explore.waitForExistence(timeout: 20) {
            if !explore.isHittable { web.swipeUp() }
            explore.tap()
        }
        stop("07-quick-action-new-entry", seconds: 4)
    }

    func test3ShareToRelish() {
        let safari = XCUIApplication(bundleIdentifier: "com.apple.mobilesafari")
        safari.launch()
        safari.open(URL(string: "http://127.0.0.1:3219/privacy/")!)
        Thread.sleep(forTimeInterval: 4)
        let share = safari.buttons["Share"].firstMatch
        if !share.waitForExistence(timeout: 6) {
            safari.buttons["Page Menu"].firstMatch.tap()
            Thread.sleep(forTimeInterval: 1)
        }
        if share.waitForExistence(timeout: 4) { share.tap() }
        Thread.sleep(forTimeInterval: 2)
        stop("09-share-sheet")
        let relish = safari.cells["Relish"].firstMatch.exists ? safari.cells["Relish"].firstMatch : safari.buttons["Relish"].firstMatch
        if relish.waitForExistence(timeout: 6) {
            relish.tap()
            stop("10-share-to-relish", seconds: 3)
            let open = safari.buttons["Open in Relish"].firstMatch
            if open.waitForExistence(timeout: 6) { open.tap() }
            stop("11-share-after-open", seconds: 4)
            let done = safari.buttons["Done"].firstMatch
            if done.waitForExistence(timeout: 4) { done.tap() }
        }
        // Relish picks the shared words up from the App Group: a new private draft.
        sample()
        stop("12-share-draft", seconds: 4)
    }
}
