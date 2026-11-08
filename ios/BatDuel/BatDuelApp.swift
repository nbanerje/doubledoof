import SwiftUI

@main
struct BatDuelApp: App {
    var body: some Scene {
        WindowGroup {
            GameWebView()
                .ignoresSafeArea()
                .statusBarHidden(true)
        }
    }
}
