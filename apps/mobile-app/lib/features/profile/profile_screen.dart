import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:itinerary_planner/features/auth/auth_provider.dart';
import 'package:itinerary_planner/features/auth/models/auth_models.dart';
import 'package:itinerary_planner/features/trips/trips_repository.dart';
import 'package:itinerary_planner/shared/providers/theme_provider.dart';
import 'package:itinerary_planner/shared/widgets/common_widgets.dart';

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  UserProfile? _profile;
  final _name = TextEditingController();
  final _avatar = TextEditingController();
  final _openaiKey = TextEditingController();
  final _googleKey = TextEditingController();
  bool _loading = true;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _name.dispose();
    _avatar.dispose();
    _openaiKey.dispose();
    _googleKey.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final profile = await ref.read(profileRepositoryProvider).getProfile();
      _name.text = profile.name;
      _avatar.text = profile.avatar ?? '';
      if (mounted) setState(() => _profile = profile);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _saveProfile() async {
    setState(() => _saving = true);
    try {
      final profile = await ref.read(profileRepositoryProvider).updateProfile(
            name: _name.text.trim(),
            avatar: _avatar.text.trim().isEmpty ? null : _avatar.text.trim(),
          );
      if (mounted) {
        setState(() => _profile = profile);
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Profile updated')));
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _saveKeys() async {
    setState(() => _saving = true);
    try {
      final profile = await ref.read(profileRepositoryProvider).updateApiKeys(
            openaiApiKey: _openaiKey.text.trim().isEmpty ? null : _openaiKey.text.trim(),
            googleMapsApiKey: _googleKey.text.trim().isEmpty ? null : _googleKey.text.trim(),
          );
      _openaiKey.clear();
      _googleKey.clear();
      if (mounted) {
        setState(() => _profile = profile);
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('API keys saved')));
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _clearKeys({bool openai = false, bool google = false}) async {
    setState(() => _saving = true);
    try {
      final profile = await ref.read(profileRepositoryProvider).updateApiKeys(
            clearOpenai: openai,
            clearGoogleMaps: google,
          );
      if (mounted) {
        setState(() => _profile = profile);
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('API keys cleared')));
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _logout() async {
    await ref.read(authProvider.notifier).logout();
    if (mounted) context.go('/login');
  }

  @override
  Widget build(BuildContext context) {
    final themeMode = ref.watch(themeModeProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Profile'),
        actions: [
          IconButton(icon: const Icon(Icons.logout), onPressed: _logout),
        ],
      ),
      body: _loading
          ? const LoadingOverlay()
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                if (_profile != null) ...[
                  CircleAvatar(
                    radius: 36,
                    child: Text(_profile!.name.isNotEmpty ? _profile!.name[0].toUpperCase() : '?'),
                  ),
                  const SizedBox(height: 8),
                  Text(_profile!.email, textAlign: TextAlign.center),
                  const SizedBox(height: 24),
                  Text('Profile', style: Theme.of(context).textTheme.titleMedium),
                  TextField(controller: _name, decoration: const InputDecoration(labelText: 'Name')),
                  TextField(
                    controller: _avatar,
                    decoration: const InputDecoration(labelText: 'Avatar URL'),
                  ),
                  FilledButton(
                    onPressed: _saving ? null : _saveProfile,
                    child: const Text('Save profile'),
                  ),
                  const SizedBox(height: 24),
                  Text('Appearance', style: Theme.of(context).textTheme.titleMedium),
                  SegmentedButton<ThemeMode>(
                    segments: const [
                      ButtonSegment(value: ThemeMode.system, label: Text('System')),
                      ButtonSegment(value: ThemeMode.light, label: Text('Light')),
                      ButtonSegment(value: ThemeMode.dark, label: Text('Dark')),
                    ],
                    selected: {themeMode},
                    onSelectionChanged: (s) => ref.read(themeModeProvider.notifier).state = s.first,
                  ),
                  const SizedBox(height: 24),
                  Text('API Keys', style: Theme.of(context).textTheme.titleMedium),
                  if (_profile!.hasOpenaiKey)
                    Row(
                      children: [
                        Expanded(child: Text('OpenAI ···${_profile!.openaiApiKeyLast4 ?? ''}')),
                        TextButton(onPressed: () => _clearKeys(openai: true), child: const Text('Clear')),
                      ],
                    ),
                  TextField(
                    controller: _openaiKey,
                    decoration: const InputDecoration(labelText: 'OpenAI API key'),
                    obscureText: true,
                  ),
                  if (_profile!.hasGoogleMapsKey)
                    Row(
                      children: [
                        Expanded(child: Text('Google Maps ···${_profile!.googleMapsApiKeyLast4 ?? ''}')),
                        TextButton(onPressed: () => _clearKeys(google: true), child: const Text('Clear')),
                      ],
                    ),
                  TextField(
                    controller: _googleKey,
                    decoration: const InputDecoration(labelText: 'Google Maps API key'),
                    obscureText: true,
                  ),
                  const SizedBox(height: 12),
                  FilledButton(
                    onPressed: _saving ? null : _saveKeys,
                    child: const Text('Save API keys'),
                  ),
                ],
              ],
            ),
    );
  }
}
