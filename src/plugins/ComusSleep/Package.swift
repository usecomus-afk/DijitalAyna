// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "ComusSleepPlugin",
    platforms: [.iOS(.v13)],
    products: [
        .library(
            name: "ComusSleepPlugin",
            targets: ["ComusSleepPlugin"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", branch: "main")
    ],
    targets: [
        .target(
            name: "ComusSleepPlugin",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm")
            ],
            path: "ios/Plugin")
    ]
)
