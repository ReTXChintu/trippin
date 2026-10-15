import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/theme.dart';
import 'data/app_state.dart';
import 'router.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await dotenv.load(fileName: '.env');
  final container = ProviderContainer();
  // Map tiles and reminders get ready in the background; nothing waits on the network.
  container.read(tilesProvider).init().catchError((_) {});
  container.read(remindersProvider).init().catchError((_) {});
  runApp(UncontrolledProviderScope(container: container, child: const TrippinApp()));
}

class TrippinApp extends ConsumerWidget {
  const TrippinApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final loading = ref.watch(sessionProvider.select((s) => s.loading));
    final theme = buildTheme(Brightness.light);
    final dark = buildTheme(Brightness.dark);
    if (loading) {
      return MaterialApp(
        debugShowCheckedModeBanner: false,
        theme: theme,
        darkTheme: dark,
        home: const Scaffold(body: Center(child: CircularProgressIndicator())),
      );
    }
    return MaterialApp.router(
      title: 'Trippin',
      debugShowCheckedModeBanner: false,
      theme: theme,
      darkTheme: dark,
      routerConfig: ref.watch(routerProvider),
    );
  }
}
