import 'package:intl/intl.dart';

import 'models.dart';

/// The suite: SpendLog (trip money) and InFrame (shared photos), linked per trip from Trippin.
/// Parsed from GET /trips/:id/links, tolerant of missing fields.

String? _str(dynamic v) {
  final s = v?.toString().trim();
  return s == null || s.isEmpty ? null : s;
}

int _int(dynamic v) => v is num ? v.toInt() : int.tryParse('${v ?? ''}') ?? 0;

Json? _map(dynamic v) => v is Map ? v.cast<String, dynamic>() : null;

/// "₹1,234.50" from minor units (paise, cents). Whole amounts drop the decimals.
String formatMinor(int minor, String currency) {
  final code = currency.toUpperCase();
  final whole = minor % 100 == 0;
  final f = NumberFormat.simpleCurrency(name: code, locale: code == 'INR' ? 'en_IN' : 'en_US', decimalDigits: whole ? 0 : 2);
  return f.format(minor / 100);
}

/// Trippin's own card for an app the viewer doesn't use yet, or hasn't linked this trip to.
class SuitePromo {
  SuitePromo({required this.title, required this.body, required this.cta, required this.webUrl, this.apkUrl});
  factory SuitePromo.fromJson(Json j) => SuitePromo(
        title: _str(j['title']) ?? '',
        body: _str(j['body']) ?? '',
        cta: _str(j['cta']) ?? 'Get the app',
        webUrl: _str(j['webUrl']) ?? '',
        apkUrl: _str(j['apkUrl']),
      );
  final String title, body, cta, webUrl;
  final String? apkUrl;

  /// What the main button opens: the APK where that's how the app is installed, else the website.
  String get downloadUrl => apkUrl ?? webUrl;
}

class SettlementLine {
  SettlementLine({required this.fromName, required this.toName, required this.amountMinor});
  factory SettlementLine.fromJson(Json j) =>
      SettlementLine(fromName: _str(j['fromName']) ?? 'Someone', toName: _str(j['toName']) ?? 'someone', amountMinor: _int(j['amountMinor']));
  final String fromName, toName;
  final int amountMinor;
}

class SpendlogSummary {
  SpendlogSummary({
    required this.url,
    required this.totalSpentMinor,
    required this.currency,
    required this.myShareMinor,
    required this.iOweMinor,
    required this.owedToMeMinor,
    required this.settlement,
    required this.transactionCount,
    this.updatedAt,
  });
  factory SpendlogSummary.fromJson(Json j) => SpendlogSummary(
        url: _str(j['url']),
        totalSpentMinor: _int(j['totalSpentMinor']),
        currency: _str(j['currency']) ?? 'INR',
        myShareMinor: _int(j['myShareMinor']),
        iOweMinor: _int(j['iOweMinor']),
        owedToMeMinor: _int(j['owedToMeMinor']),
        settlement: (j['settlement'] as List?)?.whereType<Map>().map((e) => SettlementLine.fromJson(e.cast<String, dynamic>())).toList() ?? const [],
        transactionCount: _int(j['transactionCount']),
        updatedAt: _str(j['updatedAt']),
      );
  final String? url, updatedAt;
  final int totalSpentMinor, myShareMinor, iOweMinor, owedToMeMinor, transactionCount;
  final String currency;
  final List<SettlementLine> settlement;

  String money(int minor) => formatMinor(minor, currency);
}

class InframeSummary {
  InframeSummary({
    required this.url,
    required this.photoCount,
    required this.videoCount,
    required this.albumCount,
    this.coverThumbUrl,
    required this.needsStorage,
    this.updatedAt,
  });
  factory InframeSummary.fromJson(Json j) => InframeSummary(
        url: _str(j['url']),
        photoCount: _int(j['photoCount']),
        videoCount: _int(j['videoCount']),
        albumCount: _int(j['albumCount']),
        coverThumbUrl: _str(j['coverThumbUrl']),
        needsStorage: j['needsStorage'] == true,
        updatedAt: _str(j['updatedAt']),
      );
  final String? url, coverThumbUrl, updatedAt;
  final int photoCount, videoCount, albumCount;
  final bool needsStorage;
}

/// Someone on the trip the app couldn't add yet; they join once they sign in there.
class SkippedMember {
  SkippedMember({this.sub, this.email, this.reason});
  factory SkippedMember.fromJson(Json j) => SkippedMember(sub: _str(j['sub']), email: _str(j['email']), reason: _str(j['reason']));
  final String? sub, email, reason;
}

/// One app's link to this trip, as the viewer sees it.
class ConnectedApp {
  ConnectedApp({
    required this.app,
    required this.name,
    required this.tagline,
    required this.enabled,
    this.status,
    this.url,
    this.lastError,
    this.hasAccount,
    this.spendlog,
    this.inframe,
    this.summaryError,
    this.promo,
    required this.webUrl,
    this.apkUrl,
    this.skippedMembers = const [],
  });

  factory ConnectedApp.fromJson(String app, Json j) {
    final summary = _map(j['summary']);
    final name = _str(j['name']) ?? (app == 'spendlog' ? 'SpendLog' : 'InFrame');
    return ConnectedApp(
      app: app,
      name: name,
      tagline: _str(j['tagline']) ?? defaultTagline(app),
      enabled: j['enabled'] == true,
      status: _str(j['status']),
      url: _str(j['url']),
      lastError: _str(j['lastError']),
      hasAccount: j['hasAccount'] is bool ? j['hasAccount'] as bool : null,
      spendlog: app == 'spendlog' && summary != null ? SpendlogSummary.fromJson(summary) : null,
      inframe: app == 'inframe' && summary != null ? InframeSummary.fromJson(summary) : null,
      summaryError: _str(j['summaryError']),
      promo: _map(j['promo']) == null ? null : SuitePromo.fromJson(_map(j['promo'])!),
      webUrl: _str(j['webUrl']) ?? '',
      apkUrl: _str(j['apkUrl']),
      skippedMembers: (j['skippedMembers'] as List?)?.whereType<Map>().map((e) => SkippedMember.fromJson(e.cast<String, dynamic>())).toList() ?? const [],
    );
  }

  /// The switch labels on the trip screen (and the web's create form).
  static String toggleLabel(String app) => app == 'spendlog' ? 'Track spending in SpendLog' : 'Share photos in InFrame';

  static String defaultTagline(String app) => app == 'spendlog'
      ? 'Creates a SpendLog trip for everyone on this trip — split and settle expenses there.'
      : 'Creates a shared InFrame event so everyone’s trip photos land in one place.';

  final String app, name, tagline, webUrl;
  final bool enabled;

  /// pending | linked | error | unlinked, or null when never linked.
  final String? status;
  final String? url, lastError, summaryError, apkUrl;
  final bool? hasAccount;
  final SpendlogSummary? spendlog;
  final InframeSummary? inframe;
  final SuitePromo? promo;

  /// Trip members not on the app's side yet (no account there); they join on first sign-in.
  final List<SkippedMember> skippedMembers;

  bool get hasSummary => spendlog != null || inframe != null;

  /// Where "Open in …" goes: the linked trip/event, else the summary's own link.
  String? get openUrl => url ?? spendlog?.url ?? inframe?.url;

  /// Trippin's promo for this app: when the viewer has no account there, or the trip isn't linked
  /// and it isn't known whether they have one. (Someone who uses the app gets the switch instead.)
  bool get showsPromo => promo != null && (hasAccount == false || (!enabled && hasAccount == null));
}

/// GET/PATCH /trips/:id/links.
class TripLinks {
  TripLinks({required this.canManage, required this.apps});
  factory TripLinks.fromJson(Json j) {
    final apps = _map(j['apps']) ?? const {};
    return TripLinks(
      canManage: j['canManage'] == true,
      apps: [
        for (final key in const ['spendlog', 'inframe'])
          if (_map(apps[key]) != null) ConnectedApp.fromJson(key, _map(apps[key])!),
      ],
    );
  }
  final bool canManage;
  final List<ConnectedApp> apps;
}

/// One of the owner's existing SpendLog groups / InFrame events this trip could be linked to
/// instead of a new one (GET /trips/:id/links/:app/candidates).
class LinkCandidate {
  LinkCandidate({
    required this.id,
    required this.name,
    this.startDate,
    this.endDate,
    this.archived = false,
    this.linkedHere = false,
    this.counts = const {},
    this.added,
    this.leaving,
  });

  factory LinkCandidate.fromJson(Json j) {
    final impact = _map(j['impact']);
    return LinkCandidate(
      id: _str(j['id']) ?? '',
      name: _str(j['name']) ?? 'Untitled',
      startDate: DateTime.tryParse(_str(j['startDate']) ?? ''),
      endDate: DateTime.tryParse(_str(j['endDate']) ?? ''),
      archived: j['archived'] == true,
      linkedHere: j['linkedHere'] == true,
      counts: {for (final e in (_map(j['counts']) ?? const {}).entries) e.key: _int(e.value)},
      added: impact == null ? null : _int(impact['added']),
      leaving: impact == null ? null : _int(impact['leaving']),
    );
  }

  final String id, name;
  final DateTime? startDate, endDate;
  final bool archived;

  /// It held this trip's link before (or holds it now).
  final bool linkedHere;
  final Map<String, int> counts;

  /// SpendLog only: payments in the trip's dates that linking adds, and automatic ones outside them that leave.
  final int? added, leaving;

  /// "16–20 Oct 2026", "From 3 Dec", or null when undated.
  String? get dates {
    final s = startDate, e = endDate;
    if (s == null) return null;
    if (e == null) return 'From ${DateFormat('d MMM y').format(s)}';
    if (s.year == e.year && s.month == e.month) return '${s.day}–${DateFormat('d MMM y').format(e)}';
    if (s.year == e.year) return '${DateFormat('d MMM').format(s)} – ${DateFormat('d MMM y').format(e)}';
    return '${DateFormat('d MMM y').format(s)} – ${DateFormat('d MMM y').format(e)}';
  }

  /// "12 payments · 3 people" / "240 photos · 8 videos · 5 people".
  String countsLine(String app) {
    String n(int v, String one, String many) => '$v ${v == 1 ? one : many}';
    final people = n(counts['members'] ?? 0, 'person', 'people');
    if (app == 'spendlog') return '${n(counts['transactions'] ?? 0, 'payment', 'payments')} · $people';
    final videos = counts['videos'] ?? 0;
    return [n(counts['photos'] ?? 0, 'photo', 'photos'), if (videos > 0) n(videos, 'video', 'videos'), people].join(' · ');
  }

  /// What linking it changes, or null when nothing moves.
  String? get impactLine {
    if (added == null && leaving == null) return null;
    final a = added ?? 0, l = leaving ?? 0;
    if (a == 0 && l == 0) return 'No payments move: everything in it already falls in this trip’s dates.';
    final parts = [
      if (a > 0) '$a ${a == 1 ? 'payment' : 'payments'} in this trip’s dates will be added',
      if (l > 0) '$l ${l == 1 ? 'payment' : 'payments'} outside them will leave the group',
    ];
    return '${parts.join('; ')}.';
  }
}
