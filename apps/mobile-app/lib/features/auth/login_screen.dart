import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/identity.dart';
import '../../core/theme.dart';
import '../../data/app_state.dart';
import '../../shared/widgets.dart';

/// One button: sign in with the shared account (Trippin, SpendLog and InFrame) in the browser.
class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});
  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  bool _busy = false;
  String? _error;

  Future<void> _signIn() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(sessionProvider.notifier).signIn();
      if (mounted && Navigator.of(context).canPop()) Navigator.of(context).pop();
    } on SignInCancelled {
      // Backed out of the sign-in page: nothing to explain.
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(sessionProvider);
    final again = session.needsSignIn;
    return Scaffold(
      appBar: again ? AppBar(title: const Text('Sign in again')) : null,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                Row(children: [
                  ClipRRect(borderRadius: BorderRadius.circular(12), child: Image.asset('assets/brand/logo.png', width: 48, height: 48)),
                  const SizedBox(width: 12),
                  Text('Trippin', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800)),
                ]),
                const SizedBox(height: 28),
                Text(again ? 'Your sign-in expired' : 'Your trips, even offline',
                    style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w700)),
                const SizedBox(height: 8),
                Text(
                  again
                      ? 'Your saved trips still work. Sign in to sync changes and save new trips.'
                      : 'Plan on the Trippin website. This app carries your saved plans, maps and directions — no signal needed.',
                  style: TextStyle(color: context.muted, fontSize: 15, height: 1.4),
                ),
                if (again && session.email.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text('Signed in as ${session.email}', style: TextStyle(color: context.muted, fontSize: 13)),
                ],
                if (_error != null) ...[
                  const SizedBox(height: 20),
                  Notice(text: _error!, icon: Icons.error_outline, tone: 'danger'),
                ],
                const SizedBox(height: 28),
                FilledButton.icon(
                  onPressed: _busy ? null : _signIn,
                  icon: _busy
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2.4, color: Colors.white))
                      : const Icon(Icons.login),
                  label: const Text('Sign in'),
                ),
                const SizedBox(height: 12),
                Text(
                  'One account for Trippin, SpendLog and InFrame. New here? Signing in creates your account.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: context.muted, fontSize: 13, height: 1.4),
                ),
              ]),
            ),
          ),
        ),
      ),
    );
  }
}
