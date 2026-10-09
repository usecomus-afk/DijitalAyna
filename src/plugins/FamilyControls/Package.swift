// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "ComusFamilyControls",
    platforms: [.iOS(.v15)],
    products: [
        .library(
            name: "ComusFamilyControls",
            targets: ["FamilyControlsPlugin"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", branch: "main")
    ],
    targets: [
        .target(
            name: "FamilyControlsPlugin",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm")
            ],
            path: "ios/Plugin")
    ]
)
