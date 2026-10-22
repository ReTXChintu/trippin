import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'data/app_state.dart';
import 'features/auth/login_screen.dart';
import 'features/day/day_screen.dart';
import 'features/map/day_map_screen.dart';
import 'features/navigate/navigate_screen.dart';
import 'features/safety/safety_screen.dart';
import 'features/settings/settings_screen.dart';
import 'features/trip/trip_screen.dart';
import 'features/trips/trips_screen.dart';

/// '/login', carrying where a signed-out visitor was headed (when it was anywhere but home).
String loginRedirect(Uri target) {
  final path = target.toString();
  return path == '/' || path.isEmpty ? '/login' : Uri(path: '/login', queryParameters: {'from': path}).toString();
}

/// Where to go once signed in: the page asked for before sign-in, if it's one of the app's own.
String afterLogin(Uri login) {
  final from = login.queryParameters['from'];
  return from != null && from.startsWith('/') && !from.startsWith('//') && !from.startsWith('/login') ? from : '/';
}

/// The website's /trips/:id is the app's /trip/:id ("/trips/new" is the website's form: home).
String tripLinkRedirect(String id) => id == 'new' ? '/' : '/trip/${Uri.encodeComponent(id)}';

final routerProvider = Provider<GoRouter>((ref) {
  final refresh = ValueNotifier(0);
  ref.listen(sessionProvider, (_, _) => refresh.value++);
  ref.onDispose(refresh.dispose);

  return GoRouter(
    refreshListenable: refresh,
    redirect: (_, state) {
      final s = ref.read(sessionProvider);
      final atLogin = state.matchedLocation == '/login';
      // A link opened while signed out (an App Link, a notification) is kept for after sign-in.
      if (!s.signedIn) return atLogin ? null : loginRedirect(state.uri);
      if (atLogin && !s.needsSignIn) return afterLogin(state.uri);
      return null;
    },
    // A link to a page the app doesn't have lands on the trips list rather than an error.
    onException: (_, _, router) => router.go('/'),
    routes: [
      GoRoute(path: '/', builder: (_, _) => const TripsScreen()),
      // The website's addresses, as App Links and notifications carry them.
      GoRoute(path: '/trips', redirect: (_, _) => '/'),
      GoRoute(path: '/trips/:id', redirect: (_, s) => tripLinkRedirect(s.pathParameters['id']!)),
      GoRoute(path: '/login', builder: (_, _) => const LoginScreen()),
      GoRoute(path: '/settings', builder: (_, _) => const SettingsScreen()),
      GoRoute(
        path: '/driver',
        builder: (_, state) {
          final e = state.extra as ({String name, String address})?;
          return DriverCard(name: e?.name ?? '', address: e?.address ?? '');
        },
      ),
      GoRoute(
        path: '/trip/:id',
        builder: (_, s) => TripScreen(tripId: s.pathParameters['id']!),
        routes: [
          GoRoute(path: 'safety', builder: (_, s) => SafetyScreen(tripId: s.pathParameters['id']!)),
          GoRoute(path: 'navigate', builder: (_, s) => NavigateScreen(tripId: s.pathParameters['id']!, query: s.uri.queryParameters)),
          GoRoute(
            path: 'day/:n',
            builder: (_, s) => DayScreen(tripId: s.pathParameters['id']!, dayNumber: int.parse(s.pathParameters['n']!)),
            routes: [
              GoRoute(path: 'map', builder: (_, s) => DayMapScreen(tripId: s.pathParameters['id']!, dayNumber: int.parse(s.pathParameters['n']!))),
            ],
          ),
        ],
      ),
    ],
  );
});
