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

final routerProvider = Provider<GoRouter>((ref) {
  final refresh = ValueNotifier(0);
  ref.listen(sessionProvider, (_, _) => refresh.value++);
  ref.onDispose(refresh.dispose);

  return GoRouter(
    refreshListenable: refresh,
    redirect: (_, state) {
      final s = ref.read(sessionProvider);
      final atLogin = state.matchedLocation == '/login';
      if (!s.signedIn) return atLogin ? null : '/login';
      if (atLogin && !s.needsSignIn) return '/';
      return null;
    },
    routes: [
      GoRoute(path: '/', builder: (_, _) => const TripsScreen()),
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
