import SwiftUI
import WidgetKit

// Relish's widgets (mockup Widgets, 2026-11-22). Passive: they show what the app last
// wrote to the App Group and open Relish when tapped. They never notify anyone.
// The lock screen never shows family words; the family-line widget is off until a
// grown-up turns it on in Relish's settings, and it only shows words already in
// Our family journal.

@main
struct RelishWidgetBundle: WidgetBundle {
    var body: some Widget {
        WriteWidget()
        TonightWidget()
        FamilyLineWidget()
    }
}

struct RelishEntry: TimelineEntry {
    let date: Date
    let snapshot: WidgetSnapshot
}

/// One entry from the App Group; the app reloads timelines whenever it writes new words.
struct RelishProvider: TimelineProvider {
    var sample = WidgetSnapshot(
        tonight: .init(when: "Tonight at dinner", title: "Hearing each other out",
                       prompt: "Let someone finish a story. Then ask one question about it.", own: false),
        familyLine: nil
    )
    func placeholder(in context: Context) -> RelishEntry { RelishEntry(date: Date(), snapshot: sample) }
    func getSnapshot(in context: Context, completion: @escaping (RelishEntry) -> Void) {
        let stored = WidgetStore.read()
        completion(RelishEntry(date: Date(), snapshot: context.isPreview && stored.tonight == nil ? sample : stored))
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<RelishEntry>) -> Void) {
        completion(Timeline(entries: [RelishEntry(date: Date(), snapshot: WidgetStore.read())], policy: .never))
    }
}

enum Paper {
    static let canvas = Color(red: 0.965, green: 0.957, blue: 0.929)
    static let butter = Color(red: 0.976, green: 0.933, blue: 0.788)
    static let ink = Color(red: 0.188, green: 0.220, blue: 0.173)
    static let soft = Color(red: 0.373, green: 0.392, blue: 0.345)
    static let olive = Color(red: 0.263, green: 0.318, blue: 0.227)
    static let onOlive = Color(red: 0.965, green: 0.957, blue: 0.929)
}

private struct Cap: View {
    let text: String
    var color = Paper.soft
    var body: some View {
        Text(text.uppercased())
            .font(.system(size: 11, weight: .semibold))
            .tracking(0.6)
            .foregroundStyle(color)
            .lineLimit(1)
    }
}

// MARK: Write a line about today

struct WriteWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "RelishWrite", provider: RelishProvider()) { entry in
            WriteView(entry: entry)
        }
        .configurationDisplayName("Write a line")
        .description("Opens a new private entry in My journal.")
        .supportedFamilies([.systemSmall, .accessoryCircular])
    }
}

struct WriteView: View {
    @Environment(\.widgetFamily) private var family
    let entry: RelishEntry
    var body: some View {
        Group {
            if family == .accessoryCircular {
                ZStack {
                    AccessoryWidgetBackground()
                    VStack(spacing: 1) {
                        Image(systemName: "pencil.line").font(.system(size: 20, weight: .semibold))
                        Text("Write").font(.system(size: 10, weight: .semibold))
                    }
                }
                .accessibilityLabel("Write in Relish")
                .containerBackground(.clear, for: .widget)
            } else {
                VStack(alignment: .leading) {
                    Cap(text: "My journal")
                    Spacer()
                    Text("Write a line about today")
                        .font(.system(size: 21, weight: .medium, design: .serif))
                        .foregroundStyle(Paper.ink)
                        .minimumScaleFactor(0.8)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
                .containerBackground(for: .widget) {
                    ZStack(alignment: .topTrailing) {
                        Paper.canvas
                        Image("Jot").resizable().scaledToFit().frame(width: 92, height: 92).offset(x: 8, y: -6)
                    }
                }
            }
        }
        .widgetURL(RelishLink.newEntry)
    }
}

// MARK: Tonight

struct TonightWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "RelishTonight", provider: RelishProvider()) { entry in
            TonightView(entry: entry)
        }
        .configurationDisplayName("Tonight")
        .description("Tonight’s activity. Tap to stand Relish up at the table.")
        .supportedFamilies([.systemMedium, .accessoryRectangular])
    }
}

struct TonightView: View {
    @Environment(\.widgetFamily) private var family
    let entry: RelishEntry
    var body: some View {
        let tonight = entry.snapshot.tonight
        Group {
            if family == .accessoryRectangular {
                // Lock screen: an activity's name, never the family's own words.
                VStack(alignment: .leading, spacing: 1) {
                    Text("RELISH · TONIGHT").font(.system(size: 11, weight: .semibold)).opacity(0.85)
                    Text(tonight.flatMap { $0.own ? nil : $0.title } ?? "Something to try together")
                        .font(.system(size: 15, weight: .medium, design: .serif))
                        .lineLimit(2)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .containerBackground(.clear, for: .widget)
            } else {
                HStack(spacing: 4) {
                    Image("Dinner")
                        .resizable()
                        .scaledToFill()
                        .frame(width: 128)
                        .clipped()
                        .mask(RadialGradient(colors: [.black, .black, .clear], center: .center, startRadius: 20, endRadius: 78))
                    VStack(alignment: .leading, spacing: 6) {
                        Cap(text: tonight?.when ?? "Tonight")
                        Text(tonight?.prompt ?? "Open Relish to choose something to try together.")
                            .font(.system(size: 17, weight: .medium, design: .serif))
                            .foregroundStyle(Paper.ink)
                            .lineLimit(3)
                            .minimumScaleFactor(0.85)
                        Spacer(minLength: 0)
                        Text("Stand it up at the table")
                            .font(.system(size: 13, weight: .medium, design: .serif))
                            .foregroundStyle(Paper.onOlive)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 5)
                            .background(Capsule().fill(Paper.olive))
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
                }
                .containerBackground(Paper.canvas, for: .widget)
            }
        }
        .widgetURL(RelishLink.table)
    }
}

// MARK: From Our family journal

struct FamilyLineWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "RelishFamilyLine", provider: RelishProvider()) { entry in
            FamilyLineView(entry: entry)
        }
        .configurationDisplayName("From Our family journal")
        .description("A line your family already shared. Off until a grown-up turns it on in Relish’s settings.")
        // Home screen only: family words never go on the lock screen.
        .supportedFamilies([.systemMedium])
    }
}

struct FamilyLineView: View {
    let entry: RelishEntry
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Cap(text: "From Our family journal", color: Color(red: 0.42, green: 0.365, blue: 0.18))
            if let line = entry.snapshot.familyLine {
                Text("“\(line.text)”")
                    .font(.system(size: 18, design: .serif).italic())
                    .foregroundStyle(Paper.ink)
                    .lineLimit(4)
                    .minimumScaleFactor(0.8)
                Spacer(minLength: 0)
                Text(line.who).font(.system(size: 13)).foregroundStyle(Paper.soft).lineLimit(1)
            } else {
                Text("Off for now")
                    .font(.system(size: 18, weight: .medium, design: .serif))
                    .foregroundStyle(Paper.ink)
                Text("A grown-up can turn this on in Relish: Settings. It only shows words already in Our family journal.")
                    .font(.system(size: 13))
                    .foregroundStyle(Paper.soft)
                    .lineLimit(3)
                Spacer(minLength: 0)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .containerBackground(Paper.butter, for: .widget)
        .widgetURL(RelishLink.family)
    }
}

/// The app's deep links (BookURLPolicy.route reads them).
enum RelishLink {
    static let newEntry = URL(string: "relish://new-entry")!
    static let table = URL(string: "relish://table")!
    static let family = URL(string: "relish://family")!
}
