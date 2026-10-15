import 'package:flutter/material.dart';

/// Trippin colours — the same warm paper neutrals and deep teal as the website.
class TrippinColors {
  static const canvas = Color(0xFFF5F3EE);
  static const surface = Color(0xFFFFFFFF);
  static const subtle = Color(0xFFEEEBE3);
  static const line = Color(0xFFE2DDD1);
  static const text = Color(0xFF1A2422);
  static const muted = Color(0xFF55625F);
  static const accent = Color(0xFF0F766E);
  static const accentSoft = Color(0xFFDCF0ED);
  static const accentText = Color(0xFF0A544E);
  static const warn = Color(0xFF8A4B08);
  static const warnSoft = Color(0xFFFBEBCB);
  static const danger = Color(0xFFB42318);
  static const dangerSoft = Color(0xFFFDE4E1);
  static const success = Color(0xFF25703F);
  static const successSoft = Color(0xFFDDF1E3);

  static const darkCanvas = Color(0xFF0E1514);
  static const darkSurface = Color(0xFF151E1D);
  static const darkSubtle = Color(0xFF1C2827);
  static const darkLine = Color(0xFF2B3B39);
  static const darkText = Color(0xFFE6EEEC);
  static const darkMuted = Color(0xFF9BAEAA);
  static const darkAccent = Color(0xFF4FBDB0);

  /// One colour per day, as on the website's maps.
  static const days = [
    Color(0xFF0E7490), Color(0xFFC2410C), Color(0xFF4338CA), Color(0xFFA21CAF),
    Color(0xFF4D7C0F), Color(0xFFBE123C), Color(0xFF0369A1), Color(0xFF92400E),
  ];
  static Color day(int dayNumber) => days[(dayNumber - 1) % days.length];
}

/// Colours that switch with light / dark mode.
extension TrippinContext on BuildContext {
  bool get isDark => Theme.of(this).brightness == Brightness.dark;
  Color get muted => isDark ? TrippinColors.darkMuted : TrippinColors.muted;
  Color get subtle => isDark ? TrippinColors.darkSubtle : TrippinColors.subtle;
  Color get line => isDark ? TrippinColors.darkLine : TrippinColors.line;
  Color get accent => isDark ? TrippinColors.darkAccent : TrippinColors.accent;
  Color get accentSoft => isDark ? const Color(0xFF12332F) : TrippinColors.accentSoft;
  Color get accentText => isDark ? const Color(0xFF86DCD1) : TrippinColors.accentText;
  Color get warnSoft => isDark ? const Color(0xFF35270F) : TrippinColors.warnSoft;
  Color get warn => isDark ? const Color(0xFFF0B562) : TrippinColors.warn;
  Color get dangerSoft => isDark ? const Color(0xFF3A1B18) : TrippinColors.dangerSoft;
  Color get danger => isDark ? const Color(0xFFF49C93) : TrippinColors.danger;
  Color get successSoft => isDark ? const Color(0xFF14301F) : TrippinColors.successSoft;
  Color get success => isDark ? const Color(0xFF7DD69B) : TrippinColors.success;
}

ThemeData buildTheme(Brightness brightness) {
  final dark = brightness == Brightness.dark;
  final scheme = ColorScheme.fromSeed(
    seedColor: TrippinColors.accent,
    brightness: brightness,
  ).copyWith(
    primary: dark ? TrippinColors.darkAccent : TrippinColors.accent,
    onPrimary: dark ? const Color(0xFF05201D) : Colors.white,
    surface: dark ? TrippinColors.darkSurface : TrippinColors.surface,
    onSurface: dark ? TrippinColors.darkText : TrippinColors.text,
    outlineVariant: dark ? TrippinColors.darkLine : TrippinColors.line,
    error: dark ? const Color(0xFFF49C93) : TrippinColors.danger,
  );
  final base = ThemeData(useMaterial3: true, colorScheme: scheme, brightness: brightness);
  final line = dark ? TrippinColors.darkLine : TrippinColors.line;
  return base.copyWith(
    scaffoldBackgroundColor: dark ? TrippinColors.darkCanvas : TrippinColors.canvas,
    appBarTheme: AppBarTheme(
      backgroundColor: dark ? TrippinColors.darkCanvas : TrippinColors.canvas,
      foregroundColor: scheme.onSurface,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: false,
      titleTextStyle: base.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700, color: scheme.onSurface),
    ),
    cardTheme: CardThemeData(
      color: scheme.surface,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: BorderSide(color: line)),
    ),
    dividerTheme: DividerThemeData(color: line, space: 1),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        minimumSize: const Size(48, 48),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        minimumSize: const Size(48, 48),
        side: BorderSide(color: line),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: scheme.surface,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: line)),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: line)),
    ),
    chipTheme: base.chipTheme.copyWith(side: BorderSide(color: line)),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: scheme.surface,
      indicatorColor: dark ? const Color(0xFF12332F) : TrippinColors.accentSoft,
    ),
  );
}
