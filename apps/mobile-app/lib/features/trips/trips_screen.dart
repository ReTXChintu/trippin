import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme.dart';
import '../../data/app_state.dart';
import '../../data/models.dart';
import '../../data/offline_store.dart';
import '../../data/updates.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../shared/widgets.dart';
import '../trip/today_card.dart';

class TripsScreen extends ConsumerStatefulWidget {
  const TripsScreen({super.key});
  @override
  ConsumerState<TripsScreen> createState() => _TripsScreenState();
}

class _TripsScreenState extends ConsumerState<TripsScreen> with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) => ref.read(tripServiceProvider).sync());
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) ref.read(tripServiceProvider).sync();
  }

  Future<void> _refresh() async {
    ref.invalidate(updateProvider);
    await ref.read(tripServiceProvider).sync();
    ref.invalidate(tripListProvider);
    await ref.read(tripListProvider.future).catchError((_) => TripList(const []));
  }

  Future<void> _save(TripSummary t) async {
    try {
      await ref.read(tripServiceProvider).save(t.id);
      if (mounted) toast(context, '${t.title} is saved — it works with no signal now');
    } catch (e) {
      if (mounted) toast(context, e.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(sessionProvider);
    final saved = ref.watch(savedTripsProvider);
    final list = ref.watch(tripListProvider);
    final progress = ref.watch(saveProgressProvider);
    final savedIds = saved.map((s) => s.summary.id).toSet();
    final others = (list.valueOrNull?.trips ?? const <TripSummary>[]).where((t) => !savedIds.contains(t.id)).toList();
    final firstName = session.name.split(' ').first;
    final update = ref.watch(updateProvider).valueOrNull;
    final showUpdate = update != null && ref.watch(dismissedUpdateProvider) != update.buildNumber;

    return Scaffold(
      appBar: AppBar(
        title: Row(children: [
          ClipRRect(borderRadius: BorderRadius.circular(8), child: Image.asset('assets/brand/logo.png', width: 30, height: 30)),
          const SizedBox(width: 10),
          const Text('Trippin'),
        ]),
        actions: [
          IconButton(tooltip: 'Settings', icon: const Icon(Icons.settings_outlined), onPressed: () => context.push('/settings')),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _refresh,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 4, 16, 32),
          children: [
            if (firstName.isNotEmpty)
              Padding(
                padding: const EdgeInsets.fromLTRB(4, 4, 4, 12),
                child: Text('Hi $firstName', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700)),
              ),
            if (showUpdate)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Notice(
                  text: 'Trippin ${update.version} is available${update.notes != null ? ' — ${update.notes}' : ''}',
                  icon: Icons.system_update_outlined,
                  action: Row(mainAxisSize: MainAxisSize.min, children: [
                    TextButton(onPressed: () => ref.read(dismissedUpdateProvider.notifier).state = update.buildNumber, child: const Text('Later')),
                    FilledButton(
                      onPressed: () => launchUrl(Uri.parse(update.url), mode: LaunchMode.externalApplication),
                      child: const Text('Update'),
                    ),
                  ]),
                ),
              ),
            if (session.needsSignIn)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Notice(
                  text: 'Sign in again to sync. Saved trips still work.',
                  icon: Icons.lock_clock_outlined,
                  tone: 'warn',
                  action: TextButton(onPressed: () => context.push('/login'), child: const Text('Sign in')),
                ),
              )
            else if (list.valueOrNull?.fromCache == true)
              const Padding(
                padding: EdgeInsets.only(bottom: 12),
                child: Notice(text: 'Offline — showing what’s saved on this phone.', icon: Icons.cloud_off_outlined, tone: 'warn'),
              ),
            for (final s in saved) TodayCard(tripId: s.summary.id),
            if (saved.isNotEmpty) ...[
              const SectionTitle('Saved on this phone'),
              for (final s in saved) ...[_SavedTile(trip: s, busy: progress[s.summary.id]), const SizedBox(height: 10)],
            ],
            SectionTitle(saved.isEmpty ? 'Your trips' : 'More trips'),
            if (list.isLoading && others.isEmpty)
              const Padding(padding: EdgeInsets.all(24), child: Center(child: CircularProgressIndicator()))
            else if (others.isEmpty && saved.isEmpty)
              EmptyState(
                icon: Icons.luggage_outlined,
                title: list.valueOrNull?.fromCache == true ? 'Nothing saved yet' : 'No trips yet',
                text: list.valueOrNull?.fromCache == true
                    ? 'Connect to the internet to see your trips and save them for offline.'
                    : 'Plan a trip on the Trippin website — it shows up here to save for offline.',
              )
            else if (others.isEmpty)
              Padding(
                padding: const EdgeInsets.all(8),
                child: Text('All your trips are saved on this phone.', style: TextStyle(color: context.muted)),
              )
            else
              for (final t in others) ...[_TripTile(trip: t, busy: progress[t.id], onSave: () => _save(t)), const SizedBox(height: 10)],
          ],
        ),
      ),
    );
  }
}

class _SavedTile extends ConsumerWidget {
  const _SavedTile({required this.trip, this.busy});
  final SavedTrip trip;
  final ({String label, double? value})? busy;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = trip.summary;
    final today = todayYmd();
    final running = t.startDate.compareTo(today) <= 0 && today.compareTo(t.endDate) <= 0;
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => context.push('/trip/${t.id}'),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Expanded(child: Text(t.title, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700))),
              if (running) Pill('On now', bg: context.successSoft, fg: context.success, icon: Icons.circle),
            ]),
            const SizedBox(height: 4),
            Text('${t.city} · ${dateRange(t.startDate, t.endDate)}', style: TextStyle(color: context.muted)),
            const SizedBox(height: 10),
            if (busy != null) ...[
              Text(busy!.label, style: TextStyle(fontSize: 12.5, color: context.accentText, fontWeight: FontWeight.w600)),
              const SizedBox(height: 6),
              LinearProgressIndicator(value: busy!.value, borderRadius: BorderRadius.circular(4)),
            ] else
              Wrap(spacing: 6, runSpacing: 6, children: [
                Pill('Saved ${ago(trip.savedAt)}', icon: Icons.offline_pin_outlined, bg: context.accentSoft, fg: context.accentText),
                Pill(trip.mapsSaved ? 'Maps saved' : 'No offline maps', icon: trip.mapsSaved ? Icons.map_outlined : Icons.map_outlined),
              ]),
          ]),
        ),
      ),
    );
  }
}

class _TripTile extends StatelessWidget {
  const _TripTile({required this.trip, required this.onSave, this.busy});
  final TripSummary trip;
  final VoidCallback onSave;
  final ({String label, double? value})? busy;

  @override
  Widget build(BuildContext context) => Card(
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: () => context.push('/trip/${trip.id}'),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 10, 14),
            child: Row(children: [
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(trip.title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 3),
                  Text('${trip.city} · ${dateRange(trip.startDate, trip.endDate)}', style: TextStyle(color: context.muted, fontSize: 13)),
                  if (busy != null) ...[
                    const SizedBox(height: 8),
                    LinearProgressIndicator(value: busy!.value, borderRadius: BorderRadius.circular(4)),
                  ],
                ]),
              ),
              const SizedBox(width: 8),
              busy != null
                  ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2.4))
                  : OutlinedButton.icon(onPressed: onSave, icon: const Icon(Icons.download_outlined, size: 18), label: const Text('Save')),
            ]),
          ),
        ),
      );
}
