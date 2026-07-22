import 'package:global_protect_app/features/clock_in/domain/entities/offline_clock_in_request.dart';
import 'package:hive/hive.dart';
import '../../../../core/constants/storage_keys.dart';
import '../models/attendance_record_model.dart';
import '../models/offline_clock_in_request_model.dart';

abstract class AttendanceLocalDataSource {
  Future<void> cacheCurrentAttendance(AttendanceRecordModel attendance);
  Future<AttendanceRecordModel?> getCachedCurrentAttendance();
  Future<void> clearCurrentAttendance();
  Future<void> cacheAttendanceHistory(List<AttendanceRecordModel> history);
  Future<List<AttendanceRecordModel>> getCachedAttendanceHistory();
  
  // Offline queue methods
  Future<void> addOfflineRequest(OfflineClockInRequestModel request);
  Future<List<OfflineClockInRequestModel>> getPendingOfflineRequests();
  Future<void> updateOfflineRequest(OfflineClockInRequestModel request);
  Future<void> removeOfflineRequest(String requestId);
  Future<void> clearCompletedOfflineRequests();
  Future<int> getOfflineRequestCount();
}

class AttendanceLocalDataSourceImpl implements AttendanceLocalDataSource {
  final Box box;

  AttendanceLocalDataSourceImpl({required this.box});

  @override
  Future<void> cacheCurrentAttendance(AttendanceRecordModel attendance) async {
    await box.put(StorageKeys.currentAttendance, attendance.toJson());
  }

  @override
  Future<AttendanceRecordModel?> getCachedCurrentAttendance() async {
    final data = box.get(StorageKeys.currentAttendance);
    if (data != null) {
      return AttendanceRecordModel.fromJson(Map<String, dynamic>.from(data));
    }
    return null;
  }

  @override
  Future<void> clearCurrentAttendance() async {
    await box.delete(StorageKeys.currentAttendance);
  }

  @override
  Future<void> cacheAttendanceHistory(List<AttendanceRecordModel> history) async {
    final jsonList = history.map((record) => record.toJson()).toList();
    await box.put(StorageKeys.attendanceHistory, jsonList);
  }

  @override
  Future<List<AttendanceRecordModel>> getCachedAttendanceHistory() async {
    final data = box.get(StorageKeys.attendanceHistory, defaultValue: <dynamic>[]);
    return (data as List<dynamic>)
        .map((json) => AttendanceRecordModel.fromJson(Map<String, dynamic>.from(json)))
        .toList();
  }

  @override
  Future<void> addOfflineRequest(OfflineClockInRequestModel request) async {
    final requests = await getPendingOfflineRequests();
    requests.add(request);
    await _saveOfflineRequests(requests);
  }

  @override
  Future<List<OfflineClockInRequestModel>> getPendingOfflineRequests() async {
    final data = box.get(StorageKeys.offlineRequests, defaultValue: <dynamic>[]);
    return (data as List<dynamic>)
        .map((json) => OfflineClockInRequestModel.fromJson(Map<String, dynamic>.from(json)))
        .where((request) => request.status != OfflineRequestStatus.completed)
        .toList();
  }

  @override
  Future<void> updateOfflineRequest(OfflineClockInRequestModel request) async {
    final requests = await getPendingOfflineRequests();
    final index = requests.indexWhere((r) => r.id == request.id);
    if (index != -1) {
      requests[index] = request;
      await _saveOfflineRequests(requests);
    }
  }

  @override
  Future<void> removeOfflineRequest(String requestId) async {
    final requests = await getPendingOfflineRequests();
    requests.removeWhere((r) => r.id == requestId);
    await _saveOfflineRequests(requests);
  }

  @override
  Future<void> clearCompletedOfflineRequests() async {
    final requests = await getPendingOfflineRequests();
    final pendingRequests = requests.where((r) => r.status != OfflineRequestStatus.completed).toList();
    await _saveOfflineRequests(pendingRequests);
  }

  @override
  Future<int> getOfflineRequestCount() async {
    final requests = await getPendingOfflineRequests();
    return requests.length;
  }

  Future<void> _saveOfflineRequests(List<OfflineClockInRequestModel> requests) async {
    final jsonList = requests.map((request) => request.toJson()).toList();
    await box.put(StorageKeys.offlineRequests, jsonList);
  }
}