import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';

import '../core/theme.dart';

/// The design system's semantic tones: soft fill + strong text/icon.
enum DsTone { neutral, accent, good, warn, crit }

extension DsToneColors on DsTone {
  /// (soft background, strong foreground) for this tone.
  (Color, Color) colors(DsColors c) => switch (this) {
        DsTone.neutral => (c.sunk, c.tx2),
        DsTone.accent => (c.acSoft, c.ac),
        DsTone.good => (c.goodSoft, c.good),
        DsTone.warn => (c.warnSoft, c.warn),
        DsTone.crit => (c.critSoft, c.crit),
      };
}

/// Badge / status tag (§7.4): 24 high, radius 6, 12/600, optional 14 px icon.
class Pill extends StatelessWidget {
  const Pill(this.text, {super.key, this.icon, this.tone = DsTone.neutral, this.bg, this.fg});
  final String text;
  final IconData? icon;
  final DsTone tone;

  /// Custom colours (a day's own colour); otherwise the tone's.
  final Color? bg, fg;

  @override
  Widget build(BuildContext context) {
    final (toneBg, toneFg) = tone.colors(context.ds);
    final color = fg ?? toneFg;
    return Container(
      height: 24,
      padding: const EdgeInsets.symmetric(horizontal: 8),
      decoration: BoxDecoration(color: bg ?? toneBg, borderRadius: BorderRadius.circular(Ds.rSm)),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        if (icon != null) ...[Icon(icon, size: 14, color: color), const SizedBox(width: 4)],
        Flexible(
          child: Text(
            text,
            style: TextStyle(fontSize: 12, height: 16 / 12, fontWeight: FontWeight.w600, color: color, fontFeatures: Ds.tabular),
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ]),
    );
  }
}

/// Icon tile (§7.5): a 40 (or 36) rounded-10 square in a soft tint with the icon in the strong one.
class DsIconTile extends StatelessWidget {
  const DsIconTile(this.icon, {super.key, this.tone = DsTone.accent, this.size = 40, this.bg, this.fg});
  final IconData icon;
  final DsTone tone;
  final double size;
  final Color? bg, fg;

  @override
  Widget build(BuildContext context) {
    final (toneBg, toneFg) = tone.colors(context.ds);
    return Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(color: bg ?? toneBg, borderRadius: BorderRadius.circular(Ds.rMd)),
      child: Icon(icon, size: size >= 40 ? 20 : 18, color: fg ?? toneFg),
    );
  }
}

/// The numbered square for a day, in the day's map colour (white numeral, tabular).
class DayNumberTile extends StatelessWidget {
  const DayNumberTile(this.number, {super.key, this.size = 40});
  final int number;
  final double size;

  @override
  Widget build(BuildContext context) => Container(
        width: size,
        height: size,
        alignment: Alignment.center,
        decoration: BoxDecoration(color: TrippinColors.day(number), borderRadius: BorderRadius.circular(Ds.rMd)),
        child: Text(
          '$number',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: size >= 40 ? 17 : 13, fontFeatures: Ds.tabular),
        ),
      );
}

/// A section heading over cards: 17/24 600 ink, sentence case.
class SectionTitle extends StatelessWidget {
  const SectionTitle(this.text, {super.key, this.trailing});
  final String text;
  final Widget? trailing;
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.fromLTRB(0, 24, 0, 10),
        child: Row(children: [
          Expanded(child: Text(text, style: Theme.of(context).textTheme.titleMedium)),
          ?trailing,
        ]),
      );
}

/// A callout (§7.5): radius 12, 20 px icon. `accent` is the info variant (accent tint, ink text);
/// warn / danger / success use their soft fill and strong text; neutral is the sunk notice.
class Notice extends StatelessWidget {
  const Notice({super.key, required this.text, this.icon = Icons.info_outline, this.tone = 'accent', this.action});
  final String text;
  final IconData icon;
  final String tone;
  final Widget? action;
  @override
  Widget build(BuildContext context) {
    final c = context.ds;
    final (bg, iconColor, textColor) = switch (tone) {
      'warn' => (c.warnSoft, c.warn, c.warn),
      'danger' => (c.critSoft, c.crit, c.crit),
      'success' => (c.goodSoft, c.good, c.good),
      'neutral' => (c.sunk, c.tx2, c.tx2),
      _ => (c.acSoft, c.ac, c.tx),
    };
    return Container(
      padding: EdgeInsets.fromLTRB(14, 12, action == null ? 14 : 6, 12),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(Ds.rLg)),
      child: Row(children: [
        Icon(icon, color: iconColor, size: 20),
        const SizedBox(width: 12),
        Expanded(child: Text(text, style: TextStyle(color: textColor, fontSize: 14, height: 20 / 14, fontWeight: FontWeight.w500))),
        ?action,
      ]),
    );
  }
}

/// Empty state (§7.11, full-page form): 48 icon tile, title, one sentence, one action.
class EmptyState extends StatelessWidget {
  const EmptyState({super.key, required this.icon, required this.title, required this.text, this.action});
  final IconData icon;
  final String title, text;
  final Widget? action;
  @override
  Widget build(BuildContext context) {
    final c = context.ds;
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 32),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(color: c.sunk, borderRadius: BorderRadius.circular(Ds.rLg)),
            child: Icon(icon, color: c.tx3, size: 24),
          ),
          const SizedBox(height: 12),
          Text(title, style: Theme.of(context).textTheme.titleMedium, textAlign: TextAlign.center),
          const SizedBox(height: 4),
          Text(text, style: Theme.of(context).textTheme.bodyLarge?.copyWith(color: c.tx2), textAlign: TextAlign.center),
          if (action != null) ...[const SizedBox(height: 16), action!],
        ]),
      ),
    );
  }
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
          Icon(icon, size: 18, color: context.ds.tx3),
          const SizedBox(width: 10),
          SizedBox(width: 72, child: Text(label, style: TextStyle(color: context.ds.tx3, fontSize: 13, height: 20 / 13))),
          Expanded(child: Text(value, style: TextStyle(fontSize: 14, height: 20 / 14, color: valueColor, fontWeight: FontWeight.w500))),
        ]),
      );
}

/// A secondary button in the destructive style: transparent, crit text, crit-soft border.
ButtonStyle dsDangerOutline(BuildContext context) => OutlinedButton.styleFrom(
      backgroundColor: Colors.transparent,
      foregroundColor: context.ds.crit,
      side: BorderSide(color: context.ds.critSoft),
    );

/// The final "Remove" / "Sign out" in a confirm dialog: crit fill, white text.
ButtonStyle dsDangerFilled(BuildContext context) => FilledButton.styleFrom(
      backgroundColor: context.ds.critFill,
      foregroundColor: Colors.white,
    );

/// A map control floating over tiles: surface, hairline, radius 12, a small lift.
class MapControl extends StatelessWidget {
  const MapControl({super.key, required this.icon, required this.tooltip, required this.onPressed, this.size = 48});
  final IconData icon;
  final String tooltip;
  final VoidCallback? onPressed;
  final double size;

  @override
  Widget build(BuildContext context) {
    final c = context.ds;
    return Material(
      color: c.sf,
      elevation: 2,
      shadowColor: Colors.black.withValues(alpha: 0.4),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(Ds.rLg), side: BorderSide(color: c.ln)),
      clipBehavior: Clip.antiAlias,
      child: IconButton(
        tooltip: tooltip,
        onPressed: onPressed,
        icon: Icon(icon, size: 22),
        color: c.tx,
        disabledColor: c.ln2,
        constraints: BoxConstraints.tightFor(width: size, height: size),
        style: IconButton.styleFrom(shape: const RoundedRectangleBorder()),
      ),
    );
  }
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

/// The inverse toast (§7.12): ink fill, paper text, radius 12, floating.
void toast(BuildContext context, String message) =>
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message), behavior: SnackBarBehavior.floating));

/// "Fri 16 Oct" (the suite's day format, §4.3).
String shortDate(String ymd) {
  final d = DateTime.tryParse(ymd);
  if (d == null) return ymd;
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return '${days[d.weekday - 1]} ${d.day} ${months[d.month - 1]}';
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

/// The Trippin' mark, built like every mark in the suite (design system 7.16 and 10): a 28-unit
/// square, radius 8, in the app accent, with a 2.2-stroke round-cap glyph in `acTx`. Trippin's
/// glyph is a route line ending in a pin. Same drawing as the web app's `BrandMark`.
class BrandMark extends StatelessWidget {
  const BrandMark({super.key, this.size = 28});
  final double size;

  @override
  Widget build(BuildContext context) {
    final c = context.ds;
    return Semantics(
      excludeSemantics: true,
      child: CustomPaint(size: Size.square(size), painter: _BrandMarkPainter(c.ac, c.acTx)),
    );
  }
}

class _BrandMarkPainter extends CustomPainter {
  const _BrandMarkPainter(this.fill, this.ink);
  final Color fill, ink;

  @override
  void paint(Canvas canvas, Size size) {
    canvas.scale(size.width / 28, size.height / 28);
    canvas.drawRRect(RRect.fromRectAndRadius(const Rect.fromLTWH(0, 0, 28, 28), const Radius.circular(8)), Paint()..color = fill);
    final stroke = Paint()
      ..color = ink
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.2
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;
    // The route, from bottom-left up towards the pin.
    final route = ui.Path()
      ..moveTo(6.5, 21.5)
      ..cubicTo(9.1, 21.5, 9.9, 19.9, 11.5, 18.1)
      ..cubicTo(12.9, 16.5, 14.1, 15.7, 16.1, 15.7);
    canvas.drawPath(route, stroke);
    // The pin.
    final pin = ui.Path()
      ..moveTo(19.5, 15.6)
      ..cubicTo(17.4, 13.4, 16.3, 11.6, 16.3, 10.0)
      ..arcToPoint(const Offset(22.7, 10.0), radius: const Radius.circular(3.2))
      ..cubicTo(22.7, 11.6, 21.6, 13.4, 19.5, 15.6)
      ..close();
    canvas.drawPath(pin, stroke);
    canvas.drawCircle(const Offset(19.5, 10), 1.1, Paint()..color = ink);
  }

  @override
  bool shouldRepaint(_BrandMarkPainter old) => old.fill != fill || old.ink != ink;
}

String ago(DateTime t) {
  final d = DateTime.now().difference(t);
  if (d.inMinutes < 1) return 'just now';
  if (d.inMinutes < 60) return '${d.inMinutes} min ago';
  if (d.inHours < 24) return '${d.inHours} h ago';
  return '${d.inDays} d ago';
}
