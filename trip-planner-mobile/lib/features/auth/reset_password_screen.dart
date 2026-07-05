import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:itinerary_planner/features/auth/auth_repository.dart';

class ResetPasswordScreen extends ConsumerStatefulWidget {
  const ResetPasswordScreen({super.key, required this.token});

  final String token;

  @override
  ConsumerState<ResetPasswordScreen> createState() => _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends ConsumerState<ResetPasswordScreen> {
  final _password = TextEditingController();
  final _confirm = TextEditingController();
  bool _loading = false;
  String? _error;
  String? _message;

  @override
  void dispose() {
    _password.dispose();
    _confirm.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (widget.token.isEmpty) {
      setState(() => _error = 'Invalid or missing reset token');
      return;
    }
    if (_password.text != _confirm.text) {
      setState(() => _error = 'Passwords do not match');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final msg = await ref.read(authRepositoryProvider).resetPassword(widget.token, _password.text);
      setState(() => _message = msg);
      if (mounted) {
        await Future<void>.delayed(const Duration(seconds: 1));
        if (mounted) context.go('/login');
      }
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Reset password')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TextField(
              controller: _password,
              decoration: const InputDecoration(labelText: 'New password'),
              obscureText: true,
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _confirm,
              decoration: const InputDecoration(labelText: 'Confirm password'),
              obscureText: true,
            ),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
            ],
            if (_message != null) ...[
              const SizedBox(height: 12),
              Text(_message!, style: TextStyle(color: Theme.of(context).colorScheme.primary)),
            ],
            const SizedBox(height: 24),
            FilledButton(
              onPressed: _loading ? null : _submit,
              child: _loading
                  ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Text('Update password'),
            ),
          ],
        ),
      ),
    );
  }
}
