import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

class CacheService {
  static const String _userDataKey = 'cached_user_data';
  static const String _attendanceDataKey = 'cached_attendance_data';
  static const String _locationDataKey = 'cached_location_data';
  static const String _lastCacheUpdateKey = 'last_cache_update';
  
  final SharedPreferences _prefs;
  
  CacheService(this._prefs);

  // Cache user data for offline startup
  Future<void> cacheUserData(Map<String, dynamic> userData) async {
    await _prefs.setString(_userDataKey, jsonEncode(userData));
    await _updateCacheTimestamp();
  }

  // Get cached user data
  Map<String, dynamic>? getCachedUserData() {
    final cachedData = _prefs.getString(_userDataKey);
    if (cachedData == null) return null;
    
    try {
      return jsonDecode(cachedData) as Map<String, dynamic>;
    } catch (e) {
      return null;
    }
  }

  // Cache attendance data
  Future<void> cacheAttendanceData(Map<String, dynamic> attendanceData) async {
    await _prefs.setString(_attendanceDataKey, jsonEncode(attendanceData));
    await _updateCacheTimestamp();
  }

  // Get cached attendance data
  Map<String, dynamic>? getCachedAttendanceData() {
    final cachedData = _prefs.getString(_attendanceDataKey);
    if (cachedData == null) return null;
    
    try {
      return jsonDecode(cachedData) as Map<String, dynamic>;
    } catch (e) {
      return null;
    }
  }

  // Cache location data
  Future<void> cacheLocationData(Map<String, dynamic> locationData) async {
    await _prefs.setString(_locationDataKey, jsonEncode(locationData));
    await _updateCacheTimestamp();
  }

  // Get cached location data
  Map<String, dynamic>? getCachedLocationData() {
    final cachedData = _prefs.getString(_locationDataKey);
    if (cachedData == null) return null;
    
    try {
      return jsonDecode(cachedData) as Map<String, dynamic>;
    } catch (e) {
      return null;
    }
  }

  // Check if cache is fresh (less than 24 hours old)
  bool isCacheFresh() {
    final lastUpdate = _prefs.getInt(_lastCacheUpdateKey);
    if (lastUpdate == null) return false;
    
    final lastUpdateTime = DateTime.fromMillisecondsSinceEpoch(lastUpdate);
    final now = DateTime.now();
    return now.difference(lastUpdateTime).inHours < 24;
  }

  // Clear all cached data
  Future<void> clearCache() async {
    await _prefs.remove(_userDataKey);
    await _prefs.remove(_attendanceDataKey);
    await _prefs.remove(_locationDataKey);
    await _prefs.remove(_lastCacheUpdateKey);
  }

  Future<void> _updateCacheTimestamp() async {
    await _prefs.setInt(_lastCacheUpdateKey, DateTime.now().millisecondsSinceEpoch);
  }
}