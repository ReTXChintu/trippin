// Renders every screen with a real saved trip and writes PNGs to build/screens/ — a visual check
// without a phone. Run: flutter test test/screens_test.dart
import 'dart:convert';
import 'dart:io';
import 'dart:ui' as ui;

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
import 'package:itinerary_planner/data/tile_service.dart';
import 'package:itinerary_planner/features/navigate/location.dart';
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

Future<void> _loadFonts() async {
  final fonts = '${Platform.environment['FLUTTER_ROOT'] ?? 'D:/flutter'}/bin/cache/artifacts/material_fonts';
  final roboto = FontLoader('Roboto');
  for (final f in ['roboto-regular.ttf', 'roboto-medium.ttf', 'roboto-bold.ttf', 'roboto-black.ttf', 'roboto-italic.ttf']) {
    roboto.addFont(Future.value(ByteData.sublistView(File('$fonts/$f').readAsBytesSync())));
  }
  await roboto.load();
  final icons = FontLoader('MaterialIcons')..addFont(Future.value(ByteData.sublistView(File('$fonts/materialicons-regular.otf').readAsBytesSync())));
  await icons.load();
}

void main() {
  late TripBundle bundle;
  late List<Override> overrides;
  late List<Override> base;
  final out = Directory('build/screens')..createSync(recursive: true);

  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    dotenv.testLoad(fileInput: 'API_BASE_URL=http://example.test/api/v1\nWEB_URL=http://example.test');
    await _loadFonts();
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
      locationProvider.overrideWith((ref) => Stream.value(const Fix(me, 8, 0, 0))),
      headingProvider.overrideWith((ref) => Stream.value(35.0)),
    ];
    overrides = [
      ...base,
      sessionProvider.overrideWith((ref) => SessionNotifier(ref, initial: const Session(user: {'name': 'Biswajit Panda', 'email': 'biswajit@example.com'}, loading: false))),
    ];
  });

  Future<void> shoot(WidgetTester tester, String name, String location, {Future<void> Function(WidgetTester)? then}) async {
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
