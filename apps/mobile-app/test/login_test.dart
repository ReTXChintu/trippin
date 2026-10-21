// The sign-in screen with the identity server (flutter_appauth) and the API faked.
import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:itinerary_planner/core/api_client.dart';
import 'package:itinerary_planner/core/identity.dart';
import 'package:itinerary_planner/data/app_state.dart';
import 'package:itinerary_planner/data/models.dart';
import 'package:itinerary_planner/data/offline_store.dart';
import 'package:itinerary_planner/data/reminders.dart';
import 'package:itinerary_planner/data/tile_service.dart';
import 'package:itinerary_planner/features/auth/login_screen.dart';

class _Identity implements IdentityClient {
  _Identity({this.idToken = 'id-token-from-idp', this.error});
  final String idToken;
  final Object? error;
  int signIns = 0;
  String? signedOutWith;
  bool signOutFails = false;

  @override
  Future<String> signIn() async {
    signIns++;
    if (error != null) throw error!;
    return idToken;
  }

  @override
  Future<void> signOut({String? idTokenHint}) async {
    signedOutWith = idTokenHint;
    if (signOutFails) throw const IdentityException('offline');
  }
}

class _Tokens extends TokenStorage {
  String? token;
  String? idToken;
  @override
  Future<String?> read() async => token;
  @override
  Future<void> write(String t) async => token = t;
  @override
  Future<String?> readIdToken() async => idToken;
  @override
  Future<void> writeIdToken(String t) async => idToken = t;
  @override
  Future<void> clear() async => token = idToken = null;
}

class _Api extends ApiClient {
  _Api(super.tokens, {this.error});
  final ApiException? error;
  final posts = <String, Object?>{};

  @override
  Future<Map<String, dynamic>> post(String path, {Object? body}) async {
    posts[path] = body;
    if (error != null) throw error!;
    return {
      'accessToken': 'trippin-token',
      'user': {'id': 'u1', 'name': 'Asha Rao', 'email': 'asha@example.com'},
    };
  }
}

class _Store extends OfflineStore {
  Json? user;
  bool cleared = false;
  @override
  Future<Json?> cachedUser() async => user;
  @override
  Future<void> setCachedUser(Json? u) async => user = u;
  @override
  Future<void> clearAll() async => cleared = true;
}

class _Reminders extends Reminders {
  @override
  Future<void> cancelAll() async {}
}

class _Tiles extends TileService {
  @override
  Future<void> clear() async {}
}

void main() {
  setUpAll(() {
    dotenv.testLoad(fileInput: 'API_BASE_URL=http://example.test/api/v1\nOIDC_ISSUER=https://id.example.test');
  });

  late _Tokens tokens;
  late _Store store;

  ProviderContainer containerWith(_Identity identity, {ApiException? apiError, Session initial = const Session(loading: false)}) {
    tokens = _Tokens();
    store = _Store();
    final api = _Api(tokens, error: apiError);
    return ProviderContainer(overrides: [
      tokensProvider.overrideWithValue(tokens),
      storeProvider.overrideWithValue(store),
      apiProvider.overrideWithValue(api),
      identityProvider.overrideWithValue(identity),
      remindersProvider.overrideWithValue(_Reminders()),
      tilesProvider.overrideWithValue(_Tiles()),
      sessionProvider.overrideWith((ref) => SessionNotifier(ref, initial: initial)),
    ]);
  }

  Future<void> pumpLogin(WidgetTester tester, ProviderContainer container) async {
    addTearDown(container.dispose);
    await tester.pumpWidget(UncontrolledProviderScope(container: container, child: const MaterialApp(home: LoginScreen())));
    await tester.pumpAndSettle();
  }

  testWidgets('shows one Sign in button and no password fields', (tester) async {
    await pumpLogin(tester, containerWith(_Identity()));
    expect(find.widgetWithText(FilledButton, 'Sign in'), findsOneWidget);
    expect(find.byType(TextField), findsNothing);
    expect(find.textContaining('Forgot password'), findsNothing);
    expect(find.textContaining('One account for Trippin, SpendLog and InFrame'), findsOneWidget);
  });

  testWidgets('signing in posts the ID token and keeps the returned access token', (tester) async {
    final identity = _Identity(idToken: 'the-id-token');
    final container = containerWith(identity);
    await pumpLogin(tester, container);

    await tester.tap(find.widgetWithText(FilledButton, 'Sign in'));
    await tester.pumpAndSettle();

    expect(identity.signIns, 1);
    final api = container.read(apiProvider) as _Api;
    expect(api.posts['/auth/oidc/mobile'], {'idToken': 'the-id-token'});
    expect(tokens.token, 'trippin-token');
    expect(tokens.idToken, 'the-id-token');
    expect(store.user?['email'], 'asha@example.com');
    final session = container.read(sessionProvider);
    expect(session.signedIn, isTrue);
    expect(session.name, 'Asha Rao');
  });

  testWidgets('a server refusal is shown and nothing is stored', (tester) async {
    final container = containerWith(_Identity(), apiError: ApiException('This email belongs to a Trippin account linked to someone else.'));
    await pumpLogin(tester, container);

    await tester.tap(find.widgetWithText(FilledButton, 'Sign in'));
    await tester.pumpAndSettle();

    expect(find.text('This email belongs to a Trippin account linked to someone else.'), findsOneWidget);
    expect(tokens.token, isNull);
    expect(container.read(sessionProvider).signedIn, isFalse);
    // The button works again for another try.
    expect(tester.widget<FilledButton>(find.widgetWithText(FilledButton, 'Sign in')).onPressed, isNotNull);
  });

  testWidgets('a failed sign-in page shows its message', (tester) async {
    await pumpLogin(tester, containerWith(_Identity(error: const IdentityException("Couldn't sign in. Check your connection and try again."))));

    await tester.tap(find.widgetWithText(FilledButton, 'Sign in'));
    await tester.pumpAndSettle();

    expect(find.text("Couldn't sign in. Check your connection and try again."), findsOneWidget);
    expect(tokens.token, isNull);
  });

  testWidgets('backing out of the sign-in page is not an error', (tester) async {
    final container = containerWith(_Identity(error: const SignInCancelled()));
    await pumpLogin(tester, container);

    await tester.tap(find.widgetWithText(FilledButton, 'Sign in'));
    await tester.pumpAndSettle();

    expect(find.byIcon(Icons.error_outline), findsNothing);
    expect((container.read(apiProvider) as _Api).posts, isEmpty);
    expect(container.read(sessionProvider).signedIn, isFalse);
  });

  test('signing out ends the identity session, then clears the phone — even if that fails', () async {
    final identity = _Identity()..signOutFails = true;
    final container = containerWith(identity, initial: const Session(user: {'name': 'Asha', 'email': 'asha@example.com'}, loading: false));
    addTearDown(container.dispose);
    tokens
      ..token = 'trippin-token'
      ..idToken = 'the-id-token';

    await container.read(sessionProvider.notifier).signOut();

    expect(identity.signedOutWith, 'the-id-token');
    expect(tokens.token, isNull);
    expect(tokens.idToken, isNull);
    expect(store.cleared, isTrue);
    expect(container.read(sessionProvider).signedIn, isFalse);
  });
}
