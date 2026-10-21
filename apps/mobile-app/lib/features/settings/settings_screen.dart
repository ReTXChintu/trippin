import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/config.dart';
import '../../core/theme.dart';
import '../../data/app_state.dart';
import '../../data/offline_store.dart';
import '../../data/updates.dart';
import '../../shared/widgets.dart';

final _tileSizeProvider = FutureProvider.autoDispose<double>((ref) => ref.read(tilesProvider).sizeMb().catchError((_) => 0.0));

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  Future<void> _update(WidgetRef ref, AppSettings next) async {
    if (next.reminders || next.morningBrief) await ref.read(remindersProvider).requestPermission();
    await ref.read(storeProvider).setSettings(next);
    ref.invalidate(settingsProvider);
    await ref.read(tripServiceProvider).rescheduleReminders();
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(sessionProvider);
    final settings = ref.watch(settingsProvider).valueOrNull ?? AppSettings();
    final saved = ref.watch(savedTripsProvider);
    final tiles = ref.watch(_tileSizeProvider).valueOrNull;
    final dataKb = saved.fold<int>(0, (a, t) => a + t.sizeKb);
    final version = ref.watch(appVersionProvider).valueOrNull;
    final update = ref.watch(updateProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
        children: [
          const SectionTitle('Account'),
          Card(
            child: ListTile(
              contentPadding: const EdgeInsets.symmetric(horizontal: 16),
              // The header avatar: ink fill, paper initials.
              leading: CircleAvatar(
                radius: 20,
                backgroundColor: context.ds.tx,
                foregroundColor: context.ds.bg,
                child: Text(session.name.isNotEmpty ? session.name[0].toUpperCase() : '?', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
              ),
              title: Text(session.name, style: Theme.of(context).textTheme.titleSmall),
              subtitle: Text(session.email),
            ),
          ),
          const SectionTitle('Reminders'),
          Card(
            clipBehavior: Clip.antiAlias,
            child: Column(children: [
              SwitchListTile(
                title: const Text('When to leave'),
                subtitle: Text('A nudge ${settings.leadMinutes} min before you need to set off for each stop'),
                value: settings.reminders,
                onChanged: (v) => _update(ref, settings.copyWith(reminders: v)),
              ),
              if (settings.reminders) ...[
                const Divider(),
                ListTile(
                  title: const Text('How early'),
                  trailing: DropdownButton<int>(
                    value: settings.leadMinutes,
                    underline: const SizedBox.shrink(),
                    borderRadius: BorderRadius.circular(Ds.rLg),
                    style: TextStyle(fontFamily: Ds.sans, fontSize: 14, fontWeight: FontWeight.w600, color: context.ds.tx, fontFeatures: Ds.tabular),
                    items: const [5, 10, 15, 20, 30].map((m) => DropdownMenuItem(value: m, child: Text('$m min'))).toList(),
                    onChanged: (m) => m == null ? null : _update(ref, settings.copyWith(leadMinutes: m)),
                  ),
                ),
              ],
              const Divider(),
              SwitchListTile(
                title: const Text('Morning plan'),
                subtitle: const Text('The day’s first stop and how many places, before you start'),
                value: settings.morningBrief,
                onChanged: (v) => _update(ref, settings.copyWith(morningBrief: v)),
              ),
            ]),
          ),
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Text('Reminders are set on the phone, so they arrive with no signal.', style: TextStyle(color: context.ds.tx3, fontSize: 12, height: 16 / 12)),
          ),
          const SectionTitle('Storage'),
          Card(
            clipBehavior: Clip.antiAlias,
            child: Column(children: [
              ListTile(
                leading: const Icon(Icons.description_outlined),
                title: Text('${saved.length} saved trip${saved.length == 1 ? '' : 's'}'),
                trailing: Text('${(dataKb / 1024).toStringAsFixed(1)} MB',
                    style: TextStyle(color: context.ds.tx2, fontSize: 13, fontWeight: FontWeight.w600, fontFeatures: Ds.tabular)),
              ),
              const Divider(),
              ListTile(
                leading: const Icon(Icons.map_outlined),
                title: const Text('Offline maps'),
                trailing: Text(tiles == null ? '…' : '${tiles.toStringAsFixed(1)} MB',
                    style: TextStyle(color: context.ds.tx2, fontSize: 13, fontWeight: FontWeight.w600, fontFeatures: Ds.tabular)),
              ),
              const Divider(),
              ListTile(
                leading: Icon(Icons.delete_sweep_outlined, color: context.ds.crit),
                title: Text('Delete offline maps', style: TextStyle(color: context.ds.crit)),
                subtitle: const Text('Plans stay saved; maps download again when you update a trip'),
                onTap: () async {
                  await ref.read(tilesProvider).clear();
                  for (final t in saved) {
                    await ref.read(storeProvider).markMapsSaved(t.summary.id, false);
                  }
                  await ref.read(savedTripsProvider.notifier).reload();
                  ref.invalidate(_tileSizeProvider);
                  if (context.mounted) toast(context, 'Offline maps deleted');
                },
              ),
            ]),
          ),
          const SectionTitle('About'),
          Card(
            clipBehavior: Clip.antiAlias,
            child: Column(children: [
              ListTile(
                leading: const Icon(Icons.open_in_new),
                title: const Text('Plan on the Trippin website'),
                subtitle: Text(AppConfig.webUrl),
                onTap: () => launchUrl(Uri.parse(AppConfig.webUrl), mode: LaunchMode.externalApplication),
              ),
              const Divider(),
              ListTile(
                leading: const Icon(Icons.info_outline),
                title: Text('Trippin ${version ?? ''}'),
                subtitle: Text(update.isLoading
                    ? 'Checking for updates…'
                    : update.valueOrNull != null
                        ? 'Version ${update.value!.version} is available'
                        : 'Up to date'),
                trailing: update.valueOrNull != null
                    ? FilledButton(
                        onPressed: () => launchUrl(Uri.parse(update.value!.url), mode: LaunchMode.externalApplication),
                        child: const Text('Update'),
                      )
                    : TextButton(onPressed: () => ref.invalidate(updateProvider), child: const Text('Check')),
              ),
              const Divider(),
              const ListTile(
                leading: Icon(Icons.map_outlined),
                title: Text('Map data © OpenStreetMap contributors'),
              ),
            ]),
          ),
          const SizedBox(height: 20),
          OutlinedButton.icon(
            style: dsDangerOutline(context),
            onPressed: () async {
              final ok = await showDialog<bool>(
                context: context,
                builder: (c) => AlertDialog(
                  title: const Text('Sign out?'),
                  content: const Text('Saved trips and offline maps are removed from this phone.'),
                  actions: [
                    TextButton(onPressed: () => Navigator.pop(c, false), child: const Text('Cancel')),
                    FilledButton(style: dsDangerFilled(c), onPressed: () => Navigator.pop(c, true), child: const Text('Sign out')),
                  ],
                ),
              );
              if (ok == true) {
                await ref.read(sessionProvider.notifier).signOut();
                if (context.mounted) Navigator.of(context).popUntil((r) => r.isFirst);
              }
            },
            icon: const Icon(Icons.logout),
            label: const Text('Sign out'),
          ),
        ],
      ),
    );
  }
}
