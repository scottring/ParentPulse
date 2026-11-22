import AppIntents

/// "Write in Relish": opens a new private entry in My journal.
struct WriteInRelishIntent: AppIntent {
    static let title: LocalizedStringResource = "Write in Relish"
    static let description = IntentDescription("Opens a new private entry in My journal.")
    static let supportedModes: IntentModes = .foreground(.immediate)

    @MainActor
    func perform() async throws -> some IntentResult {
        RouteInbox.shared.post(.newEntry)
        return .result()
    }
}

/// "Start a car game": opens Spot it! in Table mode, for a passenger to hold.
struct StartCarGameIntent: AppIntent {
    static let title: LocalizedStringResource = "Start a car game"
    static let description = IntentDescription("Opens Spot it! with the whole card showing, for a passenger to hold.")
    static let supportedModes: IntentModes = .foreground(.immediate)

    @MainActor
    func perform() async throws -> some IntentResult {
        RouteInbox.shared.post(.spot)
        return .result()
    }
}

/// Registered with Siri and Shortcuts as soon as the app is installed, so both work by voice,
/// including through CarPlay.
struct RelishShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: WriteInRelishIntent(),
            phrases: ["Write in \(.applicationName)", "New \(.applicationName) entry"],
            shortTitle: "Write in Relish",
            systemImageName: "square.and.pencil"
        )
        AppShortcut(
            intent: StartCarGameIntent(),
            phrases: ["Start a car game in \(.applicationName)", "Start a \(.applicationName) car game"],
            shortTitle: "Start a car game",
            systemImageName: "car"
        )
    }
}
