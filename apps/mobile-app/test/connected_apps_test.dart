// The trip screen's "Connected apps" section — SpendLog and InFrame — with the API faked:
// the owner's link switches, the summary cards, the promo cards and the error states.
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:itinerary_planner/core/api_client.dart';
import 'package:itinerary_planner/core/theme.dart';
import 'package:itinerary_planner/data/app_state.dart';
import 'package:itinerary_planner/data/offline_store.dart';
import 'package:itinerary_planner/data/suite_models.dart';
import 'package:itinerary_planner/features/trip/connected_apps.dart';

class _Store extends OfflineStore {
  final dismissed = <String, DateTime>{};
  @override
  Future<Map<String, DateTime>> promoDismissals() async => {...dismissed};
  @override
  Future<void> dismissPromo(String app, DateTime at) async => dismissed[app] = at;
}

/// GET /trips/:id/links answers [view] (or throws [error]); PATCH flips `enabled` like the server.
class _Links extends TripLinksNotifier {
  _Links(this.view, {this.error, this.calls});
  Map<String, dynamic> view;
  final Object? error;
  final List<Map<String, bool>>? calls;

  @override
  Future<TripLinks> build(String arg) async {
    if (error != null) throw error!;
    return TripLinks.fromJson(view);
  }

  @override
  Future<void> setEnabled(String app, bool on) async {
    calls?.add({app: on});
    final apps = {...(view['apps'] as Map<String, dynamic>)};
    apps[app] = {...(apps[app] as Map<String, dynamic>), 'enabled': on, 'status': on ? 'pending' : 'unlinked'};
    view = {...view, 'apps': apps};
    state = AsyncData(TripLinks.fromJson(view));
  }
}

Map<String, dynamic> _promo(String app) => app == 'spendlog'
    ? {
        'title': 'Download SpendLog to analyse your trip spending smartly',
        'body': 'Split costs with everyone on the trip and see who owes whom.',
        'cta': 'Download SpendLog',
        'webUrl': 'https://spend-log.example',
        'apkUrl': 'https://spend-log.example/SpendLog.apk',
      }
    : {
        'title': 'Install InFrame to save your trip’s memories forever',
        'body': 'Everyone’s photos from the trip in one shared event.',
        'cta': 'Install InFrame',
        'webUrl': 'https://in-frame.example',
        'apkUrl': 'https://in-frame.example/inframe.apk',
      };

Map<String, dynamic> _app(String app, {bool enabled = false, String? status, bool? hasAccount = true, Map<String, dynamic>? summary, String? summaryError, String? lastError, bool promo = false, List<Map<String, dynamic>> skipped = const []}) => {
      'app': app,
      'name': app == 'spendlog' ? 'SpendLog' : 'InFrame',
      'tagline': app == 'spendlog' ? 'Split and settle the trip’s spending in SpendLog.' : 'Everyone’s trip photos in one InFrame event.',
      'enabled': enabled,
      'status': status,
      'url': enabled && status == 'linked' ? 'https://$app.example/t/1' : null,
      'lastError': lastError,
      'linkedAt': null,
      'hasAccount': hasAccount,
      'summary': summary,
      'summaryError': summaryError,
      'promo': promo ? _promo(app) : null,
      'webUrl': 'https://$app.example',
      'apkUrl': 'https://$app.example/app.apk',
      'skippedMembers': skipped,
    };

Map<String, dynamic> _view({bool canManage = true, required Map<String, dynamic> spendlog, required Map<String, dynamic> inframe}) =>
    {'canManage': canManage, 'apps': {'spendlog': spendlog, 'inframe': inframe}};

final _spendSummary = {
  'linked': true,
  'url': 'https://spendlog.example/t/1',
  'totalSpentMinor': 1234550,
  'currency': 'INR',
  'myShareMinor': 411500,
  'iOweMinor': 25000,
  'owedToMeMinor': 0,
  'settlement': [
    {'fromName': 'Asha', 'toName': 'Ravi', 'amountMinor': 25000},
  ],
  'transactionCount': 14,
  'updatedAt': '2026-10-20T10:00:00.000Z',
};

final _frameSummary = {
  'linked': true,
  'url': 'https://inframe.example/e/1',
  'photoCount': 212,
  'videoCount': 9,
  'albumCount': 3,
  'coverThumbUrl': null,
  'needsStorage': true,
  'updatedAt': '2026-10-20T10:00:00.000Z',
};

void main() {
  Future<_Store> pump(WidgetTester tester, _Links links, {_Store? store}) async {
    // Wide and tall: the test font draws every glyph as a full square.
    tester.view.physicalSize = const Size(1400, 3000);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    final s = store ?? _Store();
    await tester.pumpWidget(ProviderScope(
      overrides: [
        storeProvider.overrideWithValue(s),
        tripLinksProvider.overrideWith(() => links),
      ],
      child: MaterialApp(
        theme: buildTheme(Brightness.light),
        home: Scaffold(body: ListView(padding: const EdgeInsets.all(16), children: const [ConnectedAppsSection(tripId: 't1')])),
      ),
    ));
    await tester.pumpAndSettle();
    return s;
  }

  test('parses the links view, tolerating missing fields', () {
    final links = TripLinks.fromJson({
      'canManage': true,
      'apps': {
        'spendlog': {'enabled': true, 'status': 'linked', 'summary': _spendSummary},
        'inframe': {'enabled': false},
      },
    });
    expect(links.apps.map((a) => a.app), ['spendlog', 'inframe']);
    final spend = links.apps.first;
    expect(spend.name, 'SpendLog');
    expect(spend.spendlog!.totalSpentMinor, 1234550);
    expect(spend.openUrl, 'https://spendlog.example/t/1');
    expect(links.apps.last.status, isNull);
    expect(links.apps.last.hasAccount, isNull);
    expect(formatMinor(1234550, 'INR'), '₹12,345.50');
    expect(formatMinor(10000000, 'INR'), '₹1,00,000');
  });

  testWidgets('the owner gets both link switches, with what each does', (tester) async {
    final calls = <Map<String, bool>>[];
    await pump(tester, _Links(_view(spendlog: _app('spendlog'), inframe: _app('inframe')), calls: calls));

    expect(find.text('Connected apps'), findsOneWidget);
    expect(find.text('Track spending in SpendLog'), findsOneWidget);
    expect(find.text('Share photos in InFrame'), findsOneWidget);
    expect(find.text('Split and settle the trip’s spending in SpendLog.'), findsOneWidget);
    expect(tester.widget<SwitchListTile>(find.byKey(const ValueKey('link-spendlog'))).value, isFalse);

    await tester.tap(find.byKey(const ValueKey('link-spendlog')));
    // The "Setting up" spinner never settles.
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 500));
    expect(calls, [
      {'spendlog': true},
    ]);
    expect(tester.widget<SwitchListTile>(find.byKey(const ValueKey('link-spendlog'))).value, isTrue);
    expect(find.textContaining('Setting up the SpendLog trip'), findsOneWidget);
  });

  testWidgets('switching off asks first, and says nothing gets deleted', (tester) async {
    final calls = <Map<String, bool>>[];
    await pump(
      tester,
      _Links(_view(spendlog: _app('spendlog'), inframe: _app('inframe', enabled: true, status: 'linked', summary: _frameSummary)), calls: calls),
    );

    await tester.tap(find.byKey(const ValueKey('link-inframe')));
    await tester.pumpAndSettle();
    expect(find.text('Unlink InFrame?'), findsOneWidget);
    expect(find.textContaining('every photo in it stay in InFrame'), findsOneWidget);
    await tester.tap(find.text('Cancel'));
    await tester.pumpAndSettle();
    expect(calls, isEmpty);

    await tester.tap(find.byKey(const ValueKey('link-inframe')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Unlink'));
    await tester.pumpAndSettle();
    expect(calls, [
      {'inframe': false},
    ]);
    expect(find.text('Open in InFrame'), findsNothing, reason: 'the summary card goes with the link');
  });

  testWidgets('members who aren’t the owner see no switches', (tester) async {
    await pump(
      tester,
      _Links(_view(canManage: false, spendlog: _app('spendlog', enabled: true, status: 'linked', summary: _spendSummary), inframe: _app('inframe'))),
    );
    expect(find.byType(SwitchListTile), findsNothing);
    expect(find.text('Open in SpendLog'), findsOneWidget);
  });

  testWidgets('a linked SpendLog trip shows its live summary and opens in SpendLog', (tester) async {
    await pump(tester, _Links(_view(spendlog: _app('spendlog', enabled: true, status: 'linked', summary: _spendSummary), inframe: _app('inframe'))));

    expect(find.text('₹12,345.50'), findsOneWidget);
    expect(find.textContaining('14 transactions'), findsOneWidget);
    expect(find.text('Your share'), findsOneWidget);
    expect(find.text('₹4,115'), findsOneWidget);
    expect(find.text('You owe'), findsOneWidget);
    expect(find.text('Asha pays Ravi'), findsOneWidget);
    expect(find.text('Linked'), findsOneWidget);
    expect(find.text('Open in SpendLog'), findsOneWidget);
  });

  testWidgets('a linked InFrame event shows its counts, and asks for a folder before photos can be added', (tester) async {
    await pump(tester, _Links(_view(spendlog: _app('spendlog'), inframe: _app('inframe', enabled: true, status: 'linked', summary: _frameSummary))));

    expect(find.text('212'), findsOneWidget);
    expect(find.text('Photos'), findsOneWidget);
    expect(find.text('9'), findsOneWidget);
    expect(find.text('3'), findsOneWidget);
    expect(find.text('Connect a folder in InFrame to start adding photos'), findsOneWidget);
    expect(find.text('Open InFrame'), findsOneWidget, reason: 'right next to the hint');
    expect(find.text('Open in InFrame'), findsOneWidget);
    // Without the link's own url, the summary's is used.
    final fallback = ConnectedApp.fromJson('inframe', {'enabled': true, 'status': 'linked', 'summary': _frameSummary});
    expect(fallback.openUrl, 'https://inframe.example/e/1');
  });

  testWidgets('no account there: the promo card, dismissed for 30 days', (tester) async {
    final store = await pump(
      tester,
      _Links(_view(canManage: false, spendlog: _app('spendlog', hasAccount: false, promo: true), inframe: _app('inframe', hasAccount: false, promo: true))),
    );

    expect(find.text('Download SpendLog to analyse your trip spending smartly'), findsOneWidget);
    expect(find.text('Install InFrame to save your trip’s memories forever'), findsOneWidget);
    expect(find.text('Download SpendLog'), findsOneWidget);
    expect(find.text('Learn more'), findsNWidgets(2));

    await tester.tap(find.byTooltip('Dismiss').first);
    await tester.pumpAndSettle();
    expect(find.text('Download SpendLog to analyse your trip spending smartly'), findsNothing);
    expect(find.text('Install InFrame to save your trip’s memories forever'), findsOneWidget);
    expect(store.dismissed.keys, ['spendlog']);
  });

  testWidgets('a promo dismissed recently stays hidden; an old dismissal has expired', (tester) async {
    final store = _Store()
      ..dismissed['spendlog'] = DateTime.now().subtract(const Duration(days: 3))
      ..dismissed['inframe'] = DateTime.now().subtract(const Duration(days: 31));
    await pump(
      tester,
      _Links(_view(canManage: false, spendlog: _app('spendlog', hasAccount: false, promo: true), inframe: _app('inframe', hasAccount: false, promo: true))),
      store: store,
    );
    expect(find.textContaining('Download SpendLog'), findsNothing);
    expect(find.text('Install InFrame to save your trip’s memories forever'), findsOneWidget);
  });

  testWidgets('someone who already uses the app gets no promo, and an empty section hides', (tester) async {
    await pump(tester, _Links(_view(canManage: false, spendlog: _app('spendlog', promo: true), inframe: _app('inframe', promo: true))));
    expect(find.text('Connected apps'), findsNothing);
    expect(find.byType(PromoCard), findsNothing);
  });

  testWidgets('an app that can’t be reached degrades to a message, not a broken screen', (tester) async {
    await pump(
      tester,
      _Links(_view(
        spendlog: _app('spendlog', enabled: true, status: 'linked', summaryError: 'Couldn’t reach SpendLog'),
        inframe: _app('inframe', enabled: true, status: 'error', lastError: 'InFrame answered 503'),
      )),
    );
    expect(find.textContaining('Couldn’t reach SpendLog'), findsOneWidget);
    expect(find.text('InFrame answered 503'), findsOneWidget, reason: 'the server’s wording, as-is');
    expect(find.text('Not linked'), findsOneWidget);
    expect(find.textContaining('keeps trying'), findsNothing);
    expect(find.text('Open in SpendLog'), findsOneWidget, reason: 'the link still works when the summary doesn’t');
  });

  testWidgets('a refused link shows the reason verbatim, and the owner can try again', (tester) async {
    const reason = '"Goa" is already running in SpendLog. End it in SpendLog, then switch tracking on again.';
    final calls = <Map<String, bool>>[];
    await pump(tester, _Links(_view(spendlog: _app('spendlog', enabled: true, status: 'error', lastError: reason), inframe: _app('inframe')), calls: calls));

    expect(find.text(reason), findsOneWidget);
    await tester.tap(find.text('Try again'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 500));
    expect(calls, [
      {'spendlog': true},
    ]);
    expect(find.text(reason), findsNothing);
    expect(find.text('Setting up'), findsOneWidget, reason: 'the returned view is pending again');
    expect(find.text('Try again'), findsNothing);
  });

  testWidgets('members can’t try again; that’s the owner’s call', (tester) async {
    await pump(tester, _Links(_view(canManage: false, spendlog: _app('spendlog', enabled: true, status: 'error', lastError: 'Nope'), inframe: _app('inframe'))));
    expect(find.text('Nope'), findsOneWidget);
    expect(find.text('Try again'), findsNothing);
  });

  testWidgets('members without an account there are noted, quietly', (tester) async {
    await pump(
      tester,
      _Links(_view(
        spendlog: _app('spendlog', enabled: true, status: 'linked', summary: _spendSummary, skipped: [
          {'sub': 'a', 'email': 'a@example.com', 'reason': 'no_account'},
          {'sub': 'b', 'email': 'b@example.com', 'reason': 'no_account'},
        ]),
        inframe: _app('inframe', enabled: true, status: 'linked', summary: _frameSummary, skipped: [
          {'sub': 'c', 'email': 'c@example.com', 'reason': 'no_account'},
        ]),
      )),
    );
    expect(find.text('2 members will join the SpendLog trip once they sign in to SpendLog'), findsOneWidget);
    expect(find.text('1 member will join the InFrame event once they sign in to InFrame'), findsOneWidget);
    expect(TripLinks.fromJson({'apps': {'spendlog': {'enabled': true}}}).apps.single.skippedMembers, isEmpty);
  });

  testWidgets('offline: a quiet note with a retry instead of the section', (tester) async {
    await pump(tester, _Links(const {}, error: ApiException('Can’t reach Trippin', offline: true)));
    expect(find.textContaining('show here when you’re online'), findsOneWidget);
    expect(find.text('Retry'), findsOneWidget);
  });
}
