import 'package:flutter/material.dart';

import '../../core/theme.dart';
import '../../data/suite_models.dart';
import '../../shared/widgets.dart';

/// What the owner chose when switching SpendLog or InFrame on: one of their existing groups/events
/// there ([attachTo]), or a new one (null).
class LinkChoice {
  const LinkChoice(this.attachTo);
  final String? attachTo;
}

/// "Link to SpendLog": the owner's existing groups (or InFrame events) this trip could use instead
/// of a new one, each with what linking it would change, and "Create a new …". Returns null when
/// dismissed.
Future<LinkChoice?> showLinkPicker(
  BuildContext context, {
  required String app,
  required String appName,
  required List<LinkCandidate> candidates,
  bool couldNotCheck = false,
}) {
  return showModalBottomSheet<LinkChoice>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    showDragHandle: true,
    builder: (_) => LinkPickerSheet(app: app, appName: appName, candidates: candidates, couldNotCheck: couldNotCheck),
  );
}

class LinkPickerSheet extends StatefulWidget {
  const LinkPickerSheet({super.key, required this.app, required this.appName, required this.candidates, this.couldNotCheck = false});
  final String app, appName;
  final List<LinkCandidate> candidates;
  final bool couldNotCheck;

  @override
  State<LinkPickerSheet> createState() => _LinkPickerSheetState();
}

class _LinkPickerSheetState extends State<LinkPickerSheet> {
  /// The candidate's id, or '' for "Create a new …".
  late String _choice = widget.candidates.where((c) => c.linkedHere).firstOrNull?.id ?? '';

  String get _thing => widget.app == 'spendlog' ? 'group' : 'event';

  @override
  Widget build(BuildContext context) {
    final c = context.ds;
    final chosen = widget.candidates.where((x) => x.id == _choice).firstOrNull;
    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: widget.candidates.length > 2 ? 0.75 : 0.55,
      minChildSize: 0.35,
      maxChildSize: 0.95,
      builder: (context, scroll) => Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Expanded(
          child: ListView(controller: scroll, padding: const EdgeInsets.fromLTRB(16, 0, 16, 16), children: [
            Text('Link to ${widget.appName}', style: TextStyle(color: c.tx, fontSize: 20, height: 28 / 20, fontWeight: FontWeight.w600)),
            const SizedBox(height: 4),
            Text(
              widget.candidates.isEmpty
                  ? 'This trip gets a new ${widget.appName} $_thing.'
                  : 'Use one of your ${widget.appName} ${_thing}s for this trip, or start a new one. A $_thing you pick takes this trip’s name and dates.',
              style: TextStyle(color: c.tx2, fontSize: 14, height: 20 / 14),
            ),
            if (widget.couldNotCheck) ...[
              const SizedBox(height: 12),
              Notice(
                tone: 'warn',
                icon: Icons.cloud_off_outlined,
                text: 'Couldn’t check ${widget.appName} for your existing ${_thing}s, so only a new one can be made right now.',
              ),
            ],
            const SizedBox(height: 12),
            for (final candidate in widget.candidates) ...[
              _Option(
                key: ValueKey('candidate-${candidate.id}'),
                selected: _choice == candidate.id,
                onTap: () => setState(() => _choice = candidate.id),
                title: candidate.name,
                lines: [
                  ?candidate.dates,
                  candidate.countsLine(widget.app),
                ],
                pills: [
                  if (candidate.linkedHere) const Pill('Linked to this trip before', tone: DsTone.accent),
                  if (candidate.archived) const Pill('Archived'),
                ],
              ),
              const SizedBox(height: 8),
            ],
            _Option(
              key: const ValueKey('candidate-new'),
              selected: _choice.isEmpty,
              onTap: () => setState(() => _choice = ''),
              title: 'Create a new $_thing',
              lines: ['Named and dated like this trip, with everyone on it.'],
              icon: Icons.add_circle_outline,
            ),
            if (chosen?.impactLine != null) ...[
              const SizedBox(height: 12),
              Notice(icon: Icons.swap_vert, tone: (chosen!.leaving ?? 0) > 0 ? 'warn' : 'accent', text: chosen.impactLine!),
            ],
          ]),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
          child: Row(children: [
            Expanded(child: OutlinedButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel'))),
            const SizedBox(width: 12),
            Expanded(
              child: FilledButton(
                key: const ValueKey('link-confirm'),
                onPressed: () => Navigator.pop(context, LinkChoice(_choice.isEmpty ? null : _choice)),
                child: Text(_choice.isEmpty ? 'Create and link' : 'Link this $_thing'),
              ),
            ),
          ]),
        ),
      ]),
    );
  }
}

class _Option extends StatelessWidget {
  const _Option({super.key, required this.selected, required this.onTap, required this.title, this.lines = const [], this.pills = const [], this.icon});
  final bool selected;
  final VoidCallback onTap;
  final String title;
  final List<String> lines;
  final List<Widget> pills;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final c = context.ds;
    return Material(
      color: selected ? c.acSoft : c.sf,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(Ds.rLg),
        side: BorderSide(color: selected ? c.ac : c.ln, width: selected ? 1.5 : 1),
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(12, 12, 14, 12),
          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Icon(selected ? Icons.radio_button_checked : (icon ?? Icons.radio_button_unchecked), color: selected ? c.ac : c.tx3, size: 22),
            const SizedBox(width: 12),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(title, style: TextStyle(color: c.tx, fontSize: 15, height: 20 / 15, fontWeight: FontWeight.w600)),
                for (final line in lines) ...[
                  const SizedBox(height: 2),
                  Text(line, style: TextStyle(color: c.tx2, fontSize: 13, height: 18 / 13, fontFeatures: Ds.tabular)),
                ],
                if (pills.isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Wrap(spacing: 6, runSpacing: 6, children: pills),
                ],
              ]),
            ),
          ]),
        ),
      ),
    );
  }
}
