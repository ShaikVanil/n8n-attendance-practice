import 'package:dio/dio.dart';
import 'package:global_protect_app/core/services/api_error_recovery_service.dart';
import '../../../../core/constants/api_constants.dart';
import '../../../../core/error/exceptions.dart';
import '../models/attendance_record_model.dart';

abstract class AttendanceRemoteDataSource {
  Future<AttendanceRecordModel> clockIn({
    required String location,
    String? notes,
  });
  
  Future<AttendanceRecordModel> clockOut({
    required String attendanceId,
    String? notes,
    String? location,
  });
  
  Future<AttendanceRecordModel?> getCurrentAttendance();
  Future<List<AttendanceRecordModel>> getAttendanceHistory();
}

class AttendanceRemoteDataSourceImpl implements AttendanceRemoteDataSource {
  final Dio dio;

  AttendanceRemoteDataSourceImpl({required this.dio});

  @override
  Future<AttendanceRecordModel> clockIn({
    required String location,
    String? notes,
  }) async {
    try {
      final response = await dio.post(
        ApiConstants.clockInEndpoint,
        data: {
          'location': location,
          'notes': notes,
          'timestamp': DateTime.now().toIso8601String(),
        },
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        // Fix: Parse attendance object from 'attendance' field, not 'data'
        return AttendanceRecordModel.fromJson(response.data['attendance']);
      } else {
        throw ServerException('Failed to clock in');
      }
    } on DioException catch (e) {
      // Handle specific error cases
      if (e.response?.statusCode == 400) {
        final errorData = e.response?.data;
        if (errorData is Map<String, dynamic> && errorData.containsKey('error')) {
          final errorMessage = errorData['error'] as String;
          if (errorMessage == 'Already checked in today') {
            throw ServerException('You are already checked in today. Please check your current status.');
          }
          throw ServerException(errorMessage);
        }
      }
      throw ServerException('Network error: ${e.message}');
    } catch (e) {
      throw ServerException('Unexpected error: ${e.toString()}');
    }
  }

  @override
  Future<AttendanceRecordModel> clockOut({
    required String attendanceId,
    String? notes,
    String? location,
  }) async {
    try {
      final response = await dio.post(
        ApiConstants.clockOutEndpoint,
        data: {
          'attendanceId': attendanceId,
          'location': location,
          'notes': notes,
          'timestamp': DateTime.now().toIso8601String(),
        },
      );

      if (response.statusCode == 200) {
        // Fix: Parse attendance object from 'attendance' field, not 'data'
        return AttendanceRecordModel.fromJson(response.data['attendance']);
      } else {
        throw ServerException('Failed to clock out');
      }
    } on DioException catch (e) {
      throw ServerException('Network error: ${e.message}');
    } catch (e) {
      throw ServerException('Unexpected error: ${e.toString()}');
    }
  }

  @override
  Future<AttendanceRecordModel?> getCurrentAttendance() async {
    try {
      final response = await dio.get(ApiConstants.currentAttendanceEndpoint);
  
      if (response.statusCode == 200) {
        final responseData = response.data;
        
        // Check if user is checked in
        final isCheckedIn = responseData['is_checked_in'] as bool? ?? false;
        
        if (isCheckedIn && responseData['current_session'] != null) {
          // User is currently checked in - return active session
          return AttendanceRecordModel.fromJson(responseData['current_session']);
        } else {
          // User is not checked in - check if there's today's data to show
          final todayTotalHours = (responseData['today_total_hours'] as num?)?.toDouble() ?? 0.0;
          
          if (todayTotalHours > 0) {
            // Return today's summary data
            return AttendanceRecordModel.fromTodaySummary(responseData);
          }
        }
        
        return null;
      } else {
        throw ServerException('Failed to get current attendance');
      }
    } on DioException catch (e) {
      throw ServerException('Network error: ${e.message}');
    } catch (e) {
      throw ServerException('Unexpected error: ${e.toString()}');
    }
  }

  @override
  Future<List<AttendanceRecordModel>> getAttendanceHistory() async {
    try {
      final response = await dio.get(ApiConstants.attendanceHistoryEndpoint);

      if (response.statusCode == 200) {
        final List<dynamic> data = response.data['data'];
        return data.map((json) => AttendanceRecordModel.fromJson(json)).toList();
      } else {
        throw ServerException('Failed to get attendance history');
      }
    } on DioException catch (e) {
      throw ServerException('Network error: ${e.message}');
    } catch (e) {
      throw ServerException('Unexpected error: ${e.toString()}');
    }
  }
}