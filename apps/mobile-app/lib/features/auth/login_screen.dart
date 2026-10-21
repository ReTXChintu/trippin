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
    final c = context.ds;
    final tt = Theme.of(context).textTheme;
    return Scaffold(
      appBar: again ? AppBar(title: const Text('Sign in again')) : null,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: Ds.pagePadPhone, vertical: 24),
            // The auth card is one of the few capped widths in the system (440).
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 440),
              child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                Row(children: [
                  const BrandMark(),
                  const SizedBox(width: 10),
                  Text('Trippin', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, letterSpacing: -0.18, color: c.tx)),
                ]),
                const SizedBox(height: 24),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(Ds.s20),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                      Text(again ? 'Your sign-in expired' : 'Your trips, even offline', style: tt.headlineSmall),
                      const SizedBox(height: 8),
                      Text(
                        again
                            ? 'Your saved trips still work. Sign in to sync changes and save new trips.'
                            : 'Plan on the Trippin website. This app carries your saved plans, maps and directions — no signal needed.',
                        style: tt.bodyLarge?.copyWith(color: c.tx2),
                      ),
                      if (again && session.email.isNotEmpty) ...[
                        const SizedBox(height: 8),
                        Text('Signed in as ${session.email}', style: tt.bodySmall?.copyWith(color: c.tx3)),
                      ],
                      if (_error != null) ...[
                        const SizedBox(height: 20),
                        Notice(text: _error!, icon: Icons.error_outline, tone: 'danger'),
                      ],
                      const SizedBox(height: 20),
                      FilledButton.icon(
                        style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(52)),
                        onPressed: _busy ? null : _signIn,
                        icon: _busy
                            ? SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2.4, color: c.tx3))
                            : const Icon(Icons.login, size: 18),
                        label: const Text('Sign in'),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'One account for Trippin, SpendLog and InFrame. New here? Signing in creates your account.',
                        style: TextStyle(color: c.tx3, fontSize: 12, height: 17 / 12),
                      ),
                    ]),
                  ),
                ),
              ]),
            ),
          ),
        ),
      ),
    );
  }
}
