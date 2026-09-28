import ExpoModulesCore
import Foundation
import UserNotifications

private enum StartupRecovery {
  static var status = "none"
  static let preference = "pastPinsResetOnNextLaunch"

  struct OwnedFiles: Decodable {
    let databaseName: String
    let catalogDirectory: String
    let diagnosticsFile: String
    let resetPreference: String
  }

  static func resetIfRequested() {
    let defaults = UserDefaults.standard
    guard defaults.bool(forKey: preference) else { return }
    status = "failed"
    do {
      guard let resource = Bundle.main.url(forResource: "PastPinsRecoveryFiles", withExtension: "json") else {
        return
      }
      let files = try JSONDecoder().decode(OwnedFiles.self, from: Data(contentsOf: resource))
      guard files.resetPreference == preference,
        [files.databaseName, files.diagnosticsFile, files.catalogDirectory].allSatisfy({
          !$0.isEmpty && !$0.contains("/") && !$0.contains("..")
        }) else { return }
      let manager = FileManager.default
      let documents = try manager.url(for: .documentDirectory, in: .userDomainMask, appropriateFor: nil, create: false)
      let cache = try manager.url(for: .cachesDirectory, in: .userDomainMask, appropriateFor: nil, create: false)
      for suffix in ["", "-wal", "-shm", "-journal"] {
        try removeIfPresent(documents.appendingPathComponent("SQLite").appendingPathComponent(files.databaseName + suffix))
      }
      try removeIfPresent(documents.appendingPathComponent(files.diagnosticsFile))
      try removeIfPresent(cache.appendingPathComponent("DocumentPicker"))
      try removeIfPresent(cache.appendingPathComponent(files.catalogDirectory))
      let cachedFiles: [URL]
      do { cachedFiles = try manager.contentsOfDirectory(at: cache, includingPropertiesForKeys: nil) }
      catch let error as CocoaError where error.code == .fileReadNoSuchFile { cachedFiles = [] }
      for file in cachedFiles where file.lastPathComponent.hasPrefix("Past-Pins-") && file.pathExtension == "json" {
        try removeIfPresent(file)
      }
      UNUserNotificationCenter.current().removeAllPendingNotificationRequests()
      UNUserNotificationCenter.current().removeAllDeliveredNotifications()
      defaults.set(false, forKey: preference)
      status = "completed"
    } catch {
    }
  }

  private static func removeIfPresent(_ url: URL) throws {
    do { try FileManager.default.removeItem(at: url) }
    catch let error as CocoaError where error.code == .fileNoSuchFile { }
  }
}

public class PastPinsRecoverySubscriber: ExpoAppDelegateSubscriber {
  public func appDelegateWillBeginInitialization() {
    StartupRecovery.resetIfRequested()
  }
}

public class PastPinsRecoveryModule: Module {
  public func definition() -> ModuleDefinition {
    Name("PastPinsRecovery")
    Function("getStartupResetStatus") { StartupRecovery.status }
  }
}
