import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:itinerary_planner/features/trips/models/trip_models.dart';
import 'package:itinerary_planner/features/trips/trips_repository.dart';
import 'package:itinerary_planner/shared/widgets/common_widgets.dart';

class NotificationsScreen extends ConsumerStatefulWidget {
  const NotificationsScreen({super.key});

  @override
  ConsumerState<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends ConsumerState<NotificationsScreen> {
  List<AppNotification> _notifications = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final result = await ref.read(notificationsRepositoryProvider).list();
      if (mounted) setState(() => _notifications = result.notifications);
      ref.read(unreadNotificationsProvider.notifier).refresh();
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _onTap(AppNotification n) async {
    if (!n.read) {
      await ref.read(notificationsRepositoryProvider).markRead(n.id);
      ref.read(unreadNotificationsProvider.notifier).refresh();
    }
    if (n.tripId != null && mounted) {
      context.push('/trips/${n.tripId}');
    }
    await _load();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [
          IconButton(
            icon: const Icon(Icons.done_all),
            onPressed: () async {
              await ref.read(notificationsRepositoryProvider).markAllRead();
              ref.read(unreadNotificationsProvider.notifier).refresh();
              await _load();
            },
          ),
        ],
      ),
      body: _loading && _notifications.isEmpty
          ? const LoadingOverlay()
          : _error != null
              ? ErrorView(message: _error!, onRetry: _load)
              : RefreshIndicator(
                  onRefresh: _load,
                  child: _notifications.isEmpty
                      ? ListView(
                          children: [
                            SizedBox(
                              height: MediaQuery.of(context).size.height * 0.4,
                              child: const EmptyState(message: 'No notifications'),
                            ),
                          ],
                        )
                      : ListView.separated(
                          itemCount: _notifications.length,
                          separatorBuilder: (_, __) => const Divider(height: 1),
                          itemBuilder: (context, index) {
                            final n = _notifications[index];
                            return ListTile(
                              title: Text(n.title, style: TextStyle(fontWeight: n.read ? FontWeight.normal : FontWeight.bold)),
                              subtitle: Text(n.message),
                              trailing: n.read ? null : const Icon(Icons.circle, size: 10, color: Colors.teal),
                              onTap: () => _onTap(n),
                            );
                          },
                        ),
                ),
    );
  }
}
