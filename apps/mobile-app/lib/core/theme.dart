import 'package:flutter/material.dart';

/// The suite's shared design tokens (SpendLog, Trippin, InFrame) — `docs/design-system.md` §9.4.
/// Field names mirror the CSS variables so the design and the code read the same. One instance
/// per brightness; each app overrides only its accent quad (and chart slot c1, which equals it).
@immutable
class DsColors extends ThemeExtension<DsColors> {
  const DsColors({
    required this.canvas, required this.bg, required this.sf, required this.sf2, required this.sunk,
    required this.ln, required this.ln2,
    required this.tx, required this.tx2, required this.tx3,
    required this.ac, required this.acTx, required this.acSoft, required this.acLine,
    required this.good, required this.goodSoft,
    required this.warn, required this.warnFill, required this.warnSoft,
    required this.crit, required this.critFill, required this.critSoft,
    required this.hatch, required this.scrim, required this.chart,
  });

  final Color canvas, bg, sf, sf2, sunk, ln, ln2, tx, tx2, tx3;
  final Color ac, acTx, acSoft, acLine;
  final Color good, goodSoft, warn, warnFill, warnSoft, crit, critFill, critSoft, hatch, scrim;

  /// c1..c5, other.
  final List<Color> chart;

  Color get moneyOut => tx;
  Color get moneyIn => good;
  Color get moneyNeutral => tx3;

  /// The shared base (SpendLog's cobalt accent, as exported).
  static const light = DsColors(
    canvas: Color(0xFFE4E1D8), bg: Color(0xFFF4F2EC), sf: Color(0xFFFFFFFF), sf2: Color(0xFFFAF9F5), sunk: Color(0xFFECE9E1),
    ln: Color(0xFFE2DED4), ln2: Color(0xFFC7C2B5),
    tx: Color(0xFF18191D), tx2: Color(0xFF4C4D53), tx3: Color(0xFF67686E),
    ac: Color(0xFF2C4FCB), acTx: Color(0xFFFFFFFF), acSoft: Color(0xFFE6EBFB), acLine: Color(0xFFB9C6F2),
    good: Color(0xFF15724A), goodSoft: Color(0xFFE1F0E6),
    warn: Color(0xFF8F5200), warnFill: Color(0xFFE39A2E), warnSoft: Color(0xFFFBEED6),
    crit: Color(0xFFB3302A), critFill: Color(0xFFD9473E), critSoft: Color(0xFFFBE5E2),
    hatch: Color(0xFFC7C2B5), scrim: Color(0x6B18191D), // rgba(24,25,29,.42)
    chart: [Color(0xFF2C4FCB), Color(0xFFC7792B), Color(0xFF2F8A7A), Color(0xFFB04A6F), Color(0xFF6A7A2F), Color(0xFF8A8780)],
  );

  static const dark = DsColors(
    canvas: Color(0xFF08090A), bg: Color(0xFF111214), sf: Color(0xFF1A1B1E), sf2: Color(0xFF202125), sunk: Color(0xFF0C0D0F),
    ln: Color(0xFF2B2D32), ln2: Color(0xFF3D3F46),
    tx: Color(0xFFEDEBE6), tx2: Color(0xFFBEBCB6), tx3: Color(0xFF9A9893),
    ac: Color(0xFF93A8FF), acTx: Color(0xFF0D1430), acSoft: Color(0xFF1D2544), acLine: Color(0xFF34407A),
    good: Color(0xFF56C892), goodSoft: Color(0xFF12291D),
    warn: Color(0xFFF2B661), warnFill: Color(0xFFE9A240), warnSoft: Color(0xFF2E2312),
    crit: Color(0xFFFF8C80), critFill: Color(0xFFE45B50), critSoft: Color(0xFF341A19),
    hatch: Color(0xFF4A4C53), scrim: Color(0x99000000), // rgba(0,0,0,.6)
    chart: [Color(0xFF93A8FF), Color(0xFFC7792B), Color(0xFF2F8A7A), Color(0xFFB04A6F), Color(0xFF6A7A2F), Color(0xFF8A8780)],
  );

  /// Trippin: ocean (§10). The ocean accent sits near the teal chart slot c3, so Trippin's c3 is
  /// cobalt — `#2C4FCB` in light, and the readable dark cobalt `#93A8FF` in dark (`#2C4FCB` is
  /// only 2.5:1 on the dark surface, the same reason the spec lifts SpendLog's dark c1).
  static final trippinLight = light
      .withAccent(ac: const Color(0xFF0A6E86), acTx: const Color(0xFFFFFFFF), acSoft: const Color(0xFFE0F1F5), acLine: const Color(0xFFA9D6E1))
      .withChartSlot(2, const Color(0xFF2C4FCB));
  static final trippinDark = dark
      .withAccent(ac: const Color(0xFF6CCBE3), acTx: const Color(0xFF062029), acSoft: const Color(0xFF10282F), acLine: const Color(0xFF1F4E5A))
      .withChartSlot(2, const Color(0xFF93A8FF));

  /// Per-app accent override (see §10).
  DsColors withAccent({required Color ac, required Color acTx, required Color acSoft, required Color acLine}) =>
      copyWith(ac: ac, acTx: acTx, acSoft: acSoft, acLine: acLine, chart: [ac, ...chart.skip(1)]);

  DsColors withChartSlot(int i, Color c) => copyWith(chart: [for (var j = 0; j < chart.length; j++) j == i ? c : chart[j]]);

  @override
  DsColors copyWith({Color? ac, Color? acTx, Color? acSoft, Color? acLine, List<Color>? chart}) => DsColors(
        canvas: canvas, bg: bg, sf: sf, sf2: sf2, sunk: sunk, ln: ln, ln2: ln2, tx: tx, tx2: tx2, tx3: tx3,
        ac: ac ?? this.ac, acTx: acTx ?? this.acTx, acSoft: acSoft ?? this.acSoft, acLine: acLine ?? this.acLine,
        good: good, goodSoft: goodSoft, warn: warn, warnFill: warnFill, warnSoft: warnSoft,
        crit: crit, critFill: critFill, critSoft: critSoft, hatch: hatch, scrim: scrim, chart: chart ?? this.chart,
      );

  @override
  DsColors lerp(ThemeExtension<DsColors>? other, double t) {
    if (other is! DsColors) return this;
    Color l(Color a, Color b) => Color.lerp(a, b, t)!;
    return DsColors(
      canvas: l(canvas, other.canvas), bg: l(bg, other.bg), sf: l(sf, other.sf), sf2: l(sf2, other.sf2), sunk: l(sunk, other.sunk),
      ln: l(ln, other.ln), ln2: l(ln2, other.ln2), tx: l(tx, other.tx), tx2: l(tx2, other.tx2), tx3: l(tx3, other.tx3),
      ac: l(ac, other.ac), acTx: l(acTx, other.acTx), acSoft: l(acSoft, other.acSoft), acLine: l(acLine, other.acLine),
      good: l(good, other.good), goodSoft: l(goodSoft, other.goodSoft),
      warn: l(warn, other.warn), warnFill: l(warnFill, other.warnFill), warnSoft: l(warnSoft, other.warnSoft),
      crit: l(crit, other.crit), critFill: l(critFill, other.critFill), critSoft: l(critSoft, other.critSoft),
      hatch: l(hatch, other.hatch), scrim: l(scrim, other.scrim),
      chart: [for (var i = 0; i < chart.length; i++) l(chart[i], other.chart[i])],
    );
  }
}

/// Spacing, radii, durations.
abstract final class Ds {
  static const s2 = 2.0, s4 = 4.0, s6 = 6.0, s8 = 8.0, s10 = 10.0, s12 = 12.0, s14 = 14.0, s16 = 16.0, s20 = 20.0, s24 = 24.0, s32 = 32.0;
  static const rXs = 3.0, rSm = 6.0, rMd = 10.0, rLg = 12.0, rXl = 14.0, r2xl = 16.0, r3xl = 20.0;
  static const pagePadPhone = 16.0, pagePadTablet = 24.0, pagePadDesktop = 32.0;
  static const durFast = Duration(milliseconds: 120), dur = Duration(milliseconds: 200), durSlow = Duration(milliseconds: 280);
  static const ease = Cubic(.2, 0, 0, 1);
  static const tabular = [FontFeature.tabularFigures(), FontFeature.liningFigures()];
  static const sans = 'IBM Plex Sans';
  static const mono = 'IBM Plex Mono';
}

/// Trippin's map palette: one colour per day on maps, route lines and day squares. It's data, not
/// chrome, so it's kept as the website's set (white numerals read on every one). Repeats after 8.
abstract final class TrippinColors {
  static const days = [
    Color(0xFF0E7490), Color(0xFFC2410C), Color(0xFF4338CA), Color(0xFFA21CAF),
    Color(0xFF4D7C0F), Color(0xFFBE123C), Color(0xFF0369A1), Color(0xFF92400E),
  ];
  static Color day(int dayNumber) => days[(dayNumber - 1) % days.length];

  /// The saved road route on the navigate screen (the copy calls it "the blue line"): cobalt, the
  /// chart slot Trippin uses in place of teal.
  static const route = Color(0xFF2C4FCB);
}

/// Sibling apps keep their own accent (§10), so their marks on Trippin's screens look like them.
abstract final class SuiteAccents {
  static (Color soft, Color strong) of(String app, {required bool dark}) => switch (app) {
        'spendlog' => dark ? (const Color(0xFF1D2544), const Color(0xFF93A8FF)) : (const Color(0xFFE6EBFB), const Color(0xFF2C4FCB)),
        'inframe' => dark ? (const Color(0xFF251D3D), const Color(0xFFBBA4FF)) : (const Color(0xFFEEE8FB), const Color(0xFF6A3FC4)),
        _ => dark ? (const Color(0xFF10282F), const Color(0xFF6CCBE3)) : (const Color(0xFFE0F1F5), const Color(0xFF0A6E86)),
      };
}

extension DsContext on BuildContext {
  bool get isDark => Theme.of(this).brightness == Brightness.dark;

  /// The current token set: `context.ds.tx3`, `context.ds.acSoft`…
  DsColors get ds => Theme.of(this).extension<DsColors>() ?? (isDark ? DsColors.trippinDark : DsColors.trippinLight);
}

TextTheme dsTextTheme(Color tx, Color tx2) {
  const f = Ds.sans;
  TextStyle s(double size, double lh, FontWeight w, {double em = 0, Color? c}) =>
      TextStyle(fontFamily: f, fontSize: size, height: lh / size, fontWeight: w, letterSpacing: em * size, color: c ?? tx);
  return TextTheme(
    displayLarge: s(44, 52, FontWeight.w600, em: -0.02), // hero money
    displayMedium: s(40, 48, FontWeight.w600, em: -0.02),
    displaySmall: s(34, 40, FontWeight.w600, em: -0.02), // big figure; phone hero
    headlineLarge: s(28, 34, FontWeight.w600, em: -0.02),
    headlineMedium: s(26, 32, FontWeight.w600, em: -0.02),
    headlineSmall: s(22, 28, FontWeight.w600), // page title, stat value
    titleLarge: s(19, 26, FontWeight.w600), // dialog / recommendation
    titleMedium: s(17, 24, FontWeight.w600), // section header
    titleSmall: s(15, 20, FontWeight.w600), // card / row title
    bodyLarge: s(15, 22, FontWeight.w400),
    bodyMedium: s(14, 20, FontWeight.w400),
    bodySmall: s(13, 18, FontWeight.w400, c: tx2),
    labelLarge: s(15, 20, FontWeight.w600), // buttons
    labelMedium: s(12, 16, FontWeight.w600, em: 0.02, c: tx2), // field labels, eyebrows
    labelSmall: s(11, 14, FontWeight.w600, c: tx2),
  );
}

ThemeData dsTheme(DsColors c, Brightness b) {
  final other = b == Brightness.light ? DsColors.trippinDark : DsColors.trippinLight;
  final scheme = ColorScheme(
    brightness: b,
    primary: c.ac, onPrimary: c.acTx, primaryContainer: c.acSoft, onPrimaryContainer: c.ac,
    secondary: c.tx, onSecondary: c.bg, secondaryContainer: c.sunk, onSecondaryContainer: c.tx,
    tertiary: c.good, onTertiary: c.sf, tertiaryContainer: c.goodSoft, onTertiaryContainer: c.good,
    error: c.crit, onError: c.sf, errorContainer: c.critSoft, onErrorContainer: c.crit,
    surface: c.sf, onSurface: c.tx, onSurfaceVariant: c.tx2,
    surfaceContainerLowest: c.sf, surfaceContainerLow: c.sf2, surfaceContainer: c.sf2,
    surfaceContainerHigh: c.sf2, surfaceContainerHighest: c.sunk,
    outline: c.ln2, outlineVariant: c.ln,
    inverseSurface: c.tx, onInverseSurface: c.bg, inversePrimary: other.ac,
    shadow: const Color(0xFF18191D), scrim: c.scrim, surfaceTint: Colors.transparent,
  );
  final text = dsTextTheme(c.tx, c.tx2);
  final r10 = BorderRadius.circular(Ds.rMd), r12 = BorderRadius.circular(Ds.rLg), r14 = BorderRadius.circular(Ds.rXl);
  OutlineInputBorder ob(Color col, double w) => OutlineInputBorder(borderRadius: r10, borderSide: BorderSide(color: col, width: w));

  return ThemeData(
    useMaterial3: true,
    brightness: b,
    colorScheme: scheme,
    scaffoldBackgroundColor: c.bg,
    canvasColor: c.bg,
    fontFamily: Ds.sans,
    textTheme: text,
    extensions: [c],
    dividerTheme: DividerThemeData(color: c.ln, thickness: 1, space: 1),
    appBarTheme: AppBarTheme(
      backgroundColor: c.bg, foregroundColor: c.tx, elevation: 0, scrolledUnderElevation: 0,
      centerTitle: false, titleTextStyle: text.headlineSmall, shape: Border(bottom: BorderSide(color: c.ln)),
    ),
    cardTheme: CardThemeData(
      color: c.sf, elevation: 0, margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(borderRadius: r14, side: BorderSide(color: c.ln)),
    ),
    // Colours come from the scheme (primary / onPrimary), so FilledButton.tonal keeps its own
    // neutral `secondaryContainer` (sunk) fill instead of turning into a second primary.
    filledButtonTheme: FilledButtonThemeData(style: FilledButton.styleFrom(
      minimumSize: const Size(64, 48), padding: const EdgeInsets.symmetric(horizontal: 20),
      shape: RoundedRectangleBorder(borderRadius: r12), textStyle: text.labelLarge, elevation: 0,
    )),
    outlinedButtonTheme: OutlinedButtonThemeData(style: OutlinedButton.styleFrom(
      backgroundColor: c.sf, foregroundColor: c.tx, side: BorderSide(color: c.ln2), minimumSize: const Size(64, 48),
      padding: const EdgeInsets.symmetric(horizontal: 20), shape: RoundedRectangleBorder(borderRadius: r12), textStyle: text.labelLarge,
    )),
    textButtonTheme: TextButtonThemeData(style: TextButton.styleFrom(
      foregroundColor: c.ac, minimumSize: const Size(48, 48), padding: const EdgeInsets.symmetric(horizontal: 16),
      shape: RoundedRectangleBorder(borderRadius: r12), textStyle: text.labelLarge,
    )),
    iconButtonTheme: IconButtonThemeData(style: IconButton.styleFrom(foregroundColor: c.tx2, minimumSize: const Size(48, 48))),
    inputDecorationTheme: InputDecorationTheme(
      filled: true, fillColor: c.sf, isDense: false,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 16), // 52 px with 15/22 text
      hintStyle: text.bodyLarge!.copyWith(color: c.tx3),
      labelStyle: text.labelMedium, floatingLabelBehavior: FloatingLabelBehavior.never,
      helperStyle: text.bodySmall!.copyWith(fontSize: 12, height: 16 / 12, color: c.tx3),
      errorStyle: text.bodySmall!.copyWith(fontSize: 12, height: 16 / 12, color: c.crit),
      border: ob(c.ln2, 1), enabledBorder: ob(c.ln2, 1), focusedBorder: ob(c.ac, 2),
      errorBorder: ob(c.crit, 2), focusedErrorBorder: ob(c.crit, 2), disabledBorder: ob(c.ln, 1),
      suffixIconColor: c.tx2, prefixIconColor: c.tx3,
    ),
    chipTheme: ChipThemeData(
      backgroundColor: c.sf, selectedColor: c.tx, disabledColor: c.sunk,
      labelStyle: text.bodySmall!.copyWith(fontWeight: FontWeight.w500, color: c.tx),
      secondaryLabelStyle: text.bodySmall!.copyWith(fontWeight: FontWeight.w500, color: c.bg),
      side: BorderSide(color: c.ln2), shape: const StadiumBorder(), showCheckmark: true, checkmarkColor: c.bg,
      padding: const EdgeInsets.symmetric(horizontal: 6), labelPadding: const EdgeInsets.symmetric(horizontal: 8),
    ),
    segmentedButtonTheme: SegmentedButtonThemeData(style: SegmentedButton.styleFrom(
      backgroundColor: c.sunk, selectedBackgroundColor: c.sf, foregroundColor: c.tx2, selectedForegroundColor: c.tx,
      side: BorderSide.none, shape: RoundedRectangleBorder(borderRadius: r12),
    )),
    switchTheme: SwitchThemeData(
      trackColor: WidgetStateProperty.resolveWith((s) => s.contains(WidgetState.selected) ? c.ac : c.ln2),
      thumbColor: WidgetStateProperty.resolveWith((s) => s.contains(WidgetState.selected) ? c.acTx : c.sf),
      trackOutlineColor: const WidgetStatePropertyAll(Colors.transparent),
    ),
    checkboxTheme: CheckboxThemeData(
      fillColor: WidgetStateProperty.resolveWith((s) => s.contains(WidgetState.selected) ? c.ac : c.sf),
      checkColor: WidgetStatePropertyAll(c.acTx), side: BorderSide(color: c.ln2, width: 1.5),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
    ),
    dialogTheme: DialogThemeData(
      backgroundColor: c.sf, elevation: 0, shadowColor: Colors.transparent, barrierColor: c.scrim,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(Ds.r3xl)), titleTextStyle: text.titleLarge,
      contentTextStyle: text.bodyLarge!.copyWith(color: c.tx2),
    ),
    bottomSheetTheme: BottomSheetThemeData(
      backgroundColor: c.sf, modalBackgroundColor: c.sf, modalBarrierColor: c.scrim,
      showDragHandle: true, dragHandleColor: c.ln2, dragHandleSize: const Size(36, 4),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(Ds.r3xl))),
    ),
    popupMenuTheme: PopupMenuThemeData(
      color: c.sf, elevation: 6, shadowColor: Colors.black.withValues(alpha: 0.3), surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(borderRadius: r12, side: BorderSide(color: c.ln)), textStyle: text.bodyMedium,
    ),
    snackBarTheme: SnackBarThemeData(
      backgroundColor: c.tx, contentTextStyle: text.bodyMedium!.copyWith(color: c.bg),
      actionTextColor: c.bg, behavior: SnackBarBehavior.floating, shape: RoundedRectangleBorder(borderRadius: r12),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: c.sf, indicatorColor: c.acSoft, height: 64, elevation: 0, surfaceTintColor: Colors.transparent,
      labelTextStyle: WidgetStateProperty.resolveWith((s) => text.labelMedium!.copyWith(letterSpacing: 0, color: s.contains(WidgetState.selected) ? c.ac : c.tx2)),
      iconTheme: WidgetStateProperty.resolveWith((s) => IconThemeData(size: 24, color: s.contains(WidgetState.selected) ? c.ac : c.tx2)),
    ),
    listTileTheme: ListTileThemeData(
      minVerticalPadding: 12, minTileHeight: 64, iconColor: c.tx2,
      titleTextStyle: text.titleSmall!.copyWith(fontWeight: FontWeight.w500), subtitleTextStyle: text.bodySmall!.copyWith(color: c.tx3),
    ),
    progressIndicatorTheme: ProgressIndicatorThemeData(
      color: c.ac, linearTrackColor: c.sunk, circularTrackColor: c.sunk, linearMinHeight: 6, borderRadius: BorderRadius.circular(3),
    ),
    tooltipTheme: TooltipThemeData(
      decoration: BoxDecoration(color: c.tx, borderRadius: BorderRadius.circular(Ds.rMd)),
      textStyle: text.bodySmall!.copyWith(color: c.bg),
    ),
    floatingActionButtonTheme: FloatingActionButtonThemeData(
      backgroundColor: c.ac, foregroundColor: c.acTx, elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(Ds.r2xl)),
    ),
  );
}

/// Trippin's theme: the shared system with the ocean accent.
ThemeData buildTheme(Brightness brightness) =>
    dsTheme(brightness == Brightness.dark ? DsColors.trippinDark : DsColors.trippinLight, brightness);
