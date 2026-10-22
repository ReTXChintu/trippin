import 'package:url_launcher/url_launcher.dart';

/// Links into SpendLog and InFrame: their web pages for a linked group/event, opened in the app
/// itself when it's installed.
///
/// Each app also answers its own custom scheme (`spendlog://app/…`, `inframe://app/…`), which
/// works whether or not Android has verified its https App Links, so that's tried first; the
/// https page in the browser is the fallback.

/// The sibling app's own link for one of its web pages, or null for a page it doesn't open.
///
/// ```text
/// SpendLog  …/groups?group=ID · …/groups/ID · …/trips?trip=ID (older links)  → spendlog://app/groups/ID
/// InFrame   …/events/ID                                                      → inframe://app/events/ID
/// ```
Uri? siblingAppLink(String url) {
  final uri = Uri.tryParse(url);
  if (uri == null || !(uri.scheme == 'https' || uri.scheme == 'http')) return null;
  final segments = uri.pathSegments.where((s) => s.isNotEmpty).toList();
  if (segments.isEmpty) return null;

  String? group;
  if (segments.first == 'groups') group = segments.length > 1 ? segments[1] : uri.queryParameters['group'];
  if (segments.first == 'trips' && segments.length == 1) group = uri.queryParameters['trip'] ?? uri.queryParameters['group'];
  if (group != null && group.isNotEmpty) return Uri(scheme: 'spendlog', host: 'app', pathSegments: ['groups', group]);

  if (segments.first == 'events' && segments.length > 1 && segments[1] != 'new') {
    return Uri(scheme: 'inframe', host: 'app', pathSegments: ['events', segments[1]]);
  }
  return null;
}

typedef UrlLauncher = Future<bool> Function(Uri uri, LaunchMode mode);

Future<bool> _launch(Uri uri, LaunchMode mode) => launchUrl(uri, mode: mode);

/// Opens a SpendLog/InFrame page in that app when it's installed, else in the browser. False when
/// nothing could open it.
Future<bool> openSuiteUrl(String url, {UrlLauncher launcher = _launch}) async {
  final app = siblingAppLink(url);
  if (app != null) {
    try {
      if (await launcher(app, LaunchMode.externalNonBrowserApplication)) return true;
    } catch (_) {
      // Not installed (or too old to know the link): the web page instead.
    }
  }
  final web = Uri.tryParse(url);
  if (web == null) return false;
  try {
    return await launcher(web, LaunchMode.externalApplication);
  } catch (_) {
    return false;
  }
}
