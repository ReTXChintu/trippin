import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:itinerary_planner/features/auth/auth_provider.dart';
import 'package:itinerary_planner/features/auth/forgot_password_screen.dart';
import 'package:itinerary_planner/features/auth/login_screen.dart';
import 'package:itinerary_planner/features/auth/register_screen.dart';
import 'package:itinerary_planner/features/auth/reset_password_screen.dart';
import 'package:itinerary_planner/features/dashboard/dashboard_screen.dart';
import 'package:itinerary_planner/features/itinerary/itinerary_screen.dart';
import 'package:itinerary_planner/features/notifications/notifications_screen.dart';
import 'package:itinerary_planner/features/places/discovery_screen.dart';
import 'package:itinerary_planner/features/profile/profile_screen.dart';
import 'package:itinerary_planner/features/share/public_share_screen.dart';
import 'package:itinerary_planner/features/trips/trip_detail_screen.dart';
import 'package:itinerary_planner/features/trips/trip_form_screen.dart';
import 'package:itinerary_planner/features/trips/trip_list_screen.dart';
import 'package:itinerary_planner/features/trips/trips_repository.dart';
import 'package:itinerary_planner/shared/widgets/app_shell.dart';

final _rootNavigatorKey = GlobalKey<NavigatorState>(debugLabel: 'root');
final _shellNavigatorDashboardKey = GlobalKey<NavigatorState>(debugLabel: 'dashboard');
final _shellNavigatorTripsKey = GlobalKey<NavigatorState>(debugLabel: 'trips');
final _shellNavigatorNotificationsKey = GlobalKey<NavigatorState>(debugLabel: 'notifications');
final _shellNavigatorProfileKey = GlobalKey<NavigatorState>(debugLabel: 'profile');

final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authProvider);
  final unreadCount = ref.watch(unreadNotificationsProvider);

  return GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: '/dashboard',
    redirect: (context, state) {
      final loggedIn = authState.isAuthenticated;
      final loc = state.matchedLocation;
      final isPublic = loc.startsWith('/share/');
      final isAuth = loc == '/login' ||
          loc == '/register' ||
          loc == '/forgot-password' ||
          loc.startsWith('/reset-password');

      if (isPublic) return null;
      if (!loggedIn && !isAuth) return '/login';
      if (loggedIn && isAuth) return '/dashboard';
      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      GoRoute(path: '/register', builder: (_, __) => const RegisterScreen()),
      GoRoute(path: '/forgot-password', builder: (_, __) => const ForgotPasswordScreen()),
      GoRoute(
        path: '/reset-password',
        builder: (_, state) => ResetPasswordScreen(token: state.uri.queryParameters['token'] ?? ''),
      ),
      GoRoute(
        path: '/share/:slug',
        builder: (_, state) => PublicShareScreen(slug: state.pathParameters['slug']!),
      ),
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) {
          return AppShell(navigationShell: navigationShell, unreadCount: unreadCount);
        },
        branches: [
          StatefulShellBranch(
            navigatorKey: _shellNavigatorDashboardKey,
            routes: [
              GoRoute(path: '/dashboard', builder: (_, __) => const DashboardScreen()),
            ],
          ),
          StatefulShellBranch(
            navigatorKey: _shellNavigatorTripsKey,
            routes: [
              GoRoute(path: '/trips', builder: (_, __) => const TripListScreen()),
            ],
          ),
          StatefulShellBranch(
            navigatorKey: _shellNavigatorNotificationsKey,
            routes: [
              GoRoute(path: '/notifications', builder: (_, __) => const NotificationsScreen()),
            ],
          ),
          StatefulShellBranch(
            navigatorKey: _shellNavigatorProfileKey,
            routes: [
              GoRoute(path: '/profile', builder: (_, __) => const ProfileScreen()),
            ],
          ),
        ],
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/trips/new',
        builder: (_, state) => TripFormScreen(tripId: state.uri.queryParameters['tripId']),
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/trips/:id',
        builder: (_, state) => TripDetailScreen(tripId: state.pathParameters['id']!),
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/trips/:id/edit',
        builder: (_, state) => TripFormScreen(tripId: state.pathParameters['id']),
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/trips/:id/discover',
        builder: (_, state) => DiscoveryScreen(tripId: state.pathParameters['id']!),
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/trips/:id/itinerary',
        builder: (_, state) => ItineraryScreen(tripId: state.pathParameters['id']!),
      ),
    ],
  );
});
