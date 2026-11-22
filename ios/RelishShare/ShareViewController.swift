import ImageIO
import SwiftUI
import UIKit
import UniformTypeIdentifiers

/// Share to Relish: words, a link or one photo from another app become a new private
/// draft in My journal. Nothing is shared with anyone. The item waits in the App Group
/// (never in a URL) until Relish opens and the page takes it.
final class ShareViewController: UIViewController {
    private let model = ShareModel()

    override func viewDidLoad() {
        super.viewDidLoad()
        model.finish = { [weak self] in self?.extensionContext?.completeRequest(returningItems: nil) }
        model.cancel = { [weak self] in
            self?.extensionContext?.cancelRequest(withError: CocoaError(.userCancelled))
        }
        model.openRelish = { [weak self] done in
            self?.extensionContext?.open(RelishShareLink.share) { opened in
                Task { @MainActor in done(opened) }
            }
        }
        let host = UIHostingController(rootView: ShareView(model: model))
        addChild(host)
        host.view.frame = view.bounds
        host.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        view.addSubview(host.view)
        host.didMove(toParent: self)
        let providers = (extensionContext?.inputItems as? [NSExtensionItem] ?? []).flatMap { $0.attachments ?? [] }
        Task { await model.load(providers) }
    }
}

enum RelishShareLink {
    static let share = URL(string: "relish://share")!
}

@MainActor
final class ShareModel: ObservableObject {
    enum Stage { case loading, ready, saved, failed(String) }
    @Published var stage: Stage = .loading
    @Published var text = ""
    @Published var image: UIImage?
    var imageJPEG: Data?
    var finish: () -> Void = {}
    var cancel: () -> Void = {}
    var openRelish: (@escaping @MainActor (Bool) -> Void) -> Void = { $0(false) }

    func load(_ providers: [NSItemProvider]) async {
        var words: [String] = []
        for provider in providers {
            if imageJPEG == nil, provider.hasItemConformingToTypeIdentifier(UTType.image.identifier),
               let data = await Self.data(provider, UTType.image), let jpeg = Self.jpeg(from: data) {
                imageJPEG = jpeg
                image = UIImage(data: jpeg)
            } else if provider.hasItemConformingToTypeIdentifier(UTType.url.identifier),
                      let url = await Self.url(provider), ["http", "https"].contains(url.scheme ?? "") {
                words.append(url.absoluteString)
            } else if provider.hasItemConformingToTypeIdentifier(UTType.plainText.identifier),
                      let value = await Self.text(provider) {
                words.append(value)
            }
        }
        text = String(words.joined(separator: "\n\n").trimmingCharacters(in: .whitespacesAndNewlines).prefix(ShareInbox.textLimit))
        stage = text.isEmpty && imageJPEG == nil ? .failed("There’s nothing here Relish can keep. Try sharing text or a photo.") : .ready
    }

    func save() {
        do {
            _ = try ShareInbox.put(text: text, image: imageJPEG)
        } catch {
            stage = .failed("Relish couldn’t keep this. Open Relish once, then try sharing again.")
            return
        }
        openRelish { [weak self] opened in
            guard let self else { return }
            if opened { self.finish() } else { self.stage = .saved }
        }
    }

    // A shared photo is shrunk on the way in (the longest side at most 1600 points).
    static func jpeg(from data: Data) -> Data? {
        guard let source = CGImageSourceCreateWithData(data as CFData, nil),
              let thumb = CGImageSourceCreateThumbnailAtIndex(source, 0, [
                  kCGImageSourceCreateThumbnailFromImageAlways: true,
                  kCGImageSourceCreateThumbnailWithTransform: true,
                  kCGImageSourceThumbnailMaxPixelSize: 1600,
              ] as CFDictionary) else { return nil }
        return UIImage(cgImage: thumb).jpegData(compressionQuality: 0.8)
    }
    private static func data(_ provider: NSItemProvider, _ type: UTType) async -> Data? {
        await withCheckedContinuation { continuation in
            _ = provider.loadDataRepresentation(for: type) { data, _ in continuation.resume(returning: data) }
        }
    }
    private static func url(_ provider: NSItemProvider) async -> URL? {
        await withCheckedContinuation { continuation in
            _ = provider.loadObject(ofClass: URL.self) { url, _ in continuation.resume(returning: url) }
        }
    }
    private static func text(_ provider: NSItemProvider) async -> String? {
        await withCheckedContinuation { continuation in
            _ = provider.loadObject(ofClass: String.self) { value, _ in continuation.resume(returning: value) }
        }
    }
}

struct ShareView: View {
    @ObservedObject var model: ShareModel
    private let ink = Color(red: 0.188, green: 0.220, blue: 0.173)
    private let olive = Color(red: 0.263, green: 0.318, blue: 0.227)
    private let paper = Color(red: 0.965, green: 0.957, blue: 0.929)

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    switch model.stage {
                    case .loading:
                        ProgressView().frame(maxWidth: .infinity)
                    case .failed(let message):
                        Text(message).foregroundStyle(ink)
                    case .saved:
                        Text("Kept for your journal")
                            .font(.system(.title2, design: .serif).weight(.medium))
                        Text("Open Relish to finish the draft in My journal. It waits in Relish for a day, only for you.")
                    case .ready:
                        Text("Only me · a new draft in My journal")
                            .font(.subheadline.weight(.medium))
                            .foregroundStyle(.secondary)
                        if let image = model.image {
                            Image(uiImage: image)
                                .resizable()
                                .scaledToFit()
                                .frame(maxHeight: 220)
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                                .accessibilityLabel("The photo you’re sharing")
                        }
                        if !model.text.isEmpty {
                            Text(model.text)
                                .font(.system(.body, design: .serif))
                                .lineLimit(8)
                                .padding(14)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .background(RoundedRectangle(cornerRadius: 12).fill(Color(red: 1, green: 0.992, blue: 0.965)))
                        }
                        Text("You can change it before you save. Nothing is shared with your family.")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                }
                .foregroundStyle(ink)
                .padding(20)
            }
            .background(paper)
            .navigationTitle("Relish")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    if case .saved = model.stage {
                        EmptyView()
                    } else {
                        Button("Cancel") { model.cancel() }
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    switch model.stage {
                    case .ready:
                        Button("Open in Relish") { model.save() }.tint(olive)
                    case .saved, .failed:
                        Button("Done") { model.finish() }.tint(olive)
                    case .loading:
                        EmptyView()
                    }
                }
            }
        }
        .tint(olive)
    }
}
