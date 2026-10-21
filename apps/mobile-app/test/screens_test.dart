// Renders every screen with a real saved trip and writes PNGs to build/screens/ — a visual check
// without a phone. Run: flutter test test/screens_test.dart
import 'dart:convert';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:itinerary_planner/core/api_client.dart';
import 'package:itinerary_planner/core/theme.dart';
import 'package:itinerary_planner/data/app_state.dart';
import 'package:itinerary_planner/data/models.dart';
import 'package:itinerary_planner/data/offline_store.dart';
import 'package:itinerary_planner/data/suite_models.dart';
import 'package:itinerary_planner/data/tile_service.dart';
import 'package:itinerary_planner/data/updates.dart';
import 'package:itinerary_planner/features/navigate/location.dart';
import 'package:itinerary_planner/features/trip/connected_apps.dart';
import 'package:itinerary_planner/router.dart';
import 'package:itinerary_planner/shared/widgets.dart';
import 'package:latlong2/latlong.dart';

class _Store extends OfflineStore {
  _Store(this.saved);
  final SavedTrip saved;
  @override
  Future<List<SavedTrip>> savedTrips() async => [saved];
  @override
  Future<SavedTrip?> savedTrip(String id) async => saved;
  @override
  Future<AppSettings> settings() async => AppSettings();
}

/// The trip's SpendLog link with a live summary, and InFrame's promo (no account there yet).
class _Links extends TripLinksNotifier {
  @override
  Future<TripLinks> build(String arg) async => TripLinks.fromJson({
        'canManage': true,
        'apps': {
          'spendlog': {
            'name': 'SpendLog',
            'tagline': 'Creates a SpendLog trip for everyone on this trip — split and settle expenses there.',
            'enabled': true,
            'status': 'linked',
            'url': 'http://example.test/spendlog',
            'hasAccount': true,
            'summary': {
              'totalSpentMinor': 1845000,
              'currency': 'INR',
              'myShareMinor': 615000,
              'iOweMinor': 0,
              'owedToMeMinor': 120000,
              'settlement': [
                {'fromName': 'Asha', 'toName': 'Biswajit', 'amountMinor': 80000},
                {'fromName': 'Ravi', 'toName': 'Biswajit', 'amountMinor': 40000},
              ],
              'transactionCount': 23,
            },
          },
          'inframe': {
            'name': 'InFrame',
            'tagline': 'Creates a shared InFrame event so everyone’s trip photos land in one place.',
            'enabled': false,
            'status': null,
            'hasAccount': false,
            'promo': {
              'title': 'Install InFrame to save your trip’s memories forever',
              'body': 'Everyone’s photos from this trip, together in one shared event.',
              'cta': 'Install InFrame',
              'webUrl': 'http://example.test/inframe',
              'apkUrl': 'http://example.test/inframe.apk',
            },
            'webUrl': 'http://example.test/inframe',
          },
        },
      });
}

class _Tokens extends TokenStorage {
  @override
  Future<String?> read() async => null;
}

class _Tiles extends TileService {
  @override
  Future<void> init() async {}
  @override
  Widget layer() => const ColoredBox(color: Color(0xFFEDE9DD), child: SizedBox.expand());
  @override
  Future<double> sizeMb() async => 38.4;
}

/// Shifts the trip so its first day is today — the Today card and "next stop" then show.
Json _shiftedBundle() {
  var text = File('test/indore_bundle.json').readAsStringSync();
  final first = DateTime.parse('2026-10-16');
  final today = DateTime.parse(todayYmd());
  final shift = today.difference(first).inDays;
  text = text.replaceAllMapped(RegExp(r'2026-10-(\d\d)'), (m) {
    final d = DateTime(2026, 10, int.parse(m[1]!)).add(Duration(days: shift));
    return '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
  });
  return jsonDecode(text) as Json;
}

/// Real fonts (IBM Plex from assets/fonts; Roboto and Material icons from the Flutter SDK cache) so the PNGs look like the app.
/// Returns false when they can't be found (e.g. a CI runner without the font cache): the fallback
/// test font draws every glyph as a wide box, so text overflows and the screenshots mean nothing —
/// the screenshot tests then mark themselves skipped.
Future<bool> _loadFonts() async {
  final exe = Platform.resolvedExecutable; // <flutter>/bin/cache/artifacts/engine/<platform>/flutter_tester
  final candidates = <String>[
    if (Platform.environment['FLUTTER_ROOT'] != null) '${Platform.environment['FLUTTER_ROOT']}/bin/cache/artifacts/material_fonts',
    '${File(exe).parent.parent.parent.path}/material_fonts',
    'D:/flutter/bin/cache/artifacts/material_fonts',
  ];
  // TRIPPIN_SCREENS_NO_FONTS=1 reproduces a runner without the SDK's font cache.
  final fonts = Platform.environment['TRIPPIN_SCREENS_NO_FONTS'] == '1'
      ? null
      : candidates.where((d) => File('$d/materialicons-regular.otf').existsSync()).firstOrNull;
  if (fonts == null) {
    debugPrint('screens_test: Flutter material fonts not found — screenshot tests skipped');
    return false;
  }
  try {
    final roboto = FontLoader('Roboto');
    for (final f in ['roboto-regular.ttf', 'roboto-medium.ttf', 'roboto-bold.ttf', 'roboto-black.ttf', 'roboto-italic.ttf']) {
      final file = File('$fonts/$f');
      if (file.existsSync()) roboto.addFont(Future.value(ByteData.sublistView(file.readAsBytesSync())));
    }
    await roboto.load();
    // The app's own typeface, bundled under assets/fonts.
    for (final (family, files) in [
      ('IBM Plex Sans', ['IBMPlexSans-Regular.ttf', 'IBMPlexSans-Medium.ttf', 'IBMPlexSans-SemiBold.ttf', 'IBMPlexSans-Bold.ttf']),
      ('IBM Plex Mono', ['IBMPlexMono-Regular.ttf', 'IBMPlexMono-Medium.ttf']),
    ]) {
      final loader = FontLoader(family);
      for (final f in files) {
        loader.addFont(Future.value(ByteData.sublistView(File('assets/fonts/$f').readAsBytesSync())));
      }
      await loader.load();
    }
    final icons = FontLoader('MaterialIcons')..addFont(Future.value(ByteData.sublistView(File('$fonts/materialicons-regular.otf').readAsBytesSync())));
    await icons.load();
    return true;
  } catch (e) {
    debugPrint('screens_test: could not load fonts ($e) — screenshot tests skipped');
    return false;
  }
}

void main() {
  late TripBundle bundle;
  late List<Override> overrides;
  late List<Override> base;
  var fontsLoaded = false;
  final out = Directory('build/screens')..createSync(recursive: true);

  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    dotenv.testLoad(fileInput: 'API_BASE_URL=http://example.test/api/v1\nWEB_URL=http://example.test');
    fontsLoaded = await _loadFonts();
    bundle = TripBundle.fromJson(_shiftedBundle());
    final saved = SavedTrip(summary: bundle.summary, version: bundle.version, savedAt: DateTime.now().subtract(const Duration(hours: 2)), mapsSaved: true, sizeKb: 52);
    // Near Ujjain's Ram Ghat, a little off the road into Kal Bhairav.
    const me = LatLng(23.1990, 75.7700);
    base = [
      storeProvider.overrideWithValue(_Store(saved)),
      tokensProvider.overrideWithValue(_Tokens()),
      tilesProvider.overrideWithValue(_Tiles()),
      tripListProvider.overrideWith((ref) async => TripList([
            bundle.summary,
            TripSummary(id: 'goa', title: 'Goa with friends', city: 'Goa', startDate: '2026-12-20', endDate: '2026-12-26'),
          ])),
      bundleProvider.overrideWith((ref, id) async => bundle),
      tripLinksProvider.overrideWith(_Links.new),
      locationProvider.overrideWith((ref) => Stream.value(const Fix(me, 8, 0, 0))),
      headingProvider.overrideWith((ref) => Stream.value(35.0)),
      appVersionProvider.overrideWith((ref) async => '0.1.0 (1)'),
      updateProvider.overrideWith((ref) async => AppUpdate(version: '0.2.0', buildNumber: 2, url: 'http://example.test/trippin.apk')),
    ];
    overrides = [
      ...base,
      sessionProvider.overrideWith((ref) => SessionNotifier(ref, initial: const Session(user: {'name': 'Biswajit Panda', 'email': 'biswajit@example.com'}, loading: false))),
    ];
  });

  Future<void> shoot(WidgetTester tester, String name, String location, {Future<void> Function(WidgetTester)? then}) async {
    if (!fontsLoaded) {
      markTestSkipped('Flutter fonts not available — run locally with the Flutter SDK for screenshots');
      return;
    }
    tester.view.physicalSize = const Size(1080, 2340);
    tester.view.devicePixelRatio = 2.625;
    addTearDown(tester.view.reset);
    final container = ProviderContainer(overrides: overrides);
    addTearDown(container.dispose);
    final router = container.read(routerProvider);
    final key = GlobalKey();
    await tester.pumpWidget(UncontrolledProviderScope(
      container: container,
      child: RepaintBoundary(
        key: key,
        child: MaterialApp.router(theme: buildTheme(Brightness.light), debugShowCheckedModeBanner: false, routerConfig: router),
      ),
    ));
    await tester.runAsync(() async {
      await Future<void>.delayed(const Duration(milliseconds: 50));
    });
    router.go(location);
    for (var i = 0; i < 8; i++) {
      await tester.pump(const Duration(milliseconds: 100));
      await tester.runAsync(() => Future<void>.delayed(const Duration(milliseconds: 20)));
    }
    if (then != null) await then(tester);
    await tester.runAsync(() async {
      // Let images (the logo) decode.
      for (final e in find.byType(Image).evaluate()) {
        final img = e.widget as Image;
        await precacheImage(img.image, e);
      }
    });
    await tester.pump(const Duration(milliseconds: 300));
    await tester.runAsync(() async {
      final boundary = key.currentContext!.findRenderObject()! as RenderRepaintBoundary;
      final image = await boundary.toImage(pixelRatio: 1.5);
      final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
      File('${out.path}/$name.png').writeAsBytesSync(bytes!.buffer.asUint8List());
    });
  }

  testWidgets('home', (t) => shoot(t, '1-home', '/'));
  testWidgets('trip', (t) => shoot(t, '2-trip', '/trip/${bundle.id}'));
  testWidgets('trip connected apps', (t) => shoot(t, '2b-trip-apps', '/trip/${bundle.id}', then: (t) async {
        await t.scrollUntilVisible(find.text('Install InFrame'), 300, scrollable: find.byType(Scrollable).first);
        await t.drag(find.byType(Scrollable).first, const Offset(0, 200));
        await t.pump(const Duration(milliseconds: 300));
      }));
  testWidgets('day', (t) => shoot(t, '3-day', '/trip/${bundle.id}/day/1'));
  testWidgets('stop', (t) => shoot(t, '4-stop', '/trip/${bundle.id}/day/1', then: (t) async {
        await t.tap(find.text('Shri Mahakaleshwar Jyotirlinga Temple').first);
        for (var i = 0; i < 6; i++) {
          await t.pump(const Duration(milliseconds: 100));
        }
      }));
  testWidgets('navigate', (t) {
    final day = bundle.days.first;
    final stop = day.stops.firstWhere((s) => s.name == 'Kal Bhairav Temple');
    return shoot(t, '5-navigate', '/trip/${bundle.id}/navigate?day=1&stop=${stop.id}');
  });
  testWidgets('map', (t) => shoot(t, '6-map', '/trip/${bundle.id}/day/1/map'));
  testWidgets('safety', (t) => shoot(t, '7-safety', '/trip/${bundle.id}/safety'));
  testWidgets('settings', (t) => shoot(t, '8-settings', '/settings'));
  testWidgets('login', (t) async {
    if (!fontsLoaded) {
      markTestSkipped('Flutter fonts not available — run locally with the Flutter SDK for screenshots');
      return;
    }
    final container = ProviderContainer(overrides: [
      ...base,
      sessionProvider.overrideWith((ref) => SessionNotifier(ref, initial: const Session(loading: false))),
    ]);
    addTearDown(container.dispose);
    t.view.physicalSize = const Size(1080, 2340);
    t.view.devicePixelRatio = 2.625;
    addTearDown(t.view.reset);
    final key = GlobalKey();
    await t.pumpWidget(UncontrolledProviderScope(
      container: container,
      child: RepaintBoundary(key: key, child: MaterialApp.router(theme: buildTheme(Brightness.light), routerConfig: container.read(routerProvider))),
    ));
    for (var i = 0; i < 5; i++) {
      await t.pump(const Duration(milliseconds: 100));
    }
    await t.runAsync(() async {
      for (final e in find.byType(Image).evaluate()) {
        await precacheImage((e.widget as Image).image, e);
      }
    });
    await t.pump(const Duration(milliseconds: 200));
    await t.runAsync(() async {
      final boundary = key.currentContext!.findRenderObject()! as RenderRepaintBoundary;
      final bytes = await (await boundary.toImage(pixelRatio: 1.5)).toByteData(format: ui.ImageByteFormat.png);
      File('${out.path}/0-login.png').writeAsBytesSync(bytes!.buffer.asUint8List());
    });
    expect(GoRouter.of(t.element(find.byType(Scaffold).first)).state.matchedLocation, '/login');
  });
}
