import SwiftUI
import WebKit

struct GameWebView: UIViewRepresentable {
    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        let web = WKWebView(frame: .zero, configuration: config)
        web.isOpaque = false
        web.backgroundColor = UIColor(red: 18 / 255, green: 23 / 255, blue: 36 / 255, alpha: 1)
        web.scrollView.isScrollEnabled = false
        web.scrollView.bounces = false
        web.scrollView.contentInsetAdjustmentBehavior = .never
        if let page = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "web") {
            web.loadFileURL(page, allowingReadAccessTo: page.deletingLastPathComponent())
        }
        return web
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}
}
