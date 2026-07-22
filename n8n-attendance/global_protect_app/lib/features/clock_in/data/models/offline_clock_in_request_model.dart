import 'package:uuid/uuid.dart';
import '../../domain/entities/offline_clock_in_request.dart';

class OfflineClockInRequestModel extends OfflineClockInRequest {
  const OfflineClockInRequestModel({
    required super.id,
    required super.type,
    required super.location,
    super.notes,
    super.attendanceId,
    required super.timestamp,
    required super.additionalData,
    super.retryCount = 0,
    required super.createdAt,
    super.status = OfflineRequestStatus.pending,
  });

  factory OfflineClockInRequestModel.fromEntity(OfflineClockInRequest entity) {
    return OfflineClockInRequestModel(
      id: entity.id,
      type: entity.type,
      location: entity.location,
      notes: entity.notes,
      attendanceId: entity.attendanceId,
      timestamp: entity.timestamp,
      additionalData: entity.additionalData,
      retryCount: entity.retryCount,
      createdAt: entity.createdAt,
      status: entity.status,
    );
  }

  factory OfflineClockInRequestModel.fromJson(Map<String, dynamic> json) {
    return OfflineClockInRequestModel(
      id: json['id'],
      type: json['type'],
      location: json['location'],
      notes: json['notes'],
      attendanceId: json['attendanceId'],
      timestamp: DateTime.parse(json['timestamp']),
      additionalData: Map<String, dynamic>.from(json['additionalData'] ?? {}),
      retryCount: json['retryCount'] ?? 0,
      createdAt: DateTime.parse(json['createdAt']),
      status: OfflineRequestStatus.values.firstWhere(
        (e) => e.toString() == json['status'],
        orElse: () => OfflineRequestStatus.pending,
      ),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'type': type,
      'location': location,
      'notes': notes,
      'attendanceId': attendanceId,
      'timestamp': timestamp.toIso8601String(),
      'additionalData': additionalData,
      'retryCount': retryCount,
      'createdAt': createdAt.toIso8601String(),
      'status': status.toString(),
    };
  }

  factory OfflineClockInRequestModel.createClockIn({
    required String location,
    String? notes,
    Map<String, dynamic>? additionalData,
  }) {
    final now = DateTime.now();
    return OfflineClockInRequestModel(
      id: const Uuid().v4(),
      type: 'clock_in',
      location: location,
      notes: notes,
      timestamp: now,
      additionalData: additionalData ?? {},
      createdAt: now,
    );
  }

  factory OfflineClockInRequestModel.createClockOut({
    required String attendanceId,
    required String location,
    String? notes,
    Map<String, dynamic>? additionalData,
  }) {
    final now = DateTime.now();
    return OfflineClockInRequestModel(
      id: const Uuid().v4(),
      type: 'clock_out',
      location: location,
      notes: notes,
      attendanceId: attendanceId,
      timestamp: now,
      additionalData: additionalData ?? {},
      createdAt: now,
    );
  }

  OfflineClockInRequestModel toEntity() {
    return this;
  }
}