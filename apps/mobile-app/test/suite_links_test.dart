// Opening SpendLog/InFrame pages in those apps, and the router's handling of links into Trippin.
import 'package:flutter_test/flutter_test.dart';
import 'package:itinerary_planner/core/push_service.dart';
import 'package:itinerary_planner/core/suite_links.dart';
import 'package:itinerary_planner/router.dart';
import 'package:url_launcher/url_launcher.dart';

void main() {
  group('siblingAppLink', () {
    test('SpendLog group pages, including the older /trips?trip= links', () {
      for (final url in [
        'https://spend-log.duckdns.org:50002/groups?group=g1',
        'https://spend-log.duckdns.org/groups/g1',
        'https://spend-log.duckdns.org:50002/trips?trip=g1',
      ]) {
        expect(siblingAppLink(url).toString(), 'spendlog://app/groups/g1', reason: url);
      }
    });

    test('InFrame event pages', () {
      expect(siblingAppLink('https://in-frame.duckdns.org:50010/events/e-1').toString(), 'inframe://app/events/e-1');
      expect(siblingAppLink('https://in-frame.duckdns.org/events/e-1/upload').toString(), 'inframe://app/events/e-1');
    });

    test('anything else stays a web page', () {
      for (final url in [
        'https://spend-log.duckdns.org/',
        'https://spend-log.duckdns.org/SpendLog.apk',
        'https://spend-log.duckdns.org/groups',
        'https://in-frame.duckdns.org/events/new',
        'mailto:x@example.com',
        'not a url',
      ]) {
        expect(siblingAppLink(url), isNull, reason: url);
      }
    });
  });

  group('openSuiteUrl', () {
    test('the app first; the web page only when the app can’t take it', () async {
      final tried = <(String, LaunchMode)>[];
      Future<bool> notInstalled(Uri uri, LaunchMode mode) async {
        tried.add((uri.toString(), mode));
        if (uri.scheme == 'spendlog') throw Exception('ACTIVITY_NOT_FOUND');
        return true;
      }

      expect(await openSuiteUrl('https://spend-log.duckdns.org:50002/groups?group=g1', launcher: notInstalled), isTrue);
      expect(tried, [
        ('spendlog://app/groups/g1', LaunchMode.externalNonBrowserApplication),
        ('https://spend-log.duckdns.org:50002/groups?group=g1', LaunchMode.externalApplication),
      ]);

      tried.clear();
      Future<bool> installed(Uri uri, LaunchMode mode) async {
        tried.add((uri.toString(), mode));
        return true;
      }

      expect(await openSuiteUrl('https://in-frame.duckdns.org/events/e-1', launcher: installed), isTrue);
      expect(tried.map((t) => t.$1), ['inframe://app/events/e-1'], reason: 'the app took it: no browser');

      tried.clear();
      expect(await openSuiteUrl('https://spend-log.duckdns.org/SpendLog.apk', launcher: installed), isTrue);
      expect(tried, [('https://spend-log.duckdns.org/SpendLog.apk', LaunchMode.externalApplication)]);

      Future<bool> nothing(Uri uri, LaunchMode mode) async => false;
      expect(await openSuiteUrl('https://in-frame.duckdns.org/events/e-1', launcher: nothing), isFalse);
    });
  });

  group('links into Trippin', () {
    test("the website's /trips/:id is the trip screen", () {
      expect(tripLinkRedirect('t1'), '/trip/t1');
      expect(tripLinkRedirect('new'), '/');
    });

    test('a link opened while signed out is kept for after sign-in, and only ever an app path', () {
      expect(loginRedirect(Uri.parse('/')), '/login');
      final login = loginRedirect(Uri.parse('/trip/t1/day/2'));
      expect(login, '/login?from=%2Ftrip%2Ft1%2Fday%2F2');
      expect(afterLogin(Uri.parse(login)), '/trip/t1/day/2');
      expect(afterLogin(Uri.parse('/login')), '/');
      expect(afterLogin(Uri.parse('/login?from=https%3A%2F%2Fevil.example')), '/');
      expect(afterLogin(Uri.parse('/login?from=%2F%2Fevil.example')), '/');
      expect(afterLogin(Uri.parse('/login?from=%2Flogin')), '/');
    });
  });

  group('notification taps', () {
    test('open the link the server sent, else the trip, else nothing', () {
      expect(pushLink({'type': 'trip_changed', 'tripId': 't1', 'link': '/trip/t1'}), '/trip/t1');
      expect(pushLink({'type': 'trip_comment', 'tripId': 't 2'}), '/trip/t%202');
      expect(pushLink({'type': 'x'}), isNull);
      expect(pushLink({'link': 'https://evil.example/trip/1'}), isNull);
      expect(pushLink({'link': '//evil.example'}), isNull);
    });
  });
}
