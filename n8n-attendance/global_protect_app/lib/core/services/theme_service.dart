import 'package:flutter/material.dart';
import 'package:hive/hive.dart';

class ThemeService {
  static const String _themeBoxName = 'theme_preferences';
  static const String _themeModeKey = 'theme_mode';
  
  late Box _themeBox;
  
  Future<void> init() async {
    _themeBox = await Hive.openBox(_themeBoxName);
  }
  
  ThemeMode getThemeMode() {
    final themeModeIndex = _themeBox.get(_themeModeKey, defaultValue: 0);
    return ThemeMode.values[themeModeIndex];
  }
  
  Future<void> setThemeMode(ThemeMode themeMode) async {
    await _themeBox.put(_themeModeKey, themeMode.index);
  }
  
  bool get isSystemMode => getThemeMode() == ThemeMode.system;
  bool get isLightMode => getThemeMode() == ThemeMode.light;
  bool get isDarkMode => getThemeMode() == ThemeMode.dark;
}