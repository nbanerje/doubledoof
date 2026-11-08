import SwiftUI

@main
struct DoubleDoofApp: App {
    var body: some Scene {
        WindowGroup {
            GameWebView()
                .ignoresSafeArea()
                .statusBarHidden(true)
        }
    }
}
