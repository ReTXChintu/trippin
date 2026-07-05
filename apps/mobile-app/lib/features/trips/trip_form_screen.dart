import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:itinerary_planner/core/constants/app_constants.dart';
import 'package:itinerary_planner/features/trips/models/trip_models.dart';
import 'package:itinerary_planner/features/trips/trips_repository.dart';

class TripFormScreen extends ConsumerStatefulWidget {
  const TripFormScreen({super.key, this.tripId});

  final String? tripId;

  bool get isEdit => tripId != null && tripId!.isNotEmpty;

  @override
  ConsumerState<TripFormScreen> createState() => _TripFormScreenState();
}

class _TripFormScreenState extends ConsumerState<TripFormScreen> {
  final _title = TextEditingController();
  final _city = TextEditingController();
  final _state = TextEditingController();
  final _country = TextEditingController(text: 'India');
  final _notes = TextEditingController();
  final _hotelName = TextEditingController();
  final _hotelAddress = TextEditingController();
  final _mustVisitInput = TextEditingController();
  final _excludedInput = TextEditingController();
  final _dailyStart = TextEditingController(text: '09:00');
  final _dailyEnd = TextEditingController(text: '20:00');
  final _arrivalTime = TextEditingController();
  final _departureTime = TextEditingController();

  DateTime _start = DateTime.now().add(const Duration(days: 7));
  DateTime _end = DateTime.now().add(const Duration(days: 10));
  String _travelStyle = 'Balanced';
  String _transport = 'Walking';
  String? _budget;
  final _interests = <String>{};
  final _mustVisit = <String>[];
  final _excluded = <String>[];
  bool _flexibleSchedule = false;
  bool _multiLeg = false;
  final _legs = <_LegFormData>[];
  bool _loading = false;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    if (widget.isEdit) _loadTrip();
  }

  Future<void> _loadTrip() async {
    setState(() => _loading = true);
    try {
      final trip = await ref.read(tripsRepositoryProvider).getTrip(widget.tripId!);
      _populateFromTrip(trip);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _populateFromTrip(Trip trip) {
    _title.text = trip.title;
    _city.text = trip.destinationCity;
    _state.text = trip.destinationState ?? '';
    _country.text = trip.destinationCountry;
    _notes.text = trip.notes ?? '';
    _hotelName.text = trip.hotelName ?? '';
    _hotelAddress.text = trip.hotelAddress ?? '';
    _dailyStart.text = trip.dailyStartTime;
    _dailyEnd.text = trip.dailyEndTime;
    _arrivalTime.text = trip.arrivalTime ?? '';
    _departureTime.text = trip.departureTime ?? '';
    _start = DateTime.tryParse(trip.startDate.split('T').first) ?? _start;
    _end = DateTime.tryParse(trip.endDate.split('T').first) ?? _end;
    _travelStyle = trip.travelStyle;
    _transport = trip.transportationMode;
    _budget = trip.budgetLevel;
    _flexibleSchedule = trip.useFlexibleSchedule;
    _interests.addAll(trip.interests);
    _mustVisit.addAll(trip.mustVisitPlaces);
    _excluded.addAll(trip.excludedPlaces);
    _multiLeg = trip.isMultiLeg;
    _legs.clear();
    for (final leg in trip.legs) {
      _legs.add(_LegFormData.fromLeg(leg));
    }
  }

  Trip _buildTrip() {
    return Trip(
      id: widget.tripId ?? '',
      title: _title.text.trim(),
      destinationCity: _city.text.trim(),
      destinationState: _state.text.trim().isEmpty ? null : _state.text.trim(),
      destinationCountry: _country.text.trim(),
      startDate: _start.toIso8601String().split('T').first,
      endDate: _end.toIso8601String().split('T').first,
      arrivalTime: _arrivalTime.text.trim().isEmpty ? null : _arrivalTime.text.trim(),
      departureTime: _departureTime.text.trim().isEmpty ? null : _departureTime.text.trim(),
      travelStyle: _travelStyle,
      transportationMode: _transport,
      budgetLevel: _budget,
      dailyStartTime: _dailyStart.text.trim(),
      dailyEndTime: _dailyEnd.text.trim(),
      useFlexibleSchedule: _flexibleSchedule,
      interests: _interests.toList(),
      mustVisitPlaces: List.from(_mustVisit),
      excludedPlaces: List.from(_excluded),
      notes: _notes.text.trim().isEmpty ? null : _notes.text.trim(),
      hotelName: _hotelName.text.trim().isEmpty ? null : _hotelName.text.trim(),
      hotelAddress: _hotelAddress.text.trim().isEmpty ? null : _hotelAddress.text.trim(),
      legs: _multiLeg ? _legs.asMap().entries.map((e) => e.value.toLeg(e.key)).toList() : [],
    );
  }

  Future<void> _save() async {
    if (_title.text.trim().isEmpty || _city.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Title and city are required')));
      return;
    }
    setState(() => _saving = true);
    try {
      final repo = ref.read(tripsRepositoryProvider);
      final body = _buildTrip().toJson();
      if (widget.isEdit) {
        await repo.updateTrip(widget.tripId!, body);
        if (mounted) context.go('/trips/${widget.tripId}');
      } else {
        final created = await repo.createTrip(body);
        if (mounted) context.go('/trips/${created.id}');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _pickDate(bool isStart) async {
    final picked = await showDatePicker(
      context: context,
      firstDate: DateTime.now().subtract(const Duration(days: 365)),
      lastDate: DateTime.now().add(const Duration(days: 730)),
      initialDate: isStart ? _start : _end,
    );
    if (picked != null) {
      setState(() {
        if (isStart) {
          _start = picked;
          if (_end.isBefore(_start)) _end = _start;
        } else {
          _end = picked;
        }
      });
    }
  }

  void _addTag(List<String> list, TextEditingController input) {
    final v = input.text.trim();
    if (v.isEmpty) return;
    setState(() {
      list.add(v);
      input.clear();
    });
  }

  void _addLeg() {
    setState(() {
      _legs.add(_LegFormData(
        name: 'Leg ${_legs.length + 1}',
        baseCity: _city.text.trim(),
        country: _country.text.trim(),
        start: _start,
        end: _end,
      ));
    });
  }

  @override
  void dispose() {
    _title.dispose();
    _city.dispose();
    _state.dispose();
    _country.dispose();
    _notes.dispose();
    _hotelName.dispose();
    _hotelAddress.dispose();
    _mustVisitInput.dispose();
    _excludedInput.dispose();
    _dailyStart.dispose();
    _dailyEnd.dispose();
    _arrivalTime.dispose();
    _departureTime.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Scaffold(
        appBar: AppBar(title: Text(widget.isEdit ? 'Edit trip' : 'New trip')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      appBar: AppBar(title: Text(widget.isEdit ? 'Edit trip' : 'New trip')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          TextField(controller: _title, decoration: const InputDecoration(labelText: 'Title *')),
          TextField(controller: _city, decoration: const InputDecoration(labelText: 'City *')),
          TextField(controller: _state, decoration: const InputDecoration(labelText: 'State / region')),
          TextField(controller: _country, decoration: const InputDecoration(labelText: 'Country *')),
          ListTile(
            title: const Text('Start date'),
            subtitle: Text(_start.toString().split(' ').first),
            trailing: const Icon(Icons.calendar_today),
            onTap: () => _pickDate(true),
          ),
          ListTile(
            title: const Text('End date'),
            subtitle: Text(_end.toString().split(' ').first),
            trailing: const Icon(Icons.calendar_today),
            onTap: () => _pickDate(false),
          ),
          TextField(controller: _arrivalTime, decoration: const InputDecoration(labelText: 'Arrival time (HH:mm)')),
          TextField(controller: _departureTime, decoration: const InputDecoration(labelText: 'Departure time (HH:mm)')),
          const SizedBox(height: 8),
          DropdownButtonFormField<String>(
            value: _travelStyle,
            decoration: const InputDecoration(labelText: 'Travel style'),
            items: AppConstants.travelStyles.map((s) => DropdownMenuItem(value: s, child: Text(s))).toList(),
            onChanged: (v) => setState(() => _travelStyle = v ?? _travelStyle),
          ),
          DropdownButtonFormField<String>(
            value: _transport,
            decoration: const InputDecoration(labelText: 'Transport'),
            items: AppConstants.transportModes.map((s) => DropdownMenuItem(value: s, child: Text(s))).toList(),
            onChanged: (v) => setState(() => _transport = v ?? _transport),
          ),
          DropdownButtonFormField<String?>(
            value: _budget,
            decoration: const InputDecoration(labelText: 'Budget'),
            items: [
              const DropdownMenuItem(value: null, child: Text('Not set')),
              ...AppConstants.budgetLevels.map((b) => DropdownMenuItem(value: b, child: Text(b))),
            ],
            onChanged: (v) => setState(() => _budget = v),
          ),
          const SizedBox(height: 8),
          Text('Interests', style: Theme.of(context).textTheme.titleSmall),
          Wrap(
            spacing: 6,
            runSpacing: 0,
            children: AppConstants.interests.map((i) {
              final selected = _interests.contains(i);
              return FilterChip(
                label: Text(i),
                selected: selected,
                onSelected: (v) => setState(() {
                  if (v) {
                    _interests.add(i);
                  } else {
                    _interests.remove(i);
                  }
                }),
              );
            }).toList(),
          ),
          const SizedBox(height: 8),
          _TagInputSection(
            label: 'Must-visit places',
            tags: _mustVisit,
            controller: _mustVisitInput,
            onAdd: () => _addTag(_mustVisit, _mustVisitInput),
            onRemove: (t) => setState(() => _mustVisit.remove(t)),
          ),
          _TagInputSection(
            label: 'Excluded places',
            tags: _excluded,
            controller: _excludedInput,
            onAdd: () => _addTag(_excluded, _excludedInput),
            onRemove: (t) => setState(() => _excluded.remove(t)),
          ),
          TextField(controller: _notes, maxLines: 3, decoration: const InputDecoration(labelText: 'Notes')),
          SwitchListTile(
            title: const Text('Flexible schedule'),
            value: _flexibleSchedule,
            onChanged: (v) => setState(() => _flexibleSchedule = v),
          ),
          TextField(controller: _dailyStart, decoration: const InputDecoration(labelText: 'Daily start time')),
          TextField(controller: _dailyEnd, decoration: const InputDecoration(labelText: 'Daily end time')),
          TextField(controller: _hotelName, decoration: const InputDecoration(labelText: 'Hotel name')),
          TextField(controller: _hotelAddress, decoration: const InputDecoration(labelText: 'Hotel address')),
          SwitchListTile(
            title: const Text('Multi-leg trip'),
            subtitle: const Text('Visit multiple cities with separate legs'),
            value: _multiLeg,
            onChanged: (v) => setState(() {
              _multiLeg = v;
              if (v && _legs.isEmpty) _addLeg();
            }),
          ),
          if (_multiLeg) ...[
            ..._legs.asMap().entries.map((e) => _LegEditor(
                  data: e.value,
                  index: e.key,
                  onChanged: () => setState(() {}),
                  onRemove: _legs.length > 1
                      ? () => setState(() => _legs.removeAt(e.key))
                      : null,
                )),
            OutlinedButton.icon(
              onPressed: _addLeg,
              icon: const Icon(Icons.add),
              label: const Text('Add leg'),
            ),
          ],
          const SizedBox(height: 24),
          FilledButton(
            onPressed: _saving ? null : _save,
            child: _saving
                ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
                : Text(widget.isEdit ? 'Save changes' : 'Create trip'),
          ),
        ],
      ),
    );
  }
}

class _TagInputSection extends StatelessWidget {
  const _TagInputSection({
    required this.label,
    required this.tags,
    required this.controller,
    required this.onAdd,
    required this.onRemove,
  });

  final String label;
  final List<String> tags;
  final TextEditingController controller;
  final VoidCallback onAdd;
  final ValueChanged<String> onRemove;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: Theme.of(context).textTheme.titleSmall),
        Row(
          children: [
            Expanded(
              child: TextField(
                controller: controller,
                decoration: InputDecoration(hintText: 'Add $label'),
                onSubmitted: (_) => onAdd(),
              ),
            ),
            IconButton(onPressed: onAdd, icon: const Icon(Icons.add)),
          ],
        ),
        Wrap(
          spacing: 6,
          children: tags.map((t) => InputChip(label: Text(t), onDeleted: () => onRemove(t))).toList(),
        ),
        const SizedBox(height: 8),
      ],
    );
  }
}

class _LegFormData {
  _LegFormData({
    required this.name,
    required this.baseCity,
    required this.country,
    required this.start,
    required this.end,
    this.state,
    this.id,
    this.arrivalTime,
    this.departureTime,
    this.hotelName,
    this.hotelAddress,
    List<String>? dayTripAreas,
  }) : dayTripAreas = dayTripAreas ?? [];

  String? id;
  String name;
  String baseCity;
  String country;
  String? state;
  DateTime start;
  DateTime end;
  String? arrivalTime;
  String? departureTime;
  String? hotelName;
  String? hotelAddress;
  List<String> dayTripAreas;

  factory _LegFormData.fromLeg(TripLeg leg) => _LegFormData(
        id: leg.id,
        name: leg.name,
        baseCity: leg.baseCity,
        country: leg.country,
        state: leg.state,
        start: DateTime.tryParse(leg.startDate.split('T').first) ?? DateTime.now(),
        end: DateTime.tryParse(leg.endDate.split('T').first) ?? DateTime.now(),
        arrivalTime: leg.arrivalTime,
        departureTime: leg.departureTime,
        hotelName: leg.hotelName,
        hotelAddress: leg.hotelAddress,
        dayTripAreas: List.from(leg.dayTripAreas),
      );

  TripLeg toLeg(int order) => TripLeg(
        id: id ?? '',
        name: name,
        baseCity: baseCity,
        country: country,
        state: state,
        startDate: start.toIso8601String().split('T').first,
        endDate: end.toIso8601String().split('T').first,
        arrivalTime: arrivalTime,
        departureTime: departureTime,
        dayTripAreas: dayTripAreas,
        hotelName: hotelName,
        hotelAddress: hotelAddress,
        order: order,
      );
}

class _LegEditor extends StatefulWidget {
  const _LegEditor({
    required this.data,
    required this.index,
    required this.onChanged,
    this.onRemove,
  });

  final _LegFormData data;
  final int index;
  final VoidCallback onChanged;
  final VoidCallback? onRemove;

  @override
  State<_LegEditor> createState() => _LegEditorState();
}

class _LegEditorState extends State<_LegEditor> {
  late TextEditingController _nameCtrl;
  late TextEditingController _cityCtrl;
  late TextEditingController _stateCtrl;

  @override
  void initState() {
    super.initState();
    _nameCtrl = TextEditingController(text: widget.data.name);
    _cityCtrl = TextEditingController(text: widget.data.baseCity);
    _stateCtrl = TextEditingController(text: widget.data.state ?? '');
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _cityCtrl.dispose();
    _stateCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickDate(bool isStart) async {
    final picked = await showDatePicker(
      context: context,
      firstDate: DateTime.now().subtract(const Duration(days: 365)),
      lastDate: DateTime.now().add(const Duration(days: 730)),
      initialDate: isStart ? widget.data.start : widget.data.end,
    );
    if (picked != null) {
      if (isStart) {
        widget.data.start = picked;
      } else {
        widget.data.end = picked;
      }
      widget.onChanged();
    }
  }

  @override
  Widget build(BuildContext context) {
    final d = widget.data;
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(child: Text('Leg ${widget.index + 1}', style: Theme.of(context).textTheme.titleSmall)),
                if (widget.onRemove != null)
                  IconButton(icon: const Icon(Icons.delete_outline), onPressed: widget.onRemove),
              ],
            ),
            TextField(
              decoration: const InputDecoration(labelText: 'Leg name'),
              controller: _nameCtrl,
              onChanged: (v) {
                widget.data.name = v;
                widget.onChanged();
              },
            ),
            TextField(
              decoration: const InputDecoration(labelText: 'Base city'),
              controller: _cityCtrl,
              onChanged: (v) {
                widget.data.baseCity = v;
                widget.onChanged();
              },
            ),
            TextField(
              decoration: const InputDecoration(labelText: 'State'),
              controller: _stateCtrl,
              onChanged: (v) {
                widget.data.state = v.isEmpty ? null : v;
                widget.onChanged();
              },
            ),
            ListTile(
              dense: true,
              title: const Text('Start'),
              subtitle: Text(d.start.toString().split(' ').first),
              onTap: () => _pickDate(true),
            ),
            ListTile(
              dense: true,
              title: const Text('End'),
              subtitle: Text(d.end.toString().split(' ').first),
              onTap: () => _pickDate(false),
            ),
            Wrap(
              spacing: 6,
              children: [
                ...d.dayTripAreas.map(
                  (a) => InputChip(
                    label: Text(a),
                    onDeleted: () {
                      d.dayTripAreas.remove(a);
                      widget.onChanged();
                      setState(() {});
                    },
                  ),
                ),
                ActionChip(
                  label: const Text('+ day trip area'),
                  onPressed: () async {
                    final area = await showDialog<String>(
                      context: context,
                      builder: (ctx) {
                        final c = TextEditingController();
                        return AlertDialog(
                          title: const Text('Day trip area'),
                          content: TextField(controller: c, decoration: const InputDecoration(hintText: 'Area name')),
                          actions: [
                            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
                            FilledButton(onPressed: () => Navigator.pop(ctx, c.text.trim()), child: const Text('Add')),
                          ],
                        );
                      },
                    );
                    if (area != null && area.isNotEmpty) {
                      d.dayTripAreas.add(area);
                      widget.onChanged();
                      setState(() {});
                    }
                  },
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
