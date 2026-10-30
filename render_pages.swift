import AppKit
import Foundation
import PDFKit
import UniformTypeIdentifiers

let args = CommandLine.arguments
let pdf = PDFDocument(url: URL(fileURLWithPath: args[1]))!
let root = URL(fileURLWithPath: args[2])

func render(_ page: PDFPage, width: Int, height: Int) -> CGImage {
    let context = CGContext(
        data: nil, width: width, height: height, bitsPerComponent: 8, bytesPerRow: 0,
        space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)!
    context.setFillColor(CGColor(red: 1, green: 1, blue: 1, alpha: 1))
    context.fill(CGRect(x: 0, y: 0, width: width, height: height))
    context.interpolationQuality = .high
    let box = page.bounds(for: .mediaBox)
    let scale = min(CGFloat(width) / box.width, CGFloat(height) / box.height)
    let dx = (CGFloat(width) - box.width * scale) / 2
    let dy = (CGFloat(height) - box.height * scale) / 2
    context.translateBy(x: dx, y: dy)
    context.scaleBy(x: scale, y: scale)
    page.draw(with: .mediaBox, to: context)
    return context.makeImage()!
}

func save(_ image: CGImage, _ url: URL) {
    let destination = CGImageDestinationCreateWithURL(url as CFURL, UTType.png.identifier as CFString, 1, nil)!
    CGImageDestinationAddImage(destination, image, nil)
    CGImageDestinationFinalize(destination)
}

let raw = root.appendingPathComponent("tools/build/raw")
try? FileManager.default.createDirectory(at: raw, withIntermediateDirectories: true)

for index in 0..<pdf.pageCount {
    let page = pdf.page(at: index)!
    let name = String(format: "%03d", index + 1)
    save(render(page, width: 1654, height: 2339), raw.appendingPathComponent(name + ".png"))
    save(render(page, width: 180, height: 254), raw.appendingPathComponent(name + "-thumb.png"))
    let box = page.bounds(for: .mediaBox)
    if box.width > box.height {
        save(render(page, width: 2339, height: 1654), raw.appendingPathComponent(name + "-wide.png"))
    }
}
print("ok", pdf.pageCount)
