import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:itinerary_planner/main.dart';

void main() {
  testWidgets('App loads', (tester) async {
    await tester.pumpWidget(const ProviderScope(child: ItineraryPlannerApp()));
    expect(find.text('Sign in'), findsWidgets);
  });
}
