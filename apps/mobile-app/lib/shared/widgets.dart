import 'package:flutter/material.dart';
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';

import '../core/theme.dart';

/// A small rounded label.
class Pill extends StatelessWidget {
  const Pill(this.text, {super.key, this.icon, this.bg, this.fg});
  final String text;
  final IconData? icon;
  final Color? bg, fg;

  @override
  Widget build(BuildContext context) {
    final color = fg ?? context.muted;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: bg ?? context.subtle, borderRadius: BorderRadius.circular(999)),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        if (icon != null) ...[Icon(icon, size: 13, color: color), const SizedBox(width: 5)],
        Flexible(child: Text(text, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: color), overflow: TextOverflow.ellipsis)),
      ]),
    );
  }
}

class SectionTitle extends StatelessWidget {
  const SectionTitle(this.text, {super.key, this.trailing});
  final String text;
  final Widget? trailing;
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.fromLTRB(4, 20, 4, 8),
        child: Row(children: [
          Expanded(
            child: Text(text.toUpperCase(),
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, letterSpacing: 0.8, color: context.muted)),
          ),
          ?trailing,
        ]),
      );
}

/// A tinted message strip.
class Notice extends StatelessWidget {
  const Notice({super.key, required this.text, this.icon = Icons.info_outline, this.tone = 'accent', this.action});
  final String text;
  final IconData icon;
  final String tone;
  final Widget? action;
  @override
  Widget build(BuildContext context) {
    final (bg, fg) = switch (tone) {
      'warn' => (context.warnSoft, context.warn),
      'danger' => (context.dangerSoft, context.danger),
      'success' => (context.successSoft, context.success),
      _ => (context.accentSoft, context.accentText),
    };
    return Container(
      padding: const EdgeInsets.fromLTRB(14, 10, 8, 10),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(12)),
      child: Row(children: [
        Icon(icon, color: fg, size: 20),
        const SizedBox(width: 10),
        Expanded(child: Text(text, style: TextStyle(color: fg, fontSize: 13.5, height: 1.3))),
        ?action,
      ]),
    );
  }
}

class EmptyState extends StatelessWidget {
  const EmptyState({super.key, required this.icon, required this.title, required this.text, this.action});
  final IconData icon;
  final String title, text;
  final Widget? action;
  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(color: context.accentSoft, shape: BoxShape.circle),
              child: Icon(icon, color: context.accentText, size: 30),
            ),
            const SizedBox(height: 16),
            Text(title, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700), textAlign: TextAlign.center),
            const SizedBox(height: 6),
            Text(text, style: TextStyle(color: context.muted), textAlign: TextAlign.center),
            if (action != null) ...[const SizedBox(height: 18), action!],
          ]),
        ),
      );
}

/// Icon + label + value row used on detail sheets.
class InfoRow extends StatelessWidget {
  const InfoRow({super.key, required this.icon, required this.label, required this.value, this.valueColor});
  final IconData icon;
  final String label, value;
  final Color? valueColor;
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 6),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Icon(icon, size: 18, color: context.muted),
          const SizedBox(width: 10),
          SizedBox(width: 72, child: Text(label, style: TextStyle(color: context.muted, fontSize: 13))),
          Expanded(child: Text(value, style: TextStyle(fontSize: 14, color: valueColor, fontWeight: FontWeight.w500))),
        ]),
      );
}

/// Opens Google Maps (or any maps app) with directions to a point. Works offline when the area
/// is downloaded in Google Maps too.
Future<void> openDirections(BuildContext context, LatLng to, {String? label}) async {
  final uri = Uri.parse('https://www.google.com/maps/dir/?api=1&destination=${to.latitude},${to.longitude}');
  if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
    final geo = Uri.parse('geo:${to.latitude},${to.longitude}?q=${to.latitude},${to.longitude}(${Uri.encodeComponent(label ?? 'Destination')})');
    if (!await launchUrl(geo) && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('No maps app found')));
    }
  }
}

Future<void> callNumber(BuildContext context, String number) async {
  final ok = await launchUrl(Uri.parse('tel:${number.replaceAll(RegExp(r'[^0-9+]'), '')}'));
  if (!ok && context.mounted) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Call $number from your phone app')));
  }
}

void toast(BuildContext context, String message) =>
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message), behavior: SnackBarBehavior.floating));

/// "Fri, 16 Oct"
String shortDate(String ymd) {
  final d = DateTime.tryParse(ymd);
  if (d == null) return ymd;
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return '${days[d.weekday - 1]}, ${d.day} ${months[d.month - 1]}';
}

String dateRange(String start, String end) {
  final s = DateTime.tryParse(start), e = DateTime.tryParse(end);
  if (s == null || e == null) return '$start – $end';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  if (s.month == e.month && s.year == e.year) return '${s.day}–${e.day} ${months[s.month - 1]} ${s.year}';
  return '${s.day} ${months[s.month - 1]} – ${e.day} ${months[e.month - 1]} ${e.year}';
}

String todayYmd() {
  final n = DateTime.now();
  return '${n.year.toString().padLeft(4, '0')}-${n.month.toString().padLeft(2, '0')}-${n.day.toString().padLeft(2, '0')}';
}

/// Minutes since midnight for "HH:mm".
int? minutesOf(String hhmm) {
  final p = hhmm.split(':');
  if (p.length != 2) return null;
  final h = int.tryParse(p[0]), m = int.tryParse(p[1]);
  return h == null || m == null ? null : h * 60 + m;
}

String ago(DateTime t) {
  final d = DateTime.now().difference(t);
  if (d.inMinutes < 1) return 'just now';
  if (d.inMinutes < 60) return '${d.inMinutes} min ago';
  if (d.inHours < 24) return '${d.inHours} h ago';
  return '${d.inDays} d ago';
}
