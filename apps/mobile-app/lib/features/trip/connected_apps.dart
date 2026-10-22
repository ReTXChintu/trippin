import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/api_client.dart';
import '../../core/theme.dart';
import '../../data/app_state.dart';
import '../../data/suite_models.dart';
import '../../shared/widgets.dart';

/// The trip's links to SpendLog and InFrame, with each linked app's live summary. Online only —
/// the trip itself never waits on it.
final tripLinksProvider = AsyncNotifierProvider.autoDispose.family<TripLinksNotifier, TripLinks, String>(TripLinksNotifier.new);

/// How often the screen asks again while a link is still being set up.
const linkPollEvery = Duration(seconds: 4);

class TripLinksNotifier extends AutoDisposeFamilyAsyncNotifier<TripLinks, String> {
  Timer? _poll;

  @override
  Future<TripLinks> build(String arg) async {
    ref.onDispose(() => _poll?.cancel());
    try {
      return _watch(await _fetch());
    } on ApiException catch (e) {
      if (e.unauthorized) ref.read(sessionProvider.notifier).markSignedOut();
      rethrow;
    }
  }

  /// Owner only. Switching off unlinks: nothing in SpendLog or InFrame is deleted.
  Future<void> setEnabled(String app, bool on) async {
    final data = await ref.read(apiProvider).patch('/trips/$arg/links', body: {app: on});
    state = AsyncData(_watch(TripLinks.fromJson(data)));
  }

  Future<TripLinks> _fetch() async => TripLinks.fromJson(await ref.read(apiProvider).get('/trips/$arg/links'));

  /// A link the server is still setting up is delivered by its outbox within seconds, but the
  /// answer we hold says "pending" — so ask again shortly, keeping what's on screen, until every
  /// link is settled.
  TripLinks _watch(TripLinks view) {
    _poll?.cancel();
    _poll = null;
    if (view.apps.any((app) => app.enabled && app.status == 'pending')) {
      _poll = Timer(linkPollEvery, _refresh);
    }
    return view;
  }

  Future<void> _refresh() async {
    _poll = null;
    try {
      state = AsyncData(_watch(await _fetch()));
    } catch (_) {
      // Offline for a moment: keep what's shown and try again.
      final current = state.valueOrNull;
      if (current != null) _watch(current);
    }
  }
}

/// A dismissed promo card stays hidden this long.
const promoQuietPeriod = Duration(days: 30);

/// When each app's promo card was last dismissed (kept on the phone).
final promoDismissalsProvider = AsyncNotifierProvider.autoDispose<PromoDismissals, Map<String, DateTime>>(PromoDismissals.new);

class PromoDismissals extends AutoDisposeAsyncNotifier<Map<String, DateTime>> {
  @override
  Future<Map<String, DateTime>> build() => ref.read(storeProvider).promoDismissals().catchError((_) => <String, DateTime>{});

  Future<void> dismiss(String app) async {
    final now = DateTime.now();
    state = AsyncData({...?state.valueOrNull, app: now});
    try {
      await ref.read(storeProvider).dismissPromo(app, now);
    } catch (_) {
      // Hidden for this visit at least.
    }
  }
}

bool _recentlyDismissed(Map<String, DateTime> dismissed, String app) {
  final at = dismissed[app];
  return at != null && DateTime.now().difference(at) < promoQuietPeriod;
}

Future<void> _open(BuildContext context, String url) async {
  final uri = Uri.tryParse(url);
  final ok = uri != null && await launchUrl(uri, mode: LaunchMode.externalApplication).catchError((_) => false);
  if (!ok && context.mounted) toast(context, 'Couldn’t open $url');
}

/// "Connected apps" on the trip screen.
class ConnectedAppsSection extends ConsumerWidget {
  const ConnectedAppsSection({super.key, required this.tripId});
  final String tripId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final links = ref.watch(tripLinksProvider(tripId));
    final dismissed = ref.watch(promoDismissalsProvider).valueOrNull ?? const <String, DateTime>{};

    return links.when(
      // Quiet while loading: the section appears once there's something to show.
      loading: () => const SizedBox.shrink(),
      error: (e, _) => Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        const SectionTitle('Connected apps'),
        Notice(
          icon: Icons.cloud_off_outlined,
          text: e is ApiException && e.offline
              ? 'SpendLog and InFrame summaries show here when you’re online.'
              : 'Couldn’t load SpendLog and InFrame for this trip.',
          action: TextButton(onPressed: () => ref.invalidate(tripLinksProvider(tripId)), child: const Text('Retry')),
        ),
      ]),
      data: (view) {
        final cards = <Widget>[
          if (view.canManage && view.apps.isNotEmpty) _LinkToggles(tripId: tripId, apps: view.apps),
          for (final app in view.apps) ...[
            if (app.enabled) AppLinkCard(tripId: tripId, app: app, canManage: view.canManage),
            if (app.showsPromo && !_recentlyDismissed(dismissed, app.app))
              PromoCard(app: app.app, promo: app.promo!, onDismiss: () => ref.read(promoDismissalsProvider.notifier).dismiss(app.app)),
          ],
        ];
        if (cards.isEmpty) return const SizedBox.shrink();
        return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          const SectionTitle('Connected apps'),
          for (final (i, c) in cards.indexed) ...[if (i > 0) const SizedBox(height: 8), c],
        ]);
      },
    );
  }
}

/// The app's mark: an icon tile in that app's own accent (SpendLog cobalt, InFrame violet), so a
/// sibling looks like itself on Trippin's screens.
class _AppBadge extends StatelessWidget {
  const _AppBadge(this.app);
  final String app;

  @override
  Widget build(BuildContext context) {
    final (soft, strong) = SuiteAccents.of(app, dark: context.isDark);
    return DsIconTile(
      app == 'spendlog' ? Icons.account_balance_wallet_outlined : Icons.photo_library_outlined,
      bg: soft,
      fg: strong,
    );
  }
}

/// Owner's switches: link this trip to SpendLog / InFrame, or unlink it.
class _LinkToggles extends ConsumerStatefulWidget {
  const _LinkToggles({required this.tripId, required this.apps});
  final String tripId;
  final List<ConnectedApp> apps;

  @override
  ConsumerState<_LinkToggles> createState() => _LinkTogglesState();
}

class _LinkTogglesState extends ConsumerState<_LinkToggles> {
  /// Switches flipped and waiting for the server: app → the value asked for.
  final _pending = <String, bool>{};

  Future<void> _set(ConnectedApp app, bool on) async {
    if (!on) {
      final ok = await showDialog<bool>(
        context: context,
        builder: (c) => AlertDialog(
          title: Text('Unlink ${app.name}?'),
          content: Text(app.app == 'spendlog'
              ? 'Your SpendLog trip and every transaction in it stay in SpendLog. Trippin just stops syncing this trip’s details and people.'
              : 'Your InFrame event and every photo in it stay in InFrame. Trippin just stops syncing this trip’s details and people.'),
          actions: [
            TextButton(onPressed: () => Navigator.pop(c, false), child: const Text('Cancel')),
            FilledButton(onPressed: () => Navigator.pop(c, true), child: const Text('Unlink')),
          ],
        ),
      );
      if (ok != true) return;
    }
    setState(() => _pending[app.app] = on);
    try {
      await ref.read(tripLinksProvider(widget.tripId).notifier).setEnabled(app.app, on);
      if (mounted) toast(context, on ? 'Linking to ${app.name}…' : 'Unlinked from ${app.name} — nothing was deleted there');
    } catch (e) {
      if (mounted) toast(context, e.toString());
    } finally {
      if (mounted) setState(() => _pending.remove(app.app));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: Column(children: [
        for (final (i, app) in widget.apps.indexed) ...[
          if (i > 0) const Divider(height: 1),
          SwitchListTile(
            key: ValueKey('link-${app.app}'),
            contentPadding: const EdgeInsets.fromLTRB(16, 4, 12, 4),
            secondary: _AppBadge(app.app),
            title: Text(ConnectedApp.toggleLabel(app.app), style: const TextStyle(fontSize: 14, height: 20 / 14, fontWeight: FontWeight.w500)),
            subtitle: Text(app.tagline, style: TextStyle(color: context.ds.tx3, fontSize: 12, height: 16 / 12)),
            value: _pending[app.app] ?? app.enabled,
            onChanged: _pending.containsKey(app.app) ? null : (v) => _set(app, v),
          ),
        ],
      ]),
    );
  }
}

/// A linked app: its live summary, or where the link stands, and "Open in …". Owners can retry a
/// link that failed.
class AppLinkCard extends ConsumerStatefulWidget {
  const AppLinkCard({super.key, required this.tripId, required this.app, this.canManage = false});
  final String tripId;
  final ConnectedApp app;
  final bool canManage;

  @override
  ConsumerState<AppLinkCard> createState() => _AppLinkCardState();
}

class _AppLinkCardState extends ConsumerState<AppLinkCard> {
  bool _retrying = false;

  ConnectedApp get app => widget.app;

  /// Asks the server to send the link again (it re-sends trip.linked for an app in error).
  Future<void> _retry() async {
    setState(() => _retrying = true);
    try {
      await ref.read(tripLinksProvider(widget.tripId).notifier).setEnabled(app.app, true);
    } catch (e) {
      if (mounted) toast(context, e.toString());
    } finally {
      if (mounted) setState(() => _retrying = false);
    }
  }

  (String, DsTone)? _pill(BuildContext context) => switch (app.status) {
        'linked' => ('Linked', DsTone.good),
        'pending' => ('Setting up', DsTone.accent),
        'error' => ('Not linked', DsTone.warn),
        _ => null,
      };

  /// The link's error as the server worded it, with "Try again" for the owner.
  Widget _error(BuildContext context) => Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Notice(tone: 'warn', icon: Icons.sync_problem_outlined, text: app.lastError ?? 'Couldn’t link this trip to ${app.name}.'),
        if (widget.canManage) ...[
          const SizedBox(height: 8),
          Align(
            alignment: Alignment.centerLeft,
            child: TextButton.icon(
              onPressed: _retrying ? null : _retry,
              icon: _retrying
                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(Icons.refresh, size: 18),
              label: const Text('Try again'),
            ),
          ),
        ],
      ]);

  Widget _body(BuildContext context) {
    if (app.spendlog != null) return _SpendlogBody(app.spendlog!);
    if (app.inframe != null) return _InframeBody(app.inframe!, openUrl: app.openUrl);
    if (app.status == 'error') return _error(context);
    if (app.summaryError != null) {
      return Notice(tone: 'warn', icon: Icons.cloud_off_outlined, text: '${app.summaryError}. The rest of your trip works as usual.');
    }
    return Row(children: [
      const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2.5, strokeCap: StrokeCap.round)),
      const SizedBox(width: 12),
      Expanded(
        child: Text(
          app.app == 'spendlog' ? 'Setting up the SpendLog trip — spending shows here once it’s ready.' : 'Setting up the InFrame event — photos show here once it’s ready.',
          style: TextStyle(color: context.ds.tx2, fontSize: 13, height: 18 / 13),
        ),
      ),
    ]);
  }

  @override
  Widget build(BuildContext context) {
    final pill = _pill(context);
    final open = app.openUrl;
    final skipped = app.skippedMembers.length;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(Ds.s16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Row(children: [
            _AppBadge(app.app),
            const SizedBox(width: 12),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(app.name, style: Theme.of(context).textTheme.titleSmall),
                Text(app.app == 'spendlog' ? 'What the trip actually cost' : 'Everyone’s trip photos',
                    style: TextStyle(color: context.ds.tx3, fontSize: 12, height: 16 / 12)),
              ]),
            ),
            if (pill != null) Pill(pill.$1, tone: pill.$2),
          ]),
          const SizedBox(height: 16),
          _body(context),
          // A summary that loaded still gets the link's error under it.
          if (app.hasSummary && app.status == 'error') ...[const SizedBox(height: 10), _error(context)],
          if (app.hasSummary && app.summaryError != null) ...[
            const SizedBox(height: 10),
            Notice(tone: 'warn', icon: Icons.cloud_off_outlined, text: app.summaryError!),
          ],
          if (skipped > 0) ...[
            const SizedBox(height: 10),
            Row(children: [
              Icon(Icons.person_add_alt_outlined, size: 18, color: context.ds.tx2),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  '$skipped member${skipped == 1 ? '' : 's'} will join the ${app.app == 'spendlog' ? 'SpendLog trip' : 'InFrame event'} once they sign in to ${app.name}',
                  style: TextStyle(color: context.ds.tx2, fontSize: 13, height: 18 / 13),
                ),
              ),
            ]),
          ],
          if (open != null) ...[
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: () => _open(context, open),
              icon: const Icon(Icons.open_in_new, size: 18),
              label: Text('Open in ${app.name}'),
            ),
          ],
        ]),
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.label, required this.value, this.color});
  final String label, value;
  final Color? color;

  @override
  // The inner tile (§7.5): raised-subtle surface, hairline, radius 14; label over a 17/600 value.
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(Ds.s14),
        decoration: BoxDecoration(
          color: context.ds.sf2,
          border: Border.all(color: context.ds.ln),
          borderRadius: BorderRadius.circular(Ds.rXl),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label, style: Theme.of(context).textTheme.labelMedium, overflow: TextOverflow.ellipsis),
          const SizedBox(height: 2),
          Text(
            value,
            style: TextStyle(fontWeight: FontWeight.w600, fontSize: 17, height: 24 / 17, color: color ?? context.ds.tx, fontFeatures: Ds.tabular),
            overflow: TextOverflow.ellipsis,
          ),
        ]),
      );
}

class _SpendlogBody extends StatelessWidget {
  const _SpendlogBody(this.s);
  final SpendlogSummary s;

  @override
  Widget build(BuildContext context) {
    final (balanceLabel, balance, balanceColor) = s.iOweMinor > 0
        ? ('You owe', s.money(s.iOweMinor), context.ds.warn)
        : s.owedToMeMinor > 0
            ? ('Owed to you', s.money(s.owedToMeMinor), context.ds.good)
            : ('Your balance', 'Settled up', null);
    const shown = 3;
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      // Money spent is ink, never red (§2).
      Text(
        s.money(s.totalSpentMinor),
        style: Theme.of(context).textTheme.headlineMedium?.copyWith(color: context.ds.moneyOut, fontFeatures: Ds.tabular),
      ),
      Text(
        'spent by everyone · ${s.transactionCount} transaction${s.transactionCount == 1 ? '' : 's'}',
        style: TextStyle(color: context.ds.tx3, fontSize: 13, height: 18 / 13, fontFeatures: Ds.tabular),
      ),
      const SizedBox(height: 12),
      Row(children: [
        Expanded(child: _Stat(label: 'Your share', value: s.money(s.myShareMinor))),
        const SizedBox(width: 8),
        Expanded(child: _Stat(label: balanceLabel, value: balance, color: balanceColor)),
      ]),
      if (s.settlement.isNotEmpty) ...[
        const SizedBox(height: 12),
        Text('To settle up', style: Theme.of(context).textTheme.labelMedium),
        for (final line in s.settlement.take(shown))
          Padding(
            padding: const EdgeInsets.only(top: 6),
            child: Row(children: [
              Expanded(child: Text('${line.fromName} pays ${line.toName}', style: TextStyle(color: context.ds.tx2), overflow: TextOverflow.ellipsis)),
              const SizedBox(width: 8),
              Text(s.money(line.amountMinor), style: const TextStyle(fontWeight: FontWeight.w600, fontFeatures: Ds.tabular)),
            ]),
          ),
        if (s.settlement.length > shown)
          Padding(
            padding: const EdgeInsets.only(top: 6),
            child: Text('+${s.settlement.length - shown} more in SpendLog', style: TextStyle(color: context.ds.tx3, fontSize: 12, height: 16 / 12)),
          ),
      ],
    ]);
  }
}

class _InframeBody extends StatelessWidget {
  const _InframeBody(this.s, {this.openUrl});
  final InframeSummary s;

  /// The linked event (the link's url, else the summary's).
  final String? openUrl;

  @override
  Widget build(BuildContext context) {
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      if (s.coverThumbUrl != null) ...[
        ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: Image.network(
            s.coverThumbUrl!,
            height: 150,
            fit: BoxFit.cover,
            errorBuilder: (_, _, _) => const SizedBox.shrink(),
          ),
        ),
        const SizedBox(height: 12),
      ],
      Row(children: [
        Expanded(child: _Stat(label: 'Photos', value: '${s.photoCount}')),
        const SizedBox(width: 8),
        Expanded(child: _Stat(label: 'Videos', value: '${s.videoCount}')),
        const SizedBox(width: 8),
        Expanded(child: _Stat(label: 'Albums', value: '${s.albumCount}')),
      ]),
      if (s.photoCount + s.videoCount == 0 && !s.needsStorage) ...[
        const SizedBox(height: 10),
        Text('No photos yet — everyone on the trip can add theirs in InFrame.', style: TextStyle(color: context.ds.tx2, fontSize: 13, height: 18 / 13)),
      ],
      // The owner connects a Drive/MEGA folder in InFrame before anyone can add photos; new
      // events start this way.
      if (s.needsStorage) ...[
        const SizedBox(height: 10),
        Notice(
          tone: 'warn',
          icon: Icons.create_new_folder_outlined,
          text: 'Connect a folder in InFrame to start adding photos',
          action: openUrl == null ? null : TextButton(onPressed: () => _open(context, openUrl!), child: const Text('Open InFrame')),
        ),
      ],
    ]);
  }
}

/// Trippin's own card for an app the viewer doesn't use yet. Dismissable; stays hidden 30 days.
class PromoCard extends StatelessWidget {
  const PromoCard({super.key, required this.app, required this.promo, required this.onDismiss});
  final String app;
  final SuitePromo promo;
  final VoidCallback onDismiss;

  @override
  Widget build(BuildContext context) {
    final c = context.ds;
    // The info treatment: accent tint, accent hairline, ink text; the mark stays in its own app's
    // accent on the surface ("on tinted" icon tile).
    final (_, strong) = SuiteAccents.of(app, dark: context.isDark);
    return Card(
      color: c.acSoft,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(Ds.rXl), side: BorderSide(color: c.acLine)),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 4, 16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: DsIconTile(app == 'spendlog' ? Icons.account_balance_wallet_outlined : Icons.photo_library_outlined, bg: c.sf, fg: strong),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(promo.title, style: Theme.of(context).textTheme.titleSmall),
                  if (promo.body.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text(promo.body, style: TextStyle(color: c.tx2, fontSize: 13, height: 18 / 13)),
                  ],
                ]),
              ),
            ),
            IconButton(
              tooltip: 'Dismiss',
              onPressed: onDismiss,
              icon: Icon(Icons.close, size: 20, color: c.tx2),
            ),
          ]),
          const SizedBox(height: 12),
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: Row(children: [
              Expanded(
                child: FilledButton.icon(
                  onPressed: () => _open(context, promo.downloadUrl),
                  icon: Icon(promo.apkUrl != null ? Icons.download_outlined : Icons.open_in_new, size: 18),
                  label: Text(promo.cta, overflow: TextOverflow.ellipsis),
                ),
              ),
              if (promo.webUrl.isNotEmpty && promo.apkUrl != null) ...[
                const SizedBox(width: 8),
                TextButton(onPressed: () => _open(context, promo.webUrl), child: const Text('Learn more')),
              ],
            ]),
          ),
        ]),
      ),
    );
  }
}
